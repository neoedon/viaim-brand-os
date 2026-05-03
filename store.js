/* =========================================================
   store.js
   状态管理 + 持久化（localStorage + IndexedDB for binary）
   按 PRD §6 数据模型实现 schema
   ========================================================= */

const STORAGE_KEYS = {
  brands: 'viaim_brand_os.brands',
  currentBrandId: 'viaim_brand_os.current_brand_id',
  currentVersion: 'viaim_brand_os.current_version',
  assets: 'viaim_brand_os.assets',
  outputs: 'viaim_brand_os.outputs',
  settings: 'viaim_brand_os.settings',
  templates: 'viaim_brand_os.templates_user',
  sources: 'viaim_brand_os.sources',
  launchPlans: 'viaim_brand_os.launch_plans',
  currentLaunchId: 'viaim_brand_os.current_launch_id',
};

const ENUMS = {
  product: ['aura', 'mate', 'viaim_general', 'none'],
  angle: ['front', '45', 'side', 'top', 'exploded', 'scene'],
  colorway: ['obsidian', 'pearl', 'sand', 'custom'],
  scene: ['desk', 'travel', 'meeting', 'lifestyle', 'plain'],
  use_scope: ['marketing', 'internal_only', 'legal_review'],
  format: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'psd', 'obj', 'fbx', 'gltf'],
  source_type: ['url', 'github', 'article', 'snippet', 'tool'],
  source_status: ['inbox', 'fetched', 'analyzing', 'reviewed', 'applied', 'rejected'],
  // Brand Source 9 段，用于灵感池标注「适用到哪一段」
  brand_sections: ['theme', 'colors', 'typography', 'spacing', 'components', 'motion', 'voice', 'marks', 'dont', 'users', 'product', 'naming', 'localization', 'use_cases', 'value_proposition'],
  // 上市规划资产分类
  launch_asset_category: ['style', 'render', 'kv', 'pdp', 'ad', 'flyer', 'tvc', 'social', 'other'],
  launch_asset_status: ['planning', 'in_progress', 'review', 'done', 'blocked'],
  launch_reuse_type: ['derive', 'crop', 'translate', 'remix', 'depend'],
};

// =================== UTIL ===================
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const nowIso = () => new Date().toISOString();
const clone = (obj) => JSON.parse(JSON.stringify(obj));

const lsGet = (key, fallback = null) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch (e) {
    console.warn('lsGet failed', key, e);
    return fallback;
  }
};
const lsSet = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('lsSet failed', key, e); }
};

// =================== INDEXEDDB (for asset binary) ===================
const DB_NAME = 'viaim_brand_os_files';
const DB_STORE = 'files';
let _dbPromise = null;
function getDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}
async function dbPut(key, blob) {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(blob, key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}
async function dbGet(key) {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(key);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
}
async function dbDelete(key) {
  const db = await getDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete = () => res(true);
    tx.onerror = () => rej(tx.error);
  });
}

