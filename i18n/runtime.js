// 당근 CC 다국어 (한국어 · English · 日本語 · 中文)
// 게임 코드는 한국어 그대로 두고, 화면에 나가는 글자(문서 글자, 버튼, 캔버스 간판)를 이 사전으로 바꿔요.
// 사전은 scripts/i18n-build.js 가 만들어요. 문구를 추가하면 사전에도 추가해 주세요.
(() => {
  const LANGS = [['ko', '한국어'], ['en', 'English'], ['ja', '日本語'], ['zh', '中文']];
  let lang = 'ko';
  try { const v = localStorage.getItem('carrotLang'); if (LANGS.some(l => l[0] === v)) lang = v; } catch {}
  const set = l => { try { localStorage.setItem('carrotLang', l); } catch {} location.reload(); };
  const I = window.I18N = { lang, LANGS, set, tr: s => s };
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
  if (lang === 'ko') return;

  const D = __DICT__;
  const col = { en: 0, ja: 1, zh: 2 }[lang];
  const HANGUL = /[가-힣ㄱ-ㅎ]/;
  const exact = new Map(), pats = [];
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const k0 in D) {
    let k = k0, t = D[k0][col];
    // 붙어 있는 자리표시자({1}{2})는 한 덩어리로 받아요 (번역에서도 붙어 있을 때)
    for (let m; (m = /\{(\d+)\}\{(\d+)\}/.exec(k)) && t.includes(m[0]);) { k = k.replace(m[0], `{${m[1]}}`); t = t.replace(m[0], `{${m[1]}}`); }
    if (!/\{\d+\}/.test(k)) { exact.set(k, t); continue; }
    const lit = k.replace(/\{\d+\}/g, '');
    const re = new RegExp('^' + k.split(/\{\d+\}/).map(reEsc).join('(.+?)') + '$');
    pats.push({ re, t, w: lit.length });
  }
  pats.sort((a, b) => b.w - a.w);
  const cache = new Map();
  // 서버가 지어주는 이름표(형용사 + 명사)도 바꿔 보여줘요. 다른 사람 화면에는 각자 언어로 보여요.
  const NA = { 아삭한: ['Crunchy', 'シャキッと', '脆脆的'], 주황빛: ['Orange', 'オレンジ色の', '橙色的'], 느긋한: ['Easygoing', 'のんびり', '悠闲的'], 조용한: ['Quiet', '静かな', '安静的'], 바람같은: ['Breezy', '風のような', '如风的'], 침착한: ['Calm', '落ち着いた', '沉着的'], 오늘도: ['Everyday', '今日も', '今天也'], 은은한: ['Gentle', 'ほのかな', '淡雅的'], 흔들리는: ['Wobbly', '揺れる', '摇摆的'], 한가로운: ['Leisurely', 'ゆったり', '悠哉的'], 산뜻한: ['Fresh', 'さわやかな', '清爽的'], 나른한: ['Drowsy', 'けだるい', '慵懒的'], 포근한: ['Cozy', 'ふんわり', '温暖的'], 단단한: ['Sturdy', 'がっしり', '结实的'] };
  const NN = { 버디: ['Birdie', 'バーディー', '小鸟球'], 이글: ['Eagle', 'イーグル', '老鹰球'], 퍼터: ['Putter', 'パター', '推杆'], 캐디: ['Caddie', 'キャディ', '球童'], 티샷: ['Tee Shot', 'ティーショット', '开球'], 디봇: ['Divot', 'ディボット', '打痕'], 당근: ['Carrot', 'にんじん', '胡萝卜'], 파세이브: ['Par Save', 'パーセーブ', '保帕'], 그린: ['Green', 'グリーン', '果岭'], 페어웨이: ['Fairway', 'フェアウェイ', '球道'], 드라이버: ['Driver', 'ドライバー', '一号木'], 웨지: ['Wedge', 'ウェッジ', '挖起杆'], 티박스: ['Tee Box', 'ティーボックス', '发球台'] };
  const nick = s => { const m = /^([^가-힣]*?)(\S+) (\S+)$/.exec(s); return m && NA[m[2]] && NN[m[3]] ? m[1] + NA[m[2]][col] + (col ? '' : ' ') + NN[m[3]][col] : null; };
  function core(s) {
    if (exact.has(s)) return exact.get(s);
    const nk = nick(s); if (nk) return nk;
    for (const p of pats) { const m = p.re.exec(s); if (m) return p.t.replace(/\{(\d+)\}/g, (_, n) => { const v = m[+n + 1]; return v == null ? '' : tr(v); }); }
    return null;
  }
  function tr(s) {
    if (typeof s !== 'string' || !HANGUL.test(s)) return s;
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0], body = s.trim().replace(/\s+/g, ' ');
    let out = core(body);
    // " · " 로 이어 붙인 문장은 조각마다 바꿔 봐요
    if (out == null && body.includes(' · ')) {
      const parts = body.split(' · ');
      const tp = parts.map((p, i) => { let r = core(p); if (r == null && i) { r = core('· ' + p); if (r != null) r = r.replace(/^[·・]\s*/, ''); } return r; });
      if (tp.some(x => x != null)) out = parts.map((p, i) => tp[i] ?? p).join(' · ');
    }
    if (out == null) out = nick(body);
    const r = out == null ? s : lead + out + tail;
    if (cache.size > 4000) cache.clear(); cache.set(s, r); return r;
  }
  I.tr = tr;

  // ---- 캔버스 글자 (3D 간판, 지도, 결과 카드) ----
  const C = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText', 'measureText']) { const orig = C[fn]; C[fn] = function (t, ...a) { return orig.call(this, tr(String(t)), ...a); }; }

  // ---- 문서 글자 ----
  const done = new WeakMap(), ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  function txt(n) { const v = n.nodeValue; if (done.get(n) === v || !HANGUL.test(v)) return; const t = tr(v); done.set(n, t); if (t !== v) n.nodeValue = t; }
  function el(e) { for (const a of ATTRS) { const v = e.getAttribute && e.getAttribute(a); if (v && HANGUL.test(v)) { const t = tr(v); if (t !== v) e.setAttribute(a, t); } } }
  function walk(root) {
    if (root.nodeType === 3) return txt(root);
    if (root.nodeType !== 1) return;
    if (root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
    el(root);
    const w = document.createTreeWalker(root, 5, { acceptNode: n => n.nodeType === 1 && (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') ? 2 : 1 });
    let n; while ((n = w.nextNode())) n.nodeType === 3 ? txt(n) : el(n);
  }
  const start = () => {
    walk(document.body); document.title = tr(document.title);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') txt(m.target); else if (m.type === 'attributes') el(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
