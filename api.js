/* =========================================================
   api.js
   LLM / Embedding / Image 接口封装
   - 兼容 OpenAI 协议（chat/completions, embeddings, images/generations）
   - 兼容 Anthropic 协议（messages）
   - 提供本地 fallback（无 API 时仍能跑核心流程）
   ========================================================= */

// ============ LLM PROVIDER PRESETS ============
// 选定 provider 后自动填入推荐 endpoint / 默认 model；底层协议直接路由
const LLM_PRESETS = {
  openai: {
    label: 'OpenAI 兼容',
    endpoint: 'https://api.openai.com/v1',
    default_model: 'gpt-4o-mini',
    model_examples: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'o3-mini'],
    protocol: 'openai',
    docs: 'https://platform.openai.com/docs/api-reference',
    note: '通用 OpenAI 协议；任何兼容服务（Moonshot / 通义 / Together / Groq）改 endpoint 即用。',
  },
  deepseek: {
    label: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    default_model: 'deepseek-chat',
    model_examples: ['deepseek-chat', 'deepseek-reasoner'],
    protocol: 'openai',  // DeepSeek 是 OpenAI 兼容协议
    docs: 'https://api-docs.deepseek.com/',
    note: 'DeepSeek 官方 API · 协议与 OpenAI 完全兼容。deepseek-chat 是 V3，deepseek-reasoner 是 R1。',
  },
  anthropic: {
    label: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1',
    default_model: 'claude-sonnet-4-5',
    model_examples: ['claude-sonnet-4-5', 'claude-opus-4-5', 'claude-haiku-4-5'],
    protocol: 'anthropic',
    docs: 'https://docs.anthropic.com/en/api',
    note: 'Anthropic Messages API · 协议与 OpenAI 不同。',
  },
};
window.LLM_PRESETS = LLM_PRESETS;