// =================== SEED DATA ===================
function seedBrand() {
  return {
    id: 'viaim_main',
    workspace_id: 'viaim',
    label: 'viaim 主品牌',
    versions: [
      {
        version: '1.0.0',
        status: 'published', // draft | published | deprecated
        published_at: nowIso(),
        published_by: 'system',
        change_note: '种子版本（来自 PRD 推荐配置）',
        data: {
          visual_theme: {
            atmosphere: 'Calm-tech 安静感、克制留白、技术精度',
            density: 'low',
            references: [],
          },
          colors: {
            tokens: [
              { name: 'primary', hex: '#18181b', role: 'text-default' },
              { name: 'accent', hex: '#b8410c', role: 'action-primary' },
              { name: 'paper', hex: '#f7f5f0', role: 'background' },
              { name: 'card', hex: '#ffffff', role: 'surface' },
              { name: 'ink-mid', hex: '#52525b', role: 'text-secondary' },
              { name: 'line', hex: '#d4d4d8', role: 'divider' },
              { name: 'success', hex: '#4d7c0f', role: 'state-success' },
              { name: 'danger', hex: '#b91c1c', role: 'state-danger' },
            ],
            aliases: { brand: 'accent' },
          },
          typography: {
            families: { display: 'Geist', body: 'Geist', cn: 'PingFang SC' },
            scale: [11, 12, 13, 14, 15, 18, 22, 28, 40],
            weights: [400, 500, 600, 700],
            line_heights: { tight: 1.2, base: 1.55, loose: 1.7 },
          },
          spacing: { base: 4, scale: [2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64] },
          components: {
            button: { radius: 6, height: 32, padding_x: 14 },
            card: { radius: 8, padding: 18 },
            input: { radius: 5, height: 34 },
          },
          motion: { duration: { fast: 120, base: 180, slow: 280 }, easing: 'cubic-bezier(0.16,1,0.3,1)' },
          voice: {
            tone: '克制 · 冷静 · 技术感',
            do: ['用动词开头', '量化收益', '保留专业术语'],
            dont: ['过度热情', '营销话术', '过多感叹号'],
          },
          brand_marks: {
            wordmark_text: 'viaim',
            safe_zone_ratio: 0.5,
            min_height_px: 24,
            variants: [],
          },
          dont: [
            { rule: '禁止在主色与红色叠加文字', reason: '可读性失效' },
            { rule: '禁止把 logo 缩放到 24px 以下', reason: '识别度丢失' },
          ],
          users: {
            primary_persona: {
              label: '高频会议人士',
              age: '28-50',
              description: '每天会议 ≥ 3 小时，手边常备纸笔但很少翻；说要跟进的事，会后记不清是谁说的',
              scenes: ['会议记录', '差旅整理', '通话沟通', '一对一对话'],
              needs: ['高效捕捉口头信息', 'AI 自动整理', '跨场次回溯', '生成跟进材料'],
              pain_points: ['手写跟不上', '会后整理耗时', '想回放却不知在哪段录音'],
              values: ['效率', '克制', '隐私', '专业感'],
            },
            secondary_personas: [
              {
                label: '信息精确记录者',
                age: '24-45',
                description: '记者 / 律师 / 研究员 · 习惯录音，但整理是最大负担；信息准确性要求极高',
                scenes: ['采访', '调研', '法律会谈', '现场速记'],
                needs: ['高精度转写', '完整时间戳', '关键句提取', '素材沉淀'],
                pain_points: ['录音有了但没时间听', '错过细节会出大问题'],
                values: ['准确', '完整', '可溯源'],
              },
              {
                label: '跨语言工作者',
                age: '26-50',
                description: '频繁使用非母语开会 · 需要向本地团队同步内容',
                scenes: ['跨语言会议', '海外谈判', '多语种采访'],
                needs: ['同传 / 翻译', '多语种转写', '术语统一'],
                pain_points: ['跨语言会议总觉得没抓住所有信息'],
                values: ['完整性', '语境保留'],
              },
              {
                label: '决策积累者',
                age: '32-55',
                description: '高频经历结构相似的对话（投资 / 招聘 / 销售）· 需要跨场次归纳',
                scenes: ['投资判断', '候选人面试', '客户访谈'],
                needs: ['跨记录归纳', '横向比较', '基于历史的洞察'],
                pain_points: ['见过太多了，但说不清核心差异在哪'],
                values: ['沉淀', '可对比', '可追问'],
              },
            ],
            anti_personas: [
              { label: '追求炫目特效的潮人', reason: '与品牌「calm-tech · 克制」相悖' },
              { label: '消费级娱乐音质追求者', reason: 'viaim 不主打 hi-fi，是商务专注工具' },
              { label: '只用免费软件的轻度用户', reason: '订阅模型不匹配' },
            ],
          },

          // §11 Product Architecture · 产品架构
          product: {
            hardware_lines: [
              { id: 'pro', label: '入耳式耳机 · Pro', positioning: '旗舰移动方案 · 主打降噪、闪录、全天续航', key_scenes: ['出差', '通勤', '线下会议'] },
              { id: 'air', label: '开放式耳机 · Air', positioning: '舒适全天候方案 · 兼顾工作与生活', key_scenes: ['办公室', '不愿频繁摘戴'] },
              { id: 'kit', label: '电脑外置麦 · Kit', positioning: '桌面固定方案 · 不需佩戴，插 USB 即录', key_scenes: ['电脑通话', '音视频录制'] },
            ],
            software_platforms: [
              { id: 'ios', label: 'iOS', capability: 'record + view', region: 'all', min_ver_cn: '13.0', min_ver_overseas: '15.0' },
              { id: 'android', label: 'Android', capability: 'record + view', region: 'all', min_ver: '7.0' },
              { id: 'harmony', label: '鸿蒙', capability: 'record + view', region: 'cn', min_ver: '5.0' },
              { id: 'windows', label: 'Windows', capability: 'record + view (with Kit)', region: 'all', min_ver: '10' },
              { id: 'macos', label: 'macOS', capability: 'record + view (with Kit)', region: 'all', min_ver_cn: '13.0', min_ver_overseas: '10.15' },
              { id: 'web', label: 'Web', capability: 'view only', region: 'all' },
            ],
            ai_engines: [
              { id: 'vitana', label: 'Vitana', region: 'overseas', role: 'AI 助手 / 对话 / 知识沉淀' },
              { id: 'wanmu', label: '万姆', region: 'cn', role: '同上 · 国内对应' },
            ],
            flagship_features: [
              { id: 'flash_rec', label: '闪录', description: '耳机内独立录音，无需 App 在手' },
              { id: 'space', label: '空间', description: '把同一项目的录音和外部文档汇聚在一起，AI 同时读取' },
              { id: 'sim_translation', label: '同传', region: 'overseas' },
              { id: 'voice_replace', label: '语音嘴替', region: 'cn' },
            ],
          },

          // §12 Naming Conventions · 命名规范
          naming: {
            brand_pair: { cn: 'iFLYBUDS', overseas: 'viaim' },
            product_naming: {
              cn_pattern: '{品牌} {系列} {版本号}  · 例 iFLYBUDS Pro 3',
              overseas_pattern: '{品牌} {专属名}        · 例 viaim Recdot',
            },
            product_pairs: [
              { type: 'pro', cn: 'iFLYBUDS Pro 3 / Pro 2', overseas: 'viaim Recdot' },
              { type: 'air', cn: 'iFLYBUDS Air 2', overseas: 'viaim OpenNote' },
              { type: 'kit', cn: 'viaim Kit 2', overseas: 'viaim NoteKit' },
            ],
            feature_pairs: [
              { cn: '闪录', overseas: 'FlashRec', notes: '耳机本地录音' },
              { cn: '空间', overseas: 'Space', notes: '项目级聚合' },
              { cn: '万姆', overseas: 'Vitana', notes: 'AI 对话' },
              { cn: '同传', overseas: 'Live Translation', notes: '海外限定' },
              { cn: '语音嘴替', overseas: 'Voice Surrogate', notes: '国内限定' },
            ],
            rules: [
              '英文专属产品名首字母大写，无空格 (Recdot / OpenNote / NoteKit)',
              '版本号用阿拉伯数字 (Pro 3, Air 2)，不用罗马数字',
              '功能名英中文均存在双区映射表，请全文统一',
              '禁止中英混杂：避免 "viaim 闪录"，应统一用 "viaim FlashRec" 或 "iFLYBUDS 闪录"',
            ],
          },

          // §13 Localization · 地域差异
          localization: {
            scope_markers: { universal: '通用', cn: '🇨🇳 国内', overseas: '🌍 海外' },
            documentation_rule: '所有面向用户/agency 的文档需明确「适用范围」标注；功能描述前置 🇨🇳/🌍/通用 标识',
            feature_diff: [
              { feature: '空间 (Space)', cn: '仅 Web 端', overseas: '全平台' },
              { feature: '同传', cn: '不支持', overseas: '支持' },
              { feature: '语音嘴替', cn: '支持', overseas: '不支持' },
              { feature: 'AI 助手品牌名', cn: '万姆', overseas: 'Vitana' },
              { feature: '订阅档位', cn: '单档', overseas: 'Basic / Pro / Ultra' },
            ],
            subscription: {
              cn: { tiers: ['未分档'], notes: '国内订阅策略待定' },
              overseas: {
                tiers: [
                  { id: 'basic', label: 'Basic', positioning: '入门 · 免费/低价' },
                  { id: 'pro', label: 'Pro', positioning: '专业 · 全功能解锁' },
                  { id: 'ultra', label: 'Ultra', positioning: '深度用户 · 最大额度' },
                ],
                notes: 'Premium 颜色 (#d0aa72 金色) 仅用于 Pro/Ultra feature 提示',
              },
            },
          },

          // §14 Use Cases · 业务场景
          use_cases: {
            business_scenarios: [
              { id: 'meeting', label: '会议', density: 'high', typical_dur: '30-90min', stakeholders: '2-15' },
              { id: 'call', label: '通话', density: 'medium', typical_dur: '10-60min', stakeholders: '2' },
              { id: 'interview', label: '采访', density: 'high', typical_dur: '45-120min', stakeholders: '2-5' },
              { id: 'negotiation', label: '谈判', density: 'high', typical_dur: '60-180min', stakeholders: '2-10' },
              { id: 'lecture', label: '讲座 / 培训', density: 'medium', typical_dur: '60-120min', stakeholders: '5-100+' },
              { id: 'one_on_one', label: '一对一沟通', density: 'medium', typical_dur: '30-60min', stakeholders: '2' },
            ],
            physical_contexts: ['办公室', '会议室', '咖啡厅', '出租车 / 通勤', '出差 / 酒店', '机场 / 高铁', '现场（户外）'],
            recording_modes: [
              { id: 'call', label: '通话录音', input: '耳机' },
              { id: 'av', label: '音视频录音', input: '耳机' },
              { id: 'live', label: '现场录音', input: '耳机' },
              { id: 'sim_trans', label: '同传录音', input: '耳机', region: 'overseas' },
              { id: 'face2face_trans', label: '面对面翻译', input: '耳机' },
              { id: 'call_trans', label: '通话翻译', input: '耳机' },
              { id: 'kit_record', label: 'Kit 桌面录音', input: 'Kit USB' },
            ],
          },

          // §15 Value Proposition · 核心价值
          value_proposition: {
            one_liner: '把对话变成可用的结果',
            promise: 'viaim 让你说过的话不再消失。开会、通话、采访、谈判，全程自动记录，AI 替你整理、总结、提炼，让对话沉淀为可调取、可追问、可生产的知识资产。',
            four_step_model: [
              { step: '捕捉', tagline: '让记录自动发生', detail: '戴耳机 / 一键 / 不需联网 / 不需提前准备' },
              { step: '整理', tagline: '会议结束，整理也结束', detail: '转写 + 摘要 + 待办 + 思维导图，走出会议室时已生成' },
              { step: '聚合', tagline: '围绕项目汇聚所有信息', detail: '空间功能：录音 + 外部文档 + AI 同时读取' },
              { step: '转化', tagline: '让过去对话持续产生新价值', detail: 'Vitana / 万姆：追问、归纳、生产报告 / 邮件 / 分析' },
            ],
            differentiators: [
              '不是录音笔 · 是知识沉淀工具',
              '不是查询工具 · 是有完整上下文的工作伙伴',
              '不是增加记录负担 · 是消灭记录负担',
            ],
            anti_positions: [
              '不主打消费级娱乐音质 · 商务专注',
              '不靠云端等待 · 强调闪录 / 离线可用',
              '不冷冰冰 · "calm-tech" 而非 "tech for tech\'s sake"',
            ],
          },

          // 自由扩展位（每段都可补 extras 自由 KV，spec 视图自动渲染）
          extras: {},
        },
      },
    ],
  };
}

