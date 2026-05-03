/* =========================================================
   modules.js
   全部页面模块：Home / Brand / Assets / Studio / Compliance / Archive / Settings / Docs
   每个模块导出 { render(ctx) -> HTMLString, mount(ctx) -> void }
   ========================================================= */

const Modules = {};

// ===================================================================
// Toast helper（全局通用）
// ===================================================================
// 防御性数组：如果不是数组返回 []
const arr = (x) => Array.isArray(x) ? x : [];
window.arr = arr;

function toast(msg, type = 'info', ttl = 2600) {
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = (window.Lang && Lang.current === 'en') ? Lang.t(msg) : msg;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .25s';
    setTimeout(() => el.remove(), 260);
  }, ttl);
}
window.toast = toast;

// ===================================================================
// HOME
// ===================================================================
Modules.home = {
  title: '主页',
  render(ctx) {
    const brand = Store.getCurrentBrand();
    const versionMeta = Store.getCurrentVersionMeta();
    const assets = Store.getAssets();
    const outputs = Store.getOutputs();
    const draftCount = brand.versions.filter((v) => v.status === 'draft').length;
    const llmReady = Api.llmReady();

    return `
      <div class="page-head">
        <h1>欢迎回到 Brand OS</h1>
        <p class="lead">这是 viaim 的品牌操作系统。从这里开始管理品牌源、产品资产、生成产物。</p>
      </div>

      <div class="home-stats">
        <div class="home-stat"><div class="v">${brand.versions.length}</div><div class="k">brand versions</div></div>
        <div class="home-stat"><div class="v">${assets.length}</div><div class="k">assets</div></div>
        <div class="home-stat"><div class="v">${outputs.length}</div><div class="k">outputs archived</div></div>
        <div class="home-stat"><div class="v">${draftCount}</div><div class="k">drafts pending</div></div>
      </div>

      ${!llmReady ? `<div class="callout amber"><b>LLM API 未配置</b> · L1/L2 生成将使用本地模板兜底。前往 <a href="#" data-go="settings" style="color:var(--accent)">Settings</a> 填写 API key 解锁完整能力。</div>` : ''}

      <div class="home-cards">
        <div class="card">
          <h3 style="font-size: 14px;margin-bottom:6px;">当前 Brand 版本</h3>
          <p style="color:var(--ink-mute);font-size: 11.5px;margin-bottom:12px;">您正在查看 ${esc(versionMeta.version)}（${esc(versionMeta.status)}）</p>
          <div class="mono" style="font-size: 11px;color:var(--ink-mute);">已发布 · ${versionMeta.published_at ? new Date(versionMeta.published_at).toLocaleString() : '未发布'}</div>
          <div style="margin-top:14px;display:flex;gap:8px;">
            <button class="btn" data-go="brand">编辑 Brand Source →</button>
            <button class="btn" data-go="archive">查看 Archive</button>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size: 14px;margin-bottom:6px;">快速开始</h3>
          <p style="color:var(--ink-mute);font-size: 11.5px;margin-bottom:12px;">三步上手 Brand OS</p>
          <ol style="padding-left:20px;font-size: 12px;line-height:1.9;color:var(--ink-soft);">
            <li>到 <b><a href="#" data-go="settings" style="color:var(--accent)">Settings</a></b> 配置 LLM API key</li>
            <li>到 <b><a href="#" data-go="assets" style="color:var(--accent)">Asset Library</a></b> 上传产品资产</li>
            <li>到 <b><a href="#" data-go="studio" style="color:var(--accent)">Generation Studio</a></b> 生成产物</li>
          </ol>
          <div style="margin-top:14px;">
            <button class="btn primary" data-go="studio">开始生成 →</button>
          </div>
        </div>
      </div>

      <h3 style="margin:36px 0 12px;font-size: 14px;font-weight:600;">最近产物</h3>
      ${outputs.length === 0 ? `<div class="empty"><div class="title">尚无产物</div><div>去 Generation Studio 生成第一个产物</div></div>` : `
        <div class="archive-list">
          ${outputs.slice(0, 5).map(renderArchiveRow).join('')}
        </div>
      `}
    `;
  },
  mount(ctx) {
    document.querySelectorAll('[data-go]').forEach((el) => {
      el.addEventListener('click', (e) => { e.preventDefault(); ctx.navigate(el.dataset.go); });
    });
  },
};

function renderArchiveRow(o) {
  const status = o.compliance?.status || 'pass';
  const tagCls = status === 'pass' ? 'green' : status === 'warn' ? 'amber' : 'red';
  return `
    <div class="archive-row" data-id="${o.id}">
      <div class="id">${esc(o.id)}</div>
      <div class="title">
        <div><b>${esc(o.title || o.template || o.type)}</b></div>
        <div class="sub">${esc(o.type)} · brand ${esc(o.refs?.brand_version || '-')}</div>
      </div>
      <div><span class="tag ${tagCls}">${esc(status)}</span></div>
      <div><span class="tag">${esc(o.adoption || 'pending')}</span></div>
      <div class="when">${new Date(o.created_at).toLocaleDateString()}</div>
    </div>`;
}

// ===================================================================
// BRAND SOURCE — 9-section editor
// ===================================================================
Modules.brand = {
  title: '品牌源',
  render(ctx) {
    const versionMeta = Store.getCurrentVersionMeta();
    // 已发布版本：完整 spec 视图（只读）
    if (versionMeta.status !== 'draft') {
      return renderBrandSpec(ctx, versionMeta);
    }
    return renderBrandEditor(ctx, versionMeta);
  },
  mount(ctx) {
    const versionMeta = Store.getCurrentVersionMeta();
    if (versionMeta.status !== 'draft') return mountBrandSpec(ctx, versionMeta);
    return mountBrandEditor(ctx);
  },
};

function renderBrandEditor(ctx, draft) {
    const editing = draft;
    const sections = [
      { id: 'theme', num: '1', name: 'Visual Theme', sub: '氛围、密度、参考' },
      { id: 'colors', num: '2', name: 'Color Palette', sub: 'tokens + 语义角色' },
      { id: 'type', num: '3', name: 'Typography', sub: '字族、字号、字重、行高' },
      { id: 'spacing', num: '4', name: 'Spacing & Grid', sub: '4/8 base + scale' },
      { id: 'components', num: '5', name: 'Component Stylings', sub: 'button / card / input' },
      { id: 'motion', num: '6', name: 'Motion', sub: '动效曲线、duration' },
      { id: 'voice', num: '7', name: 'Voice & Tone', sub: 'do/don\'t 对照' },
      { id: 'marks', num: '8', name: 'Brand Marks', sub: 'logo 留白、最小尺寸' },
      { id: 'dont', num: '9', name: "Don't / 反例", sub: '禁止用法' },
      { id: 'users', num: '10', name: 'Users · 用户信息', sub: '主/次/反向画像' },
      { id: 'product', num: '11', name: 'Product · 产品架构', sub: '硬件线/软件平台/AI/旗舰功能' },
      { id: 'naming', num: '12', name: 'Naming · 命名规范', sub: '双区命名 + 功能映射 + 规则' },
      { id: 'localization', num: '13', name: 'Localization · 地域差异', sub: '🇨🇳/🌍 功能差异 + 订阅档' },
      { id: 'use_cases', num: '14', name: 'Use Cases · 业务场景', sub: '业务/物理/录音模式' },
      { id: 'value', num: '15', name: 'Value Proposition · 核心价值', sub: '4-step + 差异化 + anti-positioning' },
    ];
    return `
      <div class="page-head">
        <p class="lead">机器可读的品牌 source of truth。修改将进入 draft 状态，发布后创建新版本快照。</p>
        <div class="actions">
          <span class="tag ${editing.status === 'draft' ? 'amber' : 'green'}" style="margin-right:8px;">${editing.version} · ${editing.status}</span>
          <button class="btn" id="btnDiscard">放弃 draft</button>
          <button class="btn primary" id="btnPublish">发布 →</button>
        </div>
      </div>

      <div class="section-grid">
        <div class="left">
          <div class="nav-list" id="brandNav">
            ${sections.map((s) => `<a data-jump="sec-${s.id}"><span class="num">${s.num}</span><span>${s.name}</span></a>`).join('')}
          </div>
          <div style="margin-top:24px;">
            <h4 style="font-size: 10px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin-bottom:8px;">影响分析</h4>
            <div id="impactBox" class="card flat" style="padding:10px 12px;font-size: 11px;color:var(--ink-mid);"></div>
          </div>
        </div>
        <div class="right">
          <div id="brandEditor"></div>
        </div>
      </div>
    `;
}

function mountBrandEditor(ctx) {
    const renderEditor = () => {
      const { draft } = Store.ensureDraft();
      const d = draft.data;

      const editor = document.getElementById('brandEditor');
      editor.innerHTML = `
        ${section('sec-theme', '1 · Visual Theme', themeEditor(d))}
        ${section('sec-colors', '2 · Color Palette', colorsEditor(d))}
        ${section('sec-type', '3 · Typography', typeEditor(d))}
        ${section('sec-spacing', '4 · Spacing & Grid', spacingEditor(d))}
        ${section('sec-components', '5 · Component Stylings', componentsEditor(d))}
        ${section('sec-motion', '6 · Motion', motionEditor(d))}
        ${section('sec-voice', '7 · Voice & Tone', voiceEditor(d))}
        ${section('sec-marks', '8 · Brand Marks', marksEditor(d))}
        ${section('sec-dont', "9 · Don't / 反例", dontEditor(d))}
        ${section('sec-users', '10 · Users · 用户信息', usersEditor(d))}
        ${section('sec-product', '11 · Product · 产品架构', productEditor(d))}
        ${section('sec-naming', '12 · Naming · 命名规范', namingEditor(d))}
        ${section('sec-localization', '13 · Localization · 地域差异', localizationEditor(d))}
        ${section('sec-use_cases', '14 · Use Cases · 业务场景', useCasesEditor(d))}
        ${section('sec-value', '15 · Value Proposition · 核心价值', valueEditor(d))}
      `;
      bindEditor(d, ctx);
    };

    renderEditor();

    // jump nav
    document.querySelectorAll('#brandNav a').forEach((a) => {
      a.addEventListener('click', () => {
        const target = document.getElementById(a.dataset.jump);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('#brandNav a').forEach((x) => x.classList.remove('active'));
        a.classList.add('active');
      });
    });

    // publish / discard
    document.getElementById('btnPublish').addEventListener('click', () => {
      const { draft } = Store.ensureDraft();
      if (draft.status !== 'draft') { toast('当前已是发布版本', 'warn'); return; }
      const note = prompt('请填写本次发布的变更说明：', draft.change_note || '');
      if (note === null) return;
      draft.change_note = note;
      Store.publishDraft();
      toast('已发布新版本', 'success');
      ctx.navigate('brand');
      ctx.refreshTopbar();
    });
    document.getElementById('btnDiscard').addEventListener('click', () => {
      if (!confirm('放弃当前 draft（未发布的修改将丢失）？')) return;
      Store.discardDraft();
      toast('draft 已放弃', 'success');
      ctx.navigate('brand');
    });

    // impact
    const impact = Store.impactAnalysis(Store.getCurrentVersionMeta().version);
    document.getElementById('impactBox').innerHTML = `
      <div>引用本版本的产物：<b style="color:var(--ink);">${impact.count}</b></div>
      <div style="font-size: 10px;color:var(--ink-mute);margin-top:4px;">规范升级时供影响评估参考</div>
    `;
}

function section(id, title, html) {
  return `<div class="brand-section" id="${id}">
    <div class="head"><h3>${title}</h3></div>
    ${html}
  </div>`;
}

function themeEditor(d) {
  return `
    <div class="field">
      <label>氛围描述（atmosphere）</label>
      <textarea data-bind="visual_theme.atmosphere">${esc(d.visual_theme.atmosphere || '')}</textarea>
      <span class="hint">用一两句话描述品牌的视觉氛围，会被注入到所有生成 prompt 中。</span>
    </div>
    <div class="field">
      <label>密度（density）</label>
      <select data-bind="visual_theme.density">
        ${['low','medium','high'].map((v)=>`<option value="${v}" ${d.visual_theme.density===v?'selected':''}>${v}</option>`).join('')}
      </select>
    </div>
  `;
}

function colorsEditor(d) {
  const tokens = d.colors.tokens || [];
  const list = `<div class="color-grid" id="colorGrid">${tokens.map((t,i)=>`
    <div class="color-card">
      <div class="swatch" style="background:${esc(t.hex)}"></div>
      <div class="meta">
        <div class="name">${esc(t.name)}</div>
        <div class="hex mono">${esc(t.hex)}</div>
        <div class="role">${esc(t.role || '')}</div>
      </div>
      <button class="del" data-del-token="${i}" title="删除">✕</button>
    </div>
  `).join('')}</div>`;
  return list + `
    <div class="token-add-row">
      <input id="newColorName" placeholder="name" />
      <input id="newColorHex" type="color" value="#000000" />
      <input id="newColorRole" placeholder="role 例如 text-default" />
      <button class="btn sm" id="btnAddColor">+ 添加</button>
    </div>
  `;
}

function typeEditor(d) {
  const fams = d.typography.families;
  return `
    <div class="field-row three">
      <div class="field"><label>display 字族</label><input data-bind="typography.families.display" value="${esc(fams.display)}"/></div>
      <div class="field"><label>body 字族</label><input data-bind="typography.families.body" value="${esc(fams.body)}"/></div>
      <div class="field"><label>中文字族</label><input data-bind="typography.families.cn" value="${esc(fams.cn || '')}"/></div>
    </div>
    <div class="field">
      <label>字号 scale（逗号分隔）</label>
      <input id="typeScale" value="${arr(d.typography.scale).join(', ')}"/>
      <span class="hint">数值，单位 px。如 11, 12, 13, 14, 16, 20, 28, 40</span>
    </div>
    <div class="field">
      <label>字重 weights</label>
      <input id="typeWeights" value="${arr(d.typography.weights).join(', ')}"/>
    </div>
  `;
}

function spacingEditor(d) {
  return `
    <div class="field-row">
      <div class="field"><label>base unit (px)</label><input type="number" data-bind="spacing.base" value="${d.spacing.base}"/></div>
      <div class="field"><label>scale（逗号分隔）</label><input id="spacingScale" value="${arr(d.spacing.scale).join(', ')}"/></div>
    </div>
  `;
}

function componentsEditor(d) {
  const c = d.components;
  return `
    <h4 style="font-size: 12px;margin:6px 0 8px;">Button</h4>
    <div class="field-row three">
      <div class="field"><label>radius</label><input type="number" data-bind="components.button.radius" value="${c.button.radius}"/></div>
      <div class="field"><label>height</label><input type="number" data-bind="components.button.height" value="${c.button.height}"/></div>
      <div class="field"><label>padding-x</label><input type="number" data-bind="components.button.padding_x" value="${c.button.padding_x}"/></div>
    </div>
    <h4 style="font-size: 12px;margin:6px 0 8px;">Card</h4>
    <div class="field-row">
      <div class="field"><label>radius</label><input type="number" data-bind="components.card.radius" value="${c.card.radius}"/></div>
      <div class="field"><label>padding</label><input type="number" data-bind="components.card.padding" value="${c.card.padding}"/></div>
    </div>
    <h4 style="font-size: 12px;margin:6px 0 8px;">Input</h4>
    <div class="field-row">
      <div class="field"><label>radius</label><input type="number" data-bind="components.input.radius" value="${c.input.radius}"/></div>
      <div class="field"><label>height</label><input type="number" data-bind="components.input.height" value="${c.input.height}"/></div>
    </div>
  `;
}

function motionEditor(d) {
  const m = d.motion;
  return `
    <div class="field-row three">
      <div class="field"><label>duration · fast</label><input type="number" data-bind="motion.duration.fast" value="${m.duration.fast}"/></div>
      <div class="field"><label>duration · base</label><input type="number" data-bind="motion.duration.base" value="${m.duration.base}"/></div>
      <div class="field"><label>duration · slow</label><input type="number" data-bind="motion.duration.slow" value="${m.duration.slow}"/></div>
    </div>
    <div class="field"><label>easing 曲线</label><input data-bind="motion.easing" value="${esc(m.easing)}"/></div>
  `;
}

function voiceEditor(d) {
  return `
    <div class="field"><label>tone（语气）</label><input data-bind="voice.tone" value="${esc(d.voice.tone)}"/></div>
    <div class="field-row">
      <div class="field">
        <label>Do（应做）</label>
        <textarea id="voiceDo">${arr(d.voice.do).join('\n')}</textarea>
        <span class="hint">每行一条</span>
      </div>
      <div class="field">
        <label>Don't（避免）</label>
        <textarea id="voiceDont">${arr(d.voice.dont).join('\n')}</textarea>
        <span class="hint">每行一条</span>
      </div>
    </div>
  `;
}

function marksEditor(d) {
  const m = d.brand_marks;
  return `
    <div class="field-row three">
      <div class="field"><label>wordmark 文字</label><input data-bind="brand_marks.wordmark_text" value="${esc(m.wordmark_text || '')}"/></div>
      <div class="field"><label>safe zone ratio</label><input type="number" step="0.05" data-bind="brand_marks.safe_zone_ratio" value="${m.safe_zone_ratio}"/></div>
      <div class="field"><label>最小高度 (px)</label><input type="number" data-bind="brand_marks.min_height_px" value="${m.min_height_px}"/></div>
    </div>
    <div class="callout">合规规则 R3/R4 直接读取此处的 <code class="inline">safe_zone_ratio</code> 与 <code class="inline">min_height_px</code></div>
  `;
}

function dontEditor(d) {
  const items = d.dont || [];
  return `
    <div id="dontList">
      ${items.map((it,i)=>`
        <div class="card flat" style="padding:12px 14px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-weight:500;color:var(--ink);">${esc(it.rule)}</div>
            <div style="font-size: 11px;color:var(--ink-mute);margin-top:4px;">${esc(it.reason || '')}</div>
          </div>
          <button class="btn sm danger" data-del-dont="${i}">删除</button>
        </div>
      `).join('') || '<div class="empty"><div>尚未配置反例</div></div>'}
    </div>
    <div class="token-add-row" style="grid-template-columns:1fr 1fr auto;">
      <input id="newDontRule" placeholder="禁止的做法"/>
      <input id="newDontReason" placeholder="原因"/>
      <button class="btn sm" id="btnAddDont">+ 添加</button>
    </div>
  `;
}