const Api = {
  // 检测 LLM 是否已配置
  llmReady() {
    const s = Store.getSettings();
    return !!(s.llm && s.llm.api_key && s.llm.endpoint);
  },
  imageReady() {
    const s = Store.getSettings();
    return s.image && s.image.enabled && !!s.image.api_key;
  },
  embeddingReady() {
    const s = Store.getSettings();
    return s.embedding && s.embedding.enabled && !!s.embedding.api_key;
  },

  // ============ LLM CHAT ============
  /**
   * 调用 LLM。返回纯文本（去除前后引号 / markdown 代码围栏）。
   * 若未配置且开启 fallback，则调用 fallback 函数。
   * @param {Object} opt
   * @param {string} opt.system   - system prompt
   * @param {string} opt.user     - user prompt
   * @param {Function} opt.fallback - (sys, user) => string
   * @param {number} opt.temperature - default 0.4
   */
  async chat({ system, user, fallback, temperature = 0.4 }) {
    const s = Store.getSettings();
    if (!this.llmReady()) {
      if (s.behaviour.offline_fallback && fallback) {
        return { text: fallback(system, user), source: 'fallback' };
      }
      throw new Error('LLM 未配置 API key（前往 Settings → LLM 配置）');
    }
    const provider = s.llm.provider || 'openai';
    if (provider === 'anthropic') {
      return this._anthropicChat(s.llm, { system, user, temperature });
    }
    // openai / deepseek / 任何 OpenAI 兼容协议（Moonshot / 通义 / Together 等）走同一通路
    return this._openaiChat(s.llm, { system, user, temperature });
  },

  async _openaiChat(cfg, { system, user, temperature }) {
    const url = `${cfg.endpoint.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.api_key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LLM 调用失败 (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { text: stripFence(text), source: 'llm', usage: data.usage };
  },

  async _anthropicChat(cfg, { system, user, temperature }) {
    const url = `${cfg.endpoint.replace(/\/$/, '')}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.api_key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 2048,
        temperature,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Claude 调用失败 (${res.status}): ${err.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return { text: stripFence(text), source: 'llm', usage: data.usage };
  },

  // ============ EMBEDDING ============
  async embed(textArr) {
    if (!this.embeddingReady()) return null;
    const s = Store.getSettings();
    const url = `${s.embedding.endpoint.replace(/\/$/, '')}/embeddings`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.embedding.api_key}` },
      body: JSON.stringify({ model: s.embedding.model, input: textArr }),
    });
    if (!res.ok) throw new Error(`Embedding 调用失败 (${res.status})`);
    const data = await res.json();
    return data.data?.map((d) => d.embedding) || null;
  },

  // ============ IMAGE GEN (L4) ============
  async generateImage({ prompt, n = 4, size = '1024x1024' }) {
    if (!this.imageReady()) {
      throw new Error('图像生成未启用，请到 Settings → Image Gen 启用并填写 key');
    }
    const s = Store.getSettings();
    const url = s.image.endpoint;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.image.api_key}` },
      body: JSON.stringify({ model: s.image.model, prompt, n, size }),
    });
    if (!res.ok) throw new Error(`图像生成失败 (${res.status})`);
    const data = await res.json();
    return (data.data || []).map((d) => d.url || d.b64_json);
  },

  // ============ HEALTH CHECK ============
  async testLlm() {
    if (!this.llmReady()) throw new Error('未填写 API key');
    const r = await this.chat({
      system: 'You are a connection test. Reply with the single word: OK.',
      user: 'ping',
      temperature: 0,
    });
    return r.text;
  },

  // ============ FETCH URL (灵感池抓取) ============
  /**
   * 抓取 URL 内容。GitHub URL 走专用 GitHub API；其他走 reader 代理（默认 Jina Reader）。
   * 返回 { title, description, content, raw, source: 'jina' | 'github' }
   */
  async fetchUrl(url) {
    // GitHub repo 专用通路（Jina 偶尔屏蔽 github.com，且 GitHub API 含更多结构化字段）
    const ghMatch = url.match(/^https?:\/\/(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s\?#]+)\/?(?:[\?#].*)?$/i);
    if (ghMatch) {
      try { return await this._fetchGithub(ghMatch[1], ghMatch[2]); }
      catch (e) { /* fall through to jina */ }
    }
    return await this._fetchJina(url);
  },

  async _fetchJina(url) {
    const s = Store.getSettings();
    const endpoint = (s.fetch && s.fetch.reader_endpoint) || 'https://r.jina.ai/';
    const max = (s.fetch && s.fetch.max_chars) || 8000;
    const fetchUrl = endpoint.replace(/\/$/, '/') + url;
    const res = await fetch(fetchUrl, {
      headers: { 'Accept': 'text/plain', 'X-Return-Format': 'markdown' },
    });
    if (!res.ok) {
      throw new Error(`抓取失败 (${res.status}) · 可能 URL 不可达或代理被限流。可改成手动粘贴正文。`);
    }
    const raw = await res.text();
    // 检测 Jina 错误响应（JSON）
    if (raw.startsWith('{') && /SecurityCompromiseError|"code":/.test(raw)) {
      try {
        const j = JSON.parse(raw);
        throw new Error(`抓取被代理拒绝 · ${j.message || j.readableMessage || 'unknown'}`);
      } catch { /* fall through */ }
    }
    const lines = raw.split('\n');
    let title = '', description = '', bodyStart = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const l = lines[i];
      if (/^Title:\s*/i.test(l)) title = l.replace(/^Title:\s*/i, '').trim();
      else if (/^Description:\s*/i.test(l)) description = l.replace(/^Description:\s*/i, '').trim();
      else if (/^Markdown Content:\s*/i.test(l)) { bodyStart = i + 1; break; }
    }
    const body = lines.slice(bodyStart).join('\n').trim();
    const content = body.slice(0, max);
    return { title: title || url, description: description.slice(0, 280), content, raw: raw.slice(0, max), source: 'jina' };
  },

  async _fetchGithub(owner, repo) {
    const max = (Store.getSettings().fetch?.max_chars) || 8000;
    // 1. repo 元数据
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (!metaRes.ok) throw new Error(`GitHub API 失败 (${metaRes.status})`);
    const meta = await metaRes.json();
    // 2. README
    let readmeText = '';
    try {
      const rmRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers: { 'Accept': 'application/vnd.github.raw' },
      });
      if (rmRes.ok) readmeText = await rmRes.text();
    } catch { /* ignore */ }

    const desc = meta.description || '';
    const topics = (meta.topics || []).join(', ');
    const stats = `★ ${meta.stargazers_count || 0}  · ${meta.language || '-'}  · ${meta.license?.spdx_id || 'no-license'}  · forks ${meta.forks_count || 0}`;
    const header = `# ${owner}/${repo}\n\n> ${desc}\n\n${stats}\n\nTopics: ${topics}\n\nHomepage: ${meta.homepage || '-'}\n\n---\n\n`;
    const content = (header + readmeText).slice(0, max);

    return {
      title: meta.full_name || `${owner}/${repo}`,
      description: desc,
      content,
      raw: content,
      source: 'github',
    };
  },

  // ============ ANALYZE SOURCE (灵感池分析) ============
  /**
   * 对一条已抓取的 source 跑结构化 LLM 分析。
   * 输出严格 JSON，含 summary, brand_sections, key_takeaways, applicable_rules, suggested_brand_updates
   */
  async analyzeSource(source, brandData) {
    const s = Store.getSettings();
    if (!this.llmReady()) {
      // 兜底：基于规则的简单分析（仅为确保流程能跑通）
      return fallbackAnalysis(source);
    }
    const truncate = (s.fetch && s.fetch.llm_truncate_chars) || 5000;
    const content = (source.content || source.raw_paste || source.description || '').slice(0, truncate);
    const sysPrompt = buildAnalyzeSystem(brandData);
    const userPrompt = `# Source\n\nURL: ${source.url || '(no url)'}\nType: ${source.type}\nTitle: ${source.title}\nUser tags: ${(source.tags || []).join(', ') || '-'}\nUser-stated targets: ${(source.brand_targets || []).join(', ') || '-'}\n\n# Content (truncated)\n\n${content}`;
    const result = await this.chat({ system: sysPrompt, user: userPrompt, temperature: 0.2 });
    let parsed;
    try {
      // 尝试找到第一个 { ... } JSON 块
      const m = result.text.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : result.text);
    } catch (e) {
      throw new Error('LLM 输出无法解析为 JSON · 可重新分析或检查模型');
    }
    return parsed;
  },
};