function seedSettings() {
  return {
    llm: {
      provider: 'openai', // 'openai' | 'anthropic' | 'custom'
      endpoint: 'https://api.openai.com/v1',
      api_key: '',
      model: 'gpt-4o-mini',
    },
    embedding: {
      enabled: false,
      endpoint: 'https://api.openai.com/v1',
      api_key: '',
      model: 'text-embedding-3-small',
    },
    image: {
      enabled: false,
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1/images/generations',
      api_key: '',
      model: 'dall-e-3',
    },
    fetch: {
      // 灵感池抓取代理：默认用 Jina Reader（无需鉴权，绕过 CORS，返回 Markdown）
      // 也可以改成自建代理或其他 reader 服务
      reader_endpoint: 'https://r.jina.ai/',
      max_chars: 8000,           // 抓取后截断的最大字符数
      llm_truncate_chars: 5000,  // 投喂 LLM 时再截断
    },
    behaviour: {
      offline_fallback: true,    // 无 API key 时启用本地模板兜底
      auto_archive: true,        // 生成后自动归档
      lint_on_generate: true,    // 生成时自动跑 lint
      auto_fetch_on_paste: true, // 粘贴 URL 自动抓取
    },
    nodeGraph: seedNodeGraph(),  // 节点关系图：哪些 brand 段影响哪些 LLM prompt / output
  };
}

