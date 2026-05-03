/* =========================================================
   skills.js · 6 大类视觉输出 × 36 代表 Skills
   v0.1.10.1：踢出与「视觉体验」无关的 skill
     - 整个「音频」类（podcast/VO/audio-ad/soundtrack-brief）
     - 文档类的纯文本输出（PRD / 纪要 / Runbook / OKR / 财报 / brief MD）
     - 视频类的纯文本脚本（explainer 文字稿 / tutorial-outline）
   补齐 OD 里 visually distinctive 的 skill：
     - gamified-app · dating-web · blog-post · kanban-board · sprite-animation
     - digital-eguide · critique · tweaks（视觉评分 / panel）

   每个 skill 仍带 L 级别 + tpl_id?（已实装映射）+ prefill 上下文
   ========================================================= */

const SKILL_CATEGORIES = [
  { id: 'prototype',  label: '原型',  label_en: 'Prototype', icon: '◫', desc: '单页 / 多屏 / 设备框 / 可交互界面草图' },
  { id: 'marketing',  label: '营销',  label_en: 'Marketing', icon: '★', desc: '社交 / 海报 / EDM / 落地页 / 动效' },
  { id: 'deck',       label: 'Deck',  label_en: 'Deck',      icon: '▤', desc: '横向滑动幻灯片 / Pitch / 周报' },
  { id: 'doc',        label: '印刷物',label_en: 'Print',     icon: '¶', desc: '封面 / 单页 / 双跨页 / 视觉评分卡' },
  { id: 'image',      label: '图像',  label_en: 'Image',     icon: '▢', desc: 'gpt-image-2 / 产品渲染 / 头像 / 信息图' },
  { id: 'video',      label: '视频',  label_en: 'Video',     icon: '▶', desc: 'Seedance / HyperFrames / 静帧动效' },
];

