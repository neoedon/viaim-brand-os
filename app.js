/* =========================================================
   app.js — 应用入口
   ========================================================= */

(function () {
  const App = {
    currentRoute: 'home',
    navigate(route) {
      if (!Modules[route]) route = 'home';
      this.currentRoute = route;
      const mod = Modules[route];
      const page = document.getElementById('page');
      page.innerHTML = mod.render(App);
      mod.mount && mod.mount(App);

      // active nav state
      document.querySelectorAll('.nav-link').forEach((el) => el.classList.toggle('active', el.dataset.route === route));

      // topbar title
      const titleEl = document.getElementById('pageTitle');
      titleEl.textContent = mod.title || '';

      // eyebrow on sidebar reflects current section（中文为默认；en 模式由 i18n 翻译）
      const eyebrowMap = {
        home: '主页', inbox: '灵感池',
        brand: '品牌源', assets: '资产库',
        studio: '生成工作台', launch: '上市规划',
        compliance: '合规',
        templates: '技能库', api: 'API & SDK',
        archive: '产物归档', settings: '设置', docs: 'PRD',
      };
      const eyebrow = document.getElementById('navEyebrow');
      if (eyebrow) {
        const text = eyebrowMap[route] || mod.title || '';
        // 中文不需要 toUpperCase（CSS text-transform 已处理）
        eyebrow.textContent = text;
      }

      window.scrollTo({ top: 0 });
      this.refreshTopbar();
      this.refreshNavBadges();
      this.refreshRecent();
      this.refreshComplianceBar();
      // 多语言：在所有刷新完成后做最后一次 DOM 翻译
      if (window.Lang && Lang.current === 'en') Lang.translateAll();
    },

    refreshTopbar() {
      const brand = Store.getCurrentBrand();
      const versionMeta = Store.getCurrentVersionMeta();
      const assets = Store.getAssets();
      const lang = (window.Lang && Lang.current) || 'zh';
      const meta = document.getElementById('topbarMeta');
      const labelAssets = lang === 'en' ? 'assets' : 'assets';
      const labelLock = lang === 'en' ? 'brand lock' : 'brand lock';
      const lockOn = versionMeta.status === 'published';
      meta.innerHTML = `
        <span>brand <b>v${esc(versionMeta.version)}</b></span>
        <span class="sep">·</span>
        <span><b>${assets.length}</b> ${labelAssets}</span>
        <span class="sep">·</span>
        <span>${labelLock}: <b class="${lockOn ? 'lock-on' : 'lock-off'}">${lockOn ? 'ON' : 'OFF'}</b></span>
        <span class="sep">·</span>
        <select id="brandSwitch" title="${lang === 'en' ? 'Switch brand version' : '切换 brand 版本'}">
          ${brand.versions.map((v) => `<option value="${esc(v.version)}" ${v.version === versionMeta.version ? 'selected' : ''}>v${esc(v.version)} · ${esc(v.status)}</option>`).join('')}
        </select>
        <span class="sep">·</span>
        <button class="lang-toggle" id="langToggle" title="${lang === 'en' ? 'Switch to Chinese' : '切换到英文'}">
          <span class="${lang === 'zh' ? 'on' : ''}">中</span>
          <span class="slash">/</span>
          <span class="${lang === 'en' ? 'on' : ''}">EN</span>
        </button>
      `;
      meta.querySelector('#brandSwitch').addEventListener('change', (e) => {
        Store.setCurrentVersion(e.target.value);
        this.navigate(this.currentRoute);
        toast(lang === 'en' ? `Switched to v${e.target.value}` : `切到 v${e.target.value}`, 'success', 1400);
      });
      meta.querySelector('#langToggle').addEventListener('click', () => {
        Lang.toggle();
        toast(Lang.current === 'en' ? 'Language: English' : '语言：中文', 'success', 1400);
        this.navigate(this.currentRoute);
      });
      if (window.Lang && Lang.current === 'en') Lang.translateDom(meta);
    },

    refreshNavBadges() {
      const brand = Store.getCurrentBrand();
      const versionMeta = Store.getCurrentVersionMeta();
      const assets = Store.getAssets();
      const outputs = Store.getOutputs();
      // recent outputs in 24h
      const recentN = outputs.filter((o) => Date.now() - new Date(o.created_at).getTime() < 24*3600*1000).length;
      // pending lint warnings (non-pass)
      const warnN = outputs.filter((o) => o.compliance && o.compliance.status !== 'pass').length;

      const set = (id, text, isRed = false) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('red', isRed);
      };
      // 灵感池：未处理数量（inbox + fetched）
      const sources = Store.getSources();
      const pendingSrc = sources.filter((s) => s.status === 'inbox' || s.status === 'fetched').length;

      set('cntInbox', pendingSrc > 0 ? String(pendingSrc) : String(sources.length), pendingSrc > 0);
      set('cntBrand', `v${versionMeta.version}`);
      set('cntAssets', String(assets.length));
      set('cntStudio', String(recentN), recentN > 0);
      // 上市倒计时（最近一个 launch）
      const launches = Store.getLaunchPlans ? Store.getLaunchPlans() : [];
      const cur = Store.getCurrentLaunch ? Store.getCurrentLaunch() : null;
      let launchCnt = '—';
      if (cur) {
        const days = Math.ceil((new Date(cur.launch_date + 'T00:00:00').getTime() - Date.now()) / 86400000);
        launchCnt = days >= 0 ? `D-${days}` : `+${-days}d`;
      }
      set('cntLaunch', launchCnt);
      set('cntCompliance', warnN > 0 ? `${warnN}⚠` : '—', warnN > 0);
      set('cntTemplates', String((window.SKILLS || []).length || Templates.list().length));
      set('cntArchive', String(outputs.length));
    },

    refreshRecent() {
      const outputs = Store.getOutputs().slice(0, 5);
      const wrap = document.getElementById('recentList');
      if (!wrap) return;
      if (outputs.length === 0) {
        wrap.innerHTML = `<div style="padding:6px 12px;font-size:11.5px;color:var(--ink-mute);">尚无产物</div>`;
        return;
      }
      wrap.innerHTML = outputs.map((o) => {
        const label = o.title || o.template || o.type;
        return `<div class="recent-row" data-out="${o.id}">${esc(label.slice(0, 28))}</div>`;
      }).join('');
      wrap.querySelectorAll('.recent-row').forEach((r) => {
        r.addEventListener('click', () => this.navigate('archive'));
      });
    },

    refreshComplianceBar() {
      const bar = document.getElementById('complianceBar');
      const onStudioL3 = (this.currentRoute === 'studio' && Modules.studio.state.tab === 'l3');

      // base: latest output's lint
      const outs = Store.getOutputs();
      const recent = outs[0];
      let lintSummary = '';
      if (recent && recent.compliance) {
        const v = recent.compliance.violations;
        const pass = recent.compliance.status === 'pass';
        lintSummary = pass
          ? '<span class="check pass"><span class="ico">✓</span>tokens 合规</span><span class="check pass"><span class="ico">✓</span>logo 留白</span><span class="check pass"><span class="ico">✓</span>字体合规</span>'
          : v.slice(0, 3).map((x) => `<span class="check ${x.level}"><span class="ico">${x.level === 'error' ? '✕' : '⚠'}</span>${esc(x.msg.slice(0, 22))}</span>`).join('');
      } else {
        lintSummary = '<span class="check pass"><span class="ico">✓</span>tokens 合规</span><span class="check pass"><span class="ico">✓</span>logo 留白</span><span class="check"><span class="ico">·</span>未检测</span>';
      }

      bar.outerHTML = `<div id="complianceBar" class="compliance-bar">
        <div class="summary">${lintSummary}</div>
        <div class="actions">
          ${onStudioL3 ? `
            <span class="label">导出 ·</span>
            <a id="actExportPng">PNG</a>
            <span class="sep">/</span>
            <a id="actExportFigma">Figma</a>
            <span class="sep">/</span>
            <a id="actExportApi">API</a>
          ` : `
            <a id="actLintMore">查看 lint →</a>
          `}
        </div>
      </div>`;

      // 翻译刚刚替换的状态条
      if (window.Lang && Lang.current === 'en') {
        const newBar = document.getElementById('complianceBar');
        if (newBar) Lang.translateDom(newBar);
      }

      const $ = (id) => document.getElementById(id);
      if (onStudioL3) {
        $('actExportPng')?.addEventListener('click', async () => {
          const last = window.__l3GetLast && window.__l3GetLast();
          if (!last || !last.html) { toast('请先在 Studio 渲染预览', 'warn'); return; }
          await exportTemplateAsPNG(last.html, last.tpl);
          window.__l3Archive && window.__l3Archive();
        });
        $('actExportFigma')?.addEventListener('click', () => {
          // Figma 导出（v0.1：复制 HTML 让用户粘贴到 Figma html.to.design 插件）
          const last = window.__l3GetLast && window.__l3GetLast();
          if (!last || !last.html) { toast('请先在 Studio 渲染预览', 'warn'); return; }
          navigator.clipboard.writeText(last.html).then(() => toast('HTML 已复制 · 在 Figma 中可用 html.to.design 插件粘贴', 'success', 4000));
        });
        $('actExportApi')?.addEventListener('click', () => {
          const last = window.__l3GetLast && window.__l3GetLast();
          if (!last || !last.tpl) return;
          const payload = {
            template: last.tpl.id,
            slots: { ...(window.L3State?.slots || {}) },
            brand_version: Store.getCurrentVersionMeta().version,
          };
          const sample = `POST /api/v1/generate/template\nContent-Type: application/json\n\n${JSON.stringify(payload, null, 2)}`;
          navigator.clipboard.writeText(sample).then(() => toast('API 调用样例已复制', 'success'));
        });
      } else {
        $('actLintMore')?.addEventListener('click', () => {
          if (recent && recent.compliance) showLintDetail(recent.compliance);
          else toast('暂无 lint 记录', 'warn');
        });
      }
    },
  };

  // 全局命令面板按键 + 双键跳转
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.shiftKey) {
      e.preventDefault(); Cmdk.toggle(); return;
    }
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
      e.preventDefault(); Cmdk.show();
      setTimeout(() => { const inp = document.getElementById('cmdkInput'); if (inp) { inp.value = 'switch'; inp.dispatchEvent(new Event('input')); } }, 60);
      return;
    }
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
      if (e.key.toLowerCase() === 'g') {
        App._waitingG = true;
        setTimeout(() => { App._waitingG = false; }, 800);
        return;
      }
      if (App._waitingG) {
        const map = { b: 'brand', a: 'assets', s: 'studio', c: 'compliance', o: 'archive', h: 'home', t: 'templates' };
        const r = map[e.key.toLowerCase()];
        if (r) { e.preventDefault(); App.navigate(r); App._waitingG = false; return; }
      }
      if (e.key === '/') {
        const search = document.querySelector('input.search');
        if (search) { e.preventDefault(); search.focus(); }
      }
    }
  });

  // 侧边栏跳转
  document.querySelectorAll('.nav-link[data-route]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); App.navigate(el.dataset.route); });
  });
  document.getElementById('openCmdk').addEventListener('click', () => Cmdk.show());
  document.getElementById('railAdd')?.addEventListener('click', () => {
    toast('多 brand 切换器 v0.1 仅展示入口（PRD §5.1.5 边界）', 'warn', 3500);
  });

  // 初始化种子 + 语言偏好
  Store.getBrands();
  Store.getSettings();
  if (window.Lang) Lang.load();

  Cmdk.setCtx(App);
  App.navigate(parseHash() || 'home');

  window.addEventListener('hashchange', () => {
    const r = parseHash();
    if (r) App.navigate(r);
  });

  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '').trim();
    return h || null;
  }

  window.__refreshComplianceBar = () => App.refreshComplianceBar();
  window.__updateBottomLint = () => App.refreshComplianceBar();
  window.App = App;
})();