// 默认节点关系图：基于当前实现的真实依赖
// 节点：brand 段（15 个）+ LLM prompts（4 个）+ outputs（4 档产物）
// 边：每条 LLM prompt 节点列出影响它的 brand 段及权重 0..1
function seedNodeGraph() {
  const ALL_BRAND = ['theme', 'colors', 'typography', 'spacing', 'components', 'motion', 'voice', 'marks', 'dont', 'users', 'product', 'naming', 'localization', 'use_cases', 'value_proposition'];
  const nodes = [
    ...ALL_BRAND.map((s) => ({ id: `brand.${s}`, type: 'brand_section', label: brandLabel(s) })),
    { id: 'prompt.l1_system', type: 'llm_prompt', label: 'L1 Prompt · System', format: 'engineering prompt（Midjourney/SDXL/Flux 友好）' },
    { id: 'prompt.l2_system', type: 'llm_prompt', label: 'L2 Mini MD · System', format: 'design brief Markdown（600-1000 字 · 中文）' },
    { id: 'prompt.l5_ui', type: 'llm_prompt', label: 'L5 UI · System', format: '完整 HTML 原型稿 · 含设备框 · 单/多屏' },
    { id: 'prompt.l6_ppt', type: 'llm_prompt', label: 'L6 PPT · System', format: '品牌幻灯片 HTML deck · 16:9 · 多版式' },
    { id: 'prompt.inbox_analyze', type: 'llm_prompt', label: '灵感池分析 · System', format: 'JSON {summary, brand_sections, key_takeaways, ...}' },
    { id: 'prompt.cmdk_intent', type: 'llm_prompt', label: '⌘K 意图识别', format: 'JSON {action, route, tab, template, note}' },
    { id: 'output.l1', type: 'output', label: 'L1 产物 · Engineering Prompt' },
    { id: 'output.l2', type: 'output', label: 'L2 产物 · Mini MD brief' },
    { id: 'output.l3', type: 'output', label: 'L3 产物 · 模板渲染' },
    { id: 'output.l4', type: 'output', label: 'L4 产物 · 媒体（图像/视频/音频）' },
    { id: 'output.l5', type: 'output', label: 'L5 产物 · UI 原型稿' },
    { id: 'output.l6', type: 'output', label: 'L6 产物 · 品牌幻灯片' },
  ];

  // 默认权重（基于实操经验，可在 settings 中调）
  const w = (from, to, weight) => ({ from, to, weight });
  const edges = [
    // L1 prompt（视觉/产物倾向）
    w('brand.theme', 'prompt.l1_system', 0.95),
    w('brand.colors', 'prompt.l1_system', 0.85),
    w('brand.typography', 'prompt.l1_system', 0.4),
    w('brand.voice', 'prompt.l1_system', 0.7),
    w('brand.marks', 'prompt.l1_system', 0.6),
    w('brand.users', 'prompt.l1_system', 0.9),
    w('brand.use_cases', 'prompt.l1_system', 0.8),
    w('brand.product', 'prompt.l1_system', 0.5),
    w('brand.value_proposition', 'prompt.l1_system', 0.6),
    w('brand.dont', 'prompt.l1_system', 0.7),

    // L2 prompt（design brief）
    w('brand.theme', 'prompt.l2_system', 0.7),
    w('brand.colors', 'prompt.l2_system', 0.7),
    w('brand.typography', 'prompt.l2_system', 0.6),
    w('brand.spacing', 'prompt.l2_system', 0.4),
    w('brand.voice', 'prompt.l2_system', 0.95),
    w('brand.users', 'prompt.l2_system', 0.95),
    w('brand.product', 'prompt.l2_system', 0.85),
    w('brand.naming', 'prompt.l2_system', 0.85),
    w('brand.localization', 'prompt.l2_system', 0.8),
    w('brand.use_cases', 'prompt.l2_system', 0.75),
    w('brand.value_proposition', 'prompt.l2_system', 0.85),

    // 灵感池分析
    w('brand.theme', 'prompt.inbox_analyze', 0.7),
    w('brand.voice', 'prompt.inbox_analyze', 0.6),
    w('brand.users', 'prompt.inbox_analyze', 0.8),
    w('brand.product', 'prompt.inbox_analyze', 0.7),
    w('brand.value_proposition', 'prompt.inbox_analyze', 0.6),

    // ⌘K 意图（轻量，几乎不需要 brand 注入）
    // 留空 · 用户可自行连接

    // L5 UI prompt
    w('brand.theme', 'prompt.l5_ui', 0.9),
    w('brand.colors', 'prompt.l5_ui', 0.95),
    w('brand.typography', 'prompt.l5_ui', 0.85),
    w('brand.spacing', 'prompt.l5_ui', 0.75),
    w('brand.components', 'prompt.l5_ui', 0.95),
    w('brand.motion', 'prompt.l5_ui', 0.5),
    w('brand.voice', 'prompt.l5_ui', 0.7),
    w('brand.users', 'prompt.l5_ui', 0.85),
    w('brand.product', 'prompt.l5_ui', 0.85),
    w('brand.use_cases', 'prompt.l5_ui', 0.7),
    w('brand.dont', 'prompt.l5_ui', 0.6),

    // L6 PPT prompt
    w('brand.theme', 'prompt.l6_ppt', 0.95),
    w('brand.colors', 'prompt.l6_ppt', 0.9),
    w('brand.typography', 'prompt.l6_ppt', 0.95),
    w('brand.spacing', 'prompt.l6_ppt', 0.6),
    w('brand.components', 'prompt.l6_ppt', 0.5),
    w('brand.voice', 'prompt.l6_ppt', 0.85),
    w('brand.marks', 'prompt.l6_ppt', 0.7),
    w('brand.users', 'prompt.l6_ppt', 0.6),
    w('brand.value_proposition', 'prompt.l6_ppt', 0.85),
    w('brand.use_cases', 'prompt.l6_ppt', 0.5),
    w('brand.dont', 'prompt.l6_ppt', 0.5),

    // 产物链路
    w('prompt.l1_system', 'output.l1', 1.0),
    w('prompt.l2_system', 'output.l2', 1.0),
    w('prompt.l5_ui', 'output.l5', 1.0),
    w('prompt.l6_ppt', 'output.l6', 1.0),
  ];

  return { nodes, edges, threshold: 0.3 };
}

