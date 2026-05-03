/* =========================================================
   cmdk.js
   ⌘K 命令面板 — 跳转 / 新建 / 搜索 / 切换 / 动作
   带 LLM 自然语言意图识别（fallback：字符串匹配）
   ========================================================= */

const Cmdk = {
  open: false,
  ctx: null,
  setCtx(ctx) { this.ctx = ctx; },

  show() {
    if (this.open) return;
    this.open = true;
    const portal = document.getElementById('cmdkPortal');
    portal.innerHTML = this._html();
    this._bind();
    if (window.Lang) Lang.translateDom(portal);
    setTimeout(() => document.getElementById('cmdkInput')?.focus(), 30);
  },
  hide() {
    this.open = false;
    document.getElementById('cmdkPortal').innerHTML = '';
    document.querySelectorAll('#lintDetailFloat').forEach((x) => x.remove());
  },
  toggle() { this.open ? this.hide() : this.show(); },

  _html() {
    return `
      <div class="cmdk-mask" id="cmdkMask">
        <div class="cmdk-box">
          <input class="cmdk-input" id="cmdkInput" placeholder="输入命令、跳转、自然语言…例如：'go brand' 或 '帮我做个 Aura 海报'" />
          <div class="cmdk-list" id="cmdkList"></div>
          <div class="cmdk-foot">
            <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
            <span><kbd>↵</kbd> 执行</span>
            <span><kbd>Esc</kbd> 关闭</span>
          </div>
        </div>
      </div>`;
  },

  _bind() {
    const mask = document.getElementById('cmdkMask');
    const input = document.getElementById('cmdkInput');
    mask.addEventListener('click', (e) => { if (e.target.id === 'cmdkMask') this.hide(); });
    input.addEventListener('input', () => this._refresh());
    input.addEventListener('keydown', (e) => this._onKey(e));
    this._refresh();
  },

  _activeIdx: 0,

  _refresh() {
    const q = (document.getElementById('cmdkInput').value || '').trim();
    const items = this._buildItems(q);
    this._items = items;
    this._activeIdx = 0;
    const list = document.getElementById('cmdkList');
    if (items.length === 0) {
      list.innerHTML = `<div class="cmdk-empty">没有匹配结果。回车按自然语言意图执行。</div>`;
      return;
    }
    let lastGroup = null;
    let html = '';
    items.forEach((it, i) => {
      if (it.group !== lastGroup) {
        if (lastGroup !== null) html += '</div>';
        html += `<div class="cmdk-group"><div class="label">${esc2(it.group)}</div>`;
        lastGroup = it.group;
      }
      html += `<div class="cmdk-item ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="icon">${esc2(it.icon || '·')}</span>
        <span class="name">${esc2(it.name)}</span>
        <span class="hint">${esc2(it.hint || '')}</span>
      </div>`;
    });
    if (lastGroup !== null) html += '</div>';
    list.innerHTML = html;
    if (window.Lang) Lang.translateDom(list);
    list.querySelectorAll('.cmdk-item').forEach((el) => {
      el.addEventListener('mouseenter', () => this._setActive(parseInt(el.dataset.i)));
      el.addEventListener('click', () => this._run(parseInt(el.dataset.i)));
    });
  },

  _setActive(i) {
    this._activeIdx = i;
    document.querySelectorAll('#cmdkList .cmdk-item').forEach((el, idx) => el.classList.toggle('active', idx === i));
  },

  _onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); this.hide(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this._setActive(Math.min(this._items.length - 1, this._activeIdx + 1)); this._scrollActive(); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); this._setActive(Math.max(0, this._activeIdx - 1)); this._scrollActive(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (this._items.length === 0) {
        this._intent(document.getElementById('cmdkInput').value);
      } else {
        this._run(this._activeIdx);
      }
    }
  },
  _scrollActive() {
    const el = document.querySelector(`#cmdkList .cmdk-item.active`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  },

  _buildItems(q) {
    const ql = q.toLowerCase();
    const all = [];

    // 跳转
    [
      { name: '主页', route: 'home', icon: '⌂' },
      { name: '灵感池', route: 'inbox', icon: '✦' },
      { name: '品牌源', route: 'brand', icon: 'B' },
      { name: '资产库', route: 'assets', icon: 'A' },
      { name: '生成工作台', route: 'studio', icon: 'S' },
      { name: '上市规划', route: 'launch', icon: '🚀' },
      { name: '合规', route: 'compliance', icon: 'C' },
      { name: '技能库', route: 'templates', icon: 'T' },
      { name: 'API & SDK', route: 'api', icon: '〈〉' },
      { name: '产物归档', route: 'archive', icon: 'O' },
      { name: '设置', route: 'settings', icon: '⚙' },
      { name: 'PRD 文档', route: 'docs', icon: '¶' },
    ].forEach((g) => {
      all.push({ group: '跳转 (Go)', name: g.name, hint: `go ${g.route}`, icon: g.icon, action: () => this.ctx.navigate(g.route) });
    });

    // 新建 source（灵感池快速入口）
    all.push({
      group: '新建 (New)',
      name: '新建 · 灵感池资源',
      hint: 'new source',
      icon: '✦',
      action: () => {
        Modules.inbox.state.adding = true;
        this.ctx.navigate('inbox');
      },
    });

    // 新建
    Templates.list().forEach((t) => {
      all.push({ group: '新建 (New)', name: `新建 · ${t.name}`, hint: `new ${t.id}`, icon: '+', action: () => this._gotoStudioTemplate(t.id) });
    });
    all.push({ group: '新建 (New)', name: '新建 L1 Prompt', hint: 'new l1', icon: '+', action: () => { this.ctx.navigate('studio'); Modules.studio.state.tab = 'l1'; this.ctx.navigate('studio'); } });
    all.push({ group: '新建 (New)', name: '新建 L2 Mini MD', hint: 'new l2', icon: '+', action: () => { this.ctx.navigate('studio'); Modules.studio.state.tab = 'l2'; this.ctx.navigate('studio'); } });

    // 搜索资产
    if (q && q.length >= 1) {
      const results = Store.filterAssets({ q });
      results.slice(0, 6).forEach((a) => {
        all.push({ group: '资产 (Find)', name: a.file.name || a.id, hint: `${a.taxonomy.product} · ${a.taxonomy.angle || ''}`, icon: '◇', action: () => this.ctx.navigate('assets') });
      });
    }

    // 切换 brand version
    const brand = Store.getCurrentBrand();
    brand.versions.forEach((v) => {
      all.push({ group: '切换 (Switch)', name: `Brand · ${v.version}`, hint: v.status, icon: '⇄', action: () => { Store.setCurrentVersion(v.version); this.ctx.refreshTopbar(); this.ctx.navigate(this.ctx.currentRoute || 'home'); toast(`已切换到 ${v.version}`, 'success'); } });
    });

    // 动作
    all.push({ group: '动作 (Action)', name: '发布当前 Brand draft', hint: 'publish', icon: '↑', action: () => { try { Store.publishDraft(); toast('已发布', 'success'); this.ctx.refreshTopbar(); this.ctx.navigate('brand'); } catch (e) { toast(e.message, 'warn'); } } });
    all.push({ group: '动作 (Action)', name: '导出 Outputs JSON', hint: 'export', icon: '↓', action: () => { const blob = new Blob([JSON.stringify(Store.getOutputs(), null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `outputs-${Date.now()}.json`; a.click(); toast('已导出', 'success'); } });

    if (!q) return all.slice(0, 14); // 不输入时只显示常用
    // 模糊匹配
    return all.filter((x) => {
      return x.name.toLowerCase().includes(ql) || (x.hint || '').toLowerCase().includes(ql) || x.group.toLowerCase().includes(ql);
    }).slice(0, 20);
  },

  _gotoStudioTemplate(tplId) {
    Modules.studio.state.tab = 'l3';
    this.ctx.navigate('studio');
    setTimeout(() => {
      const sel = document.getElementById('l3Tpl');
      if (sel) { sel.value = tplId; sel.dispatchEvent(new Event('change')); }
    }, 80);
  },

  _run(i) {
    const item = this._items[i];
    if (!item) return;
    this.hide();
    setTimeout(() => item.action(), 30);
  },

  // 自然语言意图识别（最弱兜底走关键字 + 同义词）
  async _intent(text) {
    if (!text.trim()) return;
    this.hide();
    if (!Api.llmReady()) {
      // 关键字兜底
      const t = text.toLowerCase();
      if (/(海报|社交|微博|social)/.test(t)) { this._gotoStudioTemplate('social_card_1080'); toast('已跳转到 L3 · 社交卡', 'success'); return; }
      if (/(prd|封面|cover|文档)/.test(t)) { this._gotoStudioTemplate('doc_cover'); toast('已跳转到 L3 · 文档封面', 'success'); return; }
      if (/(banner|横幅|发布|发布会)/.test(t)) { this._gotoStudioTemplate('banner_16_9'); toast('已跳转到 L3 · banner', 'success'); return; }
      if (/(品牌|brand|token)/.test(t)) { this.ctx.navigate('brand'); return; }
      if (/(资产|asset|图)/.test(t)) { this.ctx.navigate('assets'); return; }
      if (/(灵感|资源|网页|github|article|inbox|ingest|抓取)/.test(t)) { this.ctx.navigate('inbox'); return; }
      toast('未识别意图，建议配置 LLM 后再试', 'warn');
      return;
    }
    toast('正在识别意图…');
    try {
      const out = await Api.chat({
        system: `You map a user's natural language to one of these actions and reply STRICTLY in JSON like:
{"action":"navigate|new","route":"home|brand|assets|studio|compliance|archive|settings|docs","tab":"l1|l2|l3|l4","template":"social_card_1080|doc_cover|banner_16_9|null","note":"short reason"}
No markdown, no code fence.`,
        user: text,
        temperature: 0,
      });
      let json;
      try { json = JSON.parse(out.text); } catch { json = null; }
      if (!json) { toast('意图解析失败', 'warn'); return; }
      if (json.action === 'navigate' && json.route) {
        if (json.route === 'studio' && json.tab) Modules.studio.state.tab = json.tab;
        if (json.template) { this._gotoStudioTemplate(json.template); return; }
        this.ctx.navigate(json.route);
      } else if (json.action === 'new' && json.template) {
        this._gotoStudioTemplate(json.template);
      } else {
        toast(json.note || '未匹配到具体动作', 'warn');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  },
};

function esc2(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

window.Cmdk = Cmdk;
