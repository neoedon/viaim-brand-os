/* =========================================================
   templates.js
   L3 模板：HTML/SVG 渲染（按 PRD §5.3 推荐 Satori 路径）
   - social_card_1080: 1080x1080 社交卡
   - doc_cover: 1600x900 文档/PRD 封面
   - banner_16_9:  1600x900 活动 banner

   每个模板提供：
     - id, name, slots（字段定义）
     - render({ slots, brand, assetUrl }) => HTML 字符串
   渲染产物用 iframe srcdoc 展示，并可导出 PNG（html-to-image 路径，
   v0.1 用 SVG foreignObject 兜底，避免引入额外依赖）
   ========================================================= */

const Templates = {
  list() {
    return [
      {
        id: 'social_card_1080',
        name: '社交卡 1080×1080',
        size: { w: 1080, h: 1080 },
        slots: [
          { key: 'title', label: '主标题', type: 'text', max: 16, default: '双 11 早鸟价' },
          { key: 'subtitle', label: '副标题', type: 'text', max: 30, default: 'Aura · 让对话被看见' },
          { key: 'tagline', label: '尾部标语', type: 'text', max: 24, default: 'viaim · Memory Earphone' },
          { key: 'cta', label: '行动召唤', type: 'text', max: 12, default: '立即预购 →' },
        ],
        render: renderSocialCard,
      },
      {
        id: 'doc_cover',
        name: '文档/PRD 封面 1600×900',
        size: { w: 1600, h: 900 },
        slots: [
          { key: 'eyebrow', label: '上标', type: 'text', max: 24, default: 'PRD · v0.1 · DRAFT' },
          { key: 'title', label: '主标题', type: 'text', max: 32, default: 'Brand OS' },
          { key: 'subtitle', label: '副标题', type: 'text', max: 60, default: '把品牌系统从「人类可读」迁移到「机器可读」' },
          { key: 'author', label: '作者署名', type: 'text', max: 24, default: 'Tang × Claude' },
        ],
        render: renderDocCover,
      },
      {
        id: 'banner_16_9',
        name: '活动 Banner 16:9',
        size: { w: 1600, h: 900 },
        slots: [
          { key: 'title', label: '主标题', type: 'text', max: 18, default: 'Spring Launch 2026' },
          { key: 'subtitle', label: '副标题', type: 'text', max: 40, default: 'Aura 全新色 · 沙石灰 限量 5,000 副' },
          { key: 'meta', label: '时间/地点', type: 'text', max: 28, default: '04.18 · Beijing' },
          { key: 'cta', label: 'CTA', type: 'text', max: 12, default: '了解更多' },
        ],
        render: renderBanner,
      },
    ];
  },
  byId(id) { return this.list().find((t) => t.id === id); },
};

function brandTokens(brand) {
  const data = brand.data;
  const colors = data.colors.tokens.reduce((acc, t) => { acc[t.name] = t.hex; return acc; }, {});
  return {
    primary: colors.primary || '#18181b',
    accent: colors.accent || '#b8410c',
    paper: colors.paper || '#f7f5f0',
    card: colors.card || '#ffffff',
    inkMid: colors['ink-mid'] || '#52525b',
    line: colors.line || '#d4d4d8',
    fonts: data.typography.families,
  };
}

// 公共 head：给 iframe 用，注入字体 + 字体平滑
function makeHtml(body, sizeStyle, brand) {
  const t = brandTokens(brand);
  return `<!doctype html>
<html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  html,body{width:100%;height:100%;overflow:hidden;}
  body{
    font-family:'${t.fonts.body || 'Geist'}', '${t.fonts.cn || 'PingFang SC'}', sans-serif;
    -webkit-font-smoothing:antialiased;
    color:${t.primary};
    background:${t.paper};
    ${sizeStyle}
  }
  .mono{font-family:'Geist Mono',monospace;}
</style>
</head><body>${body}</body></html>`;
}

// =================== social card 1080 ===================
function renderSocialCard({ slots, brand, assetUrl }) {
  const t = brandTokens(brand);
  const product = assetUrl
    ? `<img src="${escAttr(assetUrl)}" style="width:78%;height:auto;object-fit:contain;filter:drop-shadow(0 30px 60px rgba(0,0,0,.15));"/>`
    : `<div style="width:78%;aspect-ratio:1.1/1;background:${t.line};border-radius:24px;display:flex;align-items:center;justify-content:center;color:${t.inkMid};font-family:'Geist Mono',monospace;font-size:18px;">[ 产品资产位 ]</div>`;
  const body = `
<div style="width:1080px;height:1080px;display:flex;flex-direction:column;background:${t.paper};">
  <div style="padding:64px 64px 0;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:24px;font-weight:600;letter-spacing:-.01em;">${esc(brand.data.brand_marks.wordmark_text || 'viaim')}</div>
    <div class="mono" style="font-size:14px;color:${t.inkMid};letter-spacing:.06em;text-transform:uppercase;">${esc(slots.tagline || '')}</div>
  </div>
  <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:24px 64px;">
    ${product}
  </div>
  <div style="padding:0 64px 72px;">
    <div style="font-size:64px;font-weight:600;letter-spacing:-.025em;line-height:1.05;color:${t.primary};margin-bottom:20px;">${esc(slots.title || '')}</div>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="font-size:22px;color:${t.inkMid};line-height:1.4;max-width:60%;">${esc(slots.subtitle || '')}</div>
      <div style="background:${t.accent};color:#fff;padding:14px 28px;border-radius:999px;font-size:18px;font-weight:500;">${esc(slots.cta || '')}</div>
    </div>
  </div>
</div>`;
  return makeHtml(body, '', brand);
}