function brandLabel(s) {
  return ({
    theme: 'Theme · 视觉氛围',
    colors: 'Colors · 色板',
    typography: 'Typography · 字体',
    spacing: 'Spacing · 间距',
    components: 'Components · 组件',
    motion: 'Motion · 动效',
    voice: 'Voice · 语气',
    marks: 'Brand Marks · 标识',
    dont: "Don't · 反例",
    users: 'Users · 用户画像',
    product: 'Product · 产品架构',
    naming: 'Naming · 命名规范',
    localization: 'Localization · 地域差异',
    use_cases: 'Use Cases · 业务场景',
    value_proposition: 'Value · 核心价值',
  })[s] || s;
}

// =================== STORE FACADE ===================
const Store = {
  // ------------ Brand ------------
  getBrands() {
    let brands = lsGet(STORAGE_KEYS.brands);
    if (!brands || brands.length === 0) {
      brands = [seedBrand()];
      lsSet(STORAGE_KEYS.brands, brands);
      lsSet(STORAGE_KEYS.currentBrandId, brands[0].id);
      lsSet(STORAGE_KEYS.currentVersion, '1.0.0');
    }
    // 兼容老版本：把所有 version.data 走一遍 normalize，补齐缺失字段为正确 shape
    let mutated = false;
    for (const b of brands) {
      for (const v of (b.versions || [])) {
        if (normalizeBrandData(v.data || (v.data = {}))) mutated = true;
      }
    }
    if (mutated) lsSet(STORAGE_KEYS.brands, brands);
    return brands;
  },
  getCurrentBrand() {
    const all = this.getBrands();
    const id = lsGet(STORAGE_KEYS.currentBrandId, all[0].id);
    return all.find((b) => b.id === id) || all[0];
  },
  getCurrentVersionMeta() {
    const brand = this.getCurrentBrand();
    const ver = lsGet(STORAGE_KEYS.currentVersion, brand.versions[brand.versions.length - 1].version);
    return brand.versions.find((v) => v.version === ver) || brand.versions[brand.versions.length - 1];
  },
  setCurrentVersion(version) {
    lsSet(STORAGE_KEYS.currentVersion, version);
  },
  saveBrand(brand) {
    const all = this.getBrands();
    const idx = all.findIndex((b) => b.id === brand.id);
    if (idx === -1) all.push(brand);
    else all[idx] = brand;
    lsSet(STORAGE_KEYS.brands, all);
  },
  // 编辑当前 draft（如无 draft 则基于最新 published 创建）
  ensureDraft() {
    const brand = this.getCurrentBrand();
    let draft = brand.versions.find((v) => v.status === 'draft');
    if (!draft) {
      const latest = brand.versions[brand.versions.length - 1];
      const nextVer = bumpVersion(latest.version);
      draft = {
        version: nextVer,
        status: 'draft',
        published_at: null,
        published_by: null,
        change_note: '',
        data: clone(latest.data),
        based_on: latest.version,
      };
      brand.versions.push(draft);
      this.saveBrand(brand);
    }
    // 兼容老 draft：补齐缺失字段
    if (normalizeBrandData(draft.data)) this.saveBrand(brand);
    return { brand, draft };
  },
  saveDraftData(data, change_note) {
    const { brand, draft } = this.ensureDraft();
    draft.data = data;
    if (change_note !== undefined) draft.change_note = change_note;
    this.saveBrand(brand);
  },
  publishDraft() {
    const brand = this.getCurrentBrand();
    const draft = brand.versions.find((v) => v.status === 'draft');
    if (!draft) throw new Error('no draft to publish');
    draft.status = 'published';
    draft.published_at = nowIso();
    draft.published_by = 'local-user';
    this.saveBrand(brand);
    lsSet(STORAGE_KEYS.currentVersion, draft.version);
    return draft;
  },
  discardDraft() {
    const brand = this.getCurrentBrand();
    brand.versions = brand.versions.filter((v) => v.status !== 'draft');
    this.saveBrand(brand);
  },
  // 影响分析：多少历史产物引用了某 version
  impactAnalysis(version) {
    const outputs = this.getOutputs();
    const refs = outputs.filter((o) => o.refs && o.refs.brand_version === version);
    return { count: refs.length, items: refs.slice(0, 10) };
  },

  // ------------ Assets ------------
  getAssets() { return lsGet(STORAGE_KEYS.assets, []); },
  saveAssets(arr) { lsSet(STORAGE_KEYS.assets, arr); },
  async addAsset(meta, blob) {
    const id = uid('asset');
    const fileKey = `file_${id}`;
    if (blob) await dbPut(fileKey, blob);
    const record = {
      id,
      workspace_id: 'viaim',
      created_at: nowIso(),
      uploaded_by: 'local-user',
      file: {
        format: meta.format,
        width: meta.width || null,
        height: meta.height || null,
        size_bytes: meta.size_bytes || null,
        storage_key: blob ? fileKey : null,
        storage_url: meta.storage_url || null, // 当 blob 不存在时使用外链
        name: meta.name || '',
      },
      taxonomy: {
        product: meta.taxonomy.product || 'none',
        angle: meta.taxonomy.angle || null,
        colorway: meta.taxonomy.colorway || null,
        scene: meta.taxonomy.scene || null,
        hardware_rev: meta.taxonomy.hardware_rev || null,
        use_scope: meta.taxonomy.use_scope || 'internal_only',
      },
      tags: meta.tags || [],
      embedding: null, // populated via Settings.embedding when available
    };
    const all = this.getAssets();
    all.unshift(record);
    this.saveAssets(all);
    return record;
  },
  async getAssetBlob(asset) {
    if (!asset.file.storage_key) return null;
    return await dbGet(asset.file.storage_key);
  },
  async getAssetObjectUrl(asset) {
    if (asset.file.storage_url) return asset.file.storage_url;
    const blob = await this.getAssetBlob(asset);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },
  async deleteAsset(id) {
    const all = this.getAssets();
    const target = all.find((a) => a.id === id);
    if (target && target.file.storage_key) await dbDelete(target.file.storage_key);
    this.saveAssets(all.filter((a) => a.id !== id));
  },
  filterAssets({ product, angle, colorway, scene, q } = {}) {
    let list = this.getAssets();
    if (product) list = list.filter((a) => a.taxonomy.product === product);
    if (angle) list = list.filter((a) => a.taxonomy.angle === angle);
    if (colorway) list = list.filter((a) => a.taxonomy.colorway === colorway);
    if (scene) list = list.filter((a) => a.taxonomy.scene === scene);
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((a) => {
        const hay = [a.file.name, ...(a.tags || []), Object.values(a.taxonomy).filter(Boolean).join(' ')].join(' ').toLowerCase();
        return hay.includes(ql);
      });
    }
    return list;
  },

  // ------------ Outputs (Archive) ------------
  getOutputs() { return lsGet(STORAGE_KEYS.outputs, []); },
  saveOutputs(arr) { lsSet(STORAGE_KEYS.outputs, arr); },
  archiveOutput(payload) {
    const all = this.getOutputs();
    const record = {
      id: uid('out'),
      created_at: nowIso(),
      author: 'local-user',
      ...payload,
    };
    all.unshift(record);
    this.saveOutputs(all);
    return record;
  },
  removeOutput(id) {
    const all = this.getOutputs();
    this.saveOutputs(all.filter((o) => o.id !== id));
  },

  // ------------ Settings ------------
  getSettings() {
    let s = lsGet(STORAGE_KEYS.settings);
    if (!s) {
      s = seedSettings();
      lsSet(STORAGE_KEYS.settings, s);
    }
    // 兼容字段升级
    const seed = seedSettings();
    s = { ...seed, ...s, llm: { ...seed.llm, ...(s.llm || {}) }, embedding: { ...seed.embedding, ...(s.embedding || {}) }, image: { ...seed.image, ...(s.image || {}) }, behaviour: { ...seed.behaviour, ...(s.behaviour || {}) } };
    return s;
  },
  saveSettings(s) { lsSet(STORAGE_KEYS.settings, s); },

  // ------------ Launch Plans (上市规划) ------------
  getLaunchPlans() {
    let plans = lsGet(STORAGE_KEYS.launchPlans);
    if (!plans || plans.length === 0) {
      plans = [seedMateLaunch()];
      lsSet(STORAGE_KEYS.launchPlans, plans);
      lsSet(STORAGE_KEYS.currentLaunchId, plans[0].id);
    }
    return plans;
  },
  getCurrentLaunch() {
    const all = this.getLaunchPlans();
    const id = lsGet(STORAGE_KEYS.currentLaunchId, all[0]?.id);
    return all.find((p) => p.id === id) || all[0] || null;
  },
  setCurrentLaunch(id) { lsSet(STORAGE_KEYS.currentLaunchId, id); },
  saveLaunchPlans(arr) { lsSet(STORAGE_KEYS.launchPlans, arr); },
  saveLaunch(plan) {
    const all = this.getLaunchPlans();
    const idx = all.findIndex((p) => p.id === plan.id);
    plan.updated_at = nowIso();
    if (idx === -1) all.push(plan); else all[idx] = plan;
    this.saveLaunchPlans(all);
  },
  removeLaunch(id) {
    const all = this.getLaunchPlans().filter((p) => p.id !== id);
    this.saveLaunchPlans(all);
  },
  newLaunchAsset(plan, partial) {
    plan.assets = plan.assets || [];
    const a = {
      id: uid('la'),
      category: 'other',
      name: '新资产',
      regions: ['cn', 'overseas'],
      lead_time_days: 7,
      prep_end_offset: 14, // 上市前 N 天交付
      depends_on: [],
      reuse_from: [],
      status: 'planning',
      assignee: '',
      notes: '',
      ...partial,
    };
    plan.assets.push(a);
    return a;
  },

  // ------------ Sources (灵感池) ------------
  getSources() { return lsGet(STORAGE_KEYS.sources, []); },
  saveSources(arr) { lsSet(STORAGE_KEYS.sources, arr); },
  addSource(meta) {
    const id = uid('src');
    const record = {
      id,
      type: meta.type || detectSourceType(meta.url || '', meta.file?.name),
      url: meta.url || null,
      title: meta.title || (meta.url ? meta.url : meta.file?.name || '(粘贴片段)'),
      description: meta.description || '',
      content: meta.content || '',          // 抓取/读取到的正文（Markdown）
      raw_paste: meta.raw_paste || null,    // 用户直接粘贴的内容
      file: meta.file || null,              // {name, size, format} for uploaded files
      preview: meta.preview || null,        // {image, favicon}
      tags: meta.tags || [],                // 用户自由 tag
      brand_targets: meta.brand_targets || [], // 期望应用到哪些 brand 段
      status: meta.status || 'inbox',
      analysis: null,                       // LLM 输出
      applied_to: [],                       // 应用历史
      created_at: nowIso(),
      updated_at: nowIso(),
      fetched_at: meta.content ? nowIso() : null,
    };
    const all = this.getSources();
    all.unshift(record);
    this.saveSources(all);
    return record;
  },
  updateSource(id, patch) {
    const all = this.getSources();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch, updated_at: nowIso() };
    this.saveSources(all);
    return all[idx];
  },
  removeSource(id) {
    this.saveSources(this.getSources().filter((s) => s.id !== id));
  },
  getSource(id) {
    return this.getSources().find((s) => s.id === id) || null;
  },

  // ------------ Reset ------------
  factoryReset() {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    return getDb().then((db) => {
      return new Promise((res) => {
        const tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).clear();
        tx.oncomplete = () => res(true);
      });
    });
  },
};