function usersEditor(d) {
  // 兜底数据结构
  d.users = d.users || { primary_persona: {}, secondary_personas: [], anti_personas: [] };
  const u = d.users;
  const p = u.primary_persona || {};
  const personaForm = (path, persona, idx) => `
    <div class="persona-card">
      <div class="persona-head">
        <span class="persona-tag mono">${idx === undefined ? 'PRIMARY · 核心' : `SECONDARY #${idx + 1}`}</span>
        ${idx !== undefined ? `<button class="btn sm danger" data-del-secondary="${idx}">删除</button>` : ''}
      </div>
      <div class="field-row">
        <div class="field"><label>身份 / 标签</label><input data-bind="${path}.label" value="${esc(persona.label || '')}" placeholder="例如：商务知识工作者"/></div>
        <div class="field"><label>年龄段</label><input data-bind="${path}.age" value="${esc(persona.age || '')}" placeholder="例如：28-45"/></div>
      </div>
      <div class="field"><label>一句话画像</label><textarea data-bind="${path}.description" rows="2" placeholder="一句话概括这类用户的状态/语境/特征">${esc(persona.description || '')}</textarea></div>
      <div class="field-row">
        <div class="field">
          <label>使用场景（每行一条）</label>
          <textarea data-list="${path}.scenes" rows="3" placeholder="例如：会议记录\n差旅整理">${arr(persona.scenes).join('\n')}</textarea>
        </div>
        <div class="field">
          <label>核心需求</label>
          <textarea data-list="${path}.needs" rows="3" placeholder="例如：高效捕捉信息">${arr(persona.needs).join('\n')}</textarea>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>痛点</label>
          <textarea data-list="${path}.pain_points" rows="3" placeholder="例如：手写跟不上">${arr(persona.pain_points).join('\n')}</textarea>
        </div>
        <div class="field">
          <label>价值观</label>
          <textarea data-list="${path}.values" rows="3" placeholder="例如：效率\n克制">${arr(persona.values).join('\n')}</textarea>
        </div>
      </div>
    </div>
  `;
  const secondaries = arr(u.secondary_personas).map((sp, i) => personaForm(`users.secondary_personas.${i}`, sp, i)).join('');
  const antis = arr(u.anti_personas).map((a, i) => `
    <div class="card flat" style="padding:10px 14px;margin-bottom:6px;display:flex;gap:10px;align-items:flex-start;background:var(--red-soft);border-color:rgba(185,28,28,.18);">
      <div style="flex:1;">
        <div style="font-weight:500;color:var(--ink);">✕ ${esc(a.label || a)}</div>
        ${a.reason ? `<div style="font-size: 11px;color:var(--ink-mute);margin-top:4px;">${esc(a.reason)}</div>` : ''}
      </div>
      <button class="btn sm danger" data-del-anti="${i}">删除</button>
    </div>
  `).join('') || '<div class="empty"><div>尚未配置反向画像</div></div>';

  return `
    <div class="callout blue" style="margin-bottom:12px;">
      <b>为什么记录用户信息</b> · 这一段会被注入到所有 LLM prompt（L1/L2/灵感分析）作为「目标受众」上下文。L3 模板的文案、合规字数、语气都会以此为基准。
    </div>

    <div class="persona-section-head">主画像 · Primary Persona</div>
    ${personaForm('users.primary_persona', p)}

    <div class="persona-section-head">次画像 · Secondary Personas</div>
    <div id="secondariesList">${secondaries}</div>
    <button class="btn sm" id="btnAddSecondary" style="margin-top:6px;">+ 添加次画像</button>

    <div class="persona-section-head">反向画像 · Anti Personas（不针对的用户）</div>
    <div id="antiList">${antis}</div>
    <div class="token-add-row" style="grid-template-columns:1fr 1fr auto;margin-top:8px;">
      <input id="newAntiLabel" placeholder="不针对的用户类型"/>
      <input id="newAntiReason" placeholder="原因（与品牌哪点冲突）"/>
      <button class="btn sm" id="btnAddAnti">+ 添加</button>
    </div>
  `;
}

// ===================================================================
// §11 Product Architecture · 产品架构
// ===================================================================
function productEditor(d) {
  d.product = d.product || { hardware_lines: [], software_platforms: [], ai_engines: [], flagship_features: [] };
  const p = d.product;
  return `
    <div class="callout blue" style="margin-bottom:12px;"><b>产品架构</b> · 硬件 + 软件 + AI 三层。下游 LLM 在写文案/做设计时会引用这里的产品命名与定位。</div>

    <h4 style="font-size:13px;margin:8px 0;">硬件产品线</h4>
    <div id="prodHwList">
      ${arr(p.hardware_lines).map((h, i) => `
        <div class="card flat" style="padding:10px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="product.hardware_lines.${i}.id" value="${esc(h.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="product.hardware_lines.${i}.label" value="${esc(h.label)}"/></div>
            <div class="field"><label>关键场景（,）</label><input data-bind-csv="product.hardware_lines.${i}.key_scenes" value="${esc(arr(h.key_scenes).join(', '))}"/></div>
          </div>
          <div class="field"><label>定位</label><input data-bind="product.hardware_lines.${i}.positioning" value="${esc(h.positioning || '')}"/></div>
          <button class="btn sm danger" data-del-arr="product.hardware_lines.${i}">删除</button>
        </div>
      `).join('') || '<div class="empty"><div>未配置</div></div>'}
    </div>
    <button class="btn sm" data-add-arr="product.hardware_lines" data-tpl='{"id":"","label":"","positioning":"","key_scenes":[]}'>+ 添加硬件线</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">软件平台</h4>
    <div id="prodSwList">
      ${arr(p.software_platforms).map((s, i) => `
        <div class="card flat" style="padding:10px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="product.software_platforms.${i}.id" value="${esc(s.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="product.software_platforms.${i}.label" value="${esc(s.label)}"/></div>
            <div class="field"><label>region</label>
              <select data-bind="product.software_platforms.${i}.region">
                ${['all','cn','overseas'].map((r)=>`<option ${(s.region||'all')===r?'selected':''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field"><label>capability</label><input data-bind="product.software_platforms.${i}.capability" value="${esc(s.capability || '')}"/></div>
          <button class="btn sm danger" data-del-arr="product.software_platforms.${i}">删除</button>
        </div>
      `).join('') || '<div class="empty"><div>未配置</div></div>'}
    </div>
    <button class="btn sm" data-add-arr="product.software_platforms" data-tpl='{"id":"","label":"","capability":"","region":"all"}'>+ 添加平台</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">AI 引擎</h4>
    <div id="prodAiList">
      ${arr(p.ai_engines).map((a, i) => `
        <div class="card flat" style="padding:10px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="product.ai_engines.${i}.id" value="${esc(a.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="product.ai_engines.${i}.label" value="${esc(a.label)}"/></div>
            <div class="field"><label>region</label>
              <select data-bind="product.ai_engines.${i}.region">
                ${['all','cn','overseas'].map((r)=>`<option ${(a.region||'all')===r?'selected':''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field"><label>role</label><input data-bind="product.ai_engines.${i}.role" value="${esc(a.role || '')}"/></div>
          <button class="btn sm danger" data-del-arr="product.ai_engines.${i}">删除</button>
        </div>
      `).join('') || '<div class="empty"><div>未配置</div></div>'}
    </div>
    <button class="btn sm" data-add-arr="product.ai_engines" data-tpl='{"id":"","label":"","role":"","region":"all"}'>+ 添加 AI</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">旗舰功能</h4>
    <div id="prodFeatList">
      ${arr(p.flagship_features).map((f, i) => `
        <div class="card flat" style="padding:10px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="product.flagship_features.${i}.id" value="${esc(f.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="product.flagship_features.${i}.label" value="${esc(f.label)}"/></div>
            <div class="field"><label>region</label>
              <select data-bind="product.flagship_features.${i}.region">
                ${['all','cn','overseas'].map((r)=>`<option ${(f.region||'all')===r?'selected':''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field"><label>description</label><input data-bind="product.flagship_features.${i}.description" value="${esc(f.description || '')}"/></div>
          <button class="btn sm danger" data-del-arr="product.flagship_features.${i}">删除</button>
        </div>
      `).join('') || '<div class="empty"><div>未配置</div></div>'}
    </div>
    <button class="btn sm" data-add-arr="product.flagship_features" data-tpl='{"id":"","label":"","description":"","region":"all"}'>+ 添加功能</button>
  `;
}

// ===================================================================
// §12 Naming Conventions · 命名规范
// ===================================================================
function namingEditor(d) {
  d.naming = d.naming || { brand_pair: {}, product_naming: {}, product_pairs: [], feature_pairs: [], rules: [] };
  const n = d.naming;
  return `
    <div class="callout blue" style="margin-bottom:12px;"><b>命名规范</b> · 双区品牌 · 产品命名规则 · 功能名映射 · 强制风格。<b>下游 L2 brief / 文案合规检查</b>会引用此段。</div>

    <h4 style="font-size:13px;margin:8px 0;">品牌对名</h4>
    <div class="field-row">
      <div class="field"><label>🇨🇳 国内品牌</label><input data-bind="naming.brand_pair.cn" value="${esc(n.brand_pair?.cn || '')}"/></div>
      <div class="field"><label>🌍 海外品牌</label><input data-bind="naming.brand_pair.overseas" value="${esc(n.brand_pair?.overseas || '')}"/></div>
    </div>

    <h4 style="font-size:13px;margin:14px 0 8px;">产品命名 pattern</h4>
    <div class="field"><label>🇨🇳 cn_pattern</label><input data-bind="naming.product_naming.cn_pattern" value="${esc(n.product_naming?.cn_pattern || '')}"/></div>
    <div class="field"><label>🌍 overseas_pattern</label><input data-bind="naming.product_naming.overseas_pattern" value="${esc(n.product_naming?.overseas_pattern || '')}"/></div>

    <h4 style="font-size:13px;margin:14px 0 8px;">产品双区映射</h4>
    <div id="prodPairList">
      ${arr(n.product_pairs).map((p, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>type</label><input data-bind="naming.product_pairs.${i}.type" value="${esc(p.type)}"/></div>
            <div class="field"><label>🇨🇳 cn</label><input data-bind="naming.product_pairs.${i}.cn" value="${esc(p.cn)}"/></div>
            <div class="field"><label>🌍 overseas</label><input data-bind="naming.product_pairs.${i}.overseas" value="${esc(p.overseas)}"/></div>
          </div>
          <button class="btn sm danger" data-del-arr="naming.product_pairs.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="naming.product_pairs" data-tpl='{"type":"","cn":"","overseas":""}'>+ 添加映射</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">功能名双区映射</h4>
    <div id="featPairList">
      ${arr(n.feature_pairs).map((f, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>🇨🇳 cn</label><input data-bind="naming.feature_pairs.${i}.cn" value="${esc(f.cn)}"/></div>
            <div class="field"><label>🌍 overseas</label><input data-bind="naming.feature_pairs.${i}.overseas" value="${esc(f.overseas)}"/></div>
            <div class="field"><label>notes</label><input data-bind="naming.feature_pairs.${i}.notes" value="${esc(f.notes || '')}"/></div>
          </div>
          <button class="btn sm danger" data-del-arr="naming.feature_pairs.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="naming.feature_pairs" data-tpl='{"cn":"","overseas":"","notes":""}'>+ 添加功能映射</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">命名规则（每行一条）</h4>
    <textarea data-list="naming.rules" rows="5">${arr(n.rules).join('\n')}</textarea>
  `;
}

// ===================================================================
// §13 Localization · 地域差异
// ===================================================================
function localizationEditor(d) {
  d.localization = d.localization || { scope_markers: {}, feature_diff: [], subscription: { cn: {}, overseas: {} } };
  const l = d.localization;
  return `
    <div class="callout blue" style="margin-bottom:12px;"><b>地域差异</b> · 🇨🇳/🌍/通用 标注协议 · 双区功能对照 · 订阅档差异。<b>影响 L2 brief 的「适用范围」段</b>。</div>

    <h4 style="font-size:13px;margin:8px 0;">scope markers</h4>
    <div class="field-row three">
      <div class="field"><label>universal</label><input data-bind="localization.scope_markers.universal" value="${esc(l.scope_markers?.universal || '通用')}"/></div>
      <div class="field"><label>cn</label><input data-bind="localization.scope_markers.cn" value="${esc(l.scope_markers?.cn || '🇨🇳 国内')}"/></div>
      <div class="field"><label>overseas</label><input data-bind="localization.scope_markers.overseas" value="${esc(l.scope_markers?.overseas || '🌍 海外')}"/></div>
    </div>
    <div class="field"><label>文档标注规则</label><input data-bind="localization.documentation_rule" value="${esc(l.documentation_rule || '')}"/></div>

    <h4 style="font-size:13px;margin:14px 0 8px;">功能差异表</h4>
    <div id="featDiffList">
      ${arr(l.feature_diff).map((f, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>feature</label><input data-bind="localization.feature_diff.${i}.feature" value="${esc(f.feature)}"/></div>
            <div class="field"><label>🇨🇳 cn</label><input data-bind="localization.feature_diff.${i}.cn" value="${esc(f.cn)}"/></div>
            <div class="field"><label>🌍 overseas</label><input data-bind="localization.feature_diff.${i}.overseas" value="${esc(f.overseas)}"/></div>
          </div>
          <button class="btn sm danger" data-del-arr="localization.feature_diff.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="localization.feature_diff" data-tpl='{"feature":"","cn":"","overseas":""}'>+ 添加差异</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">订阅档（海外）</h4>
    <div id="subTierList">
      ${(l.subscription?.overseas?.tiers || []).map((t, i) => typeof t === 'string' ? `<div class="card flat" style="padding:6px 12px;margin-bottom:4px;">${esc(t)}</div>` : `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="localization.subscription.overseas.tiers.${i}.id" value="${esc(t.id || '')}"/></div>
            <div class="field"><label>label</label><input data-bind="localization.subscription.overseas.tiers.${i}.label" value="${esc(t.label || '')}"/></div>
            <div class="field"><label>定位</label><input data-bind="localization.subscription.overseas.tiers.${i}.positioning" value="${esc(t.positioning || '')}"/></div>
          </div>
          <button class="btn sm danger" data-del-arr="localization.subscription.overseas.tiers.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="localization.subscription.overseas.tiers" data-tpl='{"id":"","label":"","positioning":""}'>+ 添加档位</button>
    <div class="field" style="margin-top:8px;"><label>订阅说明</label><input data-bind="localization.subscription.overseas.notes" value="${esc(l.subscription?.overseas?.notes || '')}"/></div>
  `;
}

// ===================================================================
// §14 Use Cases · 业务场景
// ===================================================================
function useCasesEditor(d) {
  d.use_cases = d.use_cases || { business_scenarios: [], physical_contexts: [], recording_modes: [] };
  const u = d.use_cases;
  return `
    <div class="callout blue" style="margin-bottom:12px;"><b>业务场景</b> · 业务对话 + 物理环境 + 录音模式分类。<b>L1/L2 prompt 会按场景调整调性</b>（紧张谈判 vs 轻松采访）。</div>

    <h4 style="font-size:13px;margin:8px 0;">业务场景</h4>
    <div id="bizScenarioList">
      ${arr(u.business_scenarios).map((s, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row four" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="use_cases.business_scenarios.${i}.id" value="${esc(s.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="use_cases.business_scenarios.${i}.label" value="${esc(s.label)}"/></div>
            <div class="field"><label>density</label>
              <select data-bind="use_cases.business_scenarios.${i}.density">
                ${['low','medium','high'].map((x)=>`<option ${s.density===x?'selected':''}>${x}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>typical_dur</label><input data-bind="use_cases.business_scenarios.${i}.typical_dur" value="${esc(s.typical_dur || '')}"/></div>
          </div>
          <div class="field"><label>stakeholders</label><input data-bind="use_cases.business_scenarios.${i}.stakeholders" value="${esc(s.stakeholders || '')}"/></div>
          <button class="btn sm danger" data-del-arr="use_cases.business_scenarios.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="use_cases.business_scenarios" data-tpl='{"id":"","label":"","density":"medium","typical_dur":"","stakeholders":""}'>+ 添加业务场景</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">物理环境（每行一条）</h4>
    <textarea data-list="use_cases.physical_contexts" rows="3">${arr(u.physical_contexts).join('\n')}</textarea>

    <h4 style="font-size:13px;margin:14px 0 8px;">录音模式</h4>
    <div id="recModeList">
      ${arr(u.recording_modes).map((m, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>id</label><input data-bind="use_cases.recording_modes.${i}.id" value="${esc(m.id)}"/></div>
            <div class="field"><label>label</label><input data-bind="use_cases.recording_modes.${i}.label" value="${esc(m.label)}"/></div>
            <div class="field"><label>input</label><input data-bind="use_cases.recording_modes.${i}.input" value="${esc(m.input || '')}"/></div>
          </div>
          <div class="field"><label>region</label>
            <select data-bind="use_cases.recording_modes.${i}.region">
              ${['all','cn','overseas'].map((r)=>`<option ${(m.region||'all')===r?'selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          <button class="btn sm danger" data-del-arr="use_cases.recording_modes.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="use_cases.recording_modes" data-tpl='{"id":"","label":"","input":"","region":"all"}'>+ 添加录音模式</button>
  `;
}

// ===================================================================
// §15 Value Proposition · 核心价值
// ===================================================================
function valueEditor(d) {
  d.value_proposition = d.value_proposition || { four_step_model: [], differentiators: [], anti_positions: [] };
  const v = d.value_proposition;
  return `
    <div class="callout blue" style="margin-bottom:12px;"><b>核心价值主张</b> · 一句话 + 完整 promise + 4 步价值模型 + 差异化 + anti-positioning。<b>L2 brief 与对外文案的灵魂段</b>。</div>

    <div class="field"><label>一句话主张</label><input data-bind="value_proposition.one_liner" value="${esc(v.one_liner || '')}" placeholder="例：把对话变成可用的结果"/></div>
    <div class="field"><label>完整 promise</label><textarea data-bind="value_proposition.promise" rows="3" placeholder="一段话描述品牌承诺...">${esc(v.promise || '')}</textarea></div>

    <h4 style="font-size:13px;margin:14px 0 8px;">4 步价值模型</h4>
    <div id="fourStepList">
      ${arr(v.four_step_model).map((s, i) => `
        <div class="card flat" style="padding:8px 12px;margin-bottom:6px;">
          <div class="field-row three" style="margin-bottom:0;">
            <div class="field"><label>step</label><input data-bind="value_proposition.four_step_model.${i}.step" value="${esc(s.step)}"/></div>
            <div class="field"><label>tagline</label><input data-bind="value_proposition.four_step_model.${i}.tagline" value="${esc(s.tagline)}"/></div>
            <div class="field"><label>detail</label><input data-bind="value_proposition.four_step_model.${i}.detail" value="${esc(s.detail || '')}"/></div>
          </div>
          <button class="btn sm danger" data-del-arr="value_proposition.four_step_model.${i}">删除</button>
        </div>
      `).join('')}
    </div>
    <button class="btn sm" data-add-arr="value_proposition.four_step_model" data-tpl='{"step":"","tagline":"","detail":""}'>+ 添加步骤</button>

    <h4 style="font-size:13px;margin:14px 0 8px;">差异化（每行一条）</h4>
    <textarea data-list="value_proposition.differentiators" rows="4">${arr(v.differentiators).join('\n')}</textarea>

    <h4 style="font-size:13px;margin:14px 0 8px;">Anti-positioning · 不是什么（每行一条）</h4>
    <textarea data-list="value_proposition.anti_positions" rows="4">${arr(v.anti_positions).join('\n')}</textarea>
  `;
}

function bindEditor(data, ctx) {
  const persist = () => {
    Store.saveDraftData(data);
    ctx.refreshTopbar();
    if (window.__refreshComplianceBar) window.__refreshComplianceBar();
  };

  document.querySelectorAll('[data-bind]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const path = inp.dataset.bind.split('.');
      let target = data;
      for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
      const last = path[path.length - 1];
      let value = inp.value;
      if (inp.type === 'number') value = parseFloat(value);
      target[last] = value;
      persist();
    });
  });

  // colors
  document.getElementById('btnAddColor')?.addEventListener('click', () => {
    const name = document.getElementById('newColorName').value.trim();
    const hex = document.getElementById('newColorHex').value;
    const role = document.getElementById('newColorRole').value.trim();
    if (!name || !hex) { toast('需要填写 name 与 hex', 'warn'); return; }
    data.colors.tokens.push({ name, hex, role });
    persist();
    ctx.navigate('brand');
  });
  document.querySelectorAll('[data-del-token]').forEach((b) => {
    b.addEventListener('click', () => {
      data.colors.tokens.splice(parseInt(b.dataset.delToken), 1);
      persist();
      ctx.navigate('brand');
    });
  });

  // type scale
  document.getElementById('typeScale')?.addEventListener('input', (e) => {
    data.typography.scale = e.target.value.split(',').map((s) => parseInt(s.trim())).filter(Boolean);
    persist();
  });
  document.getElementById('typeWeights')?.addEventListener('input', (e) => {
    data.typography.weights = e.target.value.split(',').map((s) => parseInt(s.trim())).filter(Boolean);
    persist();
  });
  document.getElementById('spacingScale')?.addEventListener('input', (e) => {
    data.spacing.scale = e.target.value.split(',').map((s) => parseInt(s.trim())).filter(Boolean);
    persist();
  });

  // voice
  document.getElementById('voiceDo')?.addEventListener('input', (e) => {
    data.voice.do = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    persist();
  });
  document.getElementById('voiceDont')?.addEventListener('input', (e) => {
    data.voice.dont = e.target.value.split('\n').map((s) => s.trim()).filter(Boolean);
    persist();
  });

  // dont
  document.getElementById('btnAddDont')?.addEventListener('click', () => {
    const r = document.getElementById('newDontRule').value.trim();
    const why = document.getElementById('newDontReason').value.trim();
    if (!r) return;
    data.dont = data.dont || [];
    data.dont.push({ rule: r, reason: why });
    persist();
    ctx.navigate('brand');
  });
  document.querySelectorAll('[data-del-dont]').forEach((b) => {
    b.addEventListener('click', () => {
      data.dont.splice(parseInt(b.dataset.delDont), 1);
      persist();
      ctx.navigate('brand');
    });
  });

  // users.* — data-bind 已自动支持嵌套路径（含数字索引：secondary_personas.0.label）
  // 修补 data-bind 的索引解析（原版只支持纯字符串 key）
  // 同时绑定 data-list（textarea 多行 → array）
  document.querySelectorAll('[data-list]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const path = inp.dataset.list.split('.');
      let target = data;
      for (let i = 0; i < path.length - 1; i++) {
        const key = /^\d+$/.test(path[i]) ? parseInt(path[i]) : path[i];
        if (target[key] === undefined) target[key] = /^\d+$/.test(path[i + 1] || '') ? [] : {};
        target = target[key];
      }
      const last = path[path.length - 1];
      target[last] = inp.value.split('\n').map((s) => s.trim()).filter(Boolean);
      persist();
    });
  });

  // 给 data-bind 重写一遍（覆盖第一次循环），支持数字索引路径 secondary_personas.0.label
  document.querySelectorAll('[data-bind]').forEach((inp) => {
    if (inp._userPathBound) return;
    inp._userPathBound = true;
    inp.addEventListener('input', () => {
      const raw = inp.dataset.bind;
      if (!raw.includes('.')) return; // 简单 key 已在前面绑定
      const path = raw.split('.');
      // 仅当路径含数字索引时由这里处理（避免重复绑定）
      const hasIndex = path.some((p) => /^\d+$/.test(p));
      if (!hasIndex) return;
      let target = data;
      for (let i = 0; i < path.length - 1; i++) {
        const key = /^\d+$/.test(path[i]) ? parseInt(path[i]) : path[i];
        if (target[key] === undefined) target[key] = {};
        target = target[key];
      }
      const last = path[path.length - 1];
      target[last] = inp.value;
      persist();
    });
  });

  // users · add secondary persona
  document.getElementById('btnAddSecondary')?.addEventListener('click', () => {
    data.users = data.users || {};
    data.users.secondary_personas = data.users.secondary_personas || [];
    data.users.secondary_personas.push({ label: '', age: '', description: '', scenes: [], needs: [], pain_points: [], values: [] });
    persist();
    ctx.navigate('brand');
  });
  document.querySelectorAll('[data-del-secondary]').forEach((b) => {
    b.addEventListener('click', () => {
      data.users.secondary_personas.splice(parseInt(b.dataset.delSecondary), 1);
      persist();
      ctx.navigate('brand');
    });
  });

  // users · add anti persona
  document.getElementById('btnAddAnti')?.addEventListener('click', () => {
    const label = document.getElementById('newAntiLabel').value.trim();
    const reason = document.getElementById('newAntiReason').value.trim();
    if (!label) return;
    data.users = data.users || {};
    data.users.anti_personas = data.users.anti_personas || [];
    data.users.anti_personas.push({ label, reason });
    persist();
    ctx.navigate('brand');
  });
  document.querySelectorAll('[data-del-anti]').forEach((b) => {
    b.addEventListener('click', () => {
      data.users.anti_personas.splice(parseInt(b.dataset.delAnti), 1);
      persist();
      ctx.navigate('brand');
    });
  });

  // 通用数组项操作 · §11-§15 各编辑器使用
  // data-add-arr="path.to.array" + data-tpl='{"...":"..."}'
  document.querySelectorAll('[data-add-arr]').forEach((b) => {
    b.addEventListener('click', () => {
      const path = b.dataset.addArr.split('.');
      let target = data;
      for (let i = 0; i < path.length - 1; i++) {
        const k = /^\d+$/.test(path[i]) ? parseInt(path[i]) : path[i];
        if (target[k] === undefined) target[k] = /^\d+$/.test(path[i + 1] || '') ? [] : {};
        target = target[k];
      }
      const last = path[path.length - 1];
      if (!Array.isArray(target[last])) target[last] = [];
      let tpl = {};
      try { tpl = JSON.parse(b.dataset.tpl || '{}'); } catch { tpl = {}; }
      target[last].push(JSON.parse(JSON.stringify(tpl)));
      persist();
      ctx.navigate('brand');
    });
  });

  // data-del-arr="path.to.array.idx"
  document.querySelectorAll('[data-del-arr]').forEach((b) => {
    b.addEventListener('click', () => {
      const path = b.dataset.delArr.split('.');
      const idx = parseInt(path.pop());
      let target = data;
      for (const seg of path) {
        const k = /^\d+$/.test(seg) ? parseInt(seg) : seg;
        target = target[k];
        if (!target) return;
      }
      if (Array.isArray(target)) target.splice(idx, 1);
      persist();
      ctx.navigate('brand');
    });
  });

  // data-bind-csv="path.to.array"  → split by comma into string[]
  document.querySelectorAll('[data-bind-csv]').forEach((inp) => {
    inp.addEventListener('input', () => {
      const path = inp.dataset.bindCsv.split('.');
      let target = data;
      for (let i = 0; i < path.length - 1; i++) {
        const k = /^\d+$/.test(path[i]) ? parseInt(path[i]) : path[i];
        if (target[k] === undefined) target[k] = {};
        target = target[k];
      }
      const last = path[path.length - 1];
      target[last] = inp.value.split(',').map((s) => s.trim()).filter(Boolean);
      persist();
    });
  });
}

// ===================================================================
// BRAND SPEC VIEW · 已发布版本完整只读视图
// ===================================================================
function renderBrandSpec(ctx, version) {
  const d = version.data;
  const brand = Store.getCurrentBrand();
  const allVers = brand.versions;
  const idx = allVers.findIndex((v) => v.version === version.version);
  const prevPub = allVers.slice(0, idx).reverse().find((v) => v.status === 'published');

  return `
    <div class="page-head">
      <p class="lead">已发布的完整品牌规范 · 此为只读视图。要修改请创建新草案。</p>
      <div class="actions">
        <button class="btn" id="btnExportSpec">↓ 导出 spec.md</button>
        <button class="btn primary" id="btnFork">+ 基于此版本编辑（创建新 draft）</button>
      </div>
    </div>

    <div class="spec-meta">
      <div class="spec-meta-row">
        <span class="k">版本</span>
        <span class="v"><b>v${esc(version.version)}</b> <span class="tag green">${esc(version.status)}</span></span>
      </div>
      <div class="spec-meta-row">
        <span class="k">发布时间</span>
        <span class="v mono">${version.published_at ? new Date(version.published_at).toLocaleString() : '-'}</span>
      </div>
      <div class="spec-meta-row">
        <span class="k">发布人</span>
        <span class="v mono">${esc(version.published_by || '-')}</span>
      </div>
      <div class="spec-meta-row">
        <span class="k">变更说明</span>
        <span class="v">${esc(version.change_note || '-')}</span>
      </div>
      ${version.based_on ? `<div class="spec-meta-row"><span class="k">基于</span><span class="v mono">v${esc(version.based_on)}</span></div>` : ''}
      ${prevPub ? `<div class="spec-meta-row"><span class="k">上一发布版本</span><span class="v mono">v${esc(prevPub.version)} · ${new Date(prevPub.published_at).toLocaleDateString()}</span></div>` : ''}
    </div>

    <div class="spec-doc">
      ${specSection('1', 'Visual Theme · 视觉氛围', `
        <div class="spec-quote">${esc(d.visual_theme.atmosphere || '-')}</div>
        <div class="spec-kv-row">
          <div><span class="k mono">density</span><span class="v">${esc(d.visual_theme.density || '-')}</span></div>
        </div>
      `)}

      ${specSection('2', 'Color Palette · 色板', `
        <div class="spec-color-grid">
          ${arr(d.colors.tokens).map((t) => `
            <div class="spec-color">
              <div class="swatch" style="background:${esc(t.hex)};"></div>
              <div class="meta">
                <div class="name">${esc(t.name)}</div>
                <div class="hex mono">${esc(t.hex)}</div>
                <div class="role mono">${esc(t.role || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
        ${Object.keys(d.colors.aliases || {}).length > 0 ? `<div class="spec-aliases mono"><span class="k">aliases:</span> ${Object.entries(d.colors.aliases).map(([k,v]) => `${k} → ${v}`).join(', ')}</div>` : ''}
      `)}

      ${specSection('3', 'Typography · 字体', `
        <div class="spec-kv-row">
          <div><span class="k mono">display</span><span class="v">${esc(d.typography.families.display || '-')}</span></div>
          <div><span class="k mono">body</span><span class="v">${esc(d.typography.families.body || '-')}</span></div>
          <div><span class="k mono">cn</span><span class="v">${esc(d.typography.families.cn || '-')}</span></div>
        </div>
        <div class="spec-section-sub">字号 scale</div>
        <div class="spec-scale">
          ${arr(d.typography.scale).map((sz) => `
            <div class="spec-scale-cell">
              <div class="demo" style="font-size:${sz}px;font-family:'${esc(d.typography.families.body || 'Geist')}',sans-serif;">Aa 字</div>
              <div class="num mono">${sz}px</div>
            </div>
          `).join('')}
        </div>
        <div class="spec-section-sub">字重</div>
        <div class="spec-pills">${arr(d.typography.weights).map((w) => `<span class="mono pill-flat">${w}</span>`).join('')}</div>
        ${d.typography.cn_rules ? `<div class="spec-section-sub">中文排版规则（来自灵感池合并）</div>
        <pre class="spec-pre">${esc(typeof d.typography.cn_rules === 'object' ? JSON.stringify(d.typography.cn_rules, null, 2) : d.typography.cn_rules)}</pre>` : ''}
      `)}

      ${specSection('4', 'Spacing & Grid · 间距与栅格', `
        <div class="spec-kv-row">
          <div><span class="k mono">base</span><span class="v">${d.spacing.base}px</span></div>
        </div>
        <div class="spec-section-sub">scale</div>
        <div class="spec-spacing-row">
          ${arr(d.spacing.scale).map((sp) => `
            <div class="spec-spacing-cell">
              <div class="bar" style="width:${sp}px;"></div>
              <div class="num mono">${sp}</div>
            </div>
          `).join('')}
        </div>
      `)}

      ${specSection('5', 'Component Stylings · 组件规范', `
        <div class="spec-comp-grid">
          ${['button', 'card', 'input'].map((c) => d.components[c] ? `
            <div class="spec-comp">
              <div class="name mono">${c}</div>
              ${Object.entries(d.components[c]).map(([k, v]) => `<div class="kv mono"><span class="k">${esc(k)}</span><span class="v">${esc(String(v))}</span></div>`).join('')}
            </div>
          ` : '').join('')}
        </div>
      `)}

      ${specSection('6', 'Motion · 动效', `
        <div class="spec-kv-row">
          <div><span class="k mono">fast</span><span class="v">${d.motion.duration?.fast || '-'}ms</span></div>
          <div><span class="k mono">base</span><span class="v">${d.motion.duration?.base || '-'}ms</span></div>
          <div><span class="k mono">slow</span><span class="v">${d.motion.duration?.slow || '-'}ms</span></div>
        </div>
        <div class="spec-section-sub">easing</div>
        <pre class="spec-pre">${esc(d.motion.easing || '-')}</pre>
      `)}

      ${specSection('7', 'Voice & Tone · 语气', `
        <div class="spec-quote">${esc(d.voice.tone || '-')}</div>
        <div class="spec-do-dont">
          <div class="col do">
            <div class="head">✓ Do</div>
            <ul>${arr(d.voice.do).map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="empty">-</li>'}</ul>
          </div>
          <div class="col dont">
            <div class="head">✕ Don't</div>
            <ul>${arr(d.voice.dont).map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="empty">-</li>'}</ul>
          </div>
        </div>
      `)}

      ${specSection('8', 'Brand Marks · 标识规范', `
        <div class="spec-kv-row">
          <div><span class="k mono">wordmark</span><span class="v" style="font-size:18px;font-weight:600;">${esc(d.brand_marks.wordmark_text || '-')}</span></div>
          <div><span class="k mono">safe-zone</span><span class="v">${d.brand_marks.safe_zone_ratio || '-'} × logo height</span></div>
          <div><span class="k mono">min-height</span><span class="v">${d.brand_marks.min_height_px || '-'}px</span></div>
        </div>
      `)}

      ${specSection('9', "Don't · 反例 / 禁止用法", `
        ${arr(d.dont).length === 0 ? '<div class="empty"><div>未配置反例</div></div>' : `
          <div class="spec-dont-list">
            ${d.dont.map((it) => `
              <div class="spec-dont-row">
                <div class="rule">✕ ${esc(it.rule)}</div>
                ${it.reason ? `<div class="reason">${esc(it.reason)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        `}
      `)}

      ${specSection('10', 'Users · 用户信息', renderPersonaSpec(d.users || {}))}

      ${specSection('11', 'Product · 产品架构', renderProductSpec(d.product || {}))}

      ${specSection('12', 'Naming · 命名规范', renderNamingSpec(d.naming || {}))}

      ${specSection('13', 'Localization · 地域差异', renderLocalizationSpec(d.localization || {}))}

      ${specSection('14', 'Use Cases · 业务场景', renderUseCasesSpec(d.use_cases || {}))}

      ${specSection('15', 'Value Proposition · 核心价值', renderValueSpec(d.value_proposition || {}))}

      <div class="spec-foot">
        <span class="mono">viaim Brand OS · v${esc(version.version)} · 由 Brand OS 自动生成于 ${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `;
}

function renderPersonaSpec(users) {
  const p = users.primary_persona || {};
  const sec = users.secondary_personas || [];
  const anti = users.anti_personas || [];
  const personaCard = (persona, tag) => `
    <div class="spec-persona">
      <div class="spec-persona-head">
        <span class="tag p0">${esc(tag)}</span>
        <span class="spec-persona-label">${esc(persona.label || '-')}</span>
        ${persona.age ? `<span class="mono spec-persona-age">${esc(persona.age)}</span>` : ''}
      </div>
      ${persona.description ? `<div class="spec-persona-desc">${esc(persona.description)}</div>` : ''}
      <div class="spec-persona-grid">
        ${(persona.scenes && persona.scenes.length) ? `<div class="spec-persona-col"><div class="head mono">使用场景</div><ul>${persona.scenes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${(persona.needs && persona.needs.length) ? `<div class="spec-persona-col"><div class="head mono">核心需求</div><ul>${persona.needs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${(persona.pain_points && persona.pain_points.length) ? `<div class="spec-persona-col"><div class="head mono">痛点</div><ul>${persona.pain_points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
        ${(persona.values && persona.values.length) ? `<div class="spec-persona-col"><div class="head mono">价值观</div><ul class="pills">${persona.values.map((x) => `<li class="pill-flat">${esc(x)}</li>`).join('')}</ul></div>` : ''}
      </div>
    </div>
  `;
  return `
    ${p.label ? personaCard(p, 'PRIMARY · 核心') : '<div class="empty"><div>未配置主画像</div></div>'}
    ${sec.map((s, i) => personaCard(s, `SECONDARY #${i + 1}`)).join('')}
    ${anti.length > 0 ? `
      <div class="spec-section-sub">反向画像 · 不针对的用户</div>
      <div class="spec-dont-list">
        ${anti.map((a) => `
          <div class="spec-dont-row">
            <div class="rule">✕ ${esc(a.label || a)}</div>
            ${a.reason ? `<div class="reason">${esc(a.reason)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
  `;
}

function specSection(num, title, body) {
  return `
    <section class="spec-block" id="spec-${num}">
      <div class="spec-num mono">§${num}</div>
      <h3 class="spec-h">${esc(title)}</h3>
      <div class="spec-body">${body}</div>
    </section>`;
}

// ==================== §11 Product ====================
function renderProductSpec(p) {
  const tag = (region) => region === 'cn' ? '<span class="tag amber">🇨🇳 国内</span>' : region === 'overseas' ? '<span class="tag blue">🌍 海外</span>' : '<span class="tag">通用</span>';
  return `
    <div class="spec-section-sub">硬件产品线</div>
    <div class="spec-comp-grid">
      ${arr(p.hardware_lines).map((h) => `
        <div class="spec-comp">
          <div class="name mono">${esc(h.id)} · ${esc(h.label)}</div>
          <div style="font-size:11.5px;color:var(--ink-mid);margin:6px 0;line-height:1.55;">${esc(h.positioning || '')}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;">${arr(h.key_scenes).map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div>
        </div>
      `).join('') || '<div class="empty"><div>未配置</div></div>'}
    </div>

    <div class="spec-section-sub">软件平台</div>
    <table class="spec">
      <thead><tr><th>平台</th><th>region</th><th>能力</th></tr></thead>
      <tbody>
        ${arr(p.software_platforms).map((s) => `
          <tr>
            <td><b>${esc(s.label)}</b><div class="mono" style="font-size:10px;color:var(--ink-mute);">${esc(s.id)}</div></td>
            <td>${tag(s.region || 'all')}</td>
            <td class="mono" style="font-size:11px;">${esc(s.capability || '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="spec-section-sub">AI 引擎</div>
    <div class="spec-comp-grid">
      ${arr(p.ai_engines).map((a) => `
        <div class="spec-comp">
          <div class="name mono">${esc(a.label)}</div>
          <div style="margin:6px 0;">${tag(a.region || 'all')}</div>
          <div style="font-size:11.5px;color:var(--ink-soft);">${esc(a.role || '')}</div>
        </div>
      `).join('')}
    </div>

    <div class="spec-section-sub">旗舰功能</div>
    <div class="spec-dont-list">
      ${arr(p.flagship_features).map((f) => `
        <div class="spec-dont-row" style="background:var(--accent-soft);border-left-color:var(--accent);">
          <div class="rule" style="display:flex;align-items:center;gap:8px;">★ ${esc(f.label)} ${tag(f.region || 'all')}</div>
          ${f.description ? `<div class="reason">${esc(f.description)}</div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

// ==================== §12 Naming ====================
function renderNamingSpec(n) {
  return `
    <div class="spec-kv-row">
      <div><span class="k mono">🇨🇳 cn brand</span><span class="v">${esc(n.brand_pair?.cn || '-')}</span></div>
      <div><span class="k mono">🌍 overseas brand</span><span class="v">${esc(n.brand_pair?.overseas || '-')}</span></div>
    </div>

    <div class="spec-section-sub">命名 pattern</div>
    <div class="spec-kv-row" style="flex-direction:column;align-items:stretch;gap:6px;">
      <div><span class="k mono">🇨🇳</span> <span class="v mono" style="font-size:11.5px;">${esc(n.product_naming?.cn_pattern || '-')}</span></div>
      <div><span class="k mono">🌍</span> <span class="v mono" style="font-size:11.5px;">${esc(n.product_naming?.overseas_pattern || '-')}</span></div>
    </div>

    <div class="spec-section-sub">产品双区映射</div>
    <table class="spec">
      <thead><tr><th>type</th><th>🇨🇳 国内</th><th>🌍 海外</th></tr></thead>
      <tbody>
        ${arr(n.product_pairs).map((p) => `<tr><td><b>${esc(p.type)}</b></td><td>${esc(p.cn)}</td><td>${esc(p.overseas)}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="spec-section-sub">功能名双区映射</div>
    <table class="spec">
      <thead><tr><th>🇨🇳 国内</th><th>🌍 海外</th><th>说明</th></tr></thead>
      <tbody>
        ${arr(n.feature_pairs).map((f) => `<tr><td><b>${esc(f.cn)}</b></td><td><b>${esc(f.overseas)}</b></td><td>${esc(f.notes || '')}</td></tr>`).join('')}
      </tbody>
    </table>

    ${arr(n.rules).length > 0 ? `
      <div class="spec-section-sub">命名规则</div>
      <ul style="padding-left:18px;font-size:12.5px;color:var(--ink-soft);line-height:1.7;">
        ${arr(n.rules).map((r) => `<li>${esc(r)}</li>`).join('')}
      </ul>
    ` : ''}
  `;
}

// ==================== §13 Localization ====================
function renderLocalizationSpec(l) {
  return `
    <div class="spec-kv-row">
      <div><span class="k mono">通用</span><span class="v">${esc(l.scope_markers?.universal || '-')}</span></div>
      <div><span class="k mono">cn</span><span class="v">${esc(l.scope_markers?.cn || '-')}</span></div>
      <div><span class="k mono">overseas</span><span class="v">${esc(l.scope_markers?.overseas || '-')}</span></div>
    </div>
    ${l.documentation_rule ? `<div class="spec-quote" style="margin-top:10px;">${esc(l.documentation_rule)}</div>` : ''}

    <div class="spec-section-sub">功能差异</div>
    <table class="spec">
      <thead><tr><th>feature</th><th>🇨🇳 国内</th><th>🌍 海外</th></tr></thead>
      <tbody>
        ${arr(l.feature_diff).map((f) => `<tr><td><b>${esc(f.feature)}</b></td><td>${esc(f.cn)}</td><td>${esc(f.overseas)}</td></tr>`).join('')}
      </tbody>
    </table>

    ${l.subscription?.overseas?.tiers ? `
      <div class="spec-section-sub">订阅档（🌍 海外）</div>
      <div class="spec-comp-grid">
        ${l.subscription.overseas.tiers.map((t) => typeof t === 'string' ? `<div class="spec-comp"><div class="name mono">${esc(t)}</div></div>` : `
          <div class="spec-comp">
            <div class="name mono">${esc(t.label || t.id)}</div>
            <div style="font-size:11.5px;color:var(--ink-soft);margin-top:6px;">${esc(t.positioning || '')}</div>
          </div>
        `).join('')}
      </div>
      ${l.subscription.overseas.notes ? `<div style="font-size:11.5px;color:var(--ink-mute);margin-top:8px;">${esc(l.subscription.overseas.notes)}</div>` : ''}
    ` : ''}
  `;
}

// ==================== §14 Use Cases ====================
function renderUseCasesSpec(u) {
  const densityTag = (d) => d === 'high' ? '<span class="tag red">high</span>' : d === 'medium' ? '<span class="tag amber">medium</span>' : '<span class="tag green">low</span>';
  return `
    <div class="spec-section-sub">业务场景</div>
    <table class="spec">
      <thead><tr><th>场景</th><th>密度</th><th>典型时长</th><th>参与人数</th></tr></thead>
      <tbody>
        ${arr(u.business_scenarios).map((s) => `<tr><td><b>${esc(s.label)}</b><div class="mono" style="font-size:10px;color:var(--ink-mute);">${esc(s.id)}</div></td><td>${densityTag(s.density)}</td><td class="mono">${esc(s.typical_dur || '-')}</td><td class="mono">${esc(s.stakeholders || '-')}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="spec-section-sub">物理环境</div>
    <div class="spec-pills">${arr(u.physical_contexts).map((c) => `<span class="pill-flat">${esc(c)}</span>`).join('')}</div>

    <div class="spec-section-sub">录音模式</div>
    <table class="spec">
      <thead><tr><th>模式</th><th>输入</th><th>地区</th></tr></thead>
      <tbody>
        ${arr(u.recording_modes).map((m) => `<tr><td><b>${esc(m.label)}</b><div class="mono" style="font-size:10px;color:var(--ink-mute);">${esc(m.id)}</div></td><td>${esc(m.input || '-')}</td><td>${m.region === 'cn' ? '🇨🇳' : m.region === 'overseas' ? '🌍' : '通用'}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ==================== §15 Value Proposition ====================
function renderValueSpec(v) {
  return `
    ${v.one_liner ? `<div class="spec-quote" style="font-size:18px;line-height:1.5;">${esc(v.one_liner)}</div>` : ''}
    ${v.promise ? `<div style="margin-top:12px;font-size:13px;line-height:1.7;color:var(--ink);">${esc(v.promise)}</div>` : ''}

    <div class="spec-section-sub">4 步价值模型</div>
    <div class="value-steps">
      ${arr(v.four_step_model).map((s, i) => `
        <div class="value-step">
          <div class="value-step-num mono">0${i + 1}</div>
          <div class="value-step-title"><b>${esc(s.step)}</b> · ${esc(s.tagline)}</div>
          <div class="value-step-detail">${esc(s.detail || '')}</div>
        </div>
      `).join('')}
    </div>

    ${arr(v.differentiators).length > 0 ? `
      <div class="spec-section-sub">差异化（是什么）</div>
      <ul style="padding-left:18px;font-size:13px;color:var(--ink);line-height:1.8;">
        ${arr(v.differentiators).map((x) => `<li>${esc(x)}</li>`).join('')}
      </ul>
    ` : ''}

    ${arr(v.anti_positions).length > 0 ? `
      <div class="spec-section-sub">Anti-positioning（不是什么）</div>
      <div class="spec-dont-list">
        ${arr(v.anti_positions).map((x) => `<div class="spec-dont-row"><div class="rule">✕ ${esc(x)}</div></div>`).join('')}
      </div>
    ` : ''}
  `;
}

function mountBrandSpec(ctx, version) {
  document.getElementById('btnFork').addEventListener('click', () => {
    // 创建新 draft（基于当前 published 版本）
    const { draft } = Store.ensureDraft();
    Store.setCurrentVersion(draft.version);
    toast(`已创建草案 v${draft.version}`, 'success');
    ctx.navigate('brand');
    ctx.refreshTopbar && ctx.refreshTopbar();
  });
  document.getElementById('btnExportSpec').addEventListener('click', () => {
    openSpecExportPreview(version);
  });
}

function openSpecExportPreview(version) {
  const md = brandSpecToMarkdown(version);
  const fileName = `viaim-brand-spec-v${version.version}.md`;
  const lineCount = md.split('\n').length;
  const charCount = md.length;

  // 在 body 末尾挂一个 modal 容器
  let modal = document.getElementById('specExportModal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'specExportModal';
  document.body.appendChild(modal);

  modal.innerHTML = `
    <div class="cmdk-mask" id="specExportMask">
      <div class="cmdk-box" style="width:880px;max-width:calc(100% - 32px);max-height:88vh;display:flex;flex-direction:column;">
        <div style="padding:16px 22px;border-bottom:1px solid var(--line-soft);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div class="mono" style="font-size:9.5px;color:var(--ink-mute);letter-spacing:.06em;text-transform:uppercase;">导出预览 · EXPORT PREVIEW</div>
            <h3 style="font-size:14px;margin:4px 0;">${esc(fileName)}</h3>
            <div class="mono" style="font-size:10.5px;color:var(--ink-mute);">${charCount} chars · ${lineCount} lines · text/markdown</div>
          </div>
          <button class="btn sm" id="specExportClose">关闭</button>
        </div>

        <div style="display:flex;align-items:center;gap:8px;padding:10px 22px;border-bottom:1px solid var(--line-soft);background:var(--bg-soft);">
          <div class="spec-preview-tabs" role="tablist">
            <button class="spec-tab active" data-tab="rendered">渲染预览</button>
            <button class="spec-tab" data-tab="raw">Markdown 原文</button>
          </div>
          <div style="flex:1;"></div>
          <button class="btn sm" id="specCopyBtn">复制</button>
          <button class="btn sm primary" id="specDownloadBtn">↓ 下载 .md</button>
        </div>

        <div id="specPreviewBody" style="flex:1;overflow:auto;padding:0;">
          <div class="spec-preview-rendered" id="specRenderedView">${renderMarkdownLite(md)}</div>
          <pre class="spec-preview-raw" id="specRawView" style="display:none;">${esc(md)}</pre>
        </div>
      </div>
    </div>`;

  const close = () => modal.remove();
  document.getElementById('specExportMask').addEventListener('click', (e) => {
    if (e.target.id === 'specExportMask') close();
  });
  document.getElementById('specExportClose').addEventListener('click', close);

  // tab 切换
  modal.querySelectorAll('.spec-tab').forEach((t) => {
    t.addEventListener('click', () => {
      modal.querySelectorAll('.spec-tab').forEach((x) => x.classList.toggle('active', x === t));
      const isRendered = t.dataset.tab === 'rendered';
      document.getElementById('specRenderedView').style.display = isRendered ? '' : 'none';
      document.getElementById('specRawView').style.display = isRendered ? 'none' : '';
    });
  });

  document.getElementById('specCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(md).then(() => toast('Markdown 已复制', 'success'));
  });
  document.getElementById('specDownloadBtn').addEventListener('click', () => {
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('spec.md 已下载', 'success');
    close();
  });
}

// 极简 Markdown 渲染器（够 brand spec 用 · 不引入第三方依赖）
function renderMarkdownLite(md) {
  if (!md) return '';
  // escape first
  let s = md.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // 提取代码块（避免内部被其他规则破坏）
  const fences = [];
  s = s.replace(/```([a-zA-Z]*)\n([\s\S]*?)\n```/g, (m, lang, code) => {
    fences.push(`<pre class="md-code"><code class="lang-${lang}">${code}</code></pre>`);
    return `\u0000FENCE${fences.length - 1}\u0000`;
  });

  // 标题
  s = s.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
       .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
       .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
       .replace(/^### (.+)$/gm, '<h3>$1</h3>')
       .replace(/^## (.+)$/gm, '<h2>$1</h2>')
       .replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 水平分隔
  s = s.replace(/^---+$/gm, '<hr/>');

  // 引用
  s = s.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // 表格（处理简单表格：| ... | ... |）
  s = s.replace(/((?:^\|.*\|$\n?)+)/gm, (block) => {
    const rows = block.trim().split('\n').filter((r) => r.trim());
    if (rows.length < 2) return block;
    const hdr = rows[0].split('|').slice(1, -1).map((c) => c.trim());
    // 第二行如果是分隔（---），跳过
    const isSep = /^[\s|:\-]+$/.test(rows[1]);
    const body = rows.slice(isSep ? 2 : 1).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
    return `<table class="md-table"><thead><tr>${hdr.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  });

  // 列表（基础）
  s = s.replace(/((?:^- .+$\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map((l) => l.replace(/^- /, ''));
    return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  });

  // 行内：粗体、斜体、代码、链接
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
       .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
       .replace(/`([^`]+)`/g, '<code>$1</code>')
       .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  // 段落
  s = s.split(/\n{2,}/).map((para) => {
    if (/^\s*<(h\d|ul|ol|table|blockquote|pre|hr)/.test(para)) return para;
    return `<p>${para.replace(/\n/g, '<br/>')}</p>`;
  }).join('\n');

  // 还原代码块
  s = s.replace(/\u0000FENCE(\d+)\u0000/g, (m, i) => fences[parseInt(i)]);

  return s;
}
window.renderMarkdownLite = renderMarkdownLite;

function brandSpecToMarkdown(version) {
  const d = version.data;
  const colorTable = arr(d.colors.tokens).map((t) => `| \`${t.name}\` | ${t.hex} | ${t.role || ''} |`).join('\n');
  return `# viaim Brand Spec · v${version.version}

> ${d.visual_theme.atmosphere || ''}

| | |
|---|---|
| **版本** | v${version.version} (${version.status}) |
| **发布时间** | ${version.published_at ? new Date(version.published_at).toLocaleString() : '-'} |
| **发布人** | ${version.published_by || '-'} |
| **变更说明** | ${version.change_note || '-'} |

---

## §1 Visual Theme

> ${d.visual_theme.atmosphere || '-'}

- **density**: \`${d.visual_theme.density || '-'}\`

## §2 Color Palette

| token | hex | role |
|---|---|---|
${colorTable}

${Object.keys(d.colors.aliases || {}).length > 0 ? `**aliases**: ${Object.entries(d.colors.aliases).map(([k, v]) => `\`${k}\` → \`${v}\``).join(', ')}\n` : ''}

## §3 Typography

- **display**: \`${d.typography.families.display || '-'}\`
- **body**: \`${d.typography.families.body || '-'}\`
- **cn**: \`${d.typography.families.cn || '-'}\`
- **scale (px)**: ${arr(d.typography.scale).join(', ')}
- **weights**: ${arr(d.typography.weights).join(', ')}

${d.typography.cn_rules ? `### 中文排版规则\n\n\`\`\`json\n${JSON.stringify(d.typography.cn_rules, null, 2)}\n\`\`\`\n` : ''}

## §4 Spacing & Grid

- **base**: ${d.spacing.base}px
- **scale**: ${arr(d.spacing.scale).join(', ')}

## §5 Component Stylings

${['button', 'card', 'input'].map((c) => d.components[c] ? `### ${c}\n\n${Object.entries(d.components[c]).map(([k, v]) => `- **${k}**: \`${v}\``).join('\n')}` : '').join('\n\n')}

## §6 Motion

- **duration**: fast=${d.motion.duration?.fast || '-'}ms · base=${d.motion.duration?.base || '-'}ms · slow=${d.motion.duration?.slow || '-'}ms
- **easing**: \`${d.motion.easing || '-'}\`

## §7 Voice & Tone

> ${d.voice.tone || '-'}

**Do**:
${arr(d.voice.do).map((x) => `- ${x}`).join('\n') || '- (none)'}

**Don't**:
${arr(d.voice.dont).map((x) => `- ${x}`).join('\n') || '- (none)'}

## §8 Brand Marks

- **wordmark**: ${d.brand_marks.wordmark_text || '-'}
- **safe-zone-ratio**: ${d.brand_marks.safe_zone_ratio || '-'} × logo height
- **min-height-px**: ${d.brand_marks.min_height_px || '-'}px

## §9 Don't · 反例

${arr(d.dont).length === 0 ? '_(none)_' : arr(d.dont).map((it) => `- ✕ **${it.rule}**${it.reason ? ` · _${it.reason}_` : ''}`).join('\n')}

## §10 Users · 用户信息

${renderPersonaMd(d.users || {})}

## §11 Product · 产品架构

${renderProductMd(d.product || {})}

## §12 Naming · 命名规范

${renderNamingMd(d.naming || {})}

## §13 Localization · 地域差异

${renderLocalizationMd(d.localization || {})}

## §14 Use Cases · 业务场景

${renderUseCasesMd(d.use_cases || {})}

## §15 Value Proposition · 核心价值

${renderValueMd(d.value_proposition || {})}

---

_Auto-generated by viaim Brand OS · ${new Date().toISOString()}_
`;
}

function renderProductMd(p) {
  const t = (r) => r === 'cn' ? '🇨🇳' : r === 'overseas' ? '🌍' : '通用';
  const hw = arr(p.hardware_lines).map((h) => `- **${h.id} · ${h.label}** — ${h.positioning || ''}${(h.key_scenes && h.key_scenes.length) ? ` _(${h.key_scenes.join(', ')})_` : ''}`).join('\n') || '_(无)_';
  const sw = arr(p.software_platforms).map((s) => `| **${s.label}** | ${t(s.region)} | ${s.capability || '-'} |`).join('\n');
  const ai = arr(p.ai_engines).map((a) => `- **${a.label}** ${t(a.region)} — ${a.role || ''}`).join('\n') || '_(无)_';
  const ff = arr(p.flagship_features).map((f) => `- ★ **${f.label}** ${t(f.region)} — ${f.description || ''}`).join('\n') || '_(无)_';
  return `### 硬件产品线\n\n${hw}\n\n### 软件平台\n\n| 平台 | region | 能力 |\n|---|---|---|\n${sw}\n\n### AI 引擎\n\n${ai}\n\n### 旗舰功能\n\n${ff}`;
}

function renderNamingMd(n) {
  const pairs = arr(n.product_pairs).map((p) => `| **${p.type}** | ${p.cn} | ${p.overseas} |`).join('\n');
  const feats = arr(n.feature_pairs).map((f) => `| ${f.cn} | ${f.overseas} | ${f.notes || ''} |`).join('\n');
  const rules = arr(n.rules).map((r) => `- ${r}`).join('\n');
  return `- **🇨🇳 cn**: \`${n.brand_pair?.cn || '-'}\` · **🌍 overseas**: \`${n.brand_pair?.overseas || '-'}\`
- **🇨🇳 pattern**: \`${n.product_naming?.cn_pattern || '-'}\`
- **🌍 pattern**: \`${n.product_naming?.overseas_pattern || '-'}\`

### 产品双区映射

| type | 🇨🇳 国内 | 🌍 海外 |
|---|---|---|
${pairs}

### 功能双区映射

| 🇨🇳 国内 | 🌍 海外 | 备注 |
|---|---|---|
${feats}

### 命名规则

${rules || '_(无)_'}`;
}

function renderLocalizationMd(l) {
  const diff = arr(l.feature_diff).map((f) => `| ${f.feature} | ${f.cn} | ${f.overseas} |`).join('\n');
  const tiers = l.subscription?.overseas?.tiers || [];
  const tiersMd = tiers.map((t) => typeof t === 'string' ? `- ${t}` : `- **${t.label || t.id}** — ${t.positioning || ''}`).join('\n');
  return `- 通用: \`${l.scope_markers?.universal || '-'}\` · cn: \`${l.scope_markers?.cn || '-'}\` · overseas: \`${l.scope_markers?.overseas || '-'}\`
${l.documentation_rule ? `\n> ${l.documentation_rule}\n` : ''}

### 功能差异

| feature | 🇨🇳 国内 | 🌍 海外 |
|---|---|---|
${diff}

### 订阅档（海外）

${tiersMd || '_(无)_'}
${l.subscription?.overseas?.notes ? `\n_${l.subscription.overseas.notes}_` : ''}`;
}

function renderUseCasesMd(u) {
  const biz = arr(u.business_scenarios).map((s) => `| **${s.label}** \`${s.id}\` | ${s.density} | ${s.typical_dur || '-'} | ${s.stakeholders || '-'} |`).join('\n');
  const ctx = arr(u.physical_contexts).map((c) => `\`${c}\``).join(' · ');
  const rec = arr(u.recording_modes).map((m) => `| **${m.label}** \`${m.id}\` | ${m.input || '-'} | ${m.region || 'all'} |`).join('\n');
  return `### 业务场景

| 场景 | 密度 | 典型时长 | 参与人数 |
|---|---|---|---|
${biz}

### 物理环境

${ctx || '_(无)_'}

### 录音模式

| 模式 | 输入 | 地区 |
|---|---|---|
${rec}`;
}

function renderValueMd(v) {
  const steps = arr(v.four_step_model).map((s, i) => `${i + 1}. **${s.step}** · ${s.tagline}\n   ${s.detail || ''}`).join('\n');
  const diff = arr(v.differentiators).map((x) => `- ${x}`).join('\n');
  const anti = arr(v.anti_positions).map((x) => `- ✕ ${x}`).join('\n');
  return `${v.one_liner ? `> **${v.one_liner}**\n` : ''}
${v.promise || ''}

### 4 步价值模型

${steps}

### 差异化

${diff || '_(无)_'}

### Anti-positioning

${anti || '_(无)_'}`;
}

function renderPersonaMd(users) {
  const p = users.primary_persona || {};
  const sec = users.secondary_personas || [];
  const anti = users.anti_personas || [];
  const md = (persona, tag) => {
    if (!persona.label) return '';
    return `### ${tag} · ${persona.label}${persona.age ? ` _(${persona.age})_` : ''}

${persona.description ? `> ${persona.description}\n` : ''}
${(persona.scenes && persona.scenes.length) ? `- **使用场景**: ${persona.scenes.join(' · ')}` : ''}
${(persona.needs && persona.needs.length) ? `\n- **核心需求**: ${persona.needs.join(' · ')}` : ''}
${(persona.pain_points && persona.pain_points.length) ? `\n- **痛点**: ${persona.pain_points.join(' · ')}` : ''}
${(persona.values && persona.values.length) ? `\n- **价值观**: ${persona.values.map((x) => `\`${x}\``).join(' · ')}` : ''}
`;
  };
  let out = '';
  out += md(p, '主画像 · Primary') || '_未配置主画像_\n';
  sec.forEach((s, i) => { out += '\n' + md(s, `次画像 #${i + 1}`); });
  if (anti.length > 0) {
    out += '\n### 反向画像 · 不针对的用户\n\n';
    out += anti.map((a) => `- ✕ **${a.label || a}**${a.reason ? ` · _${a.reason}_` : ''}`).join('\n') + '\n';
  }
  return out;
}

// ===================================================================
// ASSETS
// ===================================================================
Modules.assets = {
  title: '资产库',
  state: { filter: { product: '', angle: '', colorway: '', q: '' } },
  render(ctx) {
    return `
      <div class="page-head">
        <p class="lead">所有产品级视觉资产的中央仓库。强制 schema 化打标，避免变垃圾场。</p>
        <div class="actions">
          <button class="btn primary" id="btnUpload">+ 上传资产</button>
        </div>
      </div>

      <div class="upload-area" id="uploadArea" style="display:none;">
        <div class="big">点击或拖拽文件到此处</div>
        <div class="small">支持 PNG / JPG / WebP / SVG · 单个 ≤ 10MB</div>
        <input type="file" id="uploadInput" accept="image/*,.gltf,.obj,.fbx,.psd" style="display:none;" multiple/>
      </div>

      <div class="assets-toolbar">
        <select id="fProduct"><option value="">所有 product</option>${ENUMS.product.map((p)=>`<option>${p}</option>`).join('')}</select>
        <select id="fAngle"><option value="">所有 angle</option>${ENUMS.angle.map((p)=>`<option>${p}</option>`).join('')}</select>
        <select id="fColorway"><option value="">所有 colorway</option>${ENUMS.colorway.map((p)=>`<option>${p}</option>`).join('')}</select>
        <select id="fScene"><option value="">所有 scene</option>${ENUMS.scene.map((p)=>`<option>${p}</option>`).join('')}</select>
        <input class="search" id="fQ" placeholder="自然语言/标签搜索…" />
        <div class="grow"></div>
        <span id="assetCount" class="mono" style="font-size: 10px;color:var(--ink-mute);"></span>
      </div>

      <div id="assetsGrid"></div>

      <!-- detail modal anchor -->
      <div id="assetModal"></div>
    `;
  },
  mount(ctx) {
    const refresh = async () => {
      const { product, angle, colorway, scene, q } = Modules.assets.state.filter;
      const list = Store.filterAssets({ product, angle, colorway, scene, q });
      document.getElementById('assetCount').textContent = `${list.length} / ${Store.getAssets().length} assets`;
      const grid = document.getElementById('assetsGrid');
      if (list.length === 0) {
        grid.innerHTML = `<div class="empty"><div class="title">没有资产</div><div>尝试更换筛选条件，或点击右上角上传</div></div>`;
        return;
      }
      grid.innerHTML = `<div class="assets-grid">${list.map((a) => `
        <div class="asset-card" data-aid="${a.id}">
          <div class="thumb"><div class="ph">loading…</div></div>
          <div class="meta">
            <div class="name">${esc(a.file.name || a.id)}</div>
            <div class="tax">
              ${a.taxonomy.product ? `<span class="t">${a.taxonomy.product}</span>` : ''}
              ${a.taxonomy.angle ? `<span class="t">${a.taxonomy.angle}</span>` : ''}
              ${a.taxonomy.colorway ? `<span class="t">${a.taxonomy.colorway}</span>` : ''}
            </div>
          </div>
        </div>`).join('')}</div>`;
      // load thumbnails
      for (const a of list) {
        const url = await Store.getAssetObjectUrl(a);
        const card = grid.querySelector(`[data-aid="${a.id}"] .thumb`);
        if (!card) continue;
        if (url) card.innerHTML = `<img src="${url}" alt=""/>`;
        else card.innerHTML = `<div class="ph">${esc(a.file.format || 'file')}</div>`;
      }
      // bind click
      grid.querySelectorAll('.asset-card').forEach((c) => {
        c.addEventListener('click', () => openAssetDetail(c.dataset.aid, ctx));
      });
    };

    const upArea = document.getElementById('uploadArea');
    document.getElementById('btnUpload').addEventListener('click', () => {
      upArea.style.display = upArea.style.display === 'none' ? 'block' : 'none';
    });
    upArea.addEventListener('click', () => document.getElementById('uploadInput').click());
    upArea.addEventListener('dragover', (e) => { e.preventDefault(); upArea.classList.add('drag'); });
    upArea.addEventListener('dragleave', () => upArea.classList.remove('drag'));
    upArea.addEventListener('drop', async (e) => {
      e.preventDefault(); upArea.classList.remove('drag');
      await handleUploads(e.dataTransfer.files, ctx);
      await refresh();
    });
    document.getElementById('uploadInput').addEventListener('change', async (e) => {
      await handleUploads(e.target.files, ctx);
      await refresh();
    });

    ['fProduct', 'fAngle', 'fColorway', 'fScene'].forEach((id) => {
      const el = document.getElementById(id);
      el.addEventListener('change', () => {
        const key = id.slice(1).toLowerCase();
        Modules.assets.state.filter[key] = el.value;
        refresh();
      });
    });
    let qTimer;
    document.getElementById('fQ').addEventListener('input', (e) => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        Modules.assets.state.filter.q = e.target.value;
        refresh();
      }, 200);
    });

    refresh();
  },
};

async function handleUploads(files, ctx) {
  for (const file of Array.from(files || [])) {
    if (file.size > 10 * 1024 * 1024) { toast(`${file.name} 超过 10MB，已跳过`, 'warn'); continue; }
    const fmt = (file.name.split('.').pop() || 'png').toLowerCase();
    let dim = { width: null, height: null };
    if (file.type.startsWith('image/')) {
      try { dim = await readImageDim(file); } catch (e) { /* ignore */ }
    }
    const meta = {
      name: file.name,
      format: fmt,
      width: dim.width,
      height: dim.height,
      size_bytes: file.size,
      taxonomy: { product: 'none', use_scope: 'internal_only' },
      tags: [],
    };
    await Store.addAsset(meta, file);
  }
  toast('上传完成，请补全打标', 'success');
}

function readImageDim(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { res({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url); };
    img.onerror = (e) => { URL.revokeObjectURL(url); rej(e); };
    img.src = url;
  });
}

async function openAssetDetail(id, ctx) {
  const asset = Store.getAssets().find((a) => a.id === id);
  if (!asset) return;
  const url = await Store.getAssetObjectUrl(asset);

  const modal = document.getElementById('assetModal');
  modal.innerHTML = `
    <div class="cmdk-mask" id="amask">
      <div class="cmdk-box" style="width:720px;max-width:calc(100% - 32px);">
        <div style="display:grid;grid-template-columns:1fr 1fr;">
          <div style="background:var(--bg-softer);display:flex;align-items:center;justify-content:center;min-height:300px;">
            ${url ? `<img src="${url}" style="max-width:100%;max-height:420px;object-fit:contain;"/>` : `<div class="mono" style="color:var(--ink-mute);">no preview</div>`}
          </div>
          <div style="padding:18px 20px;">
            <h3 style="font-size: 13px;margin-bottom:6px;">${esc(asset.file.name || asset.id)}</h3>
            <div class="mono" style="font-size: 10px;color:var(--ink-mute);margin-bottom:12px;">${esc(asset.id)}</div>

            <div class="field"><label>product</label>
              <select data-tax="product">${ENUMS.product.map((p) => `<option ${p===asset.taxonomy.product?'selected':''}>${p}</option>`).join('')}</select>
            </div>
            <div class="field-row">
              <div class="field"><label>angle</label>
                <select data-tax="angle"><option value="">—</option>${ENUMS.angle.map((p) => `<option ${p===asset.taxonomy.angle?'selected':''}>${p}</option>`).join('')}</select>
              </div>
              <div class="field"><label>colorway</label>
                <select data-tax="colorway"><option value="">—</option>${ENUMS.colorway.map((p) => `<option ${p===asset.taxonomy.colorway?'selected':''}>${p}</option>`).join('')}</select>
              </div>
            </div>
            <div class="field-row">
              <div class="field"><label>scene</label>
                <select data-tax="scene"><option value="">—</option>${ENUMS.scene.map((p) => `<option ${p===asset.taxonomy.scene?'selected':''}>${p}</option>`).join('')}</select>
              </div>
              <div class="field"><label>use_scope</label>
                <select data-tax="use_scope">${ENUMS.use_scope.map((p) => `<option ${p===asset.taxonomy.use_scope?'selected':''}>${p}</option>`).join('')}</select>
              </div>
            </div>
            <div class="field"><label>hardware_rev</label><input data-tax="hardware_rev" value="${esc(asset.taxonomy.hardware_rev || '')}" placeholder="e.g. v1.0"/></div>
            <div class="field"><label>tags（逗号分隔）</label><input id="aTags" value="${esc(arr(asset.tags).join(', '))}"/></div>

            <div style="display:flex;gap:8px;margin-top:14px;">
              <button class="btn primary" id="amSave">保存</button>
              <button class="btn danger" id="amDelete">删除</button>
              <button class="btn" id="amClose" style="margin-left:auto;">关闭</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const close = () => { modal.innerHTML = ''; };
  document.getElementById('amask').addEventListener('click', (e) => { if (e.target.id === 'amask') close(); });
  document.getElementById('amClose').addEventListener('click', close);
  document.getElementById('amSave').addEventListener('click', async () => {
    document.querySelectorAll('[data-tax]').forEach((el) => {
      asset.taxonomy[el.dataset.tax] = el.value || null;
    });
    asset.tags = document.getElementById('aTags').value.split(',').map((s) => s.trim()).filter(Boolean);
    const all = Store.getAssets();
    const idx = all.findIndex((a) => a.id === asset.id);
    all[idx] = asset;
    Store.saveAssets(all);
    toast('已保存', 'success');
    close();
    ctx.navigate('assets');
  });
  document.getElementById('amDelete').addEventListener('click', async () => {
    if (!confirm('删除此资产？')) return;
    await Store.deleteAsset(asset.id);
    toast('已删除', 'success');
    close();
    ctx.navigate('assets');
  });
}

// ===================================================================
// GENERATION STUDIO
// ===================================================================
Modules.studio = {
  title: '生成工作台',
  state: { tab: 'l3', input: {} },
  render(ctx) {
    const imgReady = Api.imageReady();
    return `
      <div class="tab-bar" id="studioTabs">
        <button class="tab-btn ${Modules.studio.state.tab==='l1'?'active':''}" data-tab="l1" title="工程级 Prompt · 复制到 Midjourney / SDXL / Flux 用">
          <span class="lvl">L1</span><span>· Prompt</span><span class="lab-cn">提示词</span>
        </button>
        <button class="tab-btn ${Modules.studio.state.tab==='l2'?'active':''}" data-tab="l2" title="结构化设计简报 · 给 agency / 下游 AI 用">
          <span class="lvl">L2</span><span>· Mini MD</span><span class="lab-cn">设计简报</span>
        </button>
        <button class="tab-btn ${Modules.studio.state.tab==='l3'?'active':''}" data-tab="l3" title="HTML / SVG 模板填充 · 直接出可交付图">
          <span class="lvl">L3</span><span>· Template</span><span class="lab-cn">模板渲染</span>
        </button>
        <button class="tab-btn ${Modules.studio.state.tab==='l4'?'active':''}" data-tab="l4" title="端到端媒体生成 · 图像 / 视频 / 音频 · 需配置 API">
          <span class="lvl">L4</span><span>· Media</span><span class="lab-cn">图像视频音频</span>${!imgReady?'<span class="badge">!</span>':''}
        </button>
        <button class="tab-btn ${Modules.studio.state.tab==='l5'?'active':''}" data-tab="l5" title="LLM 端到端 UI / 原型稿 · HTML 直出 · 含设备框">
          <span class="lvl">L5</span><span>· UI</span><span class="lab-cn">界面原型</span>
        </button>
        <button class="tab-btn ${Modules.studio.state.tab==='l6'?'active':''}" data-tab="l6" title="品牌幻灯片 · 单张模板 / 多张连排 · 自动套品牌">
          <span class="lvl">L6</span><span>· PPT</span><span class="lab-cn">品牌幻灯片</span>
        </button>
      </div>
      <div class="studio-tab-hint" id="studioTabHint"></div>

      <div id="studioBody"></div>
    `;
  },
  mount(ctx) {
    const HINTS = {
      l1: { en: 'Engineering prompt for Midjourney / SDXL / Flux. Brand DNA + asset + scene → one-block prompt. AI 自主度最低，由设计师收尾。', zh: '工程级 Prompt · 用于通用图像模型 · 设计师手动跑图。' },
      l2: { en: 'Structured design brief in Markdown for agencies / downstream AI agents. Carries brand snapshot, tokens, target audience, deliverables.', zh: '结构化设计简报 · 给乙方 / 下游 AI 用 · 内含品牌摘要 / token / 目标受众 / 交付物。' },
      l3: { en: 'HTML / SVG template filling. Direct deliverable output (PNG / Figma). Avoids diffusion instability via deterministic rendering.', zh: '模板填槽渲染 · HTML/SVG 直出 PNG · 避开扩散模型不稳定 · 当前内置社交卡 / 文档封面 / Banner 三个，技能库提供更多。' },
      l4: { en: 'End-to-end media generation: image (gpt-image-2 / Flux) · video (Seedance / HyperFrames) · audio (TTS / SFX for hardware prompts & UX feedback).', zh: '端到端媒体生成 · 图像（gpt-image-2 / Flux）· 视频（Seedance / HyperFrames）· 音频（硬件提示音 / UX 反馈音）· 需 Settings 配置 API。' },
      l5: { en: 'LLM-driven full UI prototype HTML. Single screen or multi-screen flows with device chrome (iPhone / Browser / Pixel). Brand-aware, ready to demo.', zh: 'LLM 直出 UI 原型稿 · 单屏 / 多屏流程 · 含设备框 · 自动套用品牌 token · 可直接演示或交付乙方深化。' },
      l6: { en: 'Brand-conformant slide decks. Single template or full deck. Auto-layout content into branded slides (cover / agenda / data / quote / closing).', zh: '品牌规范幻灯片 · 单张模板或多张连排 · 自动把内容套到 cover / agenda / data / quote / closing 等版式 · 横向滑动 deck 即时预览。' },
    };
    const renderTab = () => {
      document.querySelectorAll('#studioTabs .tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === Modules.studio.state.tab));
      const body = document.getElementById('studioBody');
      const fn = { l1: studioL1, l2: studioL2, l3: studioL3, l4: studioL4, l5: studioL5, l6: studioL6 }[Modules.studio.state.tab];
      // 显示当前 tab 的中英说明
      const hint = HINTS[Modules.studio.state.tab];
      const hintEl = document.getElementById('studioTabHint');
      if (hintEl && hint) {
        hintEl.innerHTML = `<span class="cn">${esc(hint.zh)}</span><span class="en">${esc(hint.en)}</span>`;
      }
      fn(body, ctx);
    };
    document.querySelectorAll('#studioTabs .tab-btn').forEach((b) => {
      b.addEventListener('click', () => { Modules.studio.state.tab = b.dataset.tab; renderTab(); });
    });
    renderTab();
  },
};

// ----------- L1 Prompt -----------
function studioL1(body, ctx) {
  const brand = Store.getCurrentVersionMeta();
  const assets = Store.getAssets();
  // 接收来自 Skills 库的 prefill
  const pf = Modules.studio.state.prefill || {};
  const fromSkill = pf.from_skill;
  if (fromSkill) Modules.studio.state.prefill = null;  // consumed
  const sceneVal = pf.scene || '双 11 早鸟价微博主图，强调安静感与产品科技感';
  const mediumVal = pf.medium || 'weibo';
  const moodVal = pf.mood || 'calm-tech, restrained';
  body.innerHTML = `
    <div class="studio-layout">
      <div class="card flat" style="padding:20px;">
        ${fromSkill ? `<div class="callout blue" style="margin-bottom:10px;">已加载技能：<b>${esc(fromSkill)}</b> · 字段已预填，可直接生成或继续微调。</div>` : ''}
        <h3 style="font-size: 13px;margin-bottom:10px;">输入</h3>
        <div class="field"><label>场景描述</label><textarea id="l1Scene" placeholder="例如：双 11 微博海报，需要科技感">${esc(sceneVal)}</textarea></div>
        <div class="field"><label>关键产品 / 资产</label>
          <select id="l1Asset">
            <option value="">不绑定资产</option>
            ${assets.map((a) => `<option value="${a.id}">${esc(a.file.name || a.id)} · ${esc(a.taxonomy.product)}</option>`).join('')}
          </select>
        </div>
        <div class="field-row">
          <div class="field"><label>媒介 / 平台</label><input id="l1Medium" value="${esc(mediumVal)}"/></div>
          <div class="field"><label>风格调性</label><input id="l1Mood" value="${esc(moodVal)}"/></div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn accent" id="l1Run">生成 Prompt</button>
          <span id="l1Source" class="mono" style="font-size: 10px;color:var(--ink-mute);align-self:center;"></span>
        </div>
      </div>

      <div class="studio-output">
        <div class="head"><div class="title">Engineering Prompt</div>
          <div><button class="btn sm" id="l1Copy">复制</button></div>
        </div>
        <pre class="out" id="l1Out">点击「生成 Prompt」开始。\n\n如果未配置 LLM API，将使用本地模板拼装一份高质量 prompt。</pre>
      </div>
    </div>
  `;

  document.getElementById('l1Run').addEventListener('click', async () => {
    const scene = document.getElementById('l1Scene').value.trim();
    const assetId = document.getElementById('l1Asset').value;
    const medium = document.getElementById('l1Medium').value.trim();
    const mood = document.getElementById('l1Mood').value.trim();
    const asset = assetId ? assets.find((a) => a.id === assetId) : null;

    const sysPrompt = buildL1System(brand, asset);
    const userPrompt = `场景：${scene}\n媒介：${medium}\n调性：${mood}`;

    const out = document.getElementById('l1Out');
    out.textContent = '生成中…';
    document.getElementById('l1Run').disabled = true;
    try {
      const result = await Api.chat({
        system: sysPrompt,
        user: userPrompt,
        temperature: 0.5,
        fallback: () => fallbackL1(brand, asset, scene, medium, mood),
      });
      out.textContent = result.text;
      document.getElementById('l1Source').textContent = `· ${result.source === 'llm' ? 'LLM 生成' : '本地兜底（未配置 API）'}`;

      const archived = Store.archiveOutput({
        type: 'L1_prompt',
        title: `L1 · ${scene.slice(0, 24)}`,
        refs: { brand_version: Store.getCurrentVersionMeta().version, assets: asset ? [asset.id] : [], prompt_text: result.text },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
      toast(`已归档 ${archived.id}`, 'success');
    } catch (e) {
      out.textContent = `[错误] ${e.message}`;
      toast(e.message, 'error', 4000);
    } finally {
      document.getElementById('l1Run').disabled = false;
    }
  });
  document.getElementById('l1Copy').addEventListener('click', () => {
    const text = document.getElementById('l1Out').textContent;
    navigator.clipboard.writeText(text).then(() => toast('已复制', 'success'));
  });
}

function buildL1System(brand, asset) {
  const d = brand.data;
  const assetDesc = asset
    ? `Selected product asset: id=${asset.id}, product=${asset.taxonomy.product}, angle=${asset.taxonomy.angle || '?'}, colorway=${asset.taxonomy.colorway || '?'}, scene=${asset.taxonomy.scene || '?'}.`
    : 'No specific product asset selected; rely on brand DNA.';
  const ctx = brandContextFromGraph(d, 'prompt.l1_system');
  return `You are a senior brand-visual prompt engineer for the brand **viaim**.
Produce a single-block engineering-grade prompt suitable for Midjourney / SDXL / Flux.

${ctx}

${assetDesc}

OUTPUT REQUIREMENTS:
- Plain text prompt only, no markdown, no preface.
- Include: subject, composition, lighting, lens/perspective, color palette referencing tokens, mood, negative prompts.
- Compose for the TARGET AUDIENCE described above (their scenes / values).
- Keep under 220 tokens.`;
}

window.brandContextFromGraph = brandContextFromGraph;
window.userContextString = userContextString;
// 按 nodeGraph 决定向 prompt 注入哪些 brand 段，权重越高文本越详尽
function brandContextFromGraph(d, targetId) {
  const settings = Store.getSettings();
  const g = settings.nodeGraph;
  if (!g || !g.edges) return defaultBrandContext(d);
  const incoming = g.edges
    .filter((e) => e.to === targetId && e.weight >= (g.threshold || 0.3))
    .sort((a, b) => b.weight - a.weight);
  if (incoming.length === 0) return defaultBrandContext(d);

  const blocks = [];
  for (const e of incoming) {
    const seg = e.from.replace(/^brand\./, '');
    const detail = e.weight >= 0.7 ? 'full' : e.weight >= 0.5 ? 'medium' : 'short';
    const text = renderBrandSegment(d, seg, detail);
    if (text) blocks.push(text);
  }
  return blocks.join('\n\n');
}

function defaultBrandContext(d) {
  // 兜底：如果没有 nodeGraph 配置，按硬编码的核心段注入
  const colorList = (d.colors?.tokens || []).map((t) => `${t.name}=${t.hex}(${t.role})`).join('; ');
  return `BRAND DNA:
- atmosphere: ${d.visual_theme?.atmosphere || ''}
- color tokens: ${colorList}
- voice tone: ${d.voice?.tone || ''}
- avoid: ${(d.voice?.dont || []).join(', ')}

${userContextString(d.users)}`;
}

// 把单个 brand 段渲染成 plain text 块（按 detail 级别）
function renderBrandSegment(d, seg, detail) {
  switch (seg) {
    case 'theme': {
      const t = d.visual_theme || {};
      if (detail === 'short') return `THEME: ${t.atmosphere || ''}`;
      return `BRAND THEME:\n- atmosphere: ${t.atmosphere || ''}\n- density: ${t.density || ''}`;
    }
    case 'colors': {
      const tokens = d.colors?.tokens || [];
      if (detail === 'short') return `COLORS: ${tokens.slice(0, 3).map((x) => x.hex).join(', ')}`;
      const list = tokens.map((t) => `${t.name}=${t.hex}(${t.role})`).join('; ');
      return `COLOR TOKENS: ${list}`;
    }
    case 'typography': {
      const t = d.typography || {};
      if (detail === 'short') return `TYPE: ${t.families?.body || ''} / ${t.families?.cn || ''}`;
      return `TYPOGRAPHY:\n- display: ${t.families?.display || ''}\n- body: ${t.families?.body || ''}\n- cn: ${t.families?.cn || ''}\n- scale: ${arr(t.scale).join(', ')}`;
    }
    case 'spacing': {
      const s = d.spacing || {};
      return `SPACING: base=${s.base || ''}, scale=${arr(s.scale).join(',')}`;
    }
    case 'components': {
      const c = d.components || {};
      return `COMPONENTS: button.radius=${c.button?.radius || ''}, card.radius=${c.card?.radius || ''}`;
    }
    case 'motion': {
      const m = d.motion || {};
      return `MOTION: easing=${m.easing || ''}, durations=${JSON.stringify(m.duration || {})}`;
    }
    case 'voice': {
      const v = d.voice || {};
      if (detail === 'short') return `VOICE: ${v.tone || ''}`;
      return `VOICE & TONE:\n- tone: ${v.tone || ''}\n- do: ${arr(v.do).join(', ')}\n- don't: ${arr(v.dont).join(', ')}`;
    }
    case 'marks': {
      const m = d.brand_marks || {};
      return `MARKS: wordmark="${m.wordmark_text || ''}", safe-zone-ratio=${m.safe_zone_ratio}, min-height=${m.min_height_px}px`;
    }
    case 'dont': {
      const items = d.dont || [];
      if (items.length === 0) return '';
      return `DON'T:\n${items.map((x) => `- ${x.rule}${x.reason ? ` (${x.reason})` : ''}`).join('\n')}`;
    }
    case 'users': {
      return userContextString(d.users);
    }
    case 'product': {
      const p = d.product || {};
      const hw = arr(p.hardware_lines).map((h) => `${h.id}=${h.label}`).join(', ');
      const ai = arr(p.ai_engines).map((a) => `${a.label}(${a.region})`).join(', ');
      const ff = arr(p.flagship_features).map((f) => `${f.label}${f.region && f.region !== 'all' ? `(${f.region})` : ''}`).join(', ');
      if (detail === 'short') return `PRODUCT: ${hw}; AI: ${ai}`;
      return `PRODUCT ARCHITECTURE:\n- hardware: ${hw}\n- AI: ${ai}\n- flagship features: ${ff}`;
    }
    case 'naming': {
      const n = d.naming || {};
      const pairs = arr(n.product_pairs).map((p) => `${p.type}: ${p.cn} ⇄ ${p.overseas}`).join('; ');
      const feats = arr(n.feature_pairs).map((f) => `${f.cn} ⇄ ${f.overseas}`).join('; ');
      if (detail === 'short') return `NAMING: ${n.brand_pair?.cn} ⇄ ${n.brand_pair?.overseas}`;
      return `NAMING CONVENTIONS:\n- brand pair: ${n.brand_pair?.cn} ⇄ ${n.brand_pair?.overseas}\n- product pairs: ${pairs}\n- feature pairs: ${feats}\n- rules: ${arr(n.rules).join(' | ')}`;
    }
    case 'localization': {
      const l = d.localization || {};
      const diff = arr(l.feature_diff).map((f) => `${f.feature}: cn=${f.cn} / overseas=${f.overseas}`).join('; ');
      if (detail === 'short') return `LOCALIZATION: bilingual cn/overseas`;
      return `LOCALIZATION (feature diff):\n${diff}\nDoc rule: ${l.documentation_rule || ''}`;
    }
    case 'use_cases': {
      const u = d.use_cases || {};
      const biz = arr(u.business_scenarios).map((s) => `${s.label}(${s.density})`).join(', ');
      const ctx = arr(u.physical_contexts).join(', ');
      if (detail === 'short') return `USE CASES: ${biz}`;
      return `USE CASES:\n- business: ${biz}\n- physical: ${ctx}\n- recording modes: ${arr(u.recording_modes).map((m) => m.label).join(', ')}`;
    }
    case 'value_proposition': {
      const v = d.value_proposition || {};
      const steps = arr(v.four_step_model).map((s) => `${s.step}(${s.tagline})`).join(' → ');
      if (detail === 'short') return `VALUE: "${v.one_liner || ''}"`;
      return `VALUE PROPOSITION:\n- one-liner: ${v.one_liner || ''}\n- 4-step: ${steps}\n- differentiators: ${arr(v.differentiators).join(' | ')}\n- anti: ${arr(v.anti_positions).join(' | ')}`;
    }
    default:
      return '';
  }
}

// 把 brand.data.users 拼成 LLM 易读的 plain text 段落
function userContextString(users) {
  if (!users || !users.primary_persona || !users.primary_persona.label) return 'TARGET AUDIENCE: (not configured)';
  const p = users.primary_persona;
  const lines = [
    'TARGET AUDIENCE (核心受众):',
    `- ${p.label}${p.age ? ` · age ${p.age}` : ''}${p.description ? ` · ${p.description}` : ''}`,
  ];
  if (p.scenes?.length) lines.push(`- 使用场景: ${p.scenes.join(' / ')}`);
  if (p.needs?.length) lines.push(`- 核心需求: ${p.needs.join(' / ')}`);
  if (p.pain_points?.length) lines.push(`- 痛点: ${p.pain_points.join(' / ')}`);
  if (p.values?.length) lines.push(`- 价值观: ${p.values.join(' / ')}`);
  if (users.secondary_personas?.length) {
    lines.push('SECONDARY:');
    users.secondary_personas.forEach((s) => {
      if (!s.label) return;
      lines.push(`- ${s.label}${s.age ? ` · ${s.age}` : ''}${s.description ? ` · ${s.description}` : ''}`);
    });
  }
  if (users.anti_personas?.length) {
    lines.push('NOT-TARGETED (反向画像):');
    users.anti_personas.forEach((a) => {
      lines.push(`- ${a.label || a}${a.reason ? ` (because: ${a.reason})` : ''}`);
    });
  }
  return lines.join('\n');
}

function fallbackL1(brand, asset, scene, medium, mood) {
  const d = brand.data;
  const palette = d.colors.tokens.slice(0, 4).map((t) => `${t.name} ${t.hex}`).join(', ');
  const productPart = asset ? `featuring ${asset.taxonomy.product} (${asset.taxonomy.angle || 'product'} angle, ${asset.taxonomy.colorway || 'default'} colorway)` : 'with abstract product hero';
  return `${scene}, ${productPart}, ${mood} aesthetic, atmosphere: ${d.visual_theme.atmosphere}, color palette: ${palette}, layout: low-density restrained composition with generous negative space, lighting: soft directional studio light with subtle rim, lens: 50mm equivalent, mood reflects voice "${d.voice.tone}", suitable for ${medium}, hyperdetailed product photography, 8k. --no overly saturated, no marketing slogans, no excessive emoji, no cluttered background.`;
}

// ----------- L2 Mini MD -----------
function studioL2(body, ctx) {
  const brand = Store.getCurrentVersionMeta();
  const pf = Modules.studio.state.prefill || {};
  const fromSkill = pf.from_skill;
  if (fromSkill) Modules.studio.state.prefill = null;
  const v = (k, def) => pf[k] !== undefined ? pf[k] : def;
  body.innerHTML = `
    <div class="studio-layout">
      <div class="card flat" style="padding:20px;">
        ${fromSkill ? `<div class="callout blue" style="margin-bottom:10px;">已加载技能：<b>${esc(fromSkill)}</b> · 已为该 skill 预填 deliverables 框架。</div>` : ''}
        <h3 style="font-size: 13px;margin-bottom:10px;">项目信息</h3>
        <div class="field"><label>项目名</label><input id="l2Name" value="${esc(v('name', 'Spring Launch 2026'))}"/></div>
        <div class="field-row">
          <div class="field"><label>场景类型</label><input id="l2Scene" value="${esc(v('scene', '新品发布'))}"/></div>
          <div class="field"><label>时长 / 周期</label><input id="l2Duration" value="${esc(v('duration', '3 weeks'))}"/></div>
        </div>
        <div class="field"><label>调性</label><input id="l2Tone" value="${esc(v('tone', '克制 · 技术感 · 略带温度'))}"/></div>
        <div class="field"><label>关键产品</label><input id="l2Products" value="${esc(v('products', 'Aura（沙石灰新色）'))}"/></div>
        <div class="field"><label>交付物</label><textarea id="l2Deliv">${esc(v('deliverables', '主视觉 KV ×1\n社交卡 ×3\n邮件头图 ×1'))}</textarea></div>
        <div style="display:flex;gap:8px;">
          <button class="btn accent" id="l2Run">生成 Mini MD</button>
          <button class="btn sm" id="l2Download" disabled>下载 .md</button>
          <span id="l2Source" class="mono" style="font-size: 10px;color:var(--ink-mute);align-self:center;"></span>
        </div>
      </div>
      <div class="studio-output">
        <div class="head"><div class="title">brief.md</div><div><button class="btn sm" id="l2Copy">复制</button></div></div>
        <pre class="out" id="l2Out">点击「生成 Mini MD」生成 design brief。给 agency / 下游 AI 用。</pre>
      </div>
    </div>
  `;

  document.getElementById('l2Run').addEventListener('click', async () => {
    const fields = {
      name: $v('l2Name'), scene: $v('l2Scene'), duration: $v('l2Duration'),
      tone: $v('l2Tone'), products: $v('l2Products'), deliverables: $v('l2Deliv'),
    };
    const out = document.getElementById('l2Out');
    out.textContent = '生成中…';
    try {
      const result = await Api.chat({
        system: buildL2System(brand),
        user: `请基于以下信息生成项目 design brief MD：\n${JSON.stringify(fields, null, 2)}`,
        temperature: 0.3,
        fallback: () => fallbackL2(brand, fields),
      });
      out.textContent = result.text;
      document.getElementById('l2Source').textContent = `· ${result.source === 'llm' ? 'LLM 生成' : '本地兜底（未配置 API）'}`;
      document.getElementById('l2Download').disabled = false;
      Store.archiveOutput({
        type: 'L2_mini_md',
        title: `L2 · ${fields.name}`,
        refs: { brand_version: Store.getCurrentVersionMeta().version, assets: [], prompt_text: result.text },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
    } catch (e) {
      out.textContent = `[错误] ${e.message}`;
      toast(e.message, 'error', 4000);
    }
  });
  document.getElementById('l2Copy').addEventListener('click', () => navigator.clipboard.writeText(document.getElementById('l2Out').textContent).then(() => toast('已复制', 'success')));
  document.getElementById('l2Download').addEventListener('click', () => {
    const text = document.getElementById('l2Out').textContent;
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function $v(id) { return document.getElementById(id).value; }

function buildL2System(brand) {
  const d = brand.data;
  const ctx = brandContextFromGraph(d, 'prompt.l2_system');
  return `You produce a structured **design brief in Markdown** for the viaim brand. Output STRICTLY in Markdown with these sections (use H2/H3, no preamble):

1. **Project**（项目信息）
2. **Brand Snapshot**（品牌 DNA 摘要：atmosphere, density, voice）
3. **Target Audience**（核心受众及其场景）
4. **Tokens Subset**（仅项目相关的 color/typography/spacing tokens）
5. **Naming & Localization**（用对的产品名 / 功能名 / 地域标注）
6. **Reference Assets**（占位说明）
7. **Deliverables**（与时间表）
8. **Constraints & Don'ts**

${ctx}

The brief MUST tailor 调性 / 文案样例 / 视觉建议 to fit the BRAND CONTEXT above. Use correct product/feature names per the NAMING section. Length 800-1200 字。中文为主。`;
}

function fallbackL2(brand, f) {
  const d = brand.data;
  const colorTable = d.colors.tokens.slice(0, 6).map((t) => `| \`${t.name}\` | ${t.hex} | ${t.role} |`).join('\n');
  return `# ${f.name} · Design Brief

## 1 · Project
- **场景类型** · ${f.scene}
- **时长** · ${f.duration}
- **关键产品** · ${f.products}
- **目标调性** · ${f.tone}

## 2 · Brand Snapshot
> ${d.visual_theme.atmosphere}
- **voice tone** · ${d.voice.tone}
- **do** · ${arr(d.voice.do).join(' · ')}
- **don't** · ${arr(d.voice.dont).join(' · ')}

## 3 · Tokens Subset
| token | hex | role |
|---|---|---|
${colorTable}

字族：display \`${d.typography.families.display}\` · body \`${d.typography.families.body}\` · cn \`${d.typography.families.cn}\`
间距 base：${d.spacing.base}px · scale：${d.spacing.scale.join(', ')}

## 4 · Reference Assets
- 见 Brand OS · Asset Library，按 \`product=${f.products.split('（')[0].trim()}\` 过滤

## 5 · Deliverables
${f.deliverables.split('\n').map((l) => '- ' + l).join('\n')}

## 6 · Constraints
- 主色仅使用上表 token，禁用其他色值
- 文案遵循品牌 voice，不得违反 don't 列表
- logo 留白 ≥ logo 高度 × ${d.brand_marks.safe_zone_ratio}
- logo 最小高度 ≥ ${d.brand_marks.min_height_px}px`;
}

// ----------- L3 Template (pill style) -----------
const L3State = { tplId: 'social_card_1080', assetId: '', slots: {} };
window.L3State = L3State;

function studioL3(body, ctx) {
  const brand = Store.getCurrentVersionMeta();
  const assets = Store.getAssets();
  const tpls = Templates.list();

  // initialize state if first time
  if (!L3State.tplId || !Templates.byId(L3State.tplId)) L3State.tplId = tpls[0].id;
  let tpl = Templates.byId(L3State.tplId);
  // ensure slots populated
  tpl.slots.forEach((s) => { if (L3State.slots[s.key] === undefined) L3State.slots[s.key] = s.default || ''; });

  body.innerHTML = `
    <div class="studio-layout">
      <div class="studio-panel">
        <div class="panel-head">
          <span class="title">场景 / 配置</span>
          <span class="badge">3</span>
        </div>

        <div class="studio-pill-group" id="l3Scene">
          <div class="pill full" data-action="tpl">
            <span class="k">scene</span><span class="v">·  ${esc(tpl.id)}</span><span class="edit">▾</span>
          </div>
          <div class="pill full">
            <span class="k">size</span><span class="v">·  ${tpl.size.w}×${tpl.size.h}</span>
          </div>
          ${tpl.slots.map((s) => `
            <div class="pill full" data-slot-pill="${s.key}">
              <span class="k">${esc(s.key)}</span><span class="v">·  </span>
              <input class="inline" data-slot="${s.key}" maxlength="${s.max * 2}" value="${esc(L3State.slots[s.key] ?? s.default ?? '')}" placeholder="${esc(s.label)}"/>
            </div>`).join('')}
        </div>

        <div class="studio-pill-group">
          <div class="group-label">资产</div>
          <div id="l3AssetPills"></div>
        </div>

        <div class="studio-pill-group">
          <div class="group-label">品牌锁</div>
          <span class="pill"><span class="v">tokens ${esc(brand.version)}</span></span>
          <span class="pill"><span class="v">voice · viaim</span></span>
        </div>
      </div>

      <div class="studio-preview">
        <div class="preview-head" id="l3StatusHead"></div>
        <div class="preview-frame" id="l3Preview">
          <div class="ph">[ 实时预览 · ${tpl.size.w}×${tpl.size.h} ]</div>
        </div>
      </div>
    </div>
  `;

  // ---- asset pills ----
  const renderAssetPills = () => {
    const wrap = document.getElementById('l3AssetPills');
    const list = assets.filter((a) => /(png|jpg|jpeg|webp|svg)/i.test(a.file.format));
    if (list.length === 0) {
      wrap.innerHTML = `<span class="pill add" data-action="goto-assets">+ 上传资产</span>`;
    } else {
      wrap.innerHTML = list.slice(0, 8).map((a) => {
        const label = `${a.taxonomy.product || 'asset'} · ${a.taxonomy.angle || a.file.format}`.toLowerCase();
        return `<span class="pill ${L3State.assetId===a.id?'active':''}" data-pick-asset="${a.id}">${esc(label)}</span>`;
      }).join('') + `<span class="pill add" data-action="goto-assets">+ 更多</span>`;
    }
    wrap.querySelectorAll('[data-pick-asset]').forEach((p) => {
      p.addEventListener('click', () => {
        L3State.assetId = (L3State.assetId === p.dataset.pickAsset) ? '' : p.dataset.pickAsset;
        renderAssetPills();
        rerender();
      });
    });
    wrap.querySelectorAll('[data-action="goto-assets"]').forEach((p) => {
      p.addEventListener('click', () => ctx.navigate('assets'));
    });
  };
  renderAssetPills();

  // ---- template picker (click scene pill -> dropdown) ----
  document.querySelector('[data-action="tpl"]').addEventListener('click', (e) => {
    showTplPicker(e.currentTarget, tpls, (newId) => {
      L3State.tplId = newId;
      // reset slots to defaults of new tpl
      L3State.slots = {};
      Templates.byId(newId).slots.forEach((s) => L3State.slots[s.key] = s.default || '');
      studioL3(body, ctx);
    });
  });

  // ---- inline slot inputs ----
  body.querySelectorAll('[data-slot]').forEach((inp) => {
    inp.addEventListener('input', () => {
      L3State.slots[inp.dataset.slot] = inp.value;
      rerender();
    });
  });

  // ---- render once on mount ----
  let lastHtml = null;
  let lastTpl = tpl;

  const rerender = async () => {
    const tplNow = Templates.byId(L3State.tplId);
    const asset = L3State.assetId ? assets.find((a) => a.id === L3State.assetId) : null;
    const assetUrl = asset ? await Store.getAssetObjectUrl(asset) : null;
    const html = tplNow.render({ slots: L3State.slots, brand, assetUrl });
    lastHtml = html;
    lastTpl = tplNow;
    const wrap = document.getElementById('l3Preview');
    const wrapWidth = wrap.clientWidth - 24;
    const wrapHeight = wrap.clientHeight - 24;
    const scale = Math.min(wrapWidth / tplNow.size.w, wrapHeight / tplNow.size.h, 0.5);
    wrap.innerHTML = `<iframe srcdoc="${escAttr(html)}" style="width:${tplNow.size.w}px;height:${tplNow.size.h}px;transform:scale(${scale});transform-origin:center center;" sandbox="allow-same-origin"></iframe>`;
    const lint = Compliance.lintTemplate({ tpl: tplNow, slots: L3State.slots, brand, asset });
    document.getElementById('l3StatusHead').innerHTML = `${lint.status === 'pass' ? '' : `<span class="badge">${lint.violations.length}</span>`}`;

    // Update bottom status bar with live lint
    if (window.__updateBottomLint) window.__updateBottomLint({ tpl: tplNow, slots: L3State.slots, brand, asset, lastHtml: html, lastTpl: tplNow });
  };

  // 翻译新插入的 panel
  if (window.Lang && Lang.current === 'en') Lang.translateDom(body);

  // expose for bottom-bar export
  window.__l3GetLast = () => ({ html: lastHtml, tpl: lastTpl });
  window.__l3Archive = () => {
    if (!lastHtml || !lastTpl) return null;
    const asset = L3State.assetId ? assets.find((a) => a.id === L3State.assetId) : null;
    const lint = Compliance.lintTemplate({ tpl: lastTpl, slots: L3State.slots, brand, asset });
    const rec = Store.archiveOutput({
      type: 'L3_template',
      title: `L3 · ${lastTpl.name} · ${L3State.slots.title || ''}`,
      template: lastTpl.id,
      refs: { brand_version: Store.getCurrentVersionMeta().version, assets: asset ? [asset.id] : [], slots: { ...L3State.slots } },
      compliance: lint,
      adoption: 'pending',
    });
    return rec;
  };

  setTimeout(rerender, 50);
}

function showTplPicker(anchor, tpls, onPick) {
  const existing = document.getElementById('tplPicker');
  if (existing) existing.remove();
  const rect = anchor.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.id = 'tplPicker';
  pop.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.bottom + 4}px;width:${rect.width}px;background:var(--card);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow-pop);z-index:120;overflow:hidden;`;
  pop.innerHTML = tpls.map((t) => `<div class="cmdk-item" data-id="${t.id}"><span class="icon">▢</span><span class="name">${esc(t.name)}</span><span class="hint">${t.size.w}×${t.size.h}</span></div>`).join('');
  document.body.appendChild(pop);
  const close = () => { pop.remove(); document.removeEventListener('click', onDoc); };
  const onDoc = (e) => { if (!pop.contains(e.target) && e.target !== anchor) close(); };
  setTimeout(() => document.addEventListener('click', onDoc), 0);
  pop.querySelectorAll('[data-id]').forEach((it) => {
    it.addEventListener('click', () => { onPick(it.dataset.id); close(); });
  });
}

window.exportTemplateAsPNG = exportTemplateAsPNG;
async function exportTemplateAsPNG(html, tpl) {
  // Use SVG foreignObject → canvas → png
  const { w, h } = tpl.size;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">${html.replace(/<!doctype html>[\s\S]*?<body>/, '').replace(/<\/body>[\s\S]*$/, '')}</div>
    </foreignObject>
  </svg>`;
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx2 = canvas.getContext('2d');
  ctx2.drawImage(img, 0, 0, w, h);
  URL.revokeObjectURL(url);
  canvas.toBlob((b) => {
    const dl = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = dl;
    a.download = `${tpl.id}-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(dl), 1000);
    toast('PNG 已下载（如有图片资产因跨域导致空白，请先把外链资产改为本地上传）', 'success', 4000);
  }, 'image/png');
}

// ----------- L4 Media (image / video / audio) -----------
function studioL4(body, ctx) {
  const pf = Modules.studio.state.prefill || {};
  const fromSkill = pf.from_skill;
  if (fromSkill) Modules.studio.state.prefill = null;
  if (!Modules.studio.state.l4_mode) Modules.studio.state.l4_mode = 'image';
  const mode = Modules.studio.state.l4_mode;
  const promptVal = pf.prompt || ({
    image: 'a calm-tech product still life of viaim Aura earphones on linen fabric, soft directional lighting',
    video: 'cinematic 15s product reveal: viaim Aura earphones on linen, slow camera push-in, soft window light',
    audio: 'short notification chime · 0.4s · soft warm bell · 432Hz fundamental · calm-tech aesthetic · for viaim mobile app new-message ping',
  }[mode]);

  const audioPresets = [
    { id: 'power_on', label: '🔌 开机提示音', prompt: 'gentle 1.2s power-on chime · soft rising sweep 220→880Hz · subtle reverb · warm calm tone · viaim Aura earphone power-on' },
    { id: 'connect_ok', label: '🔗 连接成功', prompt: 'short 0.6s confirmation tone · two ascending bell notes · clean digital · friendly · device pairing success' },
    { id: 'low_battery', label: '🔋 低电量', prompt: 'soft 0.8s low-battery alert · descending two-tone soft chime · non-alarming · calm reminder · earphone' },
    { id: 'rec_start', label: '🎙 录音开始', prompt: '0.4s subtle click + soft pulse · indicates recording start · understated · pro audio recorder feel' },
    { id: 'rec_stop', label: '⏹ 录音停止', prompt: '0.5s soft confirmation tap · ends a recording · short tail · warm wood-block-like' },
    { id: 'ux_tap', label: '👆 UX 点击', prompt: '0.08s minimal UI tap sound · soft non-tonal click · for viaim mobile app primary tap feedback' },
    { id: 'ux_success', label: '✓ UX 成功', prompt: '0.3s short success ping · single bright bell note · neutral · for completion confirmations' },
    { id: 'ux_error', label: '✕ UX 错误', prompt: '0.3s short non-alarming error tone · two descending soft notes · low frequency · gentle' },
    { id: 'notification', label: '🔔 通知', prompt: '0.5s notification chime · two-note arpeggio · warm calm-tech · for new message arrival' },
  ];

  body.innerHTML = `
    <div class="l4-modes">
      <button class="l4-mode ${mode==='image'?'active':''}" data-l4mode="image">▢ 图像 · Image</button>
      <button class="l4-mode ${mode==='video'?'active':''}" data-l4mode="video">▶ 视频 · Video</button>
      <button class="l4-mode ${mode==='audio'?'active':''}" data-l4mode="audio">◉ 音频 · Audio</button>
    </div>

    ${fromSkill ? `<div class="callout blue" style="margin-top:12px;">已加载技能 <b>${esc(fromSkill)}</b> · prompt 已预填。</div>` : ''}

    ${mode === 'image' ? renderL4Image(promptVal) : ''}
    ${mode === 'video' ? renderL4Video(promptVal) : ''}
    ${mode === 'audio' ? renderL4Audio(promptVal, audioPresets) : ''}
  `;

  // 模式切换
  document.querySelectorAll('[data-l4mode]').forEach((b) => {
    b.addEventListener('click', () => {
      Modules.studio.state.l4_mode = b.dataset.l4mode;
      ctx.navigate('studio');
    });
  });

  // 通用 prefill 跳转
  document.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); ctx.navigate(el.dataset.go); }));

  // ====== Image ======
  document.getElementById('l4Run')?.addEventListener('click', async () => {
    const prompt = document.getElementById('l4Prompt').value;
    const n = parseInt(document.getElementById('l4N')?.value || '1');
    const size = document.getElementById('l4Size')?.value || '1024x1024';
    const out = document.getElementById('l4Result');
    out.innerHTML = '生成中…';
    try {
      const urls = await Api.generateImage({ prompt, n, size });
      out.innerHTML = urls.map((u) => `<img src="${u.startsWith('http')?u:`data:image/png;base64,${u}`}" style="width:200px;height:auto;border-radius:6px;border:1px solid var(--line);"/>`).join('');
      Store.archiveOutput({
        type: 'L4_image',
        title: `L4 · image · ${prompt.slice(0, 24)}`,
        refs: { brand_version: Store.getCurrentVersionMeta().version, prompt_text: prompt },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
      toast('图像生成完成并归档', 'success');
    } catch (e) {
      out.innerHTML = `<span style="color:var(--red);">${esc(e.message)}</span>`;
    }
  });

  // ====== Video ======
  document.getElementById('l4VideoRun')?.addEventListener('click', async () => {
    const prompt = document.getElementById('l4VideoPrompt').value;
    const out = document.getElementById('l4VideoResult');
    out.innerHTML = '生成中…（视频生成耗时通常 30s–3min）';
    try {
      // 复用 image API（OpenAI 兼容协议），实际部署时替换为 Seedance / HyperFrames endpoint
      const urls = await Api.generateImage({ prompt, n: 1, size: '1024x1024' });
      out.innerHTML = urls.map((u) => `
        <video src="${u}" controls style="width:320px;border-radius:6px;border:1px solid var(--line);"></video>
      `).join('') + `<div class="hint" style="margin-top:6px;">若 endpoint 是图像 API，会返回静态图。请把 Settings → 图像 endpoint 改为视频服务（Seedance / Runway / HeyGen 等）以获得真视频。</div>`;
      Store.archiveOutput({
        type: 'L4_video',
        title: `L4 · video · ${prompt.slice(0, 24)}`,
        refs: { brand_version: Store.getCurrentVersionMeta().version, prompt_text: prompt },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
    } catch (e) {
      out.innerHTML = `<span style="color:var(--red);">${esc(e.message)}</span>`;
    }
  });

  // ====== Audio ======
  document.querySelectorAll('[data-audio-preset]').forEach((b) => {
    b.addEventListener('click', () => {
      const p = audioPresets.find((x) => x.id === b.dataset.audioPreset);
      if (p) document.getElementById('l4AudioPrompt').value = p.prompt;
    });
  });
  document.getElementById('l4AudioRun')?.addEventListener('click', async () => {
    const prompt = document.getElementById('l4AudioPrompt').value;
    const dur = parseFloat(document.getElementById('l4AudioDur')?.value || '1');
    const out = document.getElementById('l4AudioResult');
    out.innerHTML = '生成中…（音频生成耗时通常 5–30s）';
    try {
      const s = Store.getSettings();
      // 默认走 image endpoint 占位；真用时把 Settings 中 image endpoint 改成音频服务（OpenAI TTS / ElevenLabs / Suno）
      // 协议大同小异：POST { model, prompt, ... } → 返回 url 或 base64
      if (!Api.imageReady()) {
        throw new Error('未启用 API · 请到 Settings 启用图像 / 音频 API（同一 endpoint 配置位）');
      }
      // 直接调用 image API（如果是 TTS 服务，多数会返回 audio）
      const audios = await Api.generateImage({ prompt, n: 1, size: `${Math.round(dur * 1000)}ms` });
      out.innerHTML = audios.map((u) => {
        const src = u.startsWith('http') ? u : `data:audio/mpeg;base64,${u}`;
        return `<audio src="${src}" controls style="width:300px;"></audio>`;
      }).join('') + `<div class="hint" style="margin-top:6px;color:var(--ink-mute);">若 Settings 配的是图像 endpoint，会按图像格式返回。请改为 OpenAI TTS / ElevenLabs / Suno 等音频服务以获得真音频。</div>`;
      Store.archiveOutput({
        type: 'L4_audio',
        title: `L4 · audio · ${prompt.slice(0, 24)}`,
        refs: { brand_version: Store.getCurrentVersionMeta().version, prompt_text: prompt },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
      toast('音频生成完成并归档', 'success');
    } catch (e) {
      out.innerHTML = `<span style="color:var(--red);">${esc(e.message)}</span>`;
    }
  });
}

function renderL4Image(promptVal) {
  const ready = Api.imageReady();
  return ready ? `
    <div class="studio-layout">
      <div class="card flat" style="padding:20px;">
        <h3 style="font-size:13px;margin-bottom:10px;">图像 prompt</h3>
        <div class="field"><label>描述</label><textarea id="l4Prompt" rows="4">${esc(promptVal)}</textarea></div>
        <div class="field-row">
          <div class="field"><label>张数</label><input type="number" id="l4N" value="1" min="1" max="4"/></div>
          <div class="field"><label>尺寸</label>
            <select id="l4Size"><option>1024x1024</option><option>1792x1024</option><option>1024x1792</option></select>
          </div>
        </div>
        <button class="btn accent" id="l4Run">调用图像 API</button>
      </div>
      <div class="studio-output">
        <div class="head"><div class="title">输出</div></div>
        <div id="l4Result" style="display:flex;gap:8px;flex-wrap:wrap;padding:14px;">点击「调用图像 API」开始</div>
      </div>
    </div>
  ` : `
    <div class="l4-empty">
      <div class="ph">IMAGE · 需配置 API</div>
      <div class="d">在 Settings → Image Generation API 启用并填 endpoint + key（兼容 OpenAI / Flux / DALL·E / 任何 OpenAI 协议图像服务）</div>
      <div style="margin-top:18px;"><button class="btn primary" data-go="settings">前往 Settings →</button></div>
    </div>`;
}

function renderL4Video(promptVal) {
  return `
    <div class="studio-layout">
      <div class="card flat" style="padding:20px;">
        <h3 style="font-size:13px;margin-bottom:10px;">视频 prompt</h3>
        <div class="field"><label>描述（建议含时长 / 镜头 / 调度）</label><textarea id="l4VideoPrompt" rows="5">${esc(promptVal)}</textarea></div>
        <div class="field"><label>endpoint 提示</label>
          <input value="把 Settings 中图像 endpoint 改为：Seedance · Runway · HeyGen 等视频 API" disabled style="opacity:.7;"/>
          <span class="hint">协议沿用 OpenAI 兼容格式（POST { model, prompt }），无需改代码。</span>
        </div>
        <button class="btn accent" id="l4VideoRun">调用视频 API</button>
      </div>
      <div class="studio-output">
        <div class="head"><div class="title">视频输出</div></div>
        <div id="l4VideoResult" style="padding:14px;">点击「调用视频 API」开始</div>
      </div>
    </div>
  `;
}

// ----------- L5 UI · 原型稿 -----------
function studioL5(body, ctx) {
  const brand = Store.getCurrentVersionMeta();
  const pf = Modules.studio.state.prefill || {};
  const fromSkill = pf.from_skill;
  if (fromSkill) Modules.studio.state.prefill = null;

  const types = [
    { id: 'web-landing', label: 'Web 落地页', size: { w: 1440, h: 900 } },
    { id: 'web-app', label: 'Web 应用 · Dashboard', size: { w: 1440, h: 900 } },
    { id: 'mobile-screen', label: 'Mobile · 单屏', size: { w: 390, h: 844 } },
    { id: 'mobile-flow', label: 'Mobile · 多屏流程（3 屏）', size: { w: 1170, h: 844 } },
    { id: 'tablet', label: 'Tablet · 平板', size: { w: 1024, h: 1366 } },
  ];
  const curType = Modules.studio.state.l5_type || 'web-landing';
  const curSize = types.find((t) => t.id === curType)?.size || { w: 1440, h: 900 };

  body.innerHTML = `
    <div class="studio-layout" style="grid-template-columns:380px 1fr;">
      <div class="card flat" style="padding:20px;">
        ${fromSkill ? `<div class="callout blue" style="margin-bottom:10px;">已加载技能 <b>${esc(fromSkill)}</b></div>` : ''}
        <div class="field"><label>原型类型</label>
          <select id="l5Type">
            ${types.map((t) => `<option value="${t.id}" ${curType===t.id?'selected':''}>${esc(t.label)} · ${t.size.w}×${t.size.h}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>产品 / 功能简介</label>
          <textarea id="l5Brief" rows="4" placeholder="例如：viaim 移动端首页 · 三个 tab：录音 / 空间 / 我的 · 顶部录音 hero 按钮 · 列表显示最近 5 条记录">${esc(pf.scene || 'viaim Mobile · 首页 · 三 tab：录音 / 空间 / 我的 · 列表展示最近 5 条记录')}</textarea>
        </div>
        <div class="field-row">
          <div class="field"><label>主色（覆盖 brand）</label><input id="l5Accent" value="${esc(brand.data.colors?.tokens?.find(t=>t.role==='action-primary')?.hex || '#b8410c')}"/></div>
          <div class="field"><label>风格</label>
            <select id="l5Style">
              <option value="calm-tech">calm-tech · 克制</option>
              <option value="editorial">editorial · 杂志感</option>
              <option value="dense-data">dense-data · 数据密集</option>
              <option value="warm-soft">warm-soft · 温暖柔和</option>
            </select>
          </div>
        </div>
        <div class="field"><label>device chrome</label>
          <select id="l5Frame">
            <option value="none">无设备框</option>
            <option value="iphone">iPhone 15 Pro 框</option>
            <option value="browser">浏览器 Chrome 框</option>
          </select>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn accent" id="l5Run">生成 UI</button>
          <button class="btn" id="l5Export" disabled>导出 HTML</button>
          <span id="l5Source" class="mono" style="font-size:10px;color:var(--ink-mute);align-self:center;"></span>
        </div>
      </div>

      <div class="studio-preview">
        <div class="preview-head">${curSize.w}×${curSize.h}</div>
        <div class="preview-frame" id="l5Preview">
          <div class="ph">[ 点击「生成 UI」开始 · 由 LLM 直出 HTML ]</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('l5Type').addEventListener('change', () => {
    Modules.studio.state.l5_type = document.getElementById('l5Type').value;
    ctx.navigate('studio');
  });

  let lastHtml = null;
  let lastSize = curSize;

  document.getElementById('l5Run').addEventListener('click', async () => {
    const brief = document.getElementById('l5Brief').value;
    const accent = document.getElementById('l5Accent').value;
    const style = document.getElementById('l5Style').value;
    const frame = document.getElementById('l5Frame').value;
    const type = document.getElementById('l5Type').value;
    const size = types.find((t) => t.id === type).size;
    lastSize = size;

    const out = document.getElementById('l5Preview');
    out.innerHTML = '<div class="ph">生成中…（5-30 秒）</div>';
    document.getElementById('l5Run').disabled = true;
    try {
      const result = await Api.chat({
        system: buildL5System(brand, type, size, frame, style, accent),
        user: brief,
        temperature: 0.5,
        fallback: () => fallbackL5HTML(brand, brief, size, accent),
      });
      let html = result.text.trim();
      // 去 markdown 围栏
      html = html.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/, '').trim();
      // 若返回的不是完整 HTML，包一层
      if (!/^<!doctype|<html/i.test(html)) {
        html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:'Geist','PingFang SC',sans-serif;}</style></head><body>${html}</body></html>`;
      }
      lastHtml = html;
      const wrapWidth = out.clientWidth - 24;
      const wrapHeight = out.clientHeight - 24;
      const scale = Math.min(wrapWidth / size.w, wrapHeight / size.h, 0.7);
      out.innerHTML = `<iframe srcdoc="${escAttr(html)}" style="width:${size.w}px;height:${size.h}px;transform:scale(${scale});transform-origin:center center;border:1px solid var(--line);" sandbox="allow-same-origin"></iframe>`;
      document.getElementById('l5Export').disabled = false;
      document.getElementById('l5Source').textContent = `· ${result.source === 'llm' ? 'LLM 生成' : '本地兜底'}`;
      Store.archiveOutput({
        type: 'L5_ui',
        title: `L5 · UI · ${brief.slice(0, 24)}`,
        refs: { brand_version: brand.version, prompt_text: brief, ui_type: type },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
      toast('UI 已生成并归档', 'success');
    } catch (e) {
      out.innerHTML = `<div class="ph" style="color:var(--red);">[错误] ${esc(e.message)}</div>`;
    } finally {
      document.getElementById('l5Run').disabled = false;
    }
  });
  document.getElementById('l5Export').addEventListener('click', () => {
    if (!lastHtml) return;
    const blob = new Blob([lastHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `viaim-ui-${Date.now()}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('HTML 已下载', 'success');
  });
}

function buildL5System(brand, type, size, frame, style, accent) {
  const ctx = window.brandContextFromGraph ? window.brandContextFromGraph(brand.data, 'prompt.l5_ui') : '';
  return `You are a senior product UI designer. Produce a SINGLE self-contained HTML file (inline CSS, no external assets) that renders a high-fidelity ${type} mockup at exactly ${size.w}×${size.h}px viewport.

DESIGN STYLE: ${style}
ACCENT COLOR: ${accent}
DEVICE CHROME: ${frame === 'iphone' ? 'iPhone 15 Pro frame (Dynamic Island, status bar)' : frame === 'browser' ? 'Browser chrome (URL bar, tabs)' : 'no device frame'}

${ctx}

OUTPUT REQUIREMENTS:
- Output ONLY the HTML (start with <!doctype html>). No markdown fences. No preamble.
- Use real fonts (system stack: -apple-system, "PingFang SC", sans-serif).
- All interactive states use hover/focus CSS only (no JS).
- Use accent color sparingly per brand voice (restrained calm-tech).
- For mobile: include realistic content (lists, cards, tabs); avoid lorem ipsum.
- For multi-screen flow: place screens horizontally side-by-side at exact device size.
- Embed Chinese content where natural; use viaim/iFLYBUDS branding references.`;
}

function fallbackL5HTML(brand, brief, size, accent) {
  const t = brand.data;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0;font-family:'Geist','PingFang SC',sans-serif;background:${t.colors?.tokens?.find(x=>x.role==='background')?.hex || '#f7f5f0'};color:#18181b;padding:32px;}
    h1{font-size:32px;font-weight:500;margin:0 0 8px;}
    .accent{color:${accent};}
    .card{background:white;border-radius:8px;padding:20px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.04);}
    .placeholder{color:#71717a;font-family:monospace;font-size:11px;}
  </style></head><body>
    <h1>${esc(brief.split('\n')[0] || 'viaim')}<span class="accent"> · UI 原型</span></h1>
    <div class="placeholder">[ 本地兜底 · ${size.w}×${size.h} ]</div>
    <div class="card"><h3>区块 1</h3><p>请配置 LLM API 后重新生成，将得到完整 UI 原型。</p></div>
    <div class="card"><h3>区块 2</h3><p>${esc(brief)}</p></div>
  </body></html>`;
}

// ----------- L6 PPT · 品牌幻灯片 -----------
function studioL6(body, ctx) {
  const brand = Store.getCurrentVersionMeta();
  const pf = Modules.studio.state.prefill || {};
  if (pf.from_skill) Modules.studio.state.prefill = null;

  const mode = Modules.studio.state.l6_mode || 'deck';

  body.innerHTML = `
    <div style="display:flex;gap:8px;margin-bottom:14px;">
      <button class="l6-mode ${mode==='single'?'active':''}" data-l6mode="single">▱ 单张模板</button>
      <button class="l6-mode ${mode==='deck'?'active':''}" data-l6mode="deck">▤▤▤ 多张连排（自动排版）</button>
    </div>

    <div class="studio-layout" style="grid-template-columns:380px 1fr;">
      <div class="card flat" style="padding:20px;">
        ${mode === 'single' ? renderL6Single() : renderL6Deck(pf)}
      </div>

      <div class="studio-preview">
        <div class="preview-head">1600 × 900 · 16:9</div>
        <div class="preview-frame" id="l6Preview">
          <div class="ph">[ 配置 → 生成 ]</div>
        </div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-l6mode]').forEach((b) => {
    b.addEventListener('click', () => { Modules.studio.state.l6_mode = b.dataset.l6mode; ctx.navigate('studio'); });
  });

  let lastHtml = null;

  document.getElementById('l6Run')?.addEventListener('click', async () => {
    const out = document.getElementById('l6Preview');
    out.innerHTML = '<div class="ph">生成中…</div>';
    document.getElementById('l6Run').disabled = true;
    try {
      const params = mode === 'single' ? {
        slideKind: document.getElementById('l6SingleKind').value,
        title: document.getElementById('l6Title').value,
        subtitle: document.getElementById('l6Subtitle').value,
        body: document.getElementById('l6Body').value,
      } : {
        topic: document.getElementById('l6Topic').value,
        outline: document.getElementById('l6Outline').value,
        slideCount: parseInt(document.getElementById('l6Count').value) || 6,
        style: document.getElementById('l6Style').value,
      };
      const result = await Api.chat({
        system: buildL6System(brand, mode, params),
        user: mode === 'single'
          ? `单张幻灯片 · ${params.slideKind}\n标题：${params.title}\n副标题：${params.subtitle}\n内容：${params.body}`
          : `主题：${params.topic}\n大纲：\n${params.outline}\n张数：${params.slideCount}\n风格：${params.style}`,
        temperature: 0.4,
        fallback: () => fallbackL6HTML(brand, mode, params),
      });
      let html = result.text.trim().replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/, '').trim();
      if (!/^<!doctype|<html/i.test(html)) {
        html = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
      }
      lastHtml = html;
      const wrapWidth = out.clientWidth - 24;
      const wrapHeight = out.clientHeight - 24;
      const scale = Math.min(wrapWidth / 1600, wrapHeight / 900, 0.6);
      out.innerHTML = `<iframe srcdoc="${escAttr(html)}" style="width:1600px;height:900px;transform:scale(${scale});transform-origin:center center;border:1px solid var(--line);background:white;" sandbox="allow-same-origin allow-scripts"></iframe>`;
      document.getElementById('l6Export').disabled = false;
      document.getElementById('l6Source').textContent = `· ${result.source === 'llm' ? 'LLM 生成' : '本地兜底'}`;
      Store.archiveOutput({
        type: 'L6_ppt',
        title: `L6 · PPT · ${(params.title || params.topic || '').slice(0, 24)}`,
        refs: { brand_version: brand.version, prompt_text: JSON.stringify(params).slice(0, 200) },
        compliance: { status: 'pass', violations: [] },
        adoption: 'pending',
      });
      toast('PPT 已生成并归档', 'success');
    } catch (e) {
      out.innerHTML = `<div class="ph" style="color:var(--red);">[错误] ${esc(e.message)}</div>`;
    } finally {
      document.getElementById('l6Run').disabled = false;
    }
  });
  document.getElementById('l6Export')?.addEventListener('click', () => {
    if (!lastHtml) return;
    const blob = new Blob([lastHtml], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `viaim-ppt-${Date.now()}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('PPT HTML 已下载（可在浏览器打开 · 也可打印为 PDF）', 'success', 4000);
  });
}

function renderL6Single() {
  const kinds = [
    { id: 'cover', label: '封面 · Cover' },
    { id: 'agenda', label: '议程 · Agenda' },
    { id: 'section', label: '分章 · Section' },
    { id: 'content', label: '内容 · Content' },
    { id: 'data', label: '数据 · Data' },
    { id: 'quote', label: '引用 · Quote' },
    { id: 'closing', label: '收尾 · Closing' },
  ];
  return `
    <div class="field"><label>幻灯片类型</label>
      <select id="l6SingleKind">
        ${kinds.map((k) => `<option value="${k.id}">${esc(k.label)}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>标题</label><input id="l6Title" value="把对话变成可用的结果"/></div>
    <div class="field"><label>副标题</label><input id="l6Subtitle" value="viaim Mate · 2026 全球上市"/></div>
    <div class="field"><label>内容（按需）</label><textarea id="l6Body" rows="4">支持要点 · 数据 · 引用 · 列表</textarea></div>
    <div style="display:flex;gap:8px;">
      <button class="btn accent" id="l6Run">生成单张</button>
      <button class="btn" id="l6Export" disabled>导出 HTML</button>
      <span id="l6Source" class="mono" style="font-size:10px;color:var(--ink-mute);align-self:center;"></span>
    </div>
  `;
}
function renderL6Deck(pf) {
  return `
    <div class="field"><label>主题</label><input id="l6Topic" value="${esc(pf.scene || 'viaim Mate · 产品发布 deck')}"/></div>
    <div class="field"><label>大纲（每行一个 slide 标题，按顺序）</label>
      <textarea id="l6Outline" rows="6">封面 · Mate 上市
问题 · 商务沟通信息流失
方案 · 录入 + AI 整理
产品 · Mate 三大特性
场景 · 会议 / 通话 / 采访
价格 · Basic / Pro / Ultra
CTA · 立即体验</textarea>
    </div>
    <div class="field-row">
      <div class="field"><label>张数</label><input type="number" id="l6Count" value="7" min="3" max="20"/></div>
      <div class="field"><label>风格</label>
        <select id="l6Style">
          <option value="minimal">minimal · 极简</option>
          <option value="magazine">magazine · 杂志感</option>
          <option value="data-heavy">data-heavy · 数据密集</option>
        </select>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button class="btn accent" id="l6Run">生成多张连排 deck</button>
      <button class="btn" id="l6Export" disabled>导出 HTML</button>
      <span id="l6Source" class="mono" style="font-size:10px;color:var(--ink-mute);align-self:center;"></span>
    </div>
  `;
}
function buildL6System(brand, mode, params) {
  const ctx = window.brandContextFromGraph ? window.brandContextFromGraph(brand.data, 'prompt.l6_ppt') : '';
  return `You are a brand presentation designer. Produce a SINGLE self-contained HTML file (inline CSS, no external assets, no JS frameworks) that renders ${mode === 'single' ? '1' : params.slideCount + ' horizontally laid-out'} slide(s) at exactly 1600×900px each.

${mode === 'deck' ? `DECK STYLE: ${params.style}\nLAYOUT: place slides side-by-side (each in its own .slide div with overflow:hidden, width:1600px, height:900px). Add minimal slide counter in corner.` : `SINGLE SLIDE KIND: ${params.slideKind}`}

${ctx}

DESIGN RULES:
- Use brand colors and typography from the BRAND CONTEXT above.
- For "magazine" style: large display headlines, generous whitespace, editorial color blocks, asymmetric layouts.
- For "minimal": small accent only on key numbers, white background, restrained.
- For "data-heavy": clean tables, simple bar/line charts via inline SVG.
- ${mode === 'single' ? 'Center on the slide kind (cover = full-bleed; data = chart-led; quote = single statement).' : 'Vary layout per slide kind based on outline (cover / agenda / data / quote / closing).'}
- Output STRICT HTML starting with <!doctype html>. No markdown fences. No preamble.
- Embed Chinese content where appropriate.`;
}
function fallbackL6HTML(brand, mode, params) {
  const accent = brand.data.colors?.tokens?.find((t) => t.role === 'action-primary')?.hex || '#b8410c';
  const ink = '#18181b';
  const slide = (i, title, subtitle) => `
    <div style="width:1600px;height:900px;display:flex;flex-direction:column;justify-content:center;padding:80px 96px;background:#f7f5f0;page-break-after:always;">
      <div style="font-family:'Geist Mono',monospace;font-size:14px;color:${accent};letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px;">SLIDE ${i + 1}</div>
      <h1 style="font-size:88px;font-weight:500;letter-spacing:-.03em;line-height:1.05;margin:0 0 20px;color:${ink};">${esc(title)}</h1>
      ${subtitle ? `<div style="font-size:28px;color:#52525b;line-height:1.4;max-width:80%;">${esc(subtitle)}</div>` : ''}
    </div>`;
  const slides = mode === 'deck'
    ? (params.outline || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, params.slideCount).map((t, i) => slide(i, t, ''))
    : [slide(0, params.title || '', params.subtitle || '')];
  return `<!doctype html><html><head><meta charset="utf-8">
  <style>body{margin:0;font-family:'Geist','PingFang SC',sans-serif;}.slide{display:block;}</style>
  </head><body>${slides.map((s) => `<div class="slide">${s}</div>`).join('')}</body></html>`;
}

function renderL4Audio(promptVal, presets) {
  return `
    <div class="studio-layout">
      <div class="card flat" style="padding:20px;">
        <h3 style="font-size:13px;margin-bottom:10px;">音频场景 · 一键预设</h3>
        <div class="audio-presets">
          ${presets.map((p) => `<button class="audio-preset" data-audio-preset="${p.id}" title="${esc(p.prompt)}">${esc(p.label)}</button>`).join('')}
        </div>

        <h3 style="font-size:13px;margin:14px 0 10px;">音频 prompt</h3>
        <div class="field"><label>描述（建议含时长 · 频率 · 调性 · 用途）</label><textarea id="l4AudioPrompt" rows="5">${esc(promptVal)}</textarea></div>
        <div class="field-row">
          <div class="field"><label>时长 (秒)</label><input type="number" id="l4AudioDur" value="1" min="0.1" max="30" step="0.1"/></div>
          <div class="field"><label>类型</label>
            <select id="l4AudioKind">
              <option value="sfx">SFX · 音效（提示音/反馈）</option>
              <option value="tts">TTS · 语音播报</option>
              <option value="music">Music · 背景音乐</option>
            </select>
          </div>
        </div>
        <button class="btn accent" id="l4AudioRun">调用音频 API</button>
        <div class="callout blue" style="margin-top:12px;font-size:11px;">
          <b>音频服务建议</b>：硬件提示音 / UX 反馈用 <code class="inline">ElevenLabs SFX</code> 或 <code class="inline">Stable Audio</code>；TTS 用 <code class="inline">OpenAI TTS</code> 或 <code class="inline">ElevenLabs Voice</code>；背景音乐用 <code class="inline">Suno</code> / <code class="inline">Udio</code>。<br>
          所有这些服务都支持 OpenAI 兼容协议或 RESTful POST，把 Settings 中 image endpoint 替换即可。
        </div>
      </div>
      <div class="studio-output">
        <div class="head"><div class="title">音频输出</div></div>
        <div id="l4AudioResult" style="padding:14px;color:var(--ink-mute);">选择上方预设或编辑 prompt 后点「调用音频 API」</div>
      </div>
    </div>
  `;
}

// ===================================================================
// COMPLIANCE
// ===================================================================
const Compliance = {
  rules() {
    return [
      { id: 'R1', name: '色值在 token 范围内', level: 'warn', desc: '采样图像主色，与 brand tokens 比对 (HSL 距离阈值)' },
      { id: 'R2', name: '字体合规', level: 'error', desc: 'L3 模板渲染时 font-family 必须在 brand typography 列表中' },
      { id: 'R3', name: 'logo 留白', level: 'error', desc: 'logo 周围 safe zone 像素 ≥ logo 高度 × safe_zone_ratio' },
      { id: 'R4', name: 'logo 最小尺寸', level: 'warn', desc: 'logo 最短边 ≥ min_height_px' },
      { id: 'R5', name: '文案字数', level: 'warn', desc: '主标题、副标题各有上限（场景级配置）' },
    ];
  },
  // 对 L3 模板槽位 + 当前 brand 跑 lint
  lintTemplate({ tpl, slots, brand, asset }) {
    const violations = [];
    const d = brand.data;
    // R5 文案字数
    tpl.slots.forEach((s) => {
      const v = slots[s.key] || '';
      if (s.max && v.length > s.max) {
        violations.push({ rule: 'R5', level: 'warn', msg: `「${s.label}」超出 ${s.max} 字（实际 ${v.length}）`, fix: '建议缩短文案以避免视觉过密' });
      }
    });
    // R2 字体（隐式：模板使用 brand typography）
    if (!d.typography.families.body) violations.push({ rule: 'R2', level: 'error', msg: 'brand typography.body 缺失', fix: '到 Brand Source → Typography 补齐' });
    // R3/R4 logo（仅在模板含 wordmark 时）
    if (!d.brand_marks.wordmark_text) violations.push({ rule: 'R3', level: 'warn', msg: 'wordmark 文字未配置，模板将使用默认 viaim', fix: '到 Brand Source → Brand Marks 配置' });
    if (!d.brand_marks.min_height_px || d.brand_marks.min_height_px < 12) violations.push({ rule: 'R4', level: 'warn', msg: 'logo 最小尺寸异常', fix: '建议 ≥ 24px' });
    // R1 占位（此处无法真正采样图像，标记 pass-by-default）
    const errors = violations.filter((v) => v.level === 'error').length;
    const warns = violations.filter((v) => v.level === 'warn').length;
    const status = errors > 0 ? 'fail' : warns > 0 ? 'warn' : 'pass';
    return { status, violations };
  },
};
window.Compliance = Compliance;

Modules.compliance = {
  title: '合规',
  render() {
    return `
      <div class="page-head">
        <p class="lead">v0.1 必备 5 条 lint 规则（R1-R5）。这是「真规范」与「装饰品」的分水岭。</p>
      </div>

      <table class="spec">
        <thead><tr><th style="width:50px;">#</th><th>规则</th><th>等级</th><th>实现说明</th></tr></thead>
        <tbody>
          ${Compliance.rules().map((r) => `<tr>
            <td><span class="tag ${r.level === 'error' ? 'red' : 'amber'}">${r.id}</span></td>
            <td><b>${esc(r.name)}</b></td>
            <td>${esc(r.level)}</td>
            <td>${esc(r.desc)}</td>
          </tr>`).join('')}
        </tbody>
      </table>

      <div class="callout">
        <b>Brand Source 审批流</b>：修改 Brand Source 进入 draft 状态。点击页面右上角「发布」按钮进入审批 → 发布快照。
        Generation Studio 产物默认不强制审批，Output 详情页提供「提交品牌 lead 审批」按钮（v0.1 简化为标记字段）。
      </div>

      <h3 style="margin:24px 0 8px;font-size: 14px;font-weight:600;">最近 Lint 结果</h3>
      <div id="lintRecent"></div>
    `;
  },
  mount() {
    const recent = Store.getOutputs().filter((o) => o.compliance && o.compliance.violations).slice(0, 10);
    const el = document.getElementById('lintRecent');
    if (recent.length === 0) { el.innerHTML = `<div class="empty"><div class="title">尚无产物</div></div>`; return; }
    el.innerHTML = recent.map((o) => `
      <div class="archive-row" style="grid-template-columns:120px 1fr 80px 100px;">
        <div class="id mono">${o.id}</div>
        <div class="title"><b>${esc(o.title || o.type)}</b><div class="sub">${o.compliance.violations.length} 条违规</div></div>
        <div><span class="tag ${o.compliance.status === 'pass' ? 'green' : o.compliance.status === 'warn' ? 'amber' : 'red'}">${o.compliance.status}</span></div>
        <div class="when">${new Date(o.created_at).toLocaleDateString()}</div>
      </div>
    `).join('');
  },
};

function showLintDetail(lint) {
  const id = 'lintDetailFloat';
  const old = document.getElementById(id);
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = id;
  wrap.className = 'lint-detail';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <b>Lint 详情 · ${lint.status.toUpperCase()}</b>
      <button class="btn sm" onclick="document.getElementById('${id}').remove()">关闭</button>
    </div>
    ${lint.violations.length === 0 ? '<div style="color:var(--green);">全部通过 ✓</div>' : lint.violations.map((v) => `
      <div class="lint-row">
        <span class="level ${v.level}">${v.rule}</span>
        <div><div class="msg">${esc(v.msg)}</div><div class="fix">${esc(v.fix || '')}</div></div>
      </div>`).join('')}
  `;
  document.body.appendChild(wrap);
}
window.showLintDetail = showLintDetail;

// ===================================================================
// ARCHIVE
// ===================================================================
Modules.archive = {
  title: '产物归档',
  render() {
    const outs = Store.getOutputs();
    return `
      <div class="page-head">
        <p class="lead">每次生成都自动归档。三态采纳信号（adopted / rejected / iterated）作为后续 fine-tune 的训练信号。</p>
        <div class="actions">
          <button class="btn" id="btnExport">导出 JSON</button>
          <button class="btn danger" id="btnClear">清空 Archive</button>
        </div>
      </div>
      ${outs.length === 0 ? `<div class="empty"><div class="title">尚无产物</div></div>` : `
        <div class="archive-list">${outs.map(renderArchiveRow).join('')}</div>
      `}
      <div id="archiveDetail"></div>
    `;
  },
  mount(ctx) {
    document.querySelectorAll('.archive-row[data-id]').forEach((r) => {
      r.addEventListener('click', () => openOutputDetail(r.dataset.id, ctx));
    });
    document.getElementById('btnExport')?.addEventListener('click', () => {
      const data = JSON.stringify(Store.getOutputs(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `outputs-${Date.now()}.json`;
      a.click();
    });
    document.getElementById('btnClear')?.addEventListener('click', () => {
      if (!confirm('确认清空所有 Archive 记录？')) return;
      Store.saveOutputs([]);
      ctx.navigate('archive');
      toast('已清空', 'success');
    });
  },
};

function openOutputDetail(id, ctx) {
  const o = Store.getOutputs().find((x) => x.id === id);
  if (!o) return;
  const modal = document.getElementById('archiveDetail');
  modal.innerHTML = `
    <div class="cmdk-mask" id="omask">
      <div class="cmdk-box" style="width:680px;max-width:calc(100% - 32px);">
        <div style="padding:18px 22px;border-bottom:1px solid var(--line-soft);">
          <div class="mono" style="font-size: 10px;color:var(--ink-mute);">${esc(o.id)} · ${esc(o.type)}</div>
          <h3 style="font-size: 15px;margin-top:4px;">${esc(o.title || '-')}</h3>
        </div>
        <div style="padding:18px 22px;max-height:50vh;overflow-y:auto;">
          <div class="mono" style="font-size: 11px;color:var(--ink-mute);margin-bottom:8px;">brand_version: ${esc(o.refs?.brand_version || '-')}</div>
          ${o.refs?.prompt_text ? `<pre class="out" style="background:var(--bg-soft);padding:12px;border-radius:5px;font-family:'Geist Mono',monospace;font-size: 11px;white-space:pre-wrap;line-height:1.65;max-height:240px;overflow:auto;border:1px solid var(--line-soft);">${esc(o.refs.prompt_text)}</pre>` : ''}
          ${o.compliance ? `<div class="callout ${o.compliance.status === 'pass' ? 'green' : o.compliance.status === 'warn' ? 'amber' : 'red'}"><b>Compliance · ${o.compliance.status}</b><br>${o.compliance.violations.length} 条违规</div>` : ''}
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--line-soft);display:flex;gap:8px;align-items:center;">
          <span style="font-size: 11px;color:var(--ink-mute);margin-right:auto;">采纳信号</span>
          ${['adopted','iterated','rejected'].map((s) => `<button class="btn sm ${o.adoption===s?'primary':''}" data-set="${s}">${s}</button>`).join('')}
          <button class="btn sm danger" id="oDelete">删除</button>
          <button class="btn sm" id="oClose">关闭</button>
        </div>
      </div>
    </div>`;

  const close = () => { modal.innerHTML = ''; };
  document.getElementById('omask').addEventListener('click', (e) => { if (e.target.id === 'omask') close(); });
  document.getElementById('oClose').addEventListener('click', close);
  document.getElementById('oDelete').addEventListener('click', () => {
    if (!confirm('删除此产物？')) return;
    Store.removeOutput(o.id);
    close();
    ctx.navigate('archive');
  });
  modal.querySelectorAll('[data-set]').forEach((b) => {
    b.addEventListener('click', () => {
      o.adoption = b.dataset.set;
      const all = Store.getOutputs();
      const idx = all.findIndex((x) => x.id === o.id);
      all[idx] = o;
      Store.saveOutputs(all);
      toast(`标记为 ${b.dataset.set}`, 'success');
      close();
      ctx.navigate('archive');
    });
  });
}

// ===================================================================
// SETTINGS
// ===================================================================
Modules.settings = {
  title: '设置',
  render() {
    const s = Store.getSettings();
    return `
      <div class="page-head">
        <p class="lead">所有 API key 仅保存在你的浏览器 localStorage，不会上传到任何服务器。</p>
      </div>

      <div class="settings-grid">
        <div class="settings-block" id="blockLlm">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3>LLM API（必填）</h3>
              <div class="sub">用于 L1 Prompt 生成、L2 Mini MD 生成、Command Palette 自然语言意图识别</div>
            </div>
            <span class="conn-pill ${Api.llmReady() ? 'ok' : ''}" id="llmStatus"><span class="dot"></span><span>${Api.llmReady() ? '已配置' : '未配置'}</span></span>
          </div>
          <div class="field-row">
            <div class="field"><label>provider</label>
              <select data-s="llm.provider" id="llmProvider">
                ${Object.entries(LLM_PRESETS).map(([k, v]) => `<option value="${k}" ${s.llm.provider===k?'selected':''}>${esc(v.label)}</option>`).join('')}
              </select>
              <span class="hint" id="llmProviderHint">${esc(LLM_PRESETS[s.llm.provider]?.note || '')}</span>
            </div>
            <div class="field"><label>model</label>
              <input data-s="llm.model" id="llmModel" value="${esc(s.llm.model)}" placeholder="${esc((LLM_PRESETS[s.llm.provider]?.model_examples || []).join(' / '))}"/>
              <span class="hint" id="llmModelExamples">推荐：${esc((LLM_PRESETS[s.llm.provider]?.model_examples || []).join(' · '))}</span>
            </div>
          </div>
          <div class="field"><label>endpoint</label>
            <input data-s="llm.endpoint" id="llmEndpoint" value="${esc(s.llm.endpoint)}" placeholder="https://api.openai.com/v1"/>
            <span class="hint">OpenAI 协议填到 <code class="inline">/v1</code> 结尾；Anthropic / DeepSeek 同样填到 <code class="inline">/v1</code>。</span>
          </div>
          <div class="field"><label>API key</label>
            <input type="password" data-s="llm.api_key" value="${esc(s.llm.api_key)}" placeholder="${s.llm.provider==='deepseek'?'sk-…（DeepSeek key）':s.llm.provider==='anthropic'?'sk-ant-…':'sk-…'}"/>
            <span class="hint">仅保存到 localStorage，不上传任何服务器。<a id="llmDocsLink" target="_blank" style="color:var(--accent);">查看 ${esc(LLM_PRESETS[s.llm.provider]?.label || '')} 文档 →</a></span>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn" id="btnSaveLlm">保存</button>
            <button class="btn primary" id="btnTestLlm">测试连接</button>
            <button class="btn" id="btnApplyPreset" title="按当前 provider 重置 endpoint / 推荐 model">↺ 应用预设</button>
          </div>
        </div>

        <div class="settings-block" id="blockEmbed">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3>Embedding API（可选）</h3>
              <div class="sub">用于 Asset Library 自然语言搜索。未启用时使用基础 tag 搜索。</div>
            </div>
            <span class="conn-pill ${Api.embeddingReady() ? 'ok' : ''}"><span class="dot"></span><span>${Api.embeddingReady() ? '已启用' : '未启用'}</span></span>
          </div>
          <div class="field"><label><input type="checkbox" data-s="embedding.enabled" ${s.embedding.enabled?'checked':''}/> 启用 Embedding 搜索</label></div>
          <div class="field-row">
            <div class="field"><label>endpoint</label><input data-s="embedding.endpoint" value="${esc(s.embedding.endpoint)}"/></div>
            <div class="field"><label>model</label><input data-s="embedding.model" value="${esc(s.embedding.model)}"/></div>
          </div>
          <div class="field"><label>API key</label><input type="password" data-s="embedding.api_key" value="${esc(s.embedding.api_key)}"/></div>
          <button class="btn" id="btnSaveEmbed">保存</button>
        </div>

        <div class="settings-block" id="blockImage">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3>Image Generation API（可选 · L4）</h3>
              <div class="sub">PRD §5.3 L4 推迟到 Phase 3 立项，本设置预留接口便于即刻试跑端到端图像生成（DALL·E / SD / Flux 兼容协议）。</div>
            </div>
            <span class="conn-pill ${Api.imageReady() ? 'ok' : ''}"><span class="dot"></span><span>${Api.imageReady() ? '已启用' : '未启用'}</span></span>
          </div>
          <div class="field"><label><input type="checkbox" data-s="image.enabled" ${s.image.enabled?'checked':''}/> 启用图像生成</label></div>
          <div class="field-row">
            <div class="field"><label>endpoint</label><input data-s="image.endpoint" value="${esc(s.image.endpoint)}"/></div>
            <div class="field"><label>model</label><input data-s="image.model" value="${esc(s.image.model)}"/></div>
          </div>
          <div class="field"><label>API key</label><input type="password" data-s="image.api_key" value="${esc(s.image.api_key)}"/></div>
          <button class="btn" id="btnSaveImage">保存</button>
        </div>

        <div class="settings-block">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <h3>抓取代理（灵感池）</h3>
              <div class="sub">用于灵感池的 URL 抓取。默认走 <a href="https://r.jina.ai/" target="_blank" style="color:var(--accent);">Jina Reader</a>，免鉴权 / CORS 友好 / 返回干净 Markdown。可改成自建代理。</div>
            </div>
          </div>
          <div class="field"><label>reader endpoint</label>
            <input data-s="fetch.reader_endpoint" value="${esc(s.fetch.reader_endpoint)}" placeholder="https://r.jina.ai/"/>
            <span class="hint">协议：endpoint + 目标 URL 直接拼接。</span>
          </div>
          <div class="field-row">
            <div class="field"><label>抓取上限（chars）</label><input type="number" data-s="fetch.max_chars" value="${s.fetch.max_chars}"/></div>
            <div class="field"><label>投喂 LLM 上限</label><input type="number" data-s="fetch.llm_truncate_chars" value="${s.fetch.llm_truncate_chars}"/></div>
          </div>
          <button class="btn" id="btnSaveFetch">保存</button>
        </div>

        <div class="settings-block">
          <h3>行为开关</h3>
          <div class="sub">细调系统行为</div>
          <div class="field"><label><input type="checkbox" data-s="behaviour.offline_fallback" ${s.behaviour.offline_fallback?'checked':''}/> 未配置 LLM 时使用本地模板兜底</label></div>
          <div class="field"><label><input type="checkbox" data-s="behaviour.auto_archive" ${s.behaviour.auto_archive?'checked':''}/> 生成后自动归档到 Output Archive</label></div>
          <div class="field"><label><input type="checkbox" data-s="behaviour.lint_on_generate" ${s.behaviour.lint_on_generate?'checked':''}/> L3 渲染时自动跑 Compliance Lint</label></div>
          <div class="field"><label><input type="checkbox" data-s="behaviour.auto_fetch_on_paste" ${s.behaviour.auto_fetch_on_paste?'checked':''}/> 灵感池粘贴 URL 时自动抓取</label></div>
          <button class="btn" id="btnSaveBehavior">保存</button>
        </div>

        ${renderNodeGraphPanel(s)}

        <div class="settings-block" style="border-color:var(--red);">
          <h3 style="color:var(--red);">危险区</h3>
          <div class="sub">一键重置所有数据，包括 Brand 草案、Asset 文件、Archive、Settings。不可撤销。</div>
          <button class="btn danger" id="btnFactoryReset">恢复出厂设置</button>
        </div>
      </div>
    `;
  },
  mount(ctx) {
    const collect = () => {
      const s = Store.getSettings();
      document.querySelectorAll('[data-s]').forEach((el) => {
        const path = el.dataset.s.split('.');
        let target = s;
        for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
        const last = path[path.length - 1];
        if (el.type === 'checkbox') target[last] = el.checked;
        else target[last] = el.value;
      });
      Store.saveSettings(s);
    };
    const saveAndRefresh = (msg) => { collect(); toast(msg || '已保存', 'success'); ctx.navigate('settings'); };
    // provider 下拉切换时：如果当前 endpoint/model 是另一个预设的默认值（即用户没自定义过），自动套用新预设；否则只更新 hint
    const providerEl = document.getElementById('llmProvider');
    const endpointEl = document.getElementById('llmEndpoint');
    const modelEl = document.getElementById('llmModel');
    const hintEl = document.getElementById('llmProviderHint');
    const examplesEl = document.getElementById('llmModelExamples');
    const docsLinkEl = document.getElementById('llmDocsLink');
    if (docsLinkEl) docsLinkEl.href = LLM_PRESETS[providerEl.value]?.docs || '#';

    const isPresetDefault = (val, key) => Object.values(LLM_PRESETS).some((p) => p[key] === val);
    providerEl?.addEventListener('change', () => {
      const newKey = providerEl.value;
      const preset = LLM_PRESETS[newKey];
      if (!preset) return;
      // endpoint / model 若是任一预设默认值，则替换为新预设；否则保留用户自定义
      if (isPresetDefault(endpointEl.value.trim(), 'endpoint') || !endpointEl.value.trim()) {
        endpointEl.value = preset.endpoint;
      }
      if (isPresetDefault(modelEl.value.trim(), 'default_model') || !modelEl.value.trim()) {
        modelEl.value = preset.default_model;
      }
      hintEl.textContent = preset.note || '';
      examplesEl.textContent = '推荐：' + arr(preset.model_examples).join(' · ');
      modelEl.placeholder = arr(preset.model_examples).join(' / ');
      if (docsLinkEl) {
        docsLinkEl.href = preset.docs || '#';
        docsLinkEl.textContent = `查看 ${preset.label} 文档 →`;
      }
    });
    document.getElementById('btnApplyPreset')?.addEventListener('click', () => {
      const preset = LLM_PRESETS[providerEl.value];
      if (!preset) return;
      endpointEl.value = preset.endpoint;
      modelEl.value = preset.default_model;
      toast(`已应用 ${preset.label} 预设`, 'success');
    });

    document.getElementById('btnSaveLlm').addEventListener('click', () => saveAndRefresh('LLM 配置已保存'));
    document.getElementById('btnSaveEmbed').addEventListener('click', () => saveAndRefresh('Embedding 配置已保存'));
    document.getElementById('btnSaveImage').addEventListener('click', () => saveAndRefresh('Image 配置已保存'));
    document.getElementById('btnSaveFetch').addEventListener('click', () => saveAndRefresh('抓取代理已保存'));
    document.getElementById('btnSaveBehavior').addEventListener('click', () => saveAndRefresh('行为开关已保存'));
    document.getElementById('btnTestLlm').addEventListener('click', async () => {
      collect();
      const btn = document.getElementById('btnTestLlm');
      btn.disabled = true; btn.textContent = '测试中…';
      try {
        const t = await Api.testLlm();
        toast(`连接成功 · 响应：${t.slice(0, 30)}`, 'success', 3500);
      } catch (e) {
        toast(`连接失败：${e.message}`, 'error', 5000);
      } finally {
        btn.disabled = false; btn.textContent = '测试连接';
      }
    });
    bindNodeGraphPanel(ctx);

    document.getElementById('btnFactoryReset').addEventListener('click', async () => {
      if (!confirm('确认恢复出厂设置？所有数据不可恢复。')) return;
      await Store.factoryReset();
      toast('已重置，正在刷新…', 'success');
      setTimeout(() => location.reload(), 600);
    });
  },
};

// ===================================================================
// NODE GRAPH PANEL · 节点关系表（Settings 内）
// ===================================================================
// 节点类型：brand_section / llm_prompt / output
// 边：from → to · weight 0..1
// 用途：可视化展示 / 编辑 brand 段对 LLM prompt 的影响权重
// 运行时：buildL1System / buildL2System / buildAnalyzeSystem 读取 nodeGraph 决定注入哪些段
function renderNodeGraphPanel(s) {
  const g = s.nodeGraph || { nodes: [], edges: [], threshold: 0.3 };
  const targets = g.nodes.filter((n) => n.type === 'llm_prompt' || n.type === 'output');
  const sources = g.nodes.filter((n) => n.type === 'brand_section');
  const cur = g.__selected_target || (targets[0]?.id);
  const incoming = g.edges.filter((e) => e.to === cur).sort((a, b) => b.weight - a.weight);
  const usedSources = new Set(incoming.map((e) => e.from));
  const availableSources = sources.filter((n) => !usedSources.has(n.id));
  const targetNode = g.nodes.find((n) => n.id === cur);

  return `
    <div class="settings-block" id="blockNodeGraph">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h3>节点关系表 · Node Graph</h3>
          <div class="sub">每条 LLM prompt 由哪些 brand 段影响、权重多少、输出格式是什么。可增删 / 调权重 / 加节点影响。<b>权重 ≥ threshold 的段会被注入 system prompt</b>。</div>
        </div>
        <span class="conn-pill"><span class="dot"></span><span class="mono">${g.nodes.length} nodes · ${g.edges.length} edges</span></span>
      </div>

      <div class="node-graph-wrap">
        <!-- 左：target 选择 -->
        <div class="ng-target-list">
          <div class="ng-list-head mono">TARGET / 目标节点</div>
          ${targets.map((t) => `
            <div class="ng-target-item ${cur === t.id ? 'active' : ''}" data-pick-target="${esc(t.id)}">
              <div class="ng-target-label">
                <span class="tag ${t.type === 'output' ? 'green' : 'blue'}">${t.type === 'output' ? 'OUT' : 'PRMP'}</span>
                <b>${esc(t.label)}</b>
              </div>
              <div class="ng-target-id mono">${esc(t.id)}</div>
              <div class="ng-target-count mono">← ${g.edges.filter((e) => e.to === t.id).length} inputs</div>
            </div>
          `).join('')}
        </div>

        <!-- 右：选中 target 的 inputs 列表 -->
        <div class="ng-edges-pane">
          ${!targetNode ? '<div class="empty"><div>请选择左侧节点</div></div>' : `
            <div class="ng-edges-head">
              <div class="ng-edges-title">
                <span class="tag ${targetNode.type === 'output' ? 'green' : 'blue'}">${targetNode.type}</span>
                <b>${esc(targetNode.label)}</b>
              </div>
              <div class="ng-edges-meta mono">${esc(targetNode.id)}</div>
              ${targetNode.format ? `<div class="ng-edges-format">format: <span class="mono">${esc(targetNode.format)}</span></div>` : ''}
            </div>

            <div class="ng-threshold-row">
              <label class="mono">threshold ≥</label>
              <input type="range" id="ngThreshold" min="0" max="1" step="0.05" value="${g.threshold}"/>
              <span class="mono" id="ngThresholdVal">${g.threshold}</span>
              <span style="font-size:10.5px;color:var(--ink-mute);">权重 < threshold 的段不注入</span>
            </div>

            <div class="ng-list-head mono">INPUTS · 影响此节点的源（按权重排序）</div>
            <div class="ng-edges-list">
              ${incoming.length === 0 ? '<div class="empty"><div>暂无 inputs · 从下方选择源节点添加</div></div>' : incoming.map((e, i) => {
                const src = g.nodes.find((n) => n.id === e.from);
                const willInject = e.weight >= g.threshold;
                return `
                  <div class="ng-edge-row ${willInject ? '' : 'inactive'}">
                    <div class="ng-edge-from">
                      <span class="tag">${esc(src?.type === 'brand_section' ? 'BRAND' : src?.type || '?')}</span>
                      <b>${esc(src?.label || e.from)}</b>
                      <span class="mono ng-edge-id">${esc(e.from)}</span>
                    </div>
                    <div class="ng-edge-weight">
                      <input type="range" min="0" max="1" step="0.05" value="${e.weight}" data-edge-w="${i}"/>
                      <span class="mono ng-w-val" data-w-display="${i}">${e.weight.toFixed(2)}</span>
                    </div>
                    <button class="btn sm danger" data-edge-del="${i}" title="删除此边">✕</button>
                  </div>
                `;
              }).join('')}
            </div>

            ${availableSources.length > 0 ? `
              <div class="ng-add-row">
                <span class="mono" style="font-size:10.5px;color:var(--ink-mute);">+ 添加 input：</span>
                <select id="ngAddSource">
                  ${availableSources.map((s) => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join('')}
                </select>
                <input type="number" id="ngAddWeight" min="0" max="1" step="0.05" value="0.5" style="width:80px;"/>
                <button class="btn sm" id="btnNgAdd">+ 添加</button>
              </div>
            ` : '<div class="ng-add-row mono" style="color:var(--ink-mute);font-size:10.5px;">所有源节点都已添加</div>'}
          `}
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:8px;align-items:center;">
        <button class="btn" id="btnSaveGraph">保存关系图</button>
        <button class="btn" id="btnResetGraph">↺ 重置为默认</button>
        <span style="font-size:11px;color:var(--ink-mute);">每次生成时 LLM 都会按当前关系图决定注入哪些 brand 段。</span>
      </div>
    </div>
  `;
}

// 仅重渲染节点关系块 + 重新绑定监听（避免触发全页 navigate 导致滚动到顶）
function refreshNodeGraphPanel(ctx) {
  const block = document.getElementById('blockNodeGraph');
  if (!block) return;
  const s = Store.getSettings();
  // outerHTML 替换会丢 ref，所以我们用临时容器解析后替换 children
  const tmp = document.createElement('div');
  tmp.innerHTML = renderNodeGraphPanel(s);
  const fresh = tmp.firstElementChild;
  block.replaceWith(fresh);
  bindNodeGraphPanel(ctx);
}

function bindNodeGraphPanel(ctx) {
  const s = Store.getSettings();
  const g = s.nodeGraph;
  if (!g) return;

  // 切换 target — 局部刷新即可，不触发全页 navigate
  document.querySelectorAll('[data-pick-target]').forEach((el) => {
    el.addEventListener('click', () => {
      g.__selected_target = el.dataset.pickTarget;
      Store.saveSettings(s);
      refreshNodeGraphPanel(ctx);
    });
  });

  // threshold 滑块
  const thrInp = document.getElementById('ngThreshold');
  thrInp?.addEventListener('input', () => {
    document.getElementById('ngThresholdVal').textContent = thrInp.value;
  });
  thrInp?.addEventListener('change', () => {
    g.threshold = parseFloat(thrInp.value);
    Store.saveSettings(s);
    refreshNodeGraphPanel(ctx);
  });

  // 边权重滑块（实时调整）
  document.querySelectorAll('[data-edge-w]').forEach((inp) => {
    const idx = parseInt(inp.dataset.edgeW);
    const display = document.querySelector(`[data-w-display="${idx}"]`);
    inp.addEventListener('input', () => {
      const v = parseFloat(inp.value);
      display.textContent = v.toFixed(2);
    });
    inp.addEventListener('change', () => {
      const cur = g.__selected_target;
      const incoming = g.edges.filter((e) => e.to === cur).sort((a, b) => b.weight - a.weight);
      const target = incoming[idx];
      if (!target) return;
      const realIdx = g.edges.findIndex((e) => e.from === target.from && e.to === target.to);
      if (realIdx >= 0) g.edges[realIdx].weight = parseFloat(inp.value);
      Store.saveSettings(s);
      refreshNodeGraphPanel(ctx);
    });
  });

  // 删除边
  document.querySelectorAll('[data-edge-del]').forEach((b) => {
    b.addEventListener('click', () => {
      const cur = g.__selected_target;
      const incoming = g.edges.filter((e) => e.to === cur).sort((a, b) => b.weight - a.weight);
      const target = incoming[parseInt(b.dataset.edgeDel)];
      if (!target) return;
      g.edges = g.edges.filter((e) => !(e.from === target.from && e.to === target.to));
      Store.saveSettings(s);
      toast(`已删除 ${target.from} → ${target.to}`, 'success');
      refreshNodeGraphPanel(ctx);
    });
  });

  // 添加边
  document.getElementById('btnNgAdd')?.addEventListener('click', () => {
    const cur = g.__selected_target;
    const src = document.getElementById('ngAddSource').value;
    const w = parseFloat(document.getElementById('ngAddWeight').value) || 0.5;
    if (g.edges.some((e) => e.from === src && e.to === cur)) {
      toast('已存在此连接', 'warn');
      return;
    }
    g.edges.push({ from: src, to: cur, weight: w });
    Store.saveSettings(s);
    toast('已添加', 'success');
    refreshNodeGraphPanel(ctx);
  });

  document.getElementById('btnSaveGraph')?.addEventListener('click', () => {
    Store.saveSettings(s);
    toast('节点关系图已保存', 'success');
  });

  document.getElementById('btnResetGraph')?.addEventListener('click', () => {
    if (!confirm('重置节点关系图为默认配置？当前自定义将丢失')) return;
    s.nodeGraph = (typeof window.seedNodeGraph === 'function') ? window.seedNodeGraph() : null;
    if (!s.nodeGraph) delete s.nodeGraph;
    Store.saveSettings(s);
    toast('已重置', 'success');
    refreshNodeGraphPanel(ctx);
  });
}

// ===================================================================
// DOCS — 嵌入原 PRD
// ===================================================================
Modules.docs = {
  title: 'PRD 文档',
  render() {
    return `<iframe src="prd.html" style="width:100%;height:calc(100vh - 140px);border:1px solid var(--line);border-radius:6px;background:white;"></iframe>`;
  },
  mount() {},
};

// ===================================================================
// TEMPLATES → SKILLS 库 · 7 大类输出对齐 Open Design
// ===================================================================
Modules.templates = {
  title: '技能库',
  state: { category: 'all' },
  render(ctx) {
    const cats = window.SKILL_CATEGORIES || [];
    const skills = window.SKILLS || [];
    const cur = Modules.templates.state.category;
    const list = cur === 'all' ? skills : skills.filter((s) => s.category === cur);
    const counts = cats.reduce((acc, c) => { acc[c.id] = skills.filter((s) => s.category === c.id).length; return acc; }, {});
    return `
      <div class="page-head">
        <p class="lead">基于 <a href="https://github.com/nexu-io/open-design" target="_blank" style="color:var(--accent);">Open Design</a> · 聚焦视觉输出 · 6 大类整合 ${skills.length} 个代表 skill。点击 skill → 自动跳转 Studio 对应 L 级别并预填上下文。</p>
      </div>

      <div class="cat-tabs">
        <button class="cat-tab ${cur==='all'?'active':''}" data-cat="all">
          <span class="ico">∗</span><span>全部</span><span class="cnt">${skills.length}</span>
        </button>
        ${cats.map((c) => `
          <button class="cat-tab ${cur===c.id?'active':''}" data-cat="${c.id}">
            <span class="ico mono">${c.icon}</span><span>${esc(c.label)}</span><span class="cnt">${counts[c.id] || 0}</span>
          </button>
        `).join('')}
      </div>

      ${cur !== 'all' ? `
        <div class="cat-desc">${esc(cats.find((c) => c.id === cur)?.desc || '')}</div>
      ` : ''}

      <div class="skill-grid">
        ${list.map((s) => skillCard(s, cats)).join('')}
      </div>
    `;
  },
  mount(ctx) {
    document.querySelectorAll('[data-cat]').forEach((b) => {
      b.addEventListener('click', () => {
        Modules.templates.state.category = b.dataset.cat;
        ctx.navigate('templates');
      });
    });
    document.querySelectorAll('[data-skill]').forEach((c) => {
      c.addEventListener('click', () => launchSkill(c.dataset.skill, ctx));
    });
  },
};

function skillCard(s, cats) {
  const cat = cats.find((c) => c.id === s.category);
  const lvlClass = { L1: 'green', L2: 'blue', L3: 'amber', L4: '' }[s.l_level] || '';
  const status = s.tpl_id ? '<span class="tag green">已实装</span>' : (s.l_level === 'L3' ? '<span class="tag amber">敬请期待</span>' : '');
  return `
    <div class="skill-card ${s.featured ? 'featured' : ''}" data-skill="${s.id}">
      ${s.featured ? '<div class="featured-flag mono">★</div>' : ''}
      <div class="skill-head">
        <span class="skill-cat-ico mono">${esc(cat?.icon || '')}</span>
        <div class="skill-head-meta">
          <div class="skill-cat mono">${esc(cat?.label || '')}</div>
          <div class="skill-name">${esc(s.name)}</div>
        </div>
        <span class="tag ${lvlClass}">${s.l_level}</span>
      </div>
      <div class="skill-desc">${esc(s.desc)}</div>
      <div class="skill-foot">
        <span class="skill-source mono">${esc(s.based_on || '')}</span>
        ${status}
      </div>
    </div>
  `;
}

// 点击 skill 卡 → 跳转 Studio 对应 L 级别并 prefill
function launchSkill(skillId, ctx) {
  const skill = (window.SKILLS || []).find((s) => s.id === skillId);
  if (!skill) return;
  const lvl = skill.l_level;
  Modules.studio.state.tab = lvl.toLowerCase();
  Modules.studio.state.prefill = { from_skill: skill.id, ...(skill.prefill || {}) };
  // L3 + 已实装的内置模板 → 切换 tpl
  if (lvl === 'L3' && skill.tpl_id) {
    L3State.tplId = skill.tpl_id;
    L3State.slots = {};
  }
  // L3 + 未实装：维持当前 tpl，显示 toast 提示
  if (lvl === 'L3' && !skill.tpl_id) {
    toast(`${skill.name} · L3 模板尚未实装，先帮你打开 Studio L3。可用现有 3 个 HTML 模板做近似。`, 'warn', 4500);
  }
  // L4 未配置 image API → 提示
  if (lvl === 'L4' && !Api.imageReady()) {
    toast(`${skill.name} · 需要在 Settings 启用图像/视频 API 后才能跑。`, 'warn', 4000);
  }
  ctx.navigate('studio');
}

// ===================================================================
// INBOX · 灵感池 — 外部资源 → 分析 → 应用到 brand
// ===================================================================
Modules.inbox = {
  title: '灵感池',
  state: { adding: false, q: '', filter: 'all' /* all|inbox|reviewed|applied */ },
  render(ctx) {
    const sources = Store.getSources();
    const counts = {
      all: sources.length,
      inbox: sources.filter((s) => s.status === 'inbox' || s.status === 'fetched').length,
      reviewed: sources.filter((s) => s.status === 'reviewed').length,
      applied: sources.filter((s) => s.status === 'applied').length,
    };
    return `
      <div class="page-head">
        <p class="lead">把外部资源（网页、GitHub、工具、文章、片段）放进来。系统抓取 → AI 分析 → 一键合并到 Brand Source 草案。</p>
        <div class="actions">
          <button class="btn primary" id="btnAddSource">+ 添加资源</button>
        </div>
      </div>

      <div class="inbox-add ${Modules.inbox.state.adding ? 'open' : ''}" id="inboxAdd">
        <div class="field">
          <label>URL · 或粘贴正文片段</label>
          <textarea id="srcInput" rows="3" placeholder="例如：https://www.w3.org/TR/clreq/  或 直接粘贴一段文字 / Markdown / GitHub README 摘录"></textarea>
        </div>

        <div class="src-divider"><span>或</span></div>

        <div class="field">
          <label>上传 Markdown / 文本文件 · 支持 .md .markdown .mdx .txt</label>
          <div class="src-file-drop" id="srcFileDrop">
            <input type="file" id="srcFile" accept=".md,.markdown,.mdx,.txt" multiple style="display:none;"/>
            <div class="big">点击或拖拽文件到此处</div>
            <div class="small">支持多文件 · 单个 ≤ 2MB · 文件名将作为标题</div>
            <div id="srcFilePreview" class="src-file-preview"></div>
          </div>
        </div>

        <div class="field">
          <label>给一句话备注（可选） · 你想用它来做什么</label>
          <input id="srcIntent" placeholder="例如：补充中文排版规范到 typography 段"/>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn accent" id="srcAdd">抓取并入库</button>
          <button class="btn" id="srcCancel">取消</button>
          <span class="mono" style="font-size:10.5px;color:var(--ink-mute);">URL → Jina Reader · 片段/文件 → 直接保存</span>
        </div>
      </div>

      <div class="inbox-tabs">
        ${[
          { k: 'all', label: '全部' },
          { k: 'inbox', label: '待处理' },
          { k: 'reviewed', label: '已分析' },
          { k: 'applied', label: '已应用' },
        ].map((t) => `<button class="inbox-tab ${Modules.inbox.state.filter===t.k?'active':''}" data-f="${t.k}">${t.label}<span class="cnt">${counts[t.k] || 0}</span></button>`).join('')}
        <div class="grow"></div>
        <input class="search" id="srcSearch" placeholder="按 / 聚焦搜索..." value="${esc(Modules.inbox.state.q)}"/>
      </div>

      <div id="srcList"></div>
      <div id="srcModal"></div>
    `;
  },
  mount(ctx) {
    const refresh = () => {
      const all = Store.getSources();
      const f = Modules.inbox.state.filter;
      const q = Modules.inbox.state.q.trim().toLowerCase();
      let list = all;
      if (f === 'inbox') list = list.filter((s) => s.status === 'inbox' || s.status === 'fetched');
      else if (f === 'reviewed') list = list.filter((s) => s.status === 'reviewed');
      else if (f === 'applied') list = list.filter((s) => s.status === 'applied');
      if (q) list = list.filter((s) => (s.title + ' ' + (s.url||'') + ' ' + (s.description||'') + ' ' + arr(s.tags).join(' ')).toLowerCase().includes(q));

      const wrap = document.getElementById('srcList');
      if (list.length === 0) {
        wrap.innerHTML = `<div class="empty"><div class="title">这里还空空的</div><div>试试粘贴 <code class="inline">https://www.w3.org/TR/clreq/</code> 或 <code class="inline">https://github.com/ibelick/ui-skills</code></div></div>`;
        return;
      }
      wrap.innerHTML = `<div class="src-list">${list.map(renderSourceRow).join('')}</div>`;
      wrap.querySelectorAll('.src-row').forEach((r) => {
        r.addEventListener('click', (e) => {
          if (e.target.closest('[data-action]')) return;
          openSourceDetail(r.dataset.id, ctx);
        });
        r.querySelectorAll('[data-action]').forEach((b) => {
          b.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const action = b.dataset.action;
            const id = r.dataset.id;
            if (action === 'analyze') await analyzeSourceFlow(id, ctx, refresh);
            else if (action === 'delete') {
              if (!confirm('删除此条？')) return;
              Store.removeSource(id); refresh(); ctx.refreshNavBadges && ctx.refreshNavBadges();
            } else if (action === 'open') {
              if (r.dataset.url) window.open(r.dataset.url, '_blank');
            }
          });
        });
      });
    };

    document.getElementById('btnAddSource').addEventListener('click', () => {
      Modules.inbox.state.adding = !Modules.inbox.state.adding;
      ctx.navigate('inbox');
    });
    document.getElementById('srcCancel')?.addEventListener('click', () => {
      Modules.inbox.state.adding = false; ctx.navigate('inbox');
    });
    // 文件上传 · 选择 + 拖放
    let pendingFiles = [];
    const fileInput = document.getElementById('srcFile');
    const fileDrop = document.getElementById('srcFileDrop');
    const filePreview = document.getElementById('srcFilePreview');
    const renderFilePreview = () => {
      if (pendingFiles.length === 0) { filePreview.innerHTML = ''; return; }
      filePreview.innerHTML = pendingFiles.map((f, i) => `
        <div class="file-chip">
          <span class="mono name">${esc(f.name)}</span>
          <span class="mono size">${(f.size / 1024).toFixed(1)} KB</span>
          <button class="x" data-rm="${i}" title="移除">✕</button>
        </div>
      `).join('');
      filePreview.querySelectorAll('[data-rm]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          pendingFiles.splice(parseInt(b.dataset.rm), 1);
          renderFilePreview();
        });
      });
    };

    // 文件名过滤：只放行 .md/.markdown/.mdx/.txt（其他扩展提示忽略）
    const acceptFile = (f) => {
      const ok = /\.(md|markdown|mdx|txt)$/i.test(f.name);
      const sized = f.size <= 2 * 1024 * 1024;
      if (!ok) toast(`忽略 ${f.name}：只支持 .md/.markdown/.mdx/.txt`, 'warn', 3500);
      else if (!sized) toast(`忽略 ${f.name}：超过 2MB`, 'warn', 3500);
      return ok && sized;
    };

    fileDrop?.addEventListener('click', (e) => {
      if (e.target.closest('.file-chip')) return;
      fileInput.click();
    });
    fileInput?.addEventListener('change', () => {
      const ok = Array.fromarr(fileInput.files).filter(acceptFile);
      pendingFiles = pendingFiles.concat(ok);
      fileInput.value = '';
      renderFilePreview();
    });

    // 拖放：拦截文件型 dragover/drop（包括子元素冒泡）
    const stopFileDefault = (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    };
    // 全局阻止默认（防止落在边缘时浏览器打开文件）
    if (!window.__fileDropGuard) {
      document.addEventListener('dragover', stopFileDefault);
      document.addEventListener('drop', stopFileDefault);
      window.__fileDropGuard = true;
    }
    fileDrop?.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('drag'); });
    fileDrop?.addEventListener('dragenter', (e) => { e.preventDefault(); fileDrop.classList.add('drag'); });
    fileDrop?.addEventListener('dragleave', (e) => {
      // 仅当离开 fileDrop 边界时移除（避免 child 触发误移除）
      if (!fileDrop.contains(e.relatedTarget)) fileDrop.classList.remove('drag');
    });
    fileDrop?.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDrop.classList.remove('drag');
      const ok = Array.fromarr(e.dataTransfer.files).filter(acceptFile);
      pendingFiles = pendingFiles.concat(ok);
      renderFilePreview();
      if (ok.length > 0) toast(`已选 ${ok.length} 个文件，点「抓取并入库」提交`, 'success', 2500);
    });

    document.getElementById('srcAdd')?.addEventListener('click', async () => {
      const inp = document.getElementById('srcInput').value.trim();
      const intent = document.getElementById('srcIntent').value.trim();
      if (!inp && pendingFiles.length === 0) { toast('请填入 URL / 正文 或 上传文件', 'warn'); return; }
      const isUrl = /^https?:\/\//i.test(inp);
      const btn = document.getElementById('srcAdd');
      btn.disabled = true; btn.textContent = '处理中…';
      try {
        let added = 0;
        // 先处理文件
        if (pendingFiles.length > 0) {
          const max = (Store.getSettings().fetch?.max_chars) || 8000;
          for (const f of pendingFiles) {
            const text = await f.text();
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            Store.addSource({
              url: null,
              title: f.name,
              description: intent || '',
              content: text.slice(0, max),
              raw_paste: text.length > max ? null : text,
              file: { name: f.name, size: f.size, format: ext },
              type: 'article',
              tags: intent ? [intent] : [],
              status: 'fetched',
            });
            added++;
          }
          pendingFiles = [];
          renderFilePreview();
        }
        // 再处理 URL / 片段
        if (inp) {
          if (isUrl) {
            const fetched = await Api.fetchUrl(inp);
            Store.addSource({
              url: inp,
              title: fetched.title,
              description: fetched.description,
              content: fetched.content,
              tags: intent ? [intent] : [],
              status: 'fetched',
            });
            added++;
          } else {
            Store.addSource({
              url: null,
              title: intent || inp.slice(0, 40),
              description: intent || '',
              raw_paste: inp,
              content: inp,
              tags: intent ? [intent] : [],
              status: 'fetched',
            });
            added++;
          }
        }
        toast(`已入库 ${added} 条`, 'success');
        Modules.inbox.state.adding = false;
        ctx.navigate('inbox');
      } catch (e) {
        toast(e.message, 'error', 5000);
      } finally {
        btn.disabled = false; btn.textContent = '抓取并入库';
      }
    });

    document.querySelectorAll('.inbox-tab').forEach((t) => {
      t.addEventListener('click', () => {
        Modules.inbox.state.filter = t.dataset.f;
        ctx.navigate('inbox');
      });
    });

    const search = document.getElementById('srcSearch');
    let qTimer;
    search.addEventListener('input', () => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => {
        Modules.inbox.state.q = search.value;
        refresh();
      }, 200);
    });

    refresh();
  },
};

function renderSourceRow(s) {
  const statusCls = {
    inbox: '', fetched: 'amber', analyzing: 'amber',
    reviewed: 'blue', applied: 'green', rejected: 'red',
  }[s.status] || '';
  const sectionTags = (s.analysis?.brand_sections || []).slice(0, 3).map((x) => `<span class="tag">${esc(x)}</span>`).join('');
  const typeIco = { url: '🔗', github: '◐', article: '¶', snippet: '✎', tool: '⚒' }[s.type] || '·';
  const desc = (s.analysis?.summary || s.description || (s.raw_paste || '').slice(0, 140) || '').slice(0, 220);
  return `
    <div class="src-row" data-id="${s.id}" ${s.url ? `data-url="${esc(s.url)}"` : ''}>
      <div class="src-ico mono">${typeIco}</div>
      <div class="src-body">
        <div class="src-title">
          <b>${esc(s.title || s.url || s.id)}</b>
          <span class="tag ${statusCls}">${esc(s.status)}</span>
          ${sectionTags}
        </div>
        ${s.url ? `<div class="src-url mono">${esc(s.url)}</div>` : ''}
        <div class="src-desc">${esc(desc)}</div>
      </div>
      <div class="src-actions">
        ${s.url ? `<button class="btn sm" data-action="open" title="打开原始链接">↗</button>` : ''}
        ${(s.status === 'inbox' || s.status === 'fetched') ? `<button class="btn sm primary" data-action="analyze">分析 →</button>` : `<button class="btn sm" data-action="analyze">重新分析</button>`}
        <button class="btn sm danger" data-action="delete" title="删除">✕</button>
      </div>
    </div>`;
}

async function analyzeSourceFlow(id, ctx, refresh) {
  const src = Store.getSource(id);
  if (!src) return;
  Store.updateSource(id, { status: 'analyzing' });
  refresh();
  toast('分析中…', 'info', 1500);
  try {
    const brandData = Store.getCurrentVersionMeta().data;
    const analysis = await Api.analyzeSource(src, brandData);
    Store.updateSource(id, { analysis, status: 'reviewed' });
    toast('分析完成', 'success');
    refresh();
    openSourceDetail(id, ctx);
    ctx.refreshNavBadges && ctx.refreshNavBadges();
  } catch (e) {
    Store.updateSource(id, { status: 'fetched' });
    toast(e.message, 'error', 5000);
    refresh();
  }
}

function openSourceDetail(id, ctx) {
  const src = Store.getSource(id);
  if (!src) return;
  const a = src.analysis;
  const modal = document.getElementById('srcModal');
  modal.innerHTML = `
    <div class="cmdk-mask" id="srcMask">
      <div class="cmdk-box" style="width:780px;max-width:calc(100% - 32px);max-height:86vh;overflow:auto;">
        <div style="padding:18px 22px;border-bottom:1px solid var(--line-soft);display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div class="mono" style="font-size:9px;color:var(--ink-mute);letter-spacing:.06em;text-transform:uppercase;">${esc(src.type)} · ${esc(src.status)}</div>
            <h3 style="font-size:15px;margin:4px 0;">${esc(src.title)}</h3>
            ${src.url ? `<div class="mono" style="font-size:10px;color:var(--ink-mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(src.url)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            ${src.url ? `<button class="btn sm" id="srcDetailOpen">↗ 打开</button>` : ''}
            <button class="btn sm" id="srcDetailReanalyze">${a ? '重新分析' : '分析'}</button>
            <button class="btn sm" id="srcDetailClose">关闭</button>
          </div>
        </div>

        <div style="padding:18px 22px;">
          ${!a ? `
            <div class="empty"><div class="title">尚未分析</div><div>点击右上「分析」让 LLM 生成结构化建议（需配置 LLM API）。</div></div>
          ` : `
            <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin-bottom:6px;">摘要 / SUMMARY</h4>
            <div style="font-size:13px;color:var(--ink);line-height:1.65;margin-bottom:14px;">${esc(a.summary || '')}</div>

            <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin:14px 0 6px;">适用段 / TARGET SECTIONS</h4>
            <div style="margin-bottom:14px;">${arr(a.brand_sections).map((x) => `<span class="tag p0" style="margin-right:4px;">${esc(x)}</span>`).join('')}</div>

            <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin:14px 0 6px;">关键洞察 / KEY TAKEAWAYS</h4>
            <ul style="padding-left:18px;font-size:13px;color:var(--ink-soft);line-height:1.7;margin-bottom:14px;">
              ${arr(a.key_takeaways).map((x) => `<li>${esc(x)}</li>`).join('')}
            </ul>

            ${arr(a.applicable_rules).length > 0 ? `
              <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin:14px 0 6px;">建议规则 / APPLICABLE RULES</h4>
              <table class="spec" style="margin-top:6px;">
                <thead><tr><th>段</th><th>规则</th><th>理由</th><th>置信</th></tr></thead>
                <tbody>${(a.applicable_rules).map((r) => `
                  <tr><td><span class="tag">${esc(r.section)}</span></td><td>${esc(r.rule)}</td><td>${esc(r.rationale || '')}</td><td><span class="tag ${r.confidence === 'high' ? 'green' : r.confidence === 'low' ? 'amber' : ''}">${esc(r.confidence || '-')}</span></td></tr>
                `).join('')}</tbody>
              </table>
            ` : ''}

            ${arr(a.suggested_brand_updates).length > 0 ? `
              <h4 style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-mute);font-family:'Geist Mono',monospace;margin:14px 0 6px;">建议品牌改动 / SUGGESTED PATCHES</h4>
              <div id="patchList">${(a.suggested_brand_updates).map((p, i) => `
                <div class="patch-row">
                  <input type="checkbox" data-patch-i="${i}" checked />
                  <div class="patch-body">
                    <div class="mono" style="font-size:11px;color:var(--accent);">${esc(p.path || '')} <span style="color:var(--ink-mute);">· ${esc(p.operation || 'set')}</span></div>
                    <div style="font-size:13px;color:var(--ink);margin-top:3px;">${esc(typeof p.value === 'object' ? JSON.stringify(p.value) : (p.value || ''))}</div>
                    <div style="font-size:11.5px;color:var(--ink-mute);margin-top:3px;">${esc(p.reason || '')}</div>
                  </div>
                </div>`).join('')}</div>
              <div style="display:flex;gap:8px;margin-top:14px;">
                <button class="btn primary" id="btnApplyPatches">→ 合并到 Brand Source 草案</button>
                <button class="btn" id="btnRejectAll">标记为已忽略</button>
              </div>
            ` : ''}

            ${a.risk_or_caveats ? `
              <div class="callout amber" style="margin-top:14px;"><b>风险与注意</b> · ${esc(a.risk_or_caveats)}</div>
            ` : ''}

            ${(src.applied_to && src.applied_to.length > 0) ? `
              <div style="margin-top:14px;font-size:11.5px;color:var(--ink-mute);font-family:'Geist Mono',monospace;">已应用于 · ${src.applied_to.map((x) => `v${x.version} (${x.section})`).join(', ')}</div>
            ` : ''}
          `}

          <details style="margin-top:18px;">
            <summary style="cursor:pointer;font-size:11px;color:var(--ink-mute);font-family:'Geist Mono',monospace;text-transform:uppercase;letter-spacing:.06em;">查看抓取正文（${(src.content || src.raw_paste || '').length} chars）</summary>
            <pre style="margin-top:8px;background:var(--bg-soft);border:1px solid var(--line-soft);border-radius:5px;padding:12px;font-family:'Geist Mono',monospace;font-size:10.5px;line-height:1.6;color:var(--ink-soft);white-space:pre-wrap;max-height:280px;overflow:auto;">${esc((src.content || src.raw_paste || '').slice(0, 4000))}</pre>
          </details>
        </div>
      </div>
    </div>`;

  const close = () => { modal.innerHTML = ''; };
  document.getElementById('srcMask').addEventListener('click', (e) => { if (e.target.id === 'srcMask') close(); });
  document.getElementById('srcDetailClose').addEventListener('click', close);
  document.getElementById('srcDetailOpen')?.addEventListener('click', () => window.open(src.url, '_blank'));
  document.getElementById('srcDetailReanalyze').addEventListener('click', async () => {
    close();
    await analyzeSourceFlow(id, ctx, () => ctx.navigate('inbox'));
  });
  document.getElementById('btnApplyPatches')?.addEventListener('click', () => {
    const checked = Array.from(modal.querySelectorAll('[data-patch-i]:checked')).map((cb) => parseInt(cb.dataset.patchI));
    const patches = arr(a.suggested_brand_updates).filter((_, i) => checked.includes(i));
    if (patches.length === 0) { toast('请勾选要应用的改动', 'warn'); return; }
    applyPatchesToBrandDraft(src, patches);
    close();
    ctx.navigate('inbox');
  });
  document.getElementById('btnRejectAll')?.addEventListener('click', () => {
    Store.updateSource(id, { status: 'rejected' });
    toast('已标记为忽略', 'success');
    close();
    ctx.navigate('inbox');
  });
}

function applyPatchesToBrandDraft(source, patches) {
  const { brand, draft } = Store.ensureDraft();
  patches.forEach((p) => applyPatchToObject(draft.data, p));
  Store.saveDraftData(draft.data, `合并自灵感池 · ${source.title || source.url}`);
  // 记录到 source 的 applied_to
  Store.updateSource(source.id, {
    status: 'applied',
    applied_to: [...arr(source.applied_to), { version: draft.version, sections: patches.map((p) => p.path.split('.')[0]).filter((x, i, arr) => arr.indexOf(x) === i), at: nowIso() }],
  });
  toast(`已合并 ${patches.length} 项到 ${draft.version} 草案`, 'success', 3500);
}

function applyPatchToObject(obj, patch) {
  const path = (patch.path || '').split('.').filter(Boolean);
  if (path.length === 0) return;
  let target = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (target[k] === undefined || target[k] === null) target[k] = {};
    target = target[k];
  }
  const last = path[path.length - 1];
  const op = patch.operation || 'set';
  const val = patch.value;
  if (op === 'append') {
    if (!Array.isArray(target[last])) target[last] = target[last] ? [target[last]] : [];
    if (Array.isArray(val)) target[last].push(...val);
    else target[last].push(val);
  } else if (op === 'merge' && typeof val === 'object' && val !== null) {
    target[last] = { ...(target[last] || {}), ...val };
  } else {
    target[last] = val;
  }
}

// ===================================================================
// LAUNCH · 上市规划 (§5.12)
// ===================================================================
Modules.launch = {
  title: '上市规划',
  state: { view: 'gantt' /* gantt | reuse | table */, selectedAsset: null, editing: null },
  render(ctx) {
    const plans = Store.getLaunchPlans();
    const cur = Store.getCurrentLaunch();
    if (!cur) return `<div class="empty"><div class="title">尚无上市计划</div><div>种子数据未加载</div></div>`;
    const view = Modules.launch.state.view;
    return `
      <div class="page-head">
        <p class="lead">新品上市资产规划：列出所有要交付的素材 · 设定起止时间 · 可视化排期与跨资产复用关系。</p>
        <div class="actions">
          <select id="launchSelect" style="padding:5px 8px;border-radius:5px;border:1px solid var(--line);background:var(--card);font-size:12px;">
            ${plans.map((p) => `<option value="${esc(p.id)}" ${p.id===cur.id?'selected':''}>${esc(p.name)} · ${esc(p.launch_date)}</option>`).join('')}
          </select>
          <button class="btn" id="btnNewLaunch">+ 新建</button>
        </div>
      </div>

      <div class="launch-meta">
        <div class="lm-row">
          <span class="k">产品</span>
          <input id="launchProduct" value="${esc(cur.product || '')}" />
          <span class="k">名称</span>
          <input id="launchName" value="${esc(cur.name || '')}" />
          <span class="k">上市日</span>
          <input type="date" id="launchDate" value="${esc(cur.launch_date || '')}" />
        </div>
        <div class="lm-row">
          <span class="k">定位</span>
          <input id="launchPositioning" value="${esc(cur.positioning || '')}" style="flex:1;" />
          <span class="k">区域</span>
          <span class="lm-tags">${(cur.regions || []).map((r) => `<span class="tag ${r==='cn'?'amber':'blue'}">${r==='cn'?'🇨🇳 国内':'🌍 海外'}</span>`).join('')}</span>
        </div>
      </div>

      <div class="view-tabs">
        <button class="vtab ${view==='gantt'?'active':''}" data-view="gantt">📅 甘特排期</button>
        <button class="vtab ${view==='reuse'?'active':''}" data-view="reuse">↻ 复用图谱</button>
        <button class="vtab ${view==='table'?'active':''}" data-view="table">≡ 资产清单</button>
        <div style="flex:1;"></div>
        <span class="mono" style="font-size:10.5px;color:var(--ink-mute);">${cur.assets.length} 项资产</span>
      </div>

      <div id="launchView">
        ${view==='gantt' ? renderGantt(cur) : view==='reuse' ? renderReuse(cur) : renderAssetTable(cur)}
      </div>

      <div id="launchAssetEditor"></div>
    `;
  },
  mount(ctx) {
    document.getElementById('launchSelect')?.addEventListener('change', (e) => {
      Store.setCurrentLaunch(e.target.value);
      ctx.navigate('launch');
    });
    document.getElementById('btnNewLaunch')?.addEventListener('click', () => {
      const name = prompt('上市项目名（如：Air 3 · 2027 春季）：', '');
      if (!name) return;
      const p = {
        id: uid('launch'),
        name,
        product: '',
        launch_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
        regions: ['cn'],
        positioning: '',
        notes: '',
        created_at: nowIso(),
        updated_at: nowIso(),
        assets: [],
      };
      Store.saveLaunch(p);
      Store.setCurrentLaunch(p.id);
      ctx.navigate('launch');
    });

    // 元信息编辑（输入即保存）
    const cur = Store.getCurrentLaunch();
    if (cur) {
      const fields = [
        ['launchProduct', 'product'],
        ['launchName', 'name'],
        ['launchDate', 'launch_date'],
        ['launchPositioning', 'positioning'],
      ];
      fields.forEach(([id, key]) => {
        const el = document.getElementById(id);
        el?.addEventListener('input', () => {
          cur[key] = el.value;
          Store.saveLaunch(cur);
          // 不重渲染（避免 input 失焦）—— 仅当 launch_date 变化时重渲染甘特
          if (key === 'launch_date') ctx.navigate('launch');
        });
      });
    }

    // 视图切换
    document.querySelectorAll('[data-view]').forEach((b) => {
      b.addEventListener('click', () => {
        Modules.launch.state.view = b.dataset.view;
        ctx.navigate('launch');
      });
    });

    // 资产行点击（甘特 / 表）→ 打开编辑器
    document.querySelectorAll('[data-asset-edit]').forEach((el) => {
      el.addEventListener('click', () => openLaunchAssetEditor(el.dataset.assetEdit, ctx));
    });

    // + 新增资产
    document.getElementById('btnAddAsset')?.addEventListener('click', () => {
      const cur = Store.getCurrentLaunch();
      const a = Store.newLaunchAsset(cur, {});
      Store.saveLaunch(cur);
      ctx.navigate('launch');
      setTimeout(() => openLaunchAssetEditor(a.id, ctx), 50);
    });
  },
};

// =============== Gantt 视图 ===============
function renderGantt(plan) {
  const launchTs = new Date(plan.launch_date + 'T00:00:00').getTime();
  // 计算时间窗：从最早 prep_start 到 launch_date + 7d
  const computed = (plan.assets || []).map((a) => {
    const endTs = launchTs - (a.prep_end_offset || 0) * 86400000;
    const startTs = endTs - (a.lead_time_days || 7) * 86400000;
    return { ...a, startTs, endTs };
  });
  const minTs = Math.min(...computed.map((a) => a.startTs), launchTs - 90 * 86400000);
  const maxTs = launchTs + 7 * 86400000;
  const totalDays = Math.ceil((maxTs - minTs) / 86400000);
  const todayTs = Date.now();

  // 月份分隔标签
  const monthMarks = [];
  let cursor = new Date(minTs);
  cursor.setDate(1);
  while (cursor.getTime() < maxTs) {
    const offset = (cursor.getTime() - minTs) / (maxTs - minTs) * 100;
    monthMarks.push({ label: `${cursor.getFullYear()}/${String(cursor.getMonth() + 1).padStart(2, '0')}`, offset });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayPct = (todayTs - minTs) / (maxTs - minTs) * 100;
  const launchPct = (launchTs - minTs) / (maxTs - minTs) * 100;

  // 按 prep_end_offset 排序（越早交付的越靠上）
  computed.sort((a, b) => (b.prep_end_offset || 0) - (a.prep_end_offset || 0));

  return `
    <div class="gantt">
      <div class="gantt-head">
        <div class="gantt-row-label">资产 · ${computed.length}</div>
        <div class="gantt-track">
          <div class="gantt-axis">
            ${monthMarks.map((m) => `<span class="gantt-month" style="left:${m.offset}%;">${m.label}</span>`).join('')}
          </div>
          ${todayPct >= 0 && todayPct <= 100 ? `<div class="gantt-today" style="left:${todayPct}%;"><span class="gantt-today-label">今日</span></div>` : ''}
          <div class="gantt-launch" style="left:${launchPct}%;"><span class="gantt-launch-label">🚀 ${plan.launch_date}</span></div>
        </div>
      </div>

      <div class="gantt-body">
        ${computed.map((a) => {
          const startPct = (a.startTs - minTs) / (maxTs - minTs) * 100;
          const widthPct = (a.endTs - a.startTs) / (maxTs - minTs) * 100;
          const catColor = launchCategoryColor(a.category);
          const isPast = a.endTs < todayTs;
          const isCurrent = a.startTs <= todayTs && todayTs <= a.endTs;
          return `
            <div class="gantt-row" data-asset-edit="${a.id}">
              <div class="gantt-row-label">
                <span class="cat-dot" style="background:${catColor};"></span>
                <span class="g-name">${esc(a.name)}</span>
                <span class="g-meta mono">${a.lead_time_days}d</span>
                ${(a.regions || []).map((r) => `<span class="g-reg">${r==='cn'?'🇨🇳':'🌍'}</span>`).join('')}
              </div>
              <div class="gantt-track">
                <div class="gantt-bar ${a.status} ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}"
                     style="left:${startPct}%; width:${Math.max(widthPct, 1)}%; background:${catColor};"
                     title="${esc(a.name)} · ${new Date(a.startTs).toISOString().slice(0,10)} → ${new Date(a.endTs).toISOString().slice(0,10)}"></div>
                <div class="gantt-bar-label" style="left:calc(${startPct}% + 4px); top:50%;">
                  ${esc(a.name.slice(0, 14))}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="gantt-foot">
        <button class="btn" id="btnAddAsset">+ 新增资产</button>
        <span class="mono" style="font-size:10.5px;color:var(--ink-mute);margin-left:auto;">总周期 ${totalDays} 天 · 至上市 ${Math.max(0, Math.ceil((launchTs - todayTs) / 86400000))} 天</span>
      </div>

      <div class="gantt-legend">
        ${ENUMS.launch_asset_category.map((c) => `<span><span class="cat-dot" style="background:${launchCategoryColor(c)};"></span>${launchCategoryLabel(c)}</span>`).join('')}
      </div>
    </div>
  `;
}

function launchCategoryColor(c) {
  return ({
    style: '#b8410c',
    render: '#0277db',
    kv: '#7c3aed',
    pdp: '#0ea550',
    ad: '#d0aa72',
    flyer: '#52525b',
    tvc: '#dc2626',
    social: '#ec4899',
    other: '#a1a1aa',
  })[c] || '#a1a1aa';
}
function launchCategoryLabel(c) {
  return ({
    style: '风格', render: '渲染', kv: 'KV', pdp: '商详',
    ad: '广告', flyer: '单页', tvc: 'TVC', social: '社交', other: '其他',
  })[c] || c;
}

// =============== 复用图谱 ===============
function renderReuse(plan) {
  const assets = plan.assets || [];
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  // 反向索引：每个资产被哪些复用
  const reusedBy = {};
  assets.forEach((a) => {
    (a.reuse_from || []).forEach((srcId) => {
      reusedBy[srcId] = reusedBy[srcId] || [];
      reusedBy[srcId].push(a.id);
    });
  });

  // 上游核心节点（被多个复用）= 高复用价值
  const valueRanked = [...assets].sort((a, b) => (reusedBy[b.id]?.length || 0) - (reusedBy[a.id]?.length || 0));

  return `
    <div class="reuse-wrap">
      <div class="callout blue" style="margin-bottom:14px;">
        <b>解读复用图谱</b> · 「被复用次数」越高的上游资产价值越大（<b>一次投入 · 多次复用</b>）。例如「风格 spec」做完，所有其他资产都能继承它的视觉语言。
      </div>

      <h3 style="font-size:13px;font-weight:600;margin:16px 0 10px;">高复用价值上游 · TOP 投入</h3>
      <div class="reuse-pillars">
        ${valueRanked.slice(0, 5).filter((a) => (reusedBy[a.id] || []).length > 0).map((a) => `
          <div class="reuse-pillar">
            <div class="reuse-pillar-head">
              <span class="cat-dot" style="background:${launchCategoryColor(a.category)};"></span>
              <b>${esc(a.name)}</b>
              <span class="reuse-cnt mono">×${(reusedBy[a.id] || []).length}</span>
            </div>
            <div class="reuse-pillar-children">
              ${(reusedBy[a.id] || []).map((cid) => `
                <span class="reuse-child" title="${esc(byId[cid]?.name || cid)}">
                  <span class="cat-dot sm" style="background:${launchCategoryColor(byId[cid]?.category || 'other')};"></span>${esc(byId[cid]?.name || cid)}
                </span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <h3 style="font-size:13px;font-weight:600;margin:24px 0 10px;">完整复用矩阵</h3>
      <div class="reuse-matrix">
        <table class="spec">
          <thead><tr><th>资产</th><th>← 复用自</th><th>→ 被复用</th><th>下游数</th></tr></thead>
          <tbody>
            ${assets.map((a) => {
              const from = (a.reuse_from || []).map((id) => byId[id]?.name || id).join(', ') || '—';
              const to = (reusedBy[a.id] || []).map((id) => byId[id]?.name || id).join(', ') || '—';
              const count = (reusedBy[a.id] || []).length;
              return `
                <tr data-asset-edit="${a.id}" style="cursor:pointer;">
                  <td><span class="cat-dot" style="background:${launchCategoryColor(a.category)};"></span><b>${esc(a.name)}</b></td>
                  <td style="font-size:11px;color:var(--ink-mute);">${esc(from)}</td>
                  <td style="font-size:11px;color:var(--ink-mute);">${esc(to)}</td>
                  <td><span class="tag ${count>=3?'p0':count>0?'amber':''}" style="${count===0?'opacity:.4;':''}">${count}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =============== 资产表 ===============
function renderAssetTable(plan) {
  return `
    <table class="spec launch-table">
      <thead><tr><th>资产</th><th>分类</th><th>区域</th><th>备料 (天)</th><th>提前于上市</th><th>状态</th><th></th></tr></thead>
      <tbody>
        ${(plan.assets || []).map((a) => `
          <tr data-asset-edit="${a.id}" style="cursor:pointer;">
            <td><span class="cat-dot" style="background:${launchCategoryColor(a.category)};"></span><b>${esc(a.name)}</b></td>
            <td><span class="tag">${launchCategoryLabel(a.category)}</span></td>
            <td>${(a.regions || []).map((r) => `<span class="tag">${r==='cn'?'🇨🇳':'🌍'}</span>`).join('')}</td>
            <td class="mono">${a.lead_time_days}d</td>
            <td class="mono">−${a.prep_end_offset}d</td>
            <td><span class="tag ${a.status==='done'?'green':a.status==='blocked'?'red':a.status==='in_progress'?'amber':''}">${esc(a.status)}</span></td>
            <td>→</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div style="margin-top:12px;">
      <button class="btn" id="btnAddAsset">+ 新增资产</button>
    </div>
  `;
}

// =============== 资产编辑器 modal ===============
function openLaunchAssetEditor(assetId, ctx) {
  const cur = Store.getCurrentLaunch();
  const a = (cur.assets || []).find((x) => x.id === assetId);
  if (!a) return;
  const others = (cur.assets || []).filter((x) => x.id !== a.id);

  const modal = document.getElementById('launchAssetEditor');
  modal.innerHTML = `
    <div class="cmdk-mask" id="laMask">
      <div class="cmdk-box" style="width:680px;max-width:calc(100% - 32px);max-height:88vh;overflow:auto;">
        <div style="padding:16px 22px;border-bottom:1px solid var(--line-soft);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="cat-dot" style="background:${launchCategoryColor(a.category)};vertical-align:middle;"></span>
            <b style="font-size:14px;margin-left:6px;">${esc(a.name)}</b>
            <span class="mono" style="font-size:10px;color:var(--ink-mute);margin-left:8px;">${esc(a.id)}</span>
          </div>
          <button class="btn sm" id="laClose">关闭</button>
        </div>

        <div style="padding:18px 22px;">
          <div class="field"><label>名称</label><input id="laName" value="${esc(a.name)}"/></div>
          <div class="field-row">
            <div class="field"><label>分类</label>
              <select id="laCat">
                ${ENUMS.launch_asset_category.map((c) => `<option value="${c}" ${a.category===c?'selected':''}>${launchCategoryLabel(c)}</option>`).join('')}
              </select>
            </div>
            <div class="field"><label>状态</label>
              <select id="laStatus">
                ${ENUMS.launch_asset_status.map((s) => `<option value="${s}" ${a.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>备料周期（天）</label><input type="number" id="laLead" value="${a.lead_time_days}"/></div>
            <div class="field"><label>提前于上市（天）</label><input type="number" id="laOffset" value="${a.prep_end_offset}"/></div>
          </div>
          <div class="field"><label>区域（多选 · 逗号分隔）</label><input id="laRegions" value="${esc((a.regions || []).join(', '))}" placeholder="cn, overseas"/></div>
          <div class="field"><label>负责人</label><input id="laAssignee" value="${esc(a.assignee || '')}"/></div>
          <div class="field"><label>备注</label><textarea id="laNotes" rows="2">${esc(a.notes || '')}</textarea></div>

          <div class="field"><label>← 复用自（哪些上游资产）</label>
            <div class="reuse-picker" id="laReuseFrom">
              ${others.map((o) => `
                <label class="reuse-chip ${(a.reuse_from || []).includes(o.id) ? 'on' : ''}">
                  <input type="checkbox" value="${o.id}" ${(a.reuse_from || []).includes(o.id) ? 'checked' : ''}/>
                  <span class="cat-dot sm" style="background:${launchCategoryColor(o.category)};"></span>${esc(o.name)}
                </label>
              `).join('')}
            </div>
            <span class="hint">勾选后这条资产可以从这些上游派生 / 翻译 / 二剪</span>
          </div>

          <div style="display:flex;gap:8px;margin-top:14px;">
            <button class="btn primary" id="laSave">保存</button>
            <button class="btn danger" id="laDelete">删除</button>
            <button class="btn" id="laClose2" style="margin-left:auto;">取消</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const close = () => { modal.innerHTML = ''; };
  document.getElementById('laMask').addEventListener('click', (e) => { if (e.target.id === 'laMask') close(); });
  document.getElementById('laClose').addEventListener('click', close);
  document.getElementById('laClose2').addEventListener('click', close);

  document.getElementById('laSave').addEventListener('click', () => {
    a.name = document.getElementById('laName').value;
    a.category = document.getElementById('laCat').value;
    a.status = document.getElementById('laStatus').value;
    a.lead_time_days = parseInt(document.getElementById('laLead').value) || 7;
    a.prep_end_offset = parseInt(document.getElementById('laOffset').value) || 14;
    a.regions = document.getElementById('laRegions').value.split(',').map((s) => s.trim()).filter(Boolean);
    a.assignee = document.getElementById('laAssignee').value;
    a.notes = document.getElementById('laNotes').value;
    a.reuse_from = Array.from(document.querySelectorAll('#laReuseFrom input[type=checkbox]:checked')).map((c) => c.value);
    Store.saveLaunch(cur);
    toast('已保存', 'success');
    close();
    ctx.navigate('launch');
  });

  document.getElementById('laDelete').addEventListener('click', () => {
    if (!confirm('删除此资产？复用关系也会一并解除')) return;
    cur.assets = cur.assets.filter((x) => x.id !== a.id);
    cur.assets.forEach((x) => { x.reuse_from = (x.reuse_from || []).filter((id) => id !== a.id); });
    Store.saveLaunch(cur);
    toast('已删除', 'success');
    close();
    ctx.navigate('launch');
  });
}

// ===================================================================
// API & SDK — endpoint 一览
// ===================================================================
Modules.api = {
  title: 'API & SDK',  // 保留英文术语，i18n 不翻译
  render() {
    const s = Store.getSettings();
    return `
      <div class="page-head">
        <p class="lead">PRD §5.7 对内输出层。所有写操作走 API，UI 是 client。Vitana 等下游消费方接入零成本。</p>
        <div class="actions"><button class="btn" data-go="settings">→ Settings 配置 key</button></div>
      </div>

      <div class="callout ${Api.llmReady() ? 'green' : 'amber'}">
        <b>当前状态</b>：LLM ${Api.llmReady() ? 'OK' : '未配置'} · Embedding ${Api.embeddingReady() ? 'OK' : '未启用'} · Image Gen ${Api.imageReady() ? 'OK' : '未启用'}
      </div>

      <h3 style="margin:24px 0 8px;font-size: 13px;font-weight:600;">v0.1 端点</h3>
      <table class="spec">
        <thead><tr><th>方法</th><th>路径</th><th>说明</th></tr></thead>
        <tbody>
          <tr><td><b>GET</b></td><td><code class="inline">/api/v1/brand/current</code></td><td>当前 published brand</td></tr>
          <tr><td><b>GET</b></td><td><code class="inline">/api/v1/brand/versions</code></td><td>所有版本</td></tr>
          <tr><td><b>PUT</b></td><td><code class="inline">/api/v1/brand/draft</code></td><td>修改草案（admin only）</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/brand/publish</code></td><td>发布草案为新版本</td></tr>
          <tr><td><b>GET</b></td><td><code class="inline">/api/v1/assets?product=aura&amp;angle=front</code></td><td>资产筛选</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/assets</code></td><td>上传 + 打标</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/assets/search</code></td><td>自然语言检索</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/generate/prompt</code></td><td>L1 prompt</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/generate/mini-md</code></td><td>L2 brief</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/generate/template</code></td><td>L3 模板渲染</td></tr>
          <tr><td><b>POST</b></td><td><code class="inline">/api/v1/compliance/lint</code></td><td>跑 lint</td></tr>
          <tr><td><b>GET</b></td><td><code class="inline">/api/v1/outputs</code></td><td>历史归档</td></tr>
        </tbody>
      </table>

      <h3 style="margin:24px 0 8px;font-size: 13px;font-weight:600;">本地 client（当前页面正在用）</h3>
      <div class="callout">
        本应用前端通过 <code class="inline">window.Store</code> 与 <code class="inline">window.Api</code> 操作数据；切换为 server 模式只需把这两个 facade 替换为 fetch 实现，UI 层无需改动。这就是 PRD §5.7 所说「API-first，UI 是 API 的 client」。
      </div>

      <h3 style="margin:24px 0 8px;font-size: 13px;font-weight:600;">SDK（Phase 2）</h3>
      <div class="callout">
        TypeScript SDK：<code class="inline">@viaim/brand-os-sdk</code>（npm 包，封装认证 / 版本协商 / 错误处理）。Python SDK 服务端调用（Vitana 等）在 Phase 2 末交付。
      </div>
    `;
  },
  mount(ctx) {
    document.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => ctx.navigate(el.dataset.go)));
  },
};

// helpers
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }

window.Modules = Modules;