function buildAnalyzeSystem(brandData) {
  const bd = brandData || {};
  const ctx = (typeof window.brandContextFromGraph === 'function')
    ? window.brandContextFromGraph(bd, 'prompt.inbox_analyze')
    : `BRAND DNA:\n- atmosphere: ${bd.visual_theme?.atmosphere || ''}\n- voice: ${bd.voice?.tone || ''}`;
  return `You are a brand-system intelligence analyst for the **viaim** brand. The brand is "calm-tech, restrained, technical precision".

You receive an external source (URL, GitHub repo readme, article excerpt, tool description, or a snippet) and must analyze how it can be applied to the viaim brand system.

The brand system has **15 sections** (v0.1.9+):
- theme / colors / typography / spacing / components / motion / voice / marks / dont   (visual & writing standards)
- users         (primary/secondary personas, anti-personas)
- product       (hardware lines, software platforms, AI engines, flagship features)
- naming        (bilingual brand pairs, product/feature naming rules)
- localization  (cn/overseas feature diff, subscription tiers)
- use_cases     (business scenarios, physical contexts, recording modes)
- value_proposition  (one-liner, 4-step value model, differentiators, anti-positioning)

Current brand context (auto-injected per node-graph):

${ctx}

OUTPUT STRICT JSON (no preamble, no markdown fence) with these fields:

{
  "type": "spec | library | article | tool | other",
  "summary": "1-2 sentences in Chinese describing what this source IS and why it's relevant to viaim brand.",
  "brand_sections": ["typography", "voice", ...],   // which of the 9 sections this source informs (1-3 most relevant)
  "key_takeaways": [                                  // 3-6 concrete, atomic takeaways (Chinese)
    "..."
  ],
  "applicable_rules": [                               // concrete rules to potentially adopt
    {
      "section": "typography",
      "rule": "中文段落首行缩进 2 字符",
      "rationale": "W3C clreq 推荐用法，提升中文阅读节奏",
      "confidence": "high | medium | low"
    }
  ],
  "suggested_brand_updates": [                        // 0-5 concrete brand schema patches
    {
      "path": "typography.cn_rules",                  // dotted path; supports new fields
      "operation": "set | append | merge",
      "value": "...",                                 // string / array / object
      "reason": "为什么这条值得加"
    }
  ],
  "risk_or_caveats": "string · 引入此源时需要注意的风险（如版权、与现有规则冲突等）。可为空字符串。"
}

Constraints:
- 中文 summary / takeaways / rationale；英文键名照常英文
- 不要硬塞改动：如果源与品牌系统关联弱，suggested_brand_updates 可以为空数组
- 提议的 path 优先用现有 9 段已有字段；新字段也允许（如 typography.cn_rules）但要可解释
- 引用源中的具体段落 / 数字 / 例子`;
}

function fallbackAnalysis(source) {
  // 无 LLM 时的占位分析：仅靠 URL/标题做粗判
  const url = source.url || '';
  const title = source.title || '';
  let sections = [];
  if (/clreq|typograph|font|type/i.test(url + title)) sections = ['typography'];
  else if (/color|palette/i.test(url + title)) sections = ['colors'];
  else if (/motion|animation|easing/i.test(url + title)) sections = ['motion'];
  else if (/voice|tone|writing/i.test(url + title)) sections = ['voice'];
  else if (/component|ui-?kit|design-?system/i.test(url + title)) sections = ['components'];
  else if (/persona|user|audience|target/i.test(url + title)) sections = ['users'];
  else sections = ['theme'];
  return {
    type: source.type === 'github' ? 'library' : 'article',
    summary: `本地兜底分析 · ${title || url}。请配置 LLM API 后重新分析以获得详细映射。`,
    brand_sections: sections,
    key_takeaways: ['（未配置 LLM）请到 Settings 填写 API key 后重新分析。'],
    applicable_rules: [],
    suggested_brand_updates: [],
    risk_or_caveats: '本地兜底分析无法识别具体规则，仅做模块归类。',
  };
}

function stripFence(text) {
  // 移除常见 ``` 包裹
  let t = text.trim();
  const fence = /^```(?:[a-zA-Z]+)?\n([\s\S]*?)\n```$/m;
  const m = t.match(fence);
  if (m) return m[1].trim();
  return t;
}

window.Api = Api;