function bumpVersion(v) {
  const [major, minor, patch] = v.split('.').map(Number);
  return `${major}.${minor + 1}.0`;
}

// 规范化 brand.data：补齐 15 段缺失字段、修正错误类型（数组应为 array、对象应为 object）
// 返回 true 表示有改动
function normalizeBrandData(d) {
  if (!d || typeof d !== 'object') return false;
  const state = { changed: false };

  // 通用助手：在 root 对象的 path（'a.b.c'）上确保是对象 / 数组
  const isPlainObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const ensureObj = (root, path) => {
    const keys = path.split('.');
    let t = root;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!isPlainObj(t[k])) { t[k] = {}; state.changed = true; }
      t = t[k];
    }
    const last = keys[keys.length - 1];
    if (!isPlainObj(t[last])) { t[last] = {}; state.changed = true; }
  };
  const ensureArr = (root, path) => {
    const keys = path.split('.');
    let t = root;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!isPlainObj(t[k])) { t[k] = {}; state.changed = true; }
      t = t[k];
    }
    const last = keys[keys.length - 1];
    if (!Array.isArray(t[last])) { t[last] = []; state.changed = true; }
  };

  // §1-§9
  ensureObj(d, 'visual_theme');
  ensureObj(d, 'colors');
  ensureArr(d, 'colors.tokens');
  ensureObj(d, 'colors.aliases');
  ensureObj(d, 'typography');
  ensureObj(d, 'typography.families');
  ensureArr(d, 'typography.scale');
  ensureArr(d, 'typography.weights');
  ensureObj(d, 'spacing');
  ensureArr(d, 'spacing.scale');
  ensureObj(d, 'components');
  ensureObj(d, 'components.button');
  ensureObj(d, 'components.card');
  ensureObj(d, 'components.input');
  ensureObj(d, 'motion');
  ensureObj(d, 'motion.duration');
  ensureObj(d, 'voice');
  ensureArr(d, 'voice.do');
  ensureArr(d, 'voice.dont');
  ensureObj(d, 'brand_marks');
  ensureArr(d, 'dont');

  // §10 Users
  ensureObj(d, 'users');
  ensureObj(d, 'users.primary_persona');
  ensureArr(d, 'users.primary_persona.scenes');
  ensureArr(d, 'users.primary_persona.needs');
  ensureArr(d, 'users.primary_persona.pain_points');
  ensureArr(d, 'users.primary_persona.values');
  ensureArr(d, 'users.secondary_personas');
  ensureArr(d, 'users.anti_personas');

  // §11 Product
  ensureObj(d, 'product');
  ensureArr(d, 'product.hardware_lines');
  ensureArr(d, 'product.software_platforms');
  ensureArr(d, 'product.ai_engines');
  ensureArr(d, 'product.flagship_features');

  // §12 Naming
  ensureObj(d, 'naming');
  ensureObj(d, 'naming.brand_pair');
  ensureObj(d, 'naming.product_naming');
  ensureArr(d, 'naming.product_pairs');
  ensureArr(d, 'naming.feature_pairs');
  ensureArr(d, 'naming.rules');

  // §13 Localization
  ensureObj(d, 'localization');
  ensureObj(d, 'localization.scope_markers');
  ensureArr(d, 'localization.feature_diff');
  ensureObj(d, 'localization.subscription');
  ensureObj(d, 'localization.subscription.cn');
  ensureObj(d, 'localization.subscription.overseas');
  ensureArr(d, 'localization.subscription.overseas.tiers');

  // §14 Use Cases
  ensureObj(d, 'use_cases');
  ensureArr(d, 'use_cases.business_scenarios');
  ensureArr(d, 'use_cases.physical_contexts');
  ensureArr(d, 'use_cases.recording_modes');

  // §15 Value Proposition
  ensureObj(d, 'value_proposition');
  ensureArr(d, 'value_proposition.four_step_model');
  ensureArr(d, 'value_proposition.differentiators');
  ensureArr(d, 'value_proposition.anti_positions');

  // extras 自由 KV
  ensureObj(d, 'extras');

  return state.changed;
}
window.normalizeBrandData = normalizeBrandData;