const SKILLS = [
  // ===================== 原型 / Prototype (11) =====================
  { id: 'web-prototype', category: 'prototype', name: 'Web 原型', desc: '单页落地 · 营销 · Hero 页', l_level: 'L3',
    based_on: 'open-design / web-prototype', featured: true,
    prefill: { scene: '单页 web prototype · 落地页结构' } },
  { id: 'dashboard', category: 'prototype', name: 'Admin 仪表盘', desc: '左侧栏 + 数据密集布局', l_level: 'L3',
    based_on: 'open-design / dashboard',
    prefill: { scene: 'Admin 仪表盘 · 销售数据视图' } },
  { id: 'mobile-app', category: 'prototype', name: 'Mobile App 截屏', desc: 'iPhone 15 Pro / Pixel 设备框', l_level: 'L3',
    based_on: 'open-design / mobile-app',
    prefill: { scene: 'iOS App 主屏 · iPhone 15 Pro' } },
  { id: 'mobile-onboarding', category: 'prototype', name: '移动端引导', desc: '启动 / 价值 / 登录 三屏', l_level: 'L3',
    based_on: 'open-design / mobile-onboarding',
    prefill: { scene: 'Mobile onboarding · 三屏首启' } },
  { id: 'gamified-app', category: 'prototype', name: '游戏化 App', desc: '深色 stage · XP 进度 · 任务卡', l_level: 'L3',
    based_on: 'open-design / gamified-app',
    prefill: { scene: '三屏游戏化 mobile · 今日任务 + XP + 关卡详情' } },
  { id: 'dating-web', category: 'prototype', name: '消费级 Dashboard', desc: '编辑型布局 · ticker · KPI · 30 日图表', l_level: 'L3',
    based_on: 'open-design / dating-web',
    prefill: { scene: '消费级 dashboard · 左栏 + KPI + 30 日图表' } },
  { id: 'blog-post', category: 'prototype', name: '编辑长文', desc: '杂志风长文版式 · 大字标题 + 引用', l_level: 'L3',
    based_on: 'open-design / blog-post',
    prefill: { scene: '编辑长文版式 · 大标题 + 内文 + 引用块' } },
  { id: 'kanban-board', category: 'prototype', name: 'Kanban 看板', desc: 'Trello / Linear 风格列表 + 卡片', l_level: 'L3',
    based_on: 'open-design / kanban-board',
    prefill: { scene: 'Kanban 看板快照 · TODO/Doing/Done 三列' } },
  { id: 'docs-page', category: 'prototype', name: '文档站布局', desc: '3 列文档站', l_level: 'L3',
    based_on: 'open-design / docs-page',
    prefill: { scene: '产品文档站 · 3 列布局' } },
  { id: 'pricing-page', category: 'prototype', name: '价格页', desc: '价格 + 对比表', l_level: 'L3',
    based_on: 'open-design / pricing-page',
    prefill: { scene: 'SaaS 价格页 · 三档对比' } },
  { id: 'wireframe-sketch', category: 'prototype', name: '低保真草图', desc: '手绘灰盒 · 早期对齐', l_level: 'L3',
    based_on: 'open-design / wireframe-sketch',
    prefill: { scene: '低保真线框草图 · 灰盒占位' } },

  // ===================== 营销 / Marketing (8) =====================
  { id: 'social_card_1080', category: 'marketing', name: '社交卡 1080×1080', desc: 'IG / 微博 / 小红书 1:1', l_level: 'L3',
    tpl_id: 'social_card_1080', based_on: 'viaim 内置', featured: true },
  { id: 'banner_16_9', category: 'marketing', name: '活动 Banner 16:9', desc: '发布会 / 营销 banner', l_level: 'L3',
    tpl_id: 'banner_16_9', based_on: 'viaim 内置' },
  { id: 'social-carousel', category: 'marketing', name: '社交轮播 ×3', desc: '3 张 1080 卡连贯叙事', l_level: 'L3',
    based_on: 'open-design / social-carousel',
    prefill: { scene: '三连图轮播 · 标题跨页连贯' } },
  { id: 'magazine-poster', category: 'marketing', name: '杂志海报', desc: '单页杂志风格海报', l_level: 'L3',
    based_on: 'open-design / magazine-poster',
    prefill: { scene: '杂志风格海报 · 大标题 · 留白' } },
  { id: 'email-marketing', category: 'marketing', name: '邮件 EDM', desc: '产品发布 HTML 邮件 (table 兼容)', l_level: 'L3',
    based_on: 'open-design / email-marketing',
    prefill: { scene: '产品发布 HTML 邮件 · masthead + hero + CTA' } },
  { id: 'saas-landing', category: 'marketing', name: 'SaaS 落地页', desc: 'Hero / Features / Pricing / CTA', l_level: 'L3',
    based_on: 'open-design / saas-landing',
    prefill: { scene: 'SaaS 落地页 · Hero+Features+Pricing+CTA' } },
  { id: 'motion-frames', category: 'marketing', name: '动效 Hero', desc: '循环 CSS 动画 hero', l_level: 'L3',
    based_on: 'open-design / motion-frames',
    prefill: { scene: '动效 hero · 循环 CSS 动画' } },
  { id: 'sprite-animation', category: 'marketing', name: '像素动画', desc: '8-bit 像素 explainer 单帧 + 动画', l_level: 'L3',
    based_on: 'open-design / sprite-animation',
    prefill: { scene: '像素 / 8-bit 动画 · 全屏 stage · kinetic 排版' } },

  // ===================== Deck (4) =====================
  { id: 'simple-deck', category: 'deck', name: '极简 Deck', desc: '横向滑动 minimal deck', l_level: 'L3',
    based_on: 'open-design / simple-deck', featured: true,
    prefill: { scene: '极简 deck · 横向滑动 · 大标题' } },
  { id: 'guizang-ppt', category: 'deck', name: '杂志 PPT (guizang)', desc: '杂志风 webPPT · WebGL hero', l_level: 'L3',
    based_on: 'open-design / guizang-ppt',
    prefill: { scene: '杂志风 webPPT · 多版式 · WebGL hero' } },
  { id: 'pitch-deck', category: 'deck', name: '融资 Pitch Deck', desc: '种子 / A 轮 deck 12 页', l_level: 'L3',
    based_on: 'open-design / replit-deck',
    prefill: { scene: '融资 pitch deck · 12 页 · 强叙事' } },
  { id: 'weekly-update', category: 'deck', name: '周报 Deck', desc: '进度 / 阻塞 / 下周 swipe deck', l_level: 'L3',
    based_on: 'open-design / weekly-update',
    prefill: { scene: '团队周报 · 进度+阻塞+下周' } },

  // ===================== 印刷物 / Document (5) =====================
  { id: 'doc_cover', category: 'doc', name: '文档封面 1600×900', desc: 'PRD / 报告 / 提案封面', l_level: 'L3',
    tpl_id: 'doc_cover', based_on: 'viaim 内置', featured: true },
  { id: 'digital-eguide', category: 'doc', name: '电子手册', desc: '双跨页：封面 + 课节内页', l_level: 'L3',
    based_on: 'open-design / digital-eguide',
    prefill: { scene: '电子手册 · 封面 + 课节双跨页 · 创作者调性' } },
  { id: 'invoice', category: 'doc', name: '发票 / Invoice', desc: '单页发票视觉模板', l_level: 'L3',
    based_on: 'open-design / invoice',
    prefill: { scene: '发票 · 单页 · 含税额 · 商务排版' } },
  { id: 'critique', category: 'doc', name: '5 维评分卡', desc: 'Philosophy/Hierarchy/Detail/Function/Innovation', l_level: 'L3',
    based_on: 'open-design / critique',
    prefill: { scene: '5 维设计自评分卡 · 视觉打分 + 雷达图' } },
  { id: 'tweaks', category: 'doc', name: 'AI Tweaks Panel', desc: 'AI 主动提出可调参数面板', l_level: 'L3',
    based_on: 'open-design / tweaks',
    prefill: { scene: 'AI tweaks 面板 · 列出建议调整的参数 + 滑块' } },

  // ===================== 图像 / Image (5) =====================
  { id: 'gpt-image-2', category: 'image', name: 'gpt-image-2 海报', desc: 'OpenAI gpt-image-2 / Azure', l_level: 'L4', featured: true,
    based_on: 'open-design 43 ready prompts',
    prefill: { prompt: 'a calm-tech product still life of viaim Aura earphones on linen fabric, soft directional lighting, cinematic shadows' } },
  { id: 'product-render', category: 'image', name: '产品渲染图', desc: 'Aura/Mate 静物 / 场景图', l_level: 'L4',
    based_on: 'viaim',
    prefill: { prompt: 'viaim Aura earphones, 45° hero shot, obsidian colorway, on minimalist desk with soft window light, hyperdetailed, 8k' } },
  { id: 'avatar-portrait', category: 'image', name: '人像 / 头像', desc: '商务头像 · 团队照', l_level: 'L4',
    prefill: { prompt: 'professional business portrait, calm-tech aesthetic, neutral linen background, 50mm lens, soft natural light' } },
  { id: 'infographic', category: 'image', name: '信息图', desc: '数据可视化 / 流程图', l_level: 'L4',
    prefill: { prompt: 'minimal infographic, viaim brand palette (#18181b primary, #b8410c accent), restrained, sans-serif typography' } },
  { id: 'illustrated-map', category: 'image', name: '说明插画', desc: '叙事性 isometric 插画', l_level: 'L4',
    prefill: { prompt: 'illustrated isometric map, calm-tech style, soft palette, no people' } },

  // ===================== 视频 / Video (3) =====================
  { id: 'seedance-15s', category: 'video', name: 'Seedance 15s', desc: 'ByteDance 文生视频 · 电影感', l_level: 'L4', featured: true,
    based_on: 'open-design / Seedance 39 prompts',
    prefill: { prompt: 'cinematic 15s product reveal: viaim Aura earphones on linen, slow camera push-in, soft window light, ambient' } },
  { id: 'hyperframes', category: 'video', name: 'HyperFrames', desc: 'HTML→MP4 动效图形', l_level: 'L4',
    based_on: 'open-design / heygen hyperframes',
    prefill: { prompt: 'kinetic typography reveal · viaim · "把对话变成可用的结果" · 8s · monochrome' } },
  { id: 'product-reveal', category: 'video', name: '产品揭幕静帧', desc: 'kinetic typography reveal · 多帧动效', l_level: 'L4',
    prefill: { prompt: 'product reveal: macro shot → camera pull back → wordmark fade in, calm-tech, 12s' } },
];

window.SKILLS = SKILLS;
window.SKILL_CATEGORIES = SKILL_CATEGORIES;