// =================== doc cover 1600x900 ===================
function renderDocCover({ slots, brand, assetUrl }) {
  const t = brandTokens(brand);
  const accent = t.accent;
  const bg = assetUrl
    ? `<div style="position:absolute;inset:0;background:url('${escAttr(assetUrl)}') center/cover;opacity:.18;mix-blend-mode:multiply;"></div>`
    : '';
  const body = `
<div style="width:1600px;height:900px;position:relative;background:${t.paper};display:flex;flex-direction:column;padding:80px 96px;">
  ${bg}
  <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start;">
    <div class="mono" style="font-size:14px;letter-spacing:.12em;color:${accent};text-transform:uppercase;">${esc(slots.eyebrow || '')}</div>
    <div style="font-size:18px;font-weight:600;letter-spacing:-.01em;">${esc(brand.data.brand_marks.wordmark_text || 'viaim')}</div>
  </div>

  <div style="position:relative;margin-top:auto;">
    <div style="font-size:160px;font-weight:500;letter-spacing:-.04em;line-height:1;color:${t.primary};margin-bottom:28px;">${esc(slots.title || '')}</div>
    <div style="font-size:32px;color:${t.inkMid};line-height:1.4;max-width:80%;font-weight:300;letter-spacing:-.01em;">${esc(slots.subtitle || '')}</div>
  </div>

  <div style="position:relative;margin-top:80px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${t.line};padding-top:28px;">
    <div class="mono" style="font-size:13px;color:${t.inkMid};letter-spacing:.06em;text-transform:uppercase;">${esc(slots.author || '')}</div>
    <div class="mono" style="font-size:13px;color:${t.inkMid};letter-spacing:.06em;">${formatDate()}</div>
  </div>
</div>`;
  return makeHtml(body, '', brand);
}

// =================== banner 16:9 ===================
function renderBanner({ slots, brand, assetUrl }) {
  const t = brandTokens(brand);
  const product = assetUrl
    ? `<img src="${escAttr(assetUrl)}" style="width:80%;height:auto;object-fit:contain;filter:drop-shadow(0 24px 48px rgba(0,0,0,.18));"/>`
    : `<div style="width:80%;aspect-ratio:1/1;background:${t.line};border-radius:24px;display:flex;align-items:center;justify-content:center;color:${t.inkMid};font-family:'Geist Mono',monospace;font-size:16px;">[ 产品图占位 ]</div>`;
  const body = `
<div style="width:1600px;height:900px;display:grid;grid-template-columns:7fr 6fr;background:${t.paper};">
  <div style="padding:88px 80px;display:flex;flex-direction:column;justify-content:center;">
    <div class="mono" style="font-size:13px;letter-spacing:.12em;color:${t.accent};text-transform:uppercase;margin-bottom:18px;">${esc(brand.data.brand_marks.wordmark_text || 'viaim')} · launch</div>
    <div style="font-size:104px;font-weight:600;letter-spacing:-.03em;line-height:1.02;margin-bottom:18px;">${esc(slots.title || '')}</div>
    <div style="font-size:24px;color:${t.inkMid};line-height:1.45;max-width:520px;margin-bottom:36px;">${esc(slots.subtitle || '')}</div>
    <div style="display:flex;align-items:center;gap:18px;">
      <div style="background:${t.primary};color:${t.paper};padding:14px 28px;border-radius:8px;font-size:18px;font-weight:500;">${esc(slots.cta || '')}</div>
      <div class="mono" style="font-size:13px;color:${t.inkMid};letter-spacing:.06em;text-transform:uppercase;">${esc(slots.meta || '')}</div>
    </div>
  </div>
  <div style="background:${t.card};border-left:1px solid ${t.line};display:flex;align-items:center;justify-content:center;">
    ${product}
  </div>
</div>`;
  return makeHtml(body, '', brand);
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escAttr(s) { return String(s ?? '').replace(/"/g, '&quot;'); }
function formatDate() {
  const d = new Date();
  return `${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}`;
}

window.Templates = Templates;