// =============== LAUNCH PLAN SEED · Mate 2026.09 ===============
function seedMateLaunch() {
  // 19 个资产 · 含 lead_time_days（备料周期）+ prep_end_offset（上市前 N 天交付）+ 依赖与复用关系
  const A = [
    // ========= 风格 / 起点 =========
    { id: 'style', category: 'style', name: '产品专属风格 spec', regions: ['cn', 'overseas'], lead_time_days: 14, prep_end_offset: 75, depends_on: [], reuse_from: [], status: 'planning', notes: '基于品牌源 §11 + viaim 主品牌系统 · 仅针对 Mate' },

    // ========= 渲染图（最依赖风格 spec）=========
    { id: 'render-std', category: 'render', name: '渲染图 · 常规角度（前/45/侧/顶）', regions: ['cn', 'overseas'], lead_time_days: 21, prep_end_offset: 50, depends_on: ['style'], reuse_from: ['style'], status: 'planning', notes: '4 角度 × 3 配色 = 12 图' },
    { id: 'render-creative', category: 'render', name: '渲染图 · 非常规角度（爆炸/微距/场景）', regions: ['cn', 'overseas'], lead_time_days: 21, prep_end_offset: 45, depends_on: ['style'], reuse_from: ['style'], status: 'planning', notes: 'KV / 创意广告用' },

    // ========= KV =========
    { id: 'kv-master', category: 'kv', name: 'KV · 主视觉', regions: ['cn', 'overseas'], lead_time_days: 14, prep_end_offset: 30, depends_on: ['style', 'render-creative'], reuse_from: ['render-creative'], status: 'planning', notes: '中英双语主 KV' },
    { id: 'kv-billboard', category: 'kv', name: 'KV · 灯箱 / 大屏适配', regions: ['cn', 'overseas'], lead_time_days: 7, prep_end_offset: 21, depends_on: ['kv-master'], reuse_from: ['kv-master'], status: 'planning', notes: '机场 / 地铁 / 户外 LED 多尺寸' },

    // ========= 商详（PDP）=========
    { id: 'pdp-website', category: 'pdp', name: '商详 · 独立站 PDP', regions: ['cn', 'overseas'], lead_time_days: 14, prep_end_offset: 21, depends_on: ['render-std', 'kv-master'], reuse_from: ['render-std', 'kv-master', 'style'], status: 'planning', notes: '中英文版本' },
    { id: 'pdp-tmall', category: 'pdp', name: '商详 · 天猫', regions: ['cn'], lead_time_days: 14, prep_end_offset: 14, depends_on: ['pdp-website', 'render-std'], reuse_from: ['pdp-website', 'render-std'], status: 'planning', notes: '天猫详情图（长图）' },
    { id: 'pdp-jd', category: 'pdp', name: '商详 · 京东', regions: ['cn'], lead_time_days: 14, prep_end_offset: 14, depends_on: ['pdp-website'], reuse_from: ['pdp-tmall', 'pdp-website'], status: 'planning', notes: '京东版式微调' },
    { id: 'pdp-douyin', category: 'pdp', name: '商详 · 抖音电商', regions: ['cn'], lead_time_days: 7, prep_end_offset: 10, depends_on: ['pdp-tmall'], reuse_from: ['pdp-tmall'], status: 'planning', notes: '抖音详情页 + 短视频卡片' },
    { id: 'pdp-amazon', category: 'pdp', name: '商详 · Amazon listing', regions: ['overseas'], lead_time_days: 14, prep_end_offset: 14, depends_on: ['pdp-website'], reuse_from: ['pdp-website', 'render-std'], status: 'planning', notes: 'A+ Content + 主图 7 张' },

    // ========= 广告投放 =========
    { id: 'ads-display', category: 'ad', name: '广告 · 信息流投放（多尺寸）', regions: ['cn', 'overseas'], lead_time_days: 10, prep_end_offset: 14, depends_on: ['kv-master', 'render-std'], reuse_from: ['kv-master', 'render-std'], status: 'planning', notes: '300×250 / 728×90 / 970×250 / 1200×628 / 1080×1080 / 1080×1920 共 12 尺寸' },
    { id: 'ads-search', category: 'ad', name: '广告 · 搜索 + SEM 物料', regions: ['cn', 'overseas'], lead_time_days: 7, prep_end_offset: 10, depends_on: ['kv-master'], reuse_from: ['ads-display'], status: 'planning', notes: '关键词文案 + 落地页缩略图' },

    // ========= 落地物料 / 多语言 =========
    { id: 'flyer-cn', category: 'flyer', name: '线下单页 · 中文', regions: ['cn'], lead_time_days: 7, prep_end_offset: 14, depends_on: ['kv-master', 'render-std'], reuse_from: ['kv-master', 'pdp-website'], status: 'planning', notes: 'A4 / 三折页' },
    { id: 'flyer-en', category: 'flyer', name: '线下单页 · 英文', regions: ['overseas'], lead_time_days: 10, prep_end_offset: 14, depends_on: ['flyer-cn'], reuse_from: ['flyer-cn'], status: 'planning', notes: '版式复用 · 文案翻译' },
    { id: 'flyer-jp', category: 'flyer', name: '线下单页 · 日文', regions: ['overseas'], lead_time_days: 10, prep_end_offset: 14, depends_on: ['flyer-en'], reuse_from: ['flyer-en'], status: 'planning', notes: '日本市场' },
    { id: 'flyer-de', category: 'flyer', name: '线下单页 · 德文', regions: ['overseas'], lead_time_days: 10, prep_end_offset: 14, depends_on: ['flyer-en'], reuse_from: ['flyer-en'], status: 'planning', notes: '欧洲市场' },

    // ========= TVC =========
    { id: 'tvc-script', category: 'tvc', name: 'TVC · 剧本 + storyboard', regions: ['cn', 'overseas'], lead_time_days: 21, prep_end_offset: 75, depends_on: ['style'], reuse_from: ['style'], status: 'planning', notes: '15s / 30s 双版本' },
    { id: 'tvc-prod', category: 'tvc', name: 'TVC · 拍摄 + 后期', regions: ['cn', 'overseas'], lead_time_days: 45, prep_end_offset: 30, depends_on: ['tvc-script', 'render-creative'], reuse_from: ['tvc-script'], status: 'planning', notes: '含外景 + 后期合成 + 调色 + 字幕' },

    // ========= 社交 =========
    { id: 'social-launch', category: 'social', name: '发布日社交连发 · 全平台', regions: ['cn', 'overseas'], lead_time_days: 7, prep_end_offset: 7, depends_on: ['kv-master', 'render-creative'], reuse_from: ['kv-master', 'render-creative'], status: 'planning', notes: '微博/IG/X/小红书 单图+轮播+短视频' },
  ];

  return {
    id: 'launch_mate_2026_09',
    name: 'Mate 2026 全球上市',
    product: 'mate',
    launch_date: '2026-09-15',
    regions: ['cn', 'overseas'],
    positioning: '商务录音麦克风 · 桌面方案 · viaim Mate / iFLYBUDS Mate',
    notes: '种子数据 · 19 个资产 · 含跨语言 / 跨平台 / 跨场景的复用关系',
    created_at: nowIso(),
    updated_at: nowIso(),
    assets: A,
  };
}

function detectSourceType(url, fileName) {
  if (fileName && /\.(md|markdown|mdx|txt)$/i.test(fileName)) return 'article';
  if (!url) return 'snippet';
  if (/github\.com\//i.test(url)) return 'github';
  if (/(npmjs|pypi|crates|huggingface|stackshare|producthunt)\.com\//i.test(url)) return 'tool';
  if (/\.(md|markdown|mdx|txt|pdf)(\?|$)/i.test(url)) return 'article';
  if (/^https?:/i.test(url)) return 'url';
  return 'snippet';
}
window.detectSourceType = detectSourceType;

// 暴露
window.Store = Store;
window.ENUMS = ENUMS;
window.uid = uid;
window.nowIso = nowIso;
window.clone = clone;
window.seedNodeGraph = seedNodeGraph;
window.brandLabel = brandLabel;
window.seedMateLaunch = seedMateLaunch;
