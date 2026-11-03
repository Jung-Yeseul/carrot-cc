// 당근 CC — 3D 클라이언트 (three.js r128)
// 입장 화면, 채널 접속, 3D 코스, 당근 캐릭터 이동, 샷·공 물리, 그늘집, 동물, 소리, 다른 사람 표시까지 이 파일 하나에 있어요.
(() => {
'use strict';
const T = window.THREE;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = n => n.toLocaleString('ko-KR');
const fmtDiff = d => d === 0 ? 'E (이븐)' : d > 0 ? `+${d}` : `${d}`;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// ================= 코스 데이터 (1 유닛 = 약 3m) =================
const MAP = 120;          // 코스는 -120 ~ 120
const M_PER_U = 3;
const G = 18;             // 중력
const HOLES = [
  { name: '단풍길', par: 3, tee: [-60, 85], cup: [-62, 30], green: 9, fair: [[-60, 85], [-62, 30]], fw: 12,
    sand: [[-52, 36, 3.5], [-71, 40, 3]], water: [] },
  { name: '악어 연못', par: 4, tee: [-45, 10], cup: [25, -55], green: 10, fair: [[-45, 10], [-20, -25], [25, -55]], fw: 13,
    sand: [[34, -48, 3.5], [-28, -32, 3]], water: [[-6, -12, 10]] },
  { name: '당근밭', par: 3, tee: [55, -25], cup: [70, 28], green: 9, fair: [[55, -25], [70, 28]], fw: 11,
    sand: [[62, 21, 3], [79, 34, 3]], water: [] },
  { name: '클럽하우스 가는 길', par: 4, tee: [60, 75], cup: [-15, 70], green: 10, fair: [[60, 75], [25, 92], [-15, 70]], fw: 13,
    sand: [[-5, 63, 3.5]], water: [[26, 68, 8]] },
];
const TOTAL_PAR = HOLES.reduce((a, h) => a + h.par, 0);
const SHADE = { x: 6, z: 32 };   // 그늘집 위치
const PATHS = [[[-62, 30], [-58, 18], [-45, 10]], [[25, -55], [42, -42], [55, -25]], [[70, 28], [64, 52], [60, 75]], [[-15, 70], [-2, 50], [6, 32]], [[6, 32], [-20, 22], [-45, 10]], [[6, 32], [36, 10], [55, -25]], [[-60, 85], [-38, 76], [-15, 70]]];
const CLUBS = [
  { name: '드라이버', loft: .30, v: 33 },
  { name: '아이언', loft: .42, v: 26 },
  { name: '웨지', loft: .78, v: 19 },
  { name: '퍼터', loft: 0, v: 13 },
];
const ROLL = { green: [.9, .5], fairway: [1.5, 1.2], tee: [1.5, 1.2], path: [1.2, 1], rough: [3, 3.5], sand: [8, 6] };
const LIE = { green: '그린', fairway: '페어웨이', tee: '티잉 구역', path: '카트 도로', rough: '러프', sand: '벙커' };
const EMOTES = ['나이스샷!', '굿 퍼팅', '아깝다~', '오잘공!', '당근이지!', '캐디님 감사']; // 서버 EMOTES 개수와 맞추기
const MENU = [
  { id: 'carrot', name: '갓 짠 당근주스', price: '12,000원', eff: '눈이 밝아져요. 공이 날아갈 길이 미리 보여요.', chip: '당근주스: 궤적 미리보기' },
  { id: 'ramen', name: '그늘집 컵라면', price: '9,000원', eff: '든든해서 힘이 나요. 비거리 +20%.', chip: '컵라면: 비거리 +20%' },
  { id: 'makgeolli', name: '막걸리 한 잔', price: '15,000원', eff: '홀컵이 두 배로 크게 보여요. 대신 손이 살짝 떨려요.', chip: '막걸리: 홀컵 크게, 손 떨림' },
  { id: 'odeng', name: '오뎅 꼬치', price: '11,000원', eff: '동반자가 너그러워져요. 멀리건 2장.', chip: '오뎅: 멀리건 2장' },
];

// ================= 지형 판정 =================
function segD(px, pz, a, b) {
  const vx = b[0] - a[0], vz = b[1] - a[1], wx = px - a[0], wz = pz - a[1];
  const t = clamp((wx * vx + wz * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t);
}
function surface(x, z) {
  for (const h of HOLES) for (const w of h.water) if (Math.hypot(x - w[0], z - w[1]) < w[2]) return 'water';
  for (const h of HOLES) for (const s of h.sand) if (Math.hypot(x - s[0], z - s[1]) < s[2]) return 'sand';
  for (const h of HOLES) if (Math.hypot(x - h.cup[0], z - h.cup[1]) < h.green) return 'green';
  for (const h of HOLES) {
    if (Math.abs(x - h.tee[0]) < 4 && Math.abs(z - h.tee[1]) < 4) return 'tee';
    for (let i = 0; i < h.fair.length - 1; i++) if (segD(x, z, h.fair[i], h.fair[i + 1]) < h.fw / 2) return 'fairway';
  }
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) if (segD(x, z, p[i], p[i + 1]) < 1.1) return 'path';
  return 'rough';
}
function nearCourse(x, z, pad) {
  for (const h of HOLES) {
    for (const w of h.water) if (Math.hypot(x - w[0], z - w[1]) < w[2] + pad) return true;
    if (Math.hypot(x - h.cup[0], z - h.cup[1]) < h.green + pad) return true;
    if (Math.hypot(x - h.tee[0], z - h.tee[1]) < 6 + pad) return true;
    for (let i = 0; i < h.fair.length - 1; i++) if (segD(x, z, h.fair[i], h.fair[i + 1]) < h.fw / 2 + pad) return true;
  }
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) if (segD(x, z, p[i], p[i + 1]) < 1.5 + pad * .4) return true;
  return Math.hypot(x - SHADE.x, z - SHADE.z) < 9 + pad;
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// 나무 위치 (고정 시드)
const TREES = [];
(() => {
  const R = rng(20261103);
  for (let k = 0; k < 2000 && TREES.length < 95; k++) {
    const x = (R() * 2 - 1) * (MAP - 4), z = (R() * 2 - 1) * (MAP - 4);
    if (nearCourse(x, z, 4.5)) continue;
    if (TREES.some(t => Math.hypot(t.x - x, t.z - z) < 5)) continue;
    const s = .8 + R() * .7, kind = R() < .45 ? 'pine' : R() < .75 ? 'maple' : 'oak';
    TREES.push({ x, z, s, kind, tr: .35 * s, ch: (kind === 'pine' ? 3.4 : 3.6) * s, cr: (kind === 'pine' ? 1.6 : 2) * s, c: R() });
  }
})();
// 러프에 숨은 당근 (토끼 먹이)
const PATCHES = [];
(() => {
  const R = rng(777);
  for (let k = 0; k < 600 && PATCHES.length < 34; k++) {
    const x = (R() * 2 - 1) * (MAP - 8), z = (R() * 2 - 1) * (MAP - 8);
    if (nearCourse(x, z, 2) || TREES.some(t => Math.hypot(t.x - x, t.z - z) < 2.5)) continue;
    PATCHES.push([x, z, R() * TAU]);
  }
})();

// ================= 네트워크 =================
const NET = { ws: null, open: false, id: 0, nick: '', color: '#e9711f', ch: 0, cap: 30, others: new Map(), retry: 0, wantCh: 0, lastSent: '', lastSentT: 0, total: 0 };
function connect() {
  let ws;
  try { ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`); } catch { return scheduleRetry(); }
  NET.ws = ws;
  ws.onopen = () => { NET.open = true; NET.retry = 0; };
  ws.onclose = () => {
    const wasIn = NET.ch; NET.open = false; clearOthers();
    if (wasIn) { NET.wantCh = wasIn; NET.ch = 0; feed('연결이 끊겼어요. 다시 연결하는 중…'); updChannelBadge(); }
    setLive(null); scheduleRetry();
  };
  ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch { return; } onMsg(m); };
}
function scheduleRetry() { NET.retry = Math.min(NET.retry + 1, 6); setTimeout(connect, 600 * 2 ** NET.retry); }
function sendNet(o) { if (NET.open && NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(o)); }
function onMsg(m) {
  switch (m.t) {
    case 'hello':
      NET.id = m.id; NET.nick = m.nick; NET.color = m.color;
      $('lobbyNick').textContent = m.nick; $('nick').textContent = m.nick; if (me.tag) me.tag.querySelector('.nm').textContent = m.nick;
      setLive(m);
      if (NET.wantCh && !$('app').hidden) sendNet({ t: 'join', ch: NET.wantCh });
      break;
    case 'lobby': setLive(m); break;
    case 'total': NET.total = m.total; updChannelBadge(); break;
    case 'full': feed('지금은 모든 채널이 꽉 찼어요. 혼자 라운딩으로 시작할게요.'); if (pendingJoin) { clearTimeout(pendingJoin); pendingJoin = 0; enterGame(); } break;
    case 'joined':
      NET.ch = m.ch; NET.cap = m.cap; NET.wantCh = 0; clearOthers();
      for (const p of m.players) addOther(p);
      if (pendingJoin) { clearTimeout(pendingJoin); pendingJoin = 0; enterGame(); } else feed(`${m.ch}채널에 다시 들어왔어요`);
      updChannelBadge(); break;
    case 'enter': addOther(m.p); feed(`${m.p.nick} 님이 티업했어요`); updChannelBadge(); break;
    case 'leave': removeOther(m.id); updChannelBadge(); break;
    case 'pos': {
      const o = NET.others.get(m.id); if (!o) return;
      const x = m.x / 10, z = m.z / 10;
      if (!o.seen || Math.hypot(o.x - x, o.z - z) > 30) { o.x = x; o.z = z; }
      o.tx = x; o.tz = z; o.tyaw = m.r / 10; o.a = m.a; o.h = m.h; o.bx = m.bx / 10; o.bz = m.bz / 10; o.bv = m.bv; o.seen = true;
      break;
    }
    case 'emo': { const o = NET.others.get(m.id); if (!o) return; showBubble(o, EMOTES[m.e]); o.jump = 1; break; }
    case 'res': {
      const name = m.one ? '홀인원' : ({ '-1': '버디', '-2': '이글', '-3': '알바트로스', '-4': '콘도르' })[m.d] || '파';
      feed(`${m.nick} 님 ${m.h + 1}번 홀 ${name}!`); break;
    }
  }
}

// ================= 입장 화면 =================
let lobbyRendered = false, pendingJoin = 0;
function setLive(m) {
  const dot = $('liveDot'), t = $('liveText');
  if (!m) { dot.classList.remove('on'); t.textContent = NET.retry > 2 ? '서버에 연결할 수 없어요. 혼자 라운딩은 할 수 있어요.' : '클럽하우스 문 여는 중'; return; }
  dot.classList.add('on'); NET.total = m.total; NET.cap = m.cap;
  t.textContent = `지금 ${nf(m.total)}명이 당근 CC에 있어요`;
  const g = $('chGrid');
  if (!lobbyRendered) {
    g.innerHTML = m.ch.map((_, i) => `<button type="button" data-ch="${i + 1}">${i + 1}채널<span></span></button>`).join('');
    g.querySelectorAll('button').forEach(b => b.onclick = () => joinChannel(+b.dataset.ch));
    lobbyRendered = true;
  }
  g.querySelectorAll('button').forEach((b, i) => { const n = m.ch[i] || 0; b.lastChild.textContent = `${n}/${m.cap}`; b.disabled = n >= m.cap; });
  updChannelBadge();
}
function joinChannel(ch) {
  audio();
  if (!NET.open) { enterGame(); return; }
  sendNet({ t: 'join', ch });
  pendingJoin = setTimeout(() => { pendingJoin = 0; enterGame(); }, 2500);
}
$('teeUp').onclick = () => joinChannel(0);
$('toLobby').onclick = () => {
  sendNet({ t: 'leave' }); NET.ch = 0; NET.wantCh = 0; clearOthers();
  $('app').hidden = true; $('lobby').hidden = false; running = false; setMaster(false);
};
function localNick() { const a = ['아삭한', '느긋한', '조용한', '주황빛'], b = ['당근', '버디', '퍼터', '캐디']; return a[Math.random() * 4 | 0] + ' ' + b[Math.random() * 4 | 0]; }
function updChannelBadge() {
  const b = $('chBadge');
  b.textContent = NET.ch ? `${NET.ch}채널 · ${NET.others.size + 1}/${NET.cap}명` : NET.wantCh ? '재연결 중' : '혼자 라운딩';
}

// ================= 3D 장면 =================
let renderer, scene, camera, ground, clock, sun;
let running = false, built = false;
const stage = $('stage');
const ray = new (T ? T.Raycaster : Object)();
const tmpV = T ? new T.Vector3() : null;

function mat(color, opts = {}) { return opts.flatShading ? new T.MeshPhongMaterial({ color, shininess: 4, ...opts }) : new T.MeshLambertMaterial({ color, ...opts }); }
function textTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}
const FONT = '"Do Hyeon","IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';

// ---- 바닥 그림 (코스 전체를 한 장에 그려서 텍스처로) ----
const GS = 2048, PPU = GS / (MAP * 2);
const groundCanvas = document.createElement('canvas'); groundCanvas.width = groundCanvas.height = GS;
function paintGround() {
  const g = groundCanvas.getContext('2d'), R = rng(42);
  const cx = x => (x + MAP) * PPU, cz = z => (z + MAP) * PPU;
  g.fillStyle = '#4c8b40'; g.fillRect(0, 0, GS, GS);
  for (let i = 0; i < 26000; i++) { g.fillStyle = R() < .5 ? 'rgba(25,60,20,.16)' : 'rgba(150,200,110,.10)'; g.fillRect(R() * GS, R() * GS, 2 + R() * 3, 2 + R() * 3); }
  const stripe = (a, b, w) => { const p = document.createElement('canvas'); p.width = p.height = w * 2; const q = p.getContext('2d'); q.fillStyle = a; q.fillRect(0, 0, w * 2, w * 2); q.fillStyle = b; q.fillRect(0, 0, w * 2, w); return g.createPattern(p, 'repeat'); };
  const line = (pts, width, style) => { g.beginPath(); g.moveTo(cx(pts[0][0]), cz(pts[0][1])); for (const p of pts.slice(1)) g.lineTo(cx(p[0]), cz(p[1])); g.lineWidth = width * PPU; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = style; g.stroke(); };
  const circle = (x, z, r, style) => { g.beginPath(); g.arc(cx(x), cz(z), r * PPU, 0, TAU); g.fillStyle = style; g.fill(); };
  for (const p of PATHS) line(p, 2.4, '#d4c9a8');
  for (const p of PATHS) line(p, 1.6, '#e4dcc0');
  for (const h of HOLES) line(h.fair, h.fw + 1.6, '#5e9e4b');
  const fwPat = stripe('#6fb55a', '#67ad53', 3 * PPU);
  for (const h of HOLES) line(h.fair, h.fw, fwPat);
  const grPat = stripe('#93d377', '#8acb6f', 1.2 * PPU);
  for (const h of HOLES) { circle(h.cup[0], h.cup[1], h.green + 1.4, '#7cbf63'); circle(h.cup[0], h.cup[1], h.green, grPat); }
  for (const h of HOLES) { g.fillStyle = '#80c766'; g.fillRect(cx(h.tee[0] - 4), cz(h.tee[1] - 3.5), 8 * PPU, 7 * PPU); }
  for (const h of HOLES) for (const s of h.sand) {
    circle(s[0], s[1], s[2] + .4, '#c9b27a'); circle(s[0], s[1], s[2], '#ead8a4');
    for (let i = 0; i < 60; i++) { const a = R() * TAU, d = R() * s[2] * .9; g.fillStyle = 'rgba(170,140,80,.35)'; g.fillRect(cx(s[0] + Math.cos(a) * d), cz(s[1] + Math.sin(a) * d), 2, 2); }
  }
  for (const h of HOLES) for (const w of h.water) { circle(w[0], w[1], w[2] + 1, '#3d6e3a'); circle(w[0], w[1], w[2], '#2b6b95'); }
  // 그늘집 마당
  g.fillStyle = '#cdbf98'; g.beginPath(); g.ellipse(cx(SHADE.x), cz(SHADE.z), 9 * PPU, 8 * PPU, 0, 0, TAU); g.fill();
  // 지도용 경계선
  g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 6; g.setLineDash([24, 18]); g.strokeRect(cx(-MAP + 1.5), cz(-MAP + 1.5), (MAP * 2 - 3) * PPU, (MAP * 2 - 3) * PPU); g.setLineDash([]);
}

// ---- 당근 캐릭터 ----
function makeCarrot(visor) {
  const g = new T.Group();
  const orange = mat(0xf08a2f, { emissive: 0x8a3a00 }), dark = mat(0x2a1a10), leaf = mat(0x3f9a4e, { emissive: 0x123a12 }), white = mat(0xffffff), vis = mat(new T.Color(visor), { emissive: new T.Color(visor).multiplyScalar(.25) });
  const body = new T.Mesh(new T.ConeGeometry(.6, 1.7, 16), orange); body.rotation.x = Math.PI; body.position.y = 1.05; body.castShadow = true; g.add(body);
  const top = new T.Mesh(new T.SphereGeometry(.6, 16, 8, 0, TAU, 0, Math.PI / 2), orange); top.position.y = 1.9; top.scale.y = .4; top.castShadow = true; g.add(top);
  const ridge = mat(0xc95f14);
  for (const [y, a] of [[1.25, .9], [.9, -1.1], [.6, 2.4]]) { const r = .6 * (y - .2) / 1.7; const m = new T.Mesh(new T.BoxGeometry(.18, .035, .04), ridge); m.position.set(Math.sin(a) * r, y, Math.cos(a) * r); m.rotation.y = a; g.add(m); }
  for (const [rz, rx] of [[0, 0], [.55, .2], [-.55, .2], [0, -.5]]) { const l = new T.Mesh(new T.ConeGeometry(.12, .8, 6), leaf); l.position.set(Math.sin(rz) * .15, 2.35, Math.sin(rx) * .15); l.rotation.set(rx, 0, -rz); l.castShadow = true; g.add(l); }
  for (const s of [-1, 1]) {
    const e = new T.Mesh(new T.SphereGeometry(.075, 10, 8), dark); e.position.set(s * .19, 1.62, .47); g.add(e);
    const hl = new T.Mesh(new T.SphereGeometry(.025, 6, 6), white); hl.position.set(s * .19 + .025, 1.65, .54); g.add(hl);
    const ck = new T.Mesh(new T.SphereGeometry(.09, 8, 6), mat(0xff8a8a)); ck.scale.set(1, .55, .4); ck.position.set(s * .32, 1.48, .4); g.add(ck);
  }
  const mouth = new T.Mesh(new T.TorusGeometry(.07, .018, 6, 12, Math.PI), dark); mouth.position.set(0, 1.5, .46); mouth.rotation.z = Math.PI; g.add(mouth);
  const band = new T.Mesh(new T.CylinderGeometry(.6, .6, .13, 18, 1, true), vis); band.position.y = 1.82; band.material.side = T.DoubleSide; g.add(band);
  const brim = new T.Mesh(new T.BoxGeometry(.62, .04, .38), vis); brim.position.set(0, 1.78, .66); brim.rotation.x = .12; g.add(brim);
  const arm = new T.Mesh(new T.SphereGeometry(.11, 8, 6), orange); arm.position.set(.5, 1.2, .15); g.add(arm);
  const club = new T.Group(); club.position.set(.52, 1.2, .2); g.add(club);
  const shaft = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.25, 6), mat(0x8a918a)); shaft.position.y = -.62; club.add(shaft);
  const head = new T.Mesh(new T.BoxGeometry(.12, .1, .26), mat(0x5d635d)); head.position.set(0, -1.25, .08); club.add(head);
  club.rotation.set(.15, 0, .2);
  g.userData = { club, body: [body, top] };
  return g;
}
function makeMiniCarrot(scale = 1) {
  const g = new T.Group();
  const c = new T.Mesh(new T.ConeGeometry(.16, .45, 8), mat(0xf08a2f, { emissive: 0x8a3a00 })); c.rotation.x = Math.PI; c.position.y = .08; g.add(c);
  for (const r of [-.4, 0, .4]) { const l = new T.Mesh(new T.ConeGeometry(.05, .35, 5), mat(0x3f9a4e)); l.position.set(r * .12, .45, 0); l.rotation.z = -r; g.add(l); }
  g.scale.setScalar(scale); return g;
}

// ---- 장면 만들기 ----
const FLAGS = [], CROCS = [], RABBITS = [], BIRDS = [], SPLASHES = [], CLOUDS = [];
let ballMesh, aimArrow, landRing, pathLine, moveRing, cupMeshes = [];
function build() {
  if (built) return true;
  try { renderer = new T.WebGLRenderer({ antialias: true }); } catch (e) {
    stage.insertAdjacentHTML('beforeend', '<div class="nogl"><p>이 브라우저에서는 3D 화면을 켤 수 없어요. 그래픽 가속이 켜진 최신 브라우저에서 다시 열어 주세요.</p></div>'); return false;
  }
  built = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  stage.insertBefore(renderer.domElement, stage.firstChild);
  renderer.domElement.tabIndex = 0;
  scene = new T.Scene();
  scene.fog = new T.Fog(0xd9ece8, 110, 420);
  camera = new T.PerspectiveCamera(50, 1, .1, 1200);
  clock = new T.Clock();

  // 하늘
  const skyGeo = new T.SphereGeometry(600, 32, 16), cols = [], pos = skyGeo.attributes.position;
  const top = new T.Color(0x7fb9e3), hor = new T.Color(0xe3f0ea);
  for (let i = 0; i < pos.count; i++) { const t = clamp(pos.getY(i) / 600, 0, 1) ** .6; const c = hor.clone().lerp(top, t); cols.push(c.r, c.g, c.b); }
  skyGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
  scene.add(new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })));

  // 빛
  scene.add(new T.HemisphereLight(0xe8f4ff, 0x56743d, .55));
  sun = new T.DirectionalLight(0xfff1d6, .75);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260; sun.shadow.bias = -.0006;
  scene.add(sun); scene.add(sun.target);

  // 땅
  paintGround();
  const gt = new T.CanvasTexture(groundCanvas); gt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  ground = new T.Mesh(new T.PlaneGeometry(MAP * 2, MAP * 2), new T.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const outer = new T.Mesh(new T.PlaneGeometry(1400, 1400), mat(0x4f8a43)); outer.rotation.x = -Math.PI / 2; outer.position.y = -.05; scene.add(outer);

  // 먼 산
  const R = rng(9);
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU + R() * .2, d = 260 + R() * 90, h = 50 + R() * 90;
    const m = new T.Mesh(new T.ConeGeometry(55 + R() * 50, h, 6), new T.MeshPhongMaterial({ color: new T.Color().setHSL(.32 + R() * .06, .25, .32 + R() * .1), flatShading: true, shininess: 0 }));
    m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d); m.rotation.y = R() * TAU; scene.add(m);
  }
  // 구름
  for (let i = 0; i < 9; i++) {
    const cl = new T.Group(); const cm = new T.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .9, fog: false });
    for (let j = 0; j < 4; j++) { const p = new T.Mesh(new T.IcosahedronGeometry(6 + R() * 5, 1), cm); p.position.set(j * 7 - 10, R() * 3, R() * 6); p.scale.y = .55; cl.add(p); }
    cl.position.set(R() * 500 - 250, 70 + R() * 30, R() * 500 - 250); scene.add(cl); CLOUDS.push(cl);
  }

  // OB 말뚝
  const stakeMat = mat(0xffffff), stakeGeo = new T.CylinderGeometry(.08, .08, 1.1, 6);
  for (let t = -MAP + 2; t <= MAP - 2; t += 12) for (const [x, z] of [[t, -MAP + 1.5], [t, MAP - 1.5], [-MAP + 1.5, t], [MAP - 1.5, t]]) {
    const s = new T.Mesh(stakeGeo, stakeMat); s.position.set(x, .55, z); s.castShadow = true; scene.add(s);
  }

  // 나무
  const trunkMat = mat(0x6b4a2e), trunkGeo = new T.CylinderGeometry(.25, .38, 2.4, 6);
  const pineGeo = new T.ConeGeometry(1.7, 4.2, 7), roundGeo = new T.IcosahedronGeometry(2, 0);
  const pineMats = [0x2f5f34, 0x386b38, 0x2a5530].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  const mapleMats = [0xd9481f, 0xe8792b, 0xf2b33d, 0xb8352a, 0xe35d2a].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  const oakMats = [0x4f8a3a, 0x6f9a3a, 0xa8a23a].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  for (const t of TREES) {
    const g = new T.Group(); g.position.set(t.x, 0, t.z); g.scale.setScalar(t.s); g.rotation.y = t.c * TAU;
    const tr = new T.Mesh(trunkGeo, trunkMat); tr.position.y = 1.2; tr.castShadow = true; g.add(tr);
    if (t.kind === 'pine') { for (const [y, sc] of [[3, 1], [4.4, .72]]) { const c = new T.Mesh(pineGeo, pineMats[(t.c * 3) | 0]); c.position.y = y; c.scale.setScalar(sc); c.castShadow = true; g.add(c); } }
    else { const ms = t.kind === 'maple' ? mapleMats : oakMats; const c = new T.Mesh(roundGeo, ms[(t.c * ms.length) | 0]); c.position.y = 3.6; c.castShadow = true; g.add(c);
      const c2 = new T.Mesh(roundGeo, ms[((t.c * 7) % 1 * ms.length) | 0]); c2.position.set(.9, 3.1, .5); c2.scale.setScalar(.6); c2.castShadow = true; g.add(c2); }
    scene.add(g); t.g = g;
  }
  // 낙엽 (단풍 시즌)
  const leafGeo = new T.PlaneGeometry(.35, .25);
  for (let i = 0; i < 160; i++) {
    const t = TREES[(i * 7) % TREES.length]; if (t.kind !== 'maple') continue;
    const l = new T.Mesh(leafGeo, mapleMats[i % mapleMats.length]); l.rotation.x = -Math.PI / 2; l.rotation.z = R() * TAU;
    const a = R() * TAU, d = R() * 3.5; l.position.set(t.x + Math.cos(a) * d, .03, t.z + Math.sin(a) * d); scene.add(l);
  }
  // 당근 밭
  for (const p of PATCHES) { const c = makeMiniCarrot(1.2); c.position.set(p[0], 0, p[1]); c.rotation.y = p[2]; scene.add(c); }

  // 연못 + 악어
  for (const h of HOLES) for (const w of h.water) {
    const wm = new T.Mesh(new T.CircleGeometry(w[2], 48), new T.MeshPhongMaterial({ color: 0x3a8cc0, shininess: 80, transparent: true, opacity: .78 }));
    wm.rotation.x = -Math.PI / 2; wm.position.set(w[0], .06, w[1]); scene.add(wm);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + R() * .3; const r = new T.Mesh(new T.DodecahedronGeometry(.5 + R() * .5, 0), mat(0x8a8a80, { flatShading: true })); r.position.set(w[0] + Math.cos(a) * (w[2] + .3), .1, w[1] + Math.sin(a) * (w[2] + .3)); r.scale.y = .5; scene.add(r); }
    for (let i = 0; i < 8; i++) { const a = R() * TAU; const reed = new T.Mesh(new T.ConeGeometry(.06, 1.4 + R(), 4), mat(0x6f8f3a)); reed.position.set(w[0] + Math.cos(a) * (w[2] - .4), .7, w[1] + Math.sin(a) * (w[2] - .4)); scene.add(reed); }
    CROCS.push(makeCroc(w));
  }

  // 홀: 깃발, 컵, 티 마커, 안내판
  HOLES.forEach((h, i) => {
    const cup = new T.Mesh(new T.CircleGeometry(.36, 20), mat(0x111111)); cup.rotation.x = -Math.PI / 2; cup.position.set(h.cup[0], .03, h.cup[1]); scene.add(cup); cupMeshes.push(cup);
    const pole = new T.Mesh(new T.CylinderGeometry(.05, .05, 3.4, 6), mat(0xf4f1e8)); pole.position.set(h.cup[0], 1.7, h.cup[1]); pole.castShadow = true; scene.add(pole);
    const ft = textTexture(128, 84, (g, w, hh) => { g.fillStyle = '#f08a2f'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.font = `700 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), w / 2, hh / 2 + 3); });
    const fg = new T.PlaneGeometry(1.4, .9, 10, 1); fg.translate(.7, 0, 0);
    const flag = new T.Mesh(fg, new T.MeshLambertMaterial({ map: ft, side: T.DoubleSide })); flag.position.set(h.cup[0], 2.9, h.cup[1]); flag.castShadow = true; scene.add(flag);
    const base = Float32Array.from(fg.attributes.position.array);
    FLAGS.push({ flag, base });
    const top = makeMiniCarrot(.9); top.position.set(h.cup[0], 3.35, h.cup[1]); scene.add(top);
    const nx = h.fair[1][0] - h.tee[0], nz = h.fair[1][1] - h.tee[1], nl = Math.hypot(nx, nz), dx = nx / nl, dz = nz / nl;
    for (const s of [-1, 1]) { const m = makeMiniCarrot(1.6); m.position.set(h.tee[0] - dz * 2.8 * s, 0, h.tee[1] + dx * 2.8 * s); scene.add(m); }
    const st = textTexture(512, 300, (g, w, hh) => {
      g.fillStyle = '#2e5e36'; g.fillRect(0, 0, w, hh); g.strokeStyle = '#f4e9cf'; g.lineWidth = 8; g.strokeRect(10, 10, w - 20, hh - 20);
      g.fillStyle = '#f08a2f'; g.font = `700 150px ${FONT}`; g.textBaseline = 'alphabetic'; g.fillText(String(i + 1), 34, 190);
      g.fillStyle = '#f4e9cf'; g.font = `400 54px ${FONT}`; g.fillText(h.name, 150, 120); g.font = `400 46px ${FONT}`;
      const len = Math.round(h.fair.reduce((a, p, k) => k ? a + Math.hypot(p[0] - h.fair[k - 1][0], p[1] - h.fair[k - 1][1]) : 0, 0) * M_PER_U);
      g.fillText(`PAR ${h.par} · ${len}m`, 150, 190); g.font = `400 36px ${FONT}`; g.fillStyle = '#b9d6b0'; g.fillText('당근 컨트리클럽', 150, 250);
    });
    const sign = new T.Group(); const board = new T.Mesh(new T.BoxGeometry(2.6, 1.5, .1), [mat(0x2e5e36), mat(0x2e5e36), mat(0x2e5e36), mat(0x2e5e36), new T.MeshLambertMaterial({ map: st }), mat(0x2e5e36)]);
    board.position.y = 1.7; board.castShadow = true; sign.add(board);
    for (const s of [-1, 1]) { const post = new T.Mesh(new T.CylinderGeometry(.07, .07, 1.7, 6), mat(0x6b4a2e)); post.position.set(s * 1, .85, 0); sign.add(post); }
    sign.position.set(h.tee[0] + dz * 5.5 - dx * 1.5, 0, h.tee[1] - dx * 5.5 - dz * 1.5); sign.rotation.y = Math.atan2(-dx, -dz); scene.add(sign);
  });

  buildShadeHouse();

  // 내 공, 조준 표시
  ballMesh = new T.Mesh(new T.SphereGeometry(.2, 16, 12), new T.MeshPhongMaterial({ color: 0xffffff, shininess: 60 })); ballMesh.castShadow = true; scene.add(ballMesh);
  const ag = new T.PlaneGeometry(.35, 7); ag.translate(0, 3.5, 0);
  aimArrow = new T.Mesh(ag, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })); aimArrow.rotation.x = -Math.PI / 2; aimArrow.visible = false; scene.add(aimArrow);
  landRing = new T.Mesh(new T.RingGeometry(.9, 1.25, 32), new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: .85, depthWrite: false })); landRing.rotation.x = -Math.PI / 2; landRing.visible = false; scene.add(landRing);
  pathLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: 0xffb27a, dashSize: .6, gapSize: .4 })); pathLine.visible = false; pathLine.frustumCulled = false; scene.add(pathLine);
  moveRing = new T.Mesh(new T.RingGeometry(.4, .6, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); moveRing.rotation.x = -Math.PI / 2; scene.add(moveRing);

  // 나
  me.av = makeCarrot('#ffffff'); scene.add(me.av);
  me.tag = makeTag(NET.nick || '나', true);

  // 토끼
  for (let i = 0; i < 5; i++) RABBITS.push(makeRabbit(PATCHES[(i * 7) % PATCHES.length]));

  resize(); window.addEventListener('resize', resize);
  bindInput();
  return true;
}
function buildShadeHouse() {
  const g = new T.Group(); g.position.set(SHADE.x, 0, SHADE.z);
  const wood = mat(0x9b6b43), dark = mat(0x5e3d24), roofM = new T.MeshPhongMaterial({ color: 0x3f454c, flatShading: true, shininess: 10 });
  const deck = new T.Mesh(new T.BoxGeometry(10, .45, 8), wood); deck.position.y = .22; deck.receiveShadow = true; deck.castShadow = true; g.add(deck);
  for (const [x, z] of [[-4.4, -3.4], [4.4, -3.4], [-4.4, 3.4], [4.4, 3.4]]) { const p = new T.Mesh(new T.CylinderGeometry(.2, .24, 3.4, 8), dark); p.position.set(x, 2.1, z); p.castShadow = true; g.add(p); }
  const beam = new T.Mesh(new T.BoxGeometry(9.4, .3, 7.4), dark); beam.position.y = 3.85; g.add(beam);
  const roof = new T.Mesh(new T.ConeGeometry(7.8, 2.8, 4, 1), roofM); roof.rotation.y = Math.PI / 4; roof.position.y = 5.4; roof.scale.z = .85; roof.castShadow = true; g.add(roof);
  const cap = new T.Mesh(new T.BoxGeometry(1.2, .3, .3), roofM); cap.position.y = 6.9; g.add(cap);
  const signT = textTexture(512, 160, (c, w, h) => { c.fillStyle = '#f4e9cf'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5e3d24'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#5e3d24'; c.font = `400 110px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('그늘집', w / 2, h / 2 + 6); });
  const sign = new T.Mesh(new T.PlaneGeometry(3.2, 1), new T.MeshLambertMaterial({ map: signT })); sign.position.set(0, 3.35, 3.72); g.add(sign);
  const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = -3.72; g.add(sign2);
  const table = new T.Mesh(new T.BoxGeometry(3, .15, 1.4), wood); table.position.set(-1.2, 1.25, 0); table.castShadow = true; g.add(table);
  for (const [x, z] of [[-2.5, -.5], [.1, -.5], [-2.5, .5], [.1, .5]]) { const l = new T.Mesh(new T.BoxGeometry(.12, .8, .12), dark); l.position.set(x, .85, z); g.add(l); }
  for (const z of [-1.3, 1.3]) { const b = new T.Mesh(new T.BoxGeometry(3, .12, .5), wood); b.position.set(-1.2, .85, z); g.add(b); }
  // 냉장고와 메뉴판
  const fridge = new T.Mesh(new T.BoxGeometry(1, 2, .8), mat(0xf6f6f2)); fridge.position.set(3.4, 1.45, -2.4); fridge.castShadow = true; g.add(fridge);
  const door = new T.Mesh(new T.PlaneGeometry(.8, 1.6), new T.MeshLambertMaterial({ map: textTexture(128, 256, (c, w, h) => { c.fillStyle = '#e8f3f6'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { c.fillStyle = ['#f08a2f', '#ffd166', '#78c587', '#f08a2f'][i]; c.fillRect(18 + (i % 2) * 50, 30 + (i >> 1) * 100, 40, 80); } }) }));
  door.position.set(3.4, 1.45, -1.99); g.add(door);
  const menuT = textTexture(256, 340, (c, w, h) => { c.fillStyle = '#26332a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4e9cf'; c.font = `400 40px ${FONT}`; c.textAlign = 'center'; c.fillText('오늘의 메뉴', w / 2, 52); c.font = `400 28px ${FONT}`; c.textAlign = 'left'; MENU.forEach((m, i) => { c.fillStyle = '#f4e9cf'; c.fillText(m.name.replace('갓 짠 ', '').replace('그늘집 ', ''), 18, 110 + i * 56); c.fillStyle = '#ffd166'; c.textAlign = 'right'; c.fillText(m.price, w - 16, 110 + i * 56); c.textAlign = 'left'; }); });
  const menu = new T.Mesh(new T.PlaneGeometry(1.2, 1.6), new T.MeshLambertMaterial({ map: menuT })); menu.position.set(2.6, 1.3, 4.6); menu.rotation.x = -.15; g.add(menu);
  const easel = new T.Mesh(new T.BoxGeometry(1.3, .08, .08), dark); easel.position.set(2.6, .45, 4.65); g.add(easel);
  for (const x of [-3.6, 3.6]) { const lan = new T.Mesh(new T.SphereGeometry(.28, 12, 8), new T.MeshLambertMaterial({ color: 0xffa64d, emissive: 0xff7a1a, emissiveIntensity: .7 })); lan.position.set(x, 3.3, 3.5); g.add(lan); }
  scene.add(g);
}
function makeCroc(w) {
  const g = new T.Group(); const skin = mat(0x4f6f3a, { flatShading: true }), belly = mat(0x7f9a55);
  const body = new T.Mesh(new T.BoxGeometry(.9, .4, 2.4), skin); g.add(body);
  const tail = new T.Mesh(new T.ConeGeometry(.35, 2.2, 5), skin); tail.rotation.x = -Math.PI / 2; tail.position.z = -2.2; g.add(tail);
  for (let i = 0; i < 5; i++) { const b = new T.Mesh(new T.BoxGeometry(.12, .14, .12), skin); b.position.set(i % 2 ? .18 : -.18, .26, .9 - i * .45); g.add(b); }
  const head = new T.Group(); head.position.z = 1.2; g.add(head);
  const lower = new T.Mesh(new T.BoxGeometry(.6, .16, 1.2), belly); lower.position.set(0, -.08, .6); head.add(lower);
  const jaw = new T.Group(); head.add(jaw);
  const upper = new T.Mesh(new T.BoxGeometry(.62, .2, 1.25), skin); upper.position.set(0, .1, .62); jaw.add(upper);
  const teeth = new T.Mesh(new T.BoxGeometry(.56, .06, 1.1), mat(0xffffff)); teeth.position.set(0, -.02, .62); jaw.add(teeth);
  for (const s of [-1, 1]) {
    const eye = new T.Mesh(new T.SphereGeometry(.13, 8, 6), mat(0xe8d84a)); eye.position.set(s * .2, .26, .1); head.add(eye);
    const pu = new T.Mesh(new T.BoxGeometry(.03, .14, .05), mat(0x111111)); pu.position.set(s * .2, .27, .22); head.add(pu);
  }
  g.position.set(w[0], -.04, w[1]); scene.add(g);
  return { g, jaw, w, a: Math.random() * TAU, tx: w[0], tz: w[1], x: w[0], z: w[1], yaw: 0, y: -.04, state: 'swim', wait: 0, chomp: 0 };
}
function makeRabbit(p) {
  const g = new T.Group(); const fur = mat(0xf2efe8), pink = mat(0xf2b5b5);
  const body = new T.Mesh(new T.SphereGeometry(.35, 10, 8), fur); body.scale.set(.85, .8, 1.15); body.position.y = .35; body.castShadow = true; g.add(body);
  const head = new T.Mesh(new T.SphereGeometry(.24, 10, 8), fur); head.position.set(0, .62, .3); head.castShadow = true; g.add(head);
  for (const s of [-1, 1]) {
    const ear = new T.Mesh(new T.BoxGeometry(.09, .42, .05), fur); ear.position.set(s * .09, .95, .25); ear.rotation.z = s * -.12; g.add(ear);
    const inner = new T.Mesh(new T.PlaneGeometry(.05, .32), pink); inner.position.set(s * .09, .95, .28); inner.rotation.z = s * -.12; g.add(inner);
    const eye = new T.Mesh(new T.SphereGeometry(.035, 6, 6), mat(0x222222)); eye.position.set(s * .12, .66, .5); g.add(eye);
  }
  const tail = new T.Mesh(new T.SphereGeometry(.1, 6, 6), fur); tail.position.set(0, .35, -.38); g.add(tail);
  const r = { g, x: p[0] + 1, z: p[1] + 1, tx: p[0] + 1, tz: p[1] + 1, yaw: 0, ph: 0, state: 'sit', t: Math.random() * 6 };
  g.position.set(r.x, 0, r.z); scene.add(g); return r;
}

// ---- 이름표 ----
function makeTag(name, mine) {
  const d = document.createElement('div'); d.className = 'tag' + (mine ? ' me' : '');
  d.innerHTML = `<span class="bub" hidden></span><span class="nm">${esc(name)}</span>`;
  $('tags').appendChild(d); return d;
}
function showBubble(o, text) {
  const b = o.tag && o.tag.querySelector('.bub'); if (!b) return;
  b.textContent = text; b.hidden = false; clearTimeout(o.bubT); o.bubT = setTimeout(() => { b.hidden = true; }, 2600);
}

// ---- 다른 사람 ----
function addOther(p) {
  if (NET.others.has(p.id)) removeOther(p.id);
  const o = { id: p.id, nick: p.nick, color: p.color, x: (p.x || 0) / 10, z: (p.z || 0) / 10, tx: (p.x || 0) / 10, tz: (p.z || 0) / 10, yaw: 0, tyaw: (p.r || 0) / 10, a: p.a || 0, h: p.h || 0, bx: 0, bz: 0, bv: 0, seen: !!p.x, ph: 0, jump: 0 };
  if (built) attachOther(o);
  NET.others.set(p.id, o);
}
function attachOther(o) {
  o.av = makeCarrot(o.color); o.av.position.set(o.x, 0, o.z); scene.add(o.av);
  o.tag = makeTag(o.nick, false);
  o.ball = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshLambertMaterial({ color: new T.Color(o.color) })); o.ball.castShadow = true; o.ball.visible = false; scene.add(o.ball);
}
function removeOther(id) {
  const o = NET.others.get(id); if (!o) return;
  if (o.av) { scene.remove(o.av); scene.remove(o.ball); o.tag.remove(); }
  NET.others.delete(id);
}
function clearOthers() { for (const id of [...NET.others.keys()]) removeOther(id); }

// ================= 게임 상태 =================
const me = { x: 0, z: 0, yaw: 0, anim: 0, ph: 0, moveT: null, av: null, tag: null, swingT: 0, jump: 0 };
const cam = { yaw: 0, pitch: .38, dist: 13, mode: 'follow', tx: 0, ty: 0, tz: 0, px: 0, py: 10, pz: 0 };
const S = { hole: 0, strokes: 0, scores: Array(HOLES.length).fill(null), buff: null, mulligans: 0, mode: 'walk', club: 0, clubAuto: true, aimYaw: 0,
  charge: false, chargeT: 0, power: 0, prev: null, last: null, ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'rest' }, ballVis: true, shadeSeen: false, shots: 0 };
const keys = new Set();

function getBest() { try { const v = localStorage.getItem('carrot-cc-best3d'); return v ? +v : null; } catch { return null; } }
function setBest(v) { try { localStorage.setItem('carrot-cc-best3d', String(v)); } catch {} }
const cupR = () => S.buff === 'makgeolli' ? .65 : .36;
const hole = () => HOLES[S.hole];
const distToCup = () => Math.hypot(S.ball.x - hole().cup[0], S.ball.z - hole().cup[1]);
function autoClub() {
  const s = surface(S.ball.x, S.ball.z), d = distToCup();
  if (s === 'green') return 3;
  return d >= 46 ? 0 : d >= 22 ? 1 : 2;
}

// ================= 소리 =================
let AC = null, master = null, ambStarted = false, soundOn = true;
try { soundOn = localStorage.getItem('carrot-cc-sound') !== 'off'; } catch {}
function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch {} } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
function out() { const a = audio(); if (!a) return null; if (!master) { master = a.createGain(); master.gain.value = soundOn ? 1 : 0; master.connect(a.destination); } return master; }
function setMaster(on) { const m = out(); if (m) m.gain.setTargetAtTime(on && soundOn ? 1 : 0, AC.currentTime, .15); }
function tone(f, d, type = 'sine', v = .2, delay = 0) {
  const a = audio(), m = out(); if (!a || !m) return; const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(m); o.start(t); o.stop(t + d);
}
function noise(dur, freq, q, v, delay = 0) {
  const a = audio(), m = out(); if (!a || !m) return; const t = a.currentTime + delay;
  const b = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(); s.buffer = b; const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f).connect(g).connect(m); s.start(t);
}
function chirp(f1, f2, dur, delay, v, pan) {
  const a = audio(), m = out(); if (!a || !m) return; const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + dur * .3); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
  let node = o.connect(g); if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = pan; node = node.connect(p); }
  node.connect(m); o.start(t); o.stop(t + dur + .02);
}
function birdSong() {
  if (!soundOn || $('app').hidden) return;
  const pan = Math.random() * 1.6 - .8;
  if (Math.random() < .15) { chirp(770, 745, .26, 0, .05, pan); chirp(620, 600, .4, .34, .05, pan); return; }
  const n = 2 + (Math.random() * 4 | 0), base = 2500 + Math.random() * 1800, gap = .1 + Math.random() * .07;
  for (let i = 0; i < n; i++) chirp(base * (1 + Math.random() * .15), base * (1.25 + Math.random() * .35), .06 + Math.random() * .05, i * gap, .03, pan);
}
function startAmbience() {
  const a = audio(), m = out(); if (!a || !m || ambStarted) return; ambStarted = true;
  const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = buf.getChannelData(0);
  let last = 0; for (let i = 0; i < d.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  const src = a.createBufferSource(); src.buffer = buf; src.loop = true;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
  const g = a.createGain(); g.gain.value = .05;
  const lfo = a.createOscillator(); lfo.frequency.value = .07; const lg = a.createGain(); lg.gain.value = .035; lfo.connect(lg).connect(g.gain); lfo.start();
  src.connect(f).connect(g).connect(m); src.start();
  const loop = () => { birdSong(); setTimeout(loop, 1600 + Math.random() * 4200); }; setTimeout(loop, 800);
}
const sndHit = (p, putt) => { if (putt) { tone(900, .05, 'triangle', .18); return; } noise(.12, 2400, .8, .35); tone(180 + p * 220, .09, 'triangle', .25); };
const sndSwish = () => noise(.25, 1200, 1.5, .12);
const sndCup = () => { tone(520, .08, 'square', .08); tone(660, .14, 'sine', .25, .1); tone(990, .3, 'sine', .2, .24); };
const sndSplash = () => { noise(.5, 600, .6, .35); tone(120, .4, 'sine', .15); };
const sndChomp = () => { tone(110, .12, 'square', .12); tone(70, .25, 'sawtooth', .12, .12); tone(140, .08, 'square', .1, .28); };
const sndTree = () => { noise(.3, 3000, .5, .2); tone(300, .06, 'triangle', .1, .05); };
const sndCart = () => { const a = audio(), m = out(); if (!a || !m) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60, a.currentTime); o.frequency.linearRampToValueAtTime(95, a.currentTime + .6); g.gain.setValueAtTime(.06, a.currentTime); g.gain.linearRampToValueAtTime(.001, a.currentTime + .9); o.connect(g).connect(m); o.start(); o.stop(a.currentTime + .9); };
function updSoundBtn() { const b = $('sound'); b.textContent = soundOn ? '소리 켬' : '소리 끔'; b.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }
$('sound').onclick = () => { soundOn = !soundOn; try { localStorage.setItem('carrot-cc-sound', soundOn ? 'on' : 'off'); } catch {} audio(); startAmbience(); setMaster(true); updSoundBtn(); };
updSoundBtn();

// ================= 화면 요소 =================
let toastT = 0;
function toast(t, ms = 1800) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), ms); }
function feed(t) { const f = $('feed'); const d = document.createElement('div'); d.textContent = t; f.appendChild(d); while (f.children.length > 4) f.firstChild.remove(); setTimeout(() => d.remove(), 5100); }
function overlay(html, soft) { const o = $('overlay'); o.className = 'overlay' + (soft ? ' soft' : ''); o.innerHTML = `<div class="card">${html}</div>`; o.hidden = false; }
function closeOverlay() { $('overlay').hidden = true; clearInterval(shadeTimer); }
$('cardBtn').onclick = () => { const s = $('cardSheet'); s.hidden = !s.hidden; $('cardBtn').setAttribute('aria-expanded', String(!s.hidden)); };
$('emoToggle').onclick = () => { const w = $('emoToggle').parentElement; w.classList.toggle('open'); $('emoToggle').setAttribute('aria-expanded', String(w.classList.contains('open'))); };
$('emotes').innerHTML = EMOTES.map((e, i) => `<button type="button" data-e="${i}">${e}</button>`).join('');
$('emotes').querySelectorAll('button').forEach(b => b.onclick = () => {
  const e = +b.dataset.e; showBubble(me, EMOTES[e]); me.jump = 1; sendNet({ t: 'emo', e });
  const all = $('emotes').querySelectorAll('button'); all.forEach(x => x.disabled = true); setTimeout(() => all.forEach(x => x.disabled = false), 900);
});

function updHud() {
  const h = hole();
  $('holeNo').textContent = S.hole + 1; $('holeName').textContent = h.name;
  $('holePar').textContent = `PAR ${h.par} · ${S.strokes}타 쳤어요`;
  const lie = LIE[surface(S.ball.x, S.ball.z)] || '';
  $('holeDist').textContent = `핀까지 ${Math.round(distToCup() * M_PER_U)}m · ${lie}`;
  $('strokes').textContent = S.strokes;
}
let lastActKey = '';
function updActions() {
  const near = Math.hypot(me.x - S.ball.x, me.z - S.ball.z) < 3.2;
  const inShade = Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 6;
  let key;
  if (S.mode === 'aim') key = `aim${S.club}`;
  else if (S.mode === 'walk' && S.ball.state === 'rest') key = `walk${near}${inShade && !S.buff}${S.mulligans && S.prev ? 1 : 0}`;
  else key = S.mode;
  if (key === lastActKey) return; lastActKey = key;
  const a = $('actions'); let html = '';
  if (S.mode === 'aim') {
    html = `<button class="act sub round" id="aL" aria-label="왼쪽으로">◀</button>
      <button class="act swing" id="swing">누르고 있다가 떼기</button>
      <button class="act sub round" id="aR" aria-label="오른쪽으로">▶</button>
      <button class="act sub" id="clubBtn">${CLUBS[S.club].name}</button>
      <button class="act sub" id="cancel">취소</button>`;
  } else if (S.mode === 'walk' && S.ball.state === 'rest') {
    if (near) html += '<button class="act" id="ready">샷 준비 (E)</button>';
    else html += '<button class="act" id="goBall">공으로 걸어가기</button><button class="act sub" id="cartBall">카트 타고 공으로</button>';
    if (inShade && !S.buff) html += '<button class="act" id="menuBtn">그늘집 메뉴판 보기</button>';
    if (S.mulligans && S.prev) html += `<button class="act sub" id="mull">멀리건 (${S.mulligans})</button>`;
  }
  a.innerHTML = html;
  const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
  on('ready', enterAim); on('goBall', walkToBall); on('cartBall', () => cartTo(S.ball.x, S.ball.z, true)); on('menuBtn', showShade); on('mull', mulligan);
  on('cancel', exitAim); on('clubBtn', () => { S.club = (S.club + 1) % 4; S.clubAuto = false; lastActKey = ''; });
  const hold = (id, d) => { const el = $(id); if (!el) return; let iv = 0; const stop = () => clearInterval(iv); el.onpointerdown = e => { e.preventDefault(); iv = setInterval(() => { S.aimYaw += d * .012; }, 16); }; el.onpointerup = stop; el.onpointerleave = stop; el.onpointercancel = stop; };
  hold('aL', 1); hold('aR', -1);
  const sw = $('swing');
  if (sw) { sw.onpointerdown = e => { e.preventDefault(); try { sw.setPointerCapture(e.pointerId); } catch {} startCharge(); }; sw.onpointerup = e => { e.preventDefault(); releaseCharge(); }; sw.onpointercancel = () => { S.charge = false; swingLabel(); }; }
}

// ================= 이동 =================
function canStand(x, z) {
  if (Math.abs(x) > MAP - 1 || Math.abs(z) > MAP - 1) return false;
  for (const h of HOLES) for (const w of h.water) if (Math.hypot(x - w[0], z - w[1]) < w[2] + .5) return false;
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < t.tr + .55) return false;
  return true;
}
function walkToBall() {
  const tg = aimTarget(), a = Math.atan2(tg[0] - S.ball.x, tg[1] - S.ball.z);
  let tx = S.ball.x - Math.sin(a) * 1.4, tz = S.ball.z - Math.cos(a) * 1.4;
  if (!canStand(tx, tz)) { tx = S.ball.x; tz = S.ball.z; }
  me.moveT = [tx, tz];
}
function cartTo(x, z, toBall) {
  const f = $('fade'); f.classList.add('on'); sndCart();
  setTimeout(() => {
    let tx = x, tz = z;
    if (toBall) { const tg = aimTarget(), a = Math.atan2(tg[0] - x, tg[1] - z); tx = x - Math.sin(a) * 1.4; tz = z - Math.cos(a) * 1.4; me.yaw = a; cam.yaw = a; }
    for (let k = 0; k < 20 && !canStand(tx, tz); k++) { tx += rand(-1.5, 1.5); tz += rand(-1.5, 1.5); }
    me.x = tx; me.z = tz; me.moveT = null; snapCam();
    setTimeout(() => f.classList.remove('on'), 120);
  }, 480);
}

// ================= 샷 =================
function enterAim() {
  if (S.mode !== 'walk' || S.ball.state !== 'rest') return;
  if (Math.hypot(me.x - S.ball.x, me.z - S.ball.z) > 3.2) return;
  S.mode = 'aim'; S.club = autoClub(); S.clubAuto = true;
  const tgt = aimTarget(); S.aimYaw = Math.atan2(tgt[0] - S.ball.x, tgt[1] - S.ball.z);
  $('power').hidden = false; $('pow').style.width = '0%'; $('powLabel').textContent = CLUBS[S.club].name;
  $('help').classList.add('off'); lastActKey = '';
}
// 처음 조준은 페어웨이를 따라: 꺾이는 홀이면 꺾이는 지점을 먼저 겨눠요
function aimTarget() {
  const h = hole(), dc = distToCup();
  for (let i = 1; i < h.fair.length - 1; i++) {
    const w = h.fair[i], wc = Math.hypot(w[0] - h.cup[0], w[1] - h.cup[1]);
    if (dc > wc + 6 && Math.hypot(w[0] - S.ball.x, w[1] - S.ball.z) > 8) return w;
  }
  return h.cup;
}
function exitAim() { S.mode = 'walk'; S.charge = false; $('power').hidden = true; aimArrow.visible = landRing.visible = pathLine.visible = false; lastActKey = ''; }
function swingLabel() { const sw = $('swing'); if (!sw) return; sw.classList.toggle('on', S.charge); sw.textContent = S.charge ? '떼면 샷!' : '누르고 있다가 떼기'; }
function startCharge() { if (S.mode !== 'aim' || S.charge) return; audio(); S.charge = true; S.chargeT = performance.now(); swingLabel(); }
function releaseCharge() {
  if (!S.charge) return; S.charge = false; swingLabel();
  if (S.power < .03) return;
  shoot(S.power);
}
function chargePower() { const t = (performance.now() - S.chargeT) / 1000 * .75; const f = t % 2; return f < 1 ? f : 2 - f; }
function launchVel(p, yaw, club, lie) {
  const c = CLUBS[club];
  let v = c.v * p * (S.buff === 'ramen' ? 1.2 : 1);
  if (club !== 3) v *= lie === 'rough' ? .85 : lie === 'sand' ? (club === 2 ? .8 : .55) : 1;
  const h = Math.cos(c.loft) * v;
  return { vx: Math.sin(yaw) * h, vy: Math.sin(c.loft) * v, vz: Math.cos(yaw) * h, putt: club === 3 };
}
function shoot(p) {
  let yaw = S.aimYaw; if (S.buff === 'makgeolli') yaw += rand(-.05, .05);
  const lie = surface(S.ball.x, S.ball.z);
  const v = launchVel(p, yaw, S.club, lie);
  S.prev = { x: S.ball.x, z: S.ball.z, strokes: S.strokes }; S.last = { x: S.ball.x, z: S.ball.z };
  Object.assign(S.ball, { vx: v.vx, vy: v.vy, vz: v.vz, state: v.putt ? 'roll' : 'fly', tree: false, lip: false, landed: false });
  S.strokes++; S.shots++; me.swingT = .01; sndSwish(); setTimeout(() => sndHit(p, v.putt), 180);
  S.mode = 'flight'; cam.mode = 'ball'; $('power').hidden = true; aimArrow.visible = landRing.visible = pathLine.visible = false;
  lastActKey = ''; updHud();
}
function mulligan() {
  if (!(S.mulligans > 0 && S.prev && S.mode === 'walk')) return;
  Object.assign(S.ball, { x: S.prev.x, y: 0, z: S.prev.z, vx: 0, vy: 0, vz: 0, state: 'rest' }); S.strokes = S.prev.strokes; S.prev = null; S.mulligans--;
  toast('멀리건! 없던 샷으로'); cartTo(S.ball.x, S.ball.z, true); updHud(); lastActKey = '';
}

// 공 물리 (sim=true면 예측용, 부수 효과 없음)
function stepBall(b, dt, sim) {
  const h = hole();
  if (b.state === 'fly') {
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (!b.tree) for (const t of TREES) {
      const dx = b.x - t.x, dz = b.z - t.z;
      if (dx * dx + dz * dz < t.cr * t.cr && b.y < t.ch + t.cr * .8 && b.y > .3) { b.vx *= -.2; b.vz *= -.2; b.vy = Math.min(b.vy, 0) * .2; b.tree = true; if (!sim) { sndTree(); toast('나무 맞았어요!', 1200); } break; }
    }
    if (Math.abs(b.x) > MAP - 1.5 || Math.abs(b.z) > MAP - 1.5) return 'ob';
    if (b.y <= 0) {
      b.y = 0; const s = surface(b.x, b.z);
      if (s === 'water') return 'water';
      if (s === 'sand') { b.vx *= .1; b.vz *= .1; b.vy = 0; b.state = 'roll'; return sim ? 'land' : null; }
      const land = sim && !b.landed; b.landed = true;
      if (b.vy < -4) { b.vy = -b.vy * (s === 'green' ? .2 : s === 'rough' ? .18 : .3); const k = s === 'rough' ? .5 : s === 'green' ? .6 : .72; b.vx *= k; b.vz *= k; }
      else { b.vy = 0; b.state = 'roll'; }
      if (land) return 'land';
    }
    return null;
  }
  if (b.state === 'roll') {
    const s = surface(b.x, b.z);
    if (s === 'water') return 'water';
    const sp = Math.hypot(b.vx, b.vz), [fr, c] = ROLL[s] || ROLL.rough;
    const dx = h.cup[0] - b.x, dz = h.cup[1] - b.z, d = Math.hypot(dx, dz);
    if (d < cupR() && sp < 3.4) return 'sink';
    if (d < cupR() && sp >= 3.4 && !sim && !b.lip) { b.lip = true; toast('아깝다, 홀컵 돌고 나왔어요', 1200); }
    if (d < cupR() + .5 && sp < 2.5 && d > 0) { b.vx += dx / d * dt * 5; b.vz += dz / d * dt * 5; }
    const ns = Math.max(0, sp - (sp * fr + c) * dt);
    if (sp > 0) { b.vx *= ns / sp; b.vz *= ns / sp; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    for (const t of TREES) { const tx = b.x - t.x, tz = b.z - t.z, td = Math.hypot(tx, tz); if (td < t.tr + .2 && td > 0) { const nx = tx / td, nz = tz / td, vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vz -= 1.6 * vn * nz; } b.x = t.x + nx * (t.tr + .2); b.z = t.z + nz * (t.tr + .2); } }
    if (Math.abs(b.x) > MAP - 1.5 || Math.abs(b.z) > MAP - 1.5) return 'ob';
    if (ns < .12) { b.vx = b.vz = 0; b.state = 'rest'; return 'stop'; }
  }
  return null;
}
function predict(p) {
  const lie = surface(S.ball.x, S.ball.z), v = launchVel(p, S.aimYaw, S.club, lie);
  const b = { x: S.ball.x, y: 0, z: S.ball.z, vx: v.vx, vy: v.vy, vz: v.vz, state: v.putt ? 'roll' : 'fly' };
  const pts = [new T.Vector3(b.x, .15, b.z)]; let land = null;
  for (let i = 0; i < 900; i++) {
    const e = stepBall(b, 1 / 60, true);
    if (i % 3 === 0) pts.push(new T.Vector3(b.x, b.y + .15, b.z));
    if (e === 'land' && !land) land = [b.x, b.z];
    if (e && e !== 'land') { if (!land) land = [b.x, b.z]; break; }
  }
  if (!land) land = [b.x, b.z];
  return { pts, land };
}

function onBallEvent(e) {
  const h = hole(), b = S.ball;
  if (e === 'water') {
    S.mode = 'wait'; S.ballVis = false; sndSplash(); splash(b.x, b.z);
    const eaten = crocEats(b.x, b.z);
    toast(eaten ? '악어가 공을 물어갔어요! 1벌타' : '퐁당! 해저드 1벌타', 2200);
    setTimeout(() => penaltyReturn(), eaten ? 2200 : 1300);
  } else if (e === 'ob') {
    S.mode = 'wait'; toast('OB! 1벌타'); setTimeout(() => penaltyReturn(), 1200);
  } else if (e === 'sink') {
    S.mode = 'wait'; b.state = 'sinking'; b.x = h.cup[0]; b.z = h.cup[1]; sndCup();
    setTimeout(() => { S.ballVis = false; finishHole(''); }, 700);
  } else if (e === 'stop') {
    const s = surface(b.x, b.z), d = distToCup();
    if (s === 'green' && d < 1.1) { S.strokes++; S.mode = 'wait'; finishHole('OK! 컨시드'); return; }
    if (S.strokes >= h.par * 2) { S.mode = 'wait'; finishHole('양파! 픽업'); return; }
    toast(`${LIE[s]} · 핀까지 ${Math.round(d * M_PER_U)}m`, 1600);
    S.mode = 'wait'; setTimeout(() => { S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; }, 900);
  }
  updHud();
}
function penaltyReturn() {
  S.strokes++; Object.assign(S.ball, { x: S.last.x, y: 0, z: S.last.z, vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
  if (S.strokes >= hole().par * 2) { finishHole('양파! 픽업'); return; }
  S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; updHud();
}
function scoreName(s, par) {
  if (s === 1) return '홀인원!'; const d = s - par;
  return ({ '-3': '알바트로스!', '-2': '이글!', '-1': '버디!', '0': '파', '1': '보기', '2': '더블 보기', '3': '트리플 보기' })[d] || (d > 0 ? `+${d}` : `${d}`);
}
const totalDiff = () => S.scores.reduce((d, s, i) => s == null ? d : d + s - HOLES[i].par, 0);
function finishHole(prefix) {
  const h = hole(); const s = Math.min(S.strokes, h.par * 2); S.scores[S.hole] = s; renderCard();
  const name = scoreName(s, h.par); toast(prefix ? `${prefix} · ${name}` : name, 2200);
  if (s - h.par < 0 || s === 1) sendNet({ t: 'res', h: S.hole, d: Math.max(-4, s - h.par), one: s === 1 ? 1 : 0 });
  if (s - h.par < 0) { me.jump = 1; showBubble(me, name); }
  setTimeout(() => { cam.mode = 'follow'; if (S.hole === HOLES.length - 1) endRound(); else nextHoleCard(s); }, 1600);
}
function nextHoleCard(s) {
  const done = S.hole, n = HOLES[done + 1];
  const shade = done === 1 && !S.buff;
  overlay(`<span class="eyebrow">${done + 1}번 홀 ${s}타 (${fmtDiff(s - HOLES[done].par)}) · 합계 ${fmtDiff(totalDiff())}</span>
    <h2>다음은 ${done + 2}번 홀, ${esc(n.name)}</h2><p>PAR ${n.par}. ${shade ? '전반이 끝났어요. 그늘집에 들러 쉬었다 가도 돼요.' : '티잉 구역으로 이동해 주세요.'}</p>
    <div class="btns">${shade ? '<button class="btn" id="goShade">그늘집 들르기</button>' : ''}<button class="btn${shade ? ' sub' : ''}" id="goCart">카트 타고 티로</button><button class="btn sub" id="goWalk">걸어가기</button></div>`, true);
  S.hole = done + 1; S.strokes = 0; S.prev = null; S.last = null;
  const t = HOLES[S.hole].tee; Object.assign(S.ball, { x: t[0], y: 0, z: t[1], vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
  S.mode = 'walk'; lastActKey = ''; updHud(); renderCard();
  $('goCart').onclick = () => { closeOverlay(); cartTo(t[0], t[1], true); };
  $('goWalk').onclick = () => { closeOverlay(); walkToBall(); };
  if (shade) $('goShade').onclick = () => { closeOverlay(); cartTo(SHADE.x + rand(-2, 0), SHADE.z + rand(-1, 1), false); };
}
let shadeTimer = 0;
function shadeNames() {
  const list = [...NET.others.values()].filter(o => Math.hypot(o.x - SHADE.x, o.z - SHADE.z) < 7).map(o => o.nick);
  return list.length ? `지금 그늘집에 ${esc(list.slice(0, 5).join(', '))}${list.length > 5 ? ` 외 ${list.length - 5}명` : ''} 님이 쉬고 있어요.` : '그늘집이 한산하네요. 혼자 여유롭게 쉬어가세요.';
}
function showShade() {
  overlay(`<span class="eyebrow">그늘집 · 오늘의 메뉴</span><h2>잠깐 쉬었다 가세요</h2>
    <p>하나 고르면 라운딩 끝까지 효과가 있어요.</p>
    <div class="menu">${MENU.map(m => `<button type="button" data-id="${m.id}"><span class="it">${m.name}</span><span class="pc">${m.price}</span><span class="ef">${m.eff}</span></button>`).join('')}</div>
    <div class="shade-now" id="shadeNow">${shadeNames()}</div><button class="btn sub" id="shadeClose">그냥 구경만 할게요</button>`);
  shadeTimer = setInterval(() => { const el = $('shadeNow'); if (el) el.innerHTML = shadeNames(); }, 1500);
  $('shadeClose').onclick = closeOverlay;
  document.querySelectorAll('.menu button').forEach(b => b.onclick = () => {
    const m = MENU.find(x => x.id === b.dataset.id); S.buff = m.id; if (m.id === 'odeng') S.mulligans = 2;
    const c = $('buffChip'); c.textContent = m.chip; c.hidden = false; closeOverlay(); toast(`${m.name} 냠냠`); me.jump = 1; showBubble(me, '잘 먹었습니다!'); lastActKey = '';
  });
  document.querySelector('.menu button').focus();
}
const MASCOT = document.querySelector('.lobby .mascot').outerHTML;
function endRound() {
  const tot = S.scores.reduce((a, b) => a + b, 0), d = tot - TOTAL_PAR, best = getBest(), nb = best == null || tot < best;
  if (nb) setBest(tot);
  const line = d <= -3 ? '당근 CC 클럽 챔피언 감이에요.' : d <= 0 ? '오늘 샷감 좋네요.' : d <= 4 ? '무난한 라운딩이었어요.' : '다음엔 그늘집부터 들르세요.';
  overlay(`${MASCOT}<span class="eyebrow">라운딩 완료 · ${esc(NET.nick)}</span><div class="big-num">${tot}타</div><h2>${fmtDiff(d)}</h2>
    <p>PAR ${TOTAL_PAR} 기준. ${nb ? '새 베스트 기록이에요. ' : `베스트 ${best}타. `}${line}</p><div class="btns"><button class="btn" id="again">다시 라운딩</button><button class="btn sub" id="stroll">코스 산책하기</button></div>`);
  $('again').onclick = () => { closeOverlay(); resetRound(true); };
  $('stroll').onclick = () => { closeOverlay(); S.mode = 'walk'; S.ballVis = false; S.ball.state = 'done'; lastActKey = ''; toast('천천히 둘러보세요. 오른쪽 위 스코어카드에서 새 라운딩을 시작할 수 있어요', 2800); showAgainInSheet(); };
}
function showAgainInSheet() { const s = $('cardSheet'); if (!$('againSheet')) s.insertAdjacentHTML('beforeend', '<button class="btn" id="againSheet">새 라운딩 시작</button>'); $('againSheet').onclick = () => { s.hidden = true; $('againSheet').remove(); resetRound(true); }; }
function renderCard() {
  const cell = (s, i) => { if (s == null) return ''; const d = s - HOLES[i].par; const k = d <= -2 ? 'e' : d === -1 ? 'b' : d === 1 ? 'bo' : d >= 2 ? 'db' : ''; return `<span class="mk ${k}">${s}</span>`; };
  let h = '<tr><th class="rl">HOLE</th>', p = '<tr><td class="rl">PAR</td>', s = '<tr><td class="rl">타수</td>';
  HOLES.forEach((ho, i) => {
    if (i === 2) { h += '<th class="shade-col">쉼</th>'; p += '<td class="shade-col" rowspan="2">그늘집</td>'; }
    const cur = i === S.hole && S.scores[i] == null ? ' class="cur"' : '';
    h += `<th${cur}>${i + 1}</th>`; p += `<td>${ho.par}</td>`; s += `<td${cur}>${cell(S.scores[i], i)}</td>`;
  });
  const played = S.scores.filter(x => x != null); const tot = played.reduce((a, b) => a + b, 0);
  $('sc').innerHTML = h + '<th>합계</th></tr>' + p + `<td>${TOTAL_PAR}</td></tr>` + s + `<td>${played.length ? tot : ''}</td></tr>`;
}
function resetRound(teleport) {
  closeOverlay(); S.scores.fill(null); S.buff = null; S.mulligans = 0; S.hole = 0; S.strokes = 0; S.prev = null; S.last = null; S.mode = 'walk';
  $('buffChip').hidden = true;
  const t = HOLES[0].tee; Object.assign(S.ball, { x: t[0], y: 0, z: t[1], vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
  if (teleport) cartTo(t[0], t[1], true);
  lastActKey = ''; updHud(); renderCard();
}

// ================= 동물 =================
function crocEats(x, z) {
  const c = CROCS.filter(c => Math.hypot(x - c.w[0], z - c.w[1]) < c.w[2]).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  if (!c) return false;
  c.tx = x; c.tz = z; c.chomp = 2.2; c.state = 'swim'; setTimeout(sndChomp, 700); return true;
}
function splash(x, z) {
  const m = new T.Mesh(new T.RingGeometry(.3, .45, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .1, z); scene.add(m); SPLASHES.push({ m, t: 0 });
}
function randInPond(w) { const a = Math.random() * TAU, d = Math.random() * (w[2] - 3); return [w[0] + Math.cos(a) * d, w[1] + Math.sin(a) * d]; }
let nextBirds = 8;
function updateLife(dt, t) {
  for (const c of CROCS) {
    if (c.chomp > 0) {
      c.chomp -= dt; c.x += (c.tx - c.x) * Math.min(1, dt * 4); c.z += (c.tz - c.z) * Math.min(1, dt * 4); c.y += (.05 - c.y) * dt * 6;
      const a = Math.atan2(c.tx - c.x, c.tz - c.z); if (Math.hypot(c.tx - c.x, c.tz - c.z) > .3) c.yaw += angDiff(c.yaw, a) * Math.min(1, dt * 6);
      c.jaw.rotation.x = -Math.abs(Math.sin(c.chomp * 7)) * .7;
      if (c.chomp <= 0) { c.jaw.rotation.x = 0; c.state = 'dive'; }
    } else if (c.state === 'swim') {
      const dx = c.tx - c.x, dz = c.tz - c.z, d = Math.hypot(dx, dz);
      if (d < .4) { c.wait -= dt; if (c.wait <= 0) { if (Math.random() < .3) c.state = 'dive'; else { [c.tx, c.tz] = randInPond(c.w); c.wait = rand(2, 6); } } }
      else { c.x += dx / d * dt * 1.1; c.z += dz / d * dt * 1.1; c.yaw += angDiff(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 1.5); }
      c.y += (-.04 + Math.sin(t * 1.3) * .03 - c.y) * dt * 2;
    } else if (c.state === 'dive') { c.y -= dt * .5; if (c.y < -1.2) { [c.x, c.z] = randInPond(c.w); [c.tx, c.tz] = [c.x, c.z]; c.state = 'rise'; c.wait = rand(2, 5); } }
    else if (c.state === 'rise') { c.wait -= dt; if (c.wait <= 0) { c.y += dt * .4; if (c.y >= -.04) { c.state = 'swim'; c.wait = rand(1, 4); } } }
    c.g.position.set(c.x, c.y, c.z); c.g.rotation.y = c.yaw;
  }
  for (const r of RABBITS) {
    const pd = Math.hypot(me.x - r.x, me.z - r.z), bd = S.ball.state !== 'rest' ? Math.hypot(S.ball.x - r.x, S.ball.z - r.z) : 99;
    if ((pd < 4.5 || bd < 5) && r.state !== 'flee') {
      const sx = pd < 4.5 ? me.x : S.ball.x, sz = pd < 4.5 ? me.z : S.ball.z, k = 10 / (Math.hypot(r.x - sx, r.z - sz) || 1);
      r.tx = clamp(r.x + (r.x - sx) * k, -MAP + 3, MAP - 3); r.tz = clamp(r.z + (r.z - sz) * k, -MAP + 3, MAP - 3); r.state = 'flee';
    }
    if (r.state === 'sit') { r.t -= dt; if (r.t <= 0) { const p = PATCHES[Math.random() * PATCHES.length | 0]; if (Math.hypot(p[0] - r.x, p[1] - r.z) < 50) { r.tx = p[0] + .9; r.tz = p[1] + .6; } else { r.tx = r.x + rand(-8, 8); r.tz = r.z + rand(-8, 8); } r.state = 'hop'; } }
    else {
      const sp = r.state === 'flee' ? 7 : 2.4, dx = r.tx - r.x, dz = r.tz - r.z, d = Math.hypot(dx, dz);
      if (d < .3 || !canStand(r.x + dx / d * .5, r.z + dz / d * .5)) { r.state = 'sit'; r.t = rand(3, 9); r.ph = 0; }
      else { r.x += dx / d * sp * dt; r.z += dz / d * sp * dt; r.ph += dt * (r.state === 'flee' ? 14 : 8); r.yaw = Math.atan2(dx, dz); }
    }
    const hop = r.state === 'sit' ? 0 : Math.abs(Math.sin(r.ph)) * .45;
    r.g.position.set(r.x, hop, r.z); r.g.rotation.y = r.yaw; r.g.rotation.x = r.state === 'sit' ? Math.sin(t * 6) * .04 : 0;
  }
  nextBirds -= dt;
  if (nextBirds <= 0) {
    nextBirds = rand(18, 40); const n = 3 + (Math.random() * 4 | 0), a = Math.random() * TAU, y = rand(16, 26);
    const sx = me.x - Math.cos(a) * 90, sz = me.z - Math.sin(a) * 90;
    for (let i = 0; i < n; i++) {
      const g = new T.Group(); const bm = mat(0x2b2a26);
      const body = new T.Mesh(new T.BoxGeometry(.18, .14, .5), bm); g.add(body);
      const wm = new T.MeshLambertMaterial({ color: 0x2b2a26, side: T.DoubleSide });
      const wl = new T.Mesh(new T.PlaneGeometry(.7, .25).rotateX(-Math.PI / 2).translate(-.35, 0, 0), wm); g.add(wl);
      const wr = new T.Mesh(new T.PlaneGeometry(.7, .25).rotateX(-Math.PI / 2).translate(.35, 0, 0), wm); g.add(wr);
      const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2);
      g.position.set(sx - Math.sin(a) * side * 1.6 - Math.cos(a) * Math.abs(side) * 1.6, y + side * .3, sz + Math.cos(a) * side * 1.6 - Math.sin(a) * Math.abs(side) * 1.6);
      g.rotation.y = Math.atan2(Math.cos(a), Math.sin(a));
      scene.add(g); BIRDS.push({ g, wl, wr, vx: Math.cos(a) * 11, vz: Math.sin(a) * 11, ph: Math.random() * 6, life: 18 });
    }
    setTimeout(birdSong, 600);
  }
  for (let i = BIRDS.length - 1; i >= 0; i--) {
    const b = BIRDS[i]; b.life -= dt; b.ph += dt * 9;
    b.g.position.x += b.vx * dt; b.g.position.z += b.vz * dt; b.wl.rotation.z = Math.sin(b.ph) * .6; b.wr.rotation.z = -Math.sin(b.ph) * .6;
    if (b.life <= 0) { scene.remove(b.g); BIRDS.splice(i, 1); }
  }
  for (let i = SPLASHES.length - 1; i >= 0; i--) {
    const s = SPLASHES[i]; s.t += dt; const k = 1 + s.t * 6; s.m.scale.set(k, k, k); s.m.material.opacity = Math.max(0, .9 - s.t * .6);
    if (s.t > 1.5) { scene.remove(s.m); SPLASHES.splice(i, 1); }
  }
  for (const c of CLOUDS) { c.position.x += dt * 1.5; if (c.position.x > 300) c.position.x = -300; }
  for (const f of FLAGS) {
    const p = f.flag.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = f.base[i * 3]; p.setZ(i, Math.sin(x * 4 - t * 5) * .12 * (x / 1.4)); }
    p.needsUpdate = true;
  }
}

// ================= 아바타 애니메이션 =================
function animateAvatar(av, o, dt, t) {
  const walking = o.anim === 1, aiming = o.anim === 2;
  o.ph += dt * (walking ? 11 : 2);
  const hop = walking ? Math.abs(Math.sin(o.ph)) * .28 : 0;
  if (o.jump > 0) o.jump = Math.max(0, o.jump - dt * 1.6);
  const jy = o.jump > 0 ? Math.sin((1 - o.jump) * Math.PI) * .9 : 0;
  av.position.set(o.x, hop + jy, o.z); av.rotation.y = o.yaw;
  const sq = walking ? 1 + Math.sin(o.ph * 2) * .04 : 1 + Math.sin(t * 2) * .015;
  av.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  const club = av.userData.club;
  if (o.swingT > 0) {
    o.swingT += dt; const k = o.swingT;
    if (k < .35) { club.rotation.set(.15, 0, .2 + k / .35 * 2.4); }
    else if (k < .55) { club.rotation.set(.15, 0, 2.6 - (k - .35) / .2 * 4.4); }
    else if (k < 1) { club.rotation.set(.15, 0, -1.8); }
    else { o.swingT = 0; }
  } else if (aiming) { club.rotation.set(0, 0, .02); }
  else { club.rotation.set(.15, 0, .2 + Math.sin(o.ph) * (walking ? .25 : .03)); }
}

// ================= 입력 =================
function resize() {
  if (!renderer) return; const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
}
function bindInput() {
  const el = renderer.domElement, ptrs = new Map(); let moved = 0, pinch = 0;
  el.addEventListener('pointerdown', e => { audio(); el.focus({ preventScroll: true }); el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = ptrs.size > 1 ? 99 : 0; pinch = 0; });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 5, 40); pinch = d; return; }
    moved += Math.abs(dx) + Math.abs(dy);
    if (moved > 6) {
      if (S.mode === 'aim') S.aimYaw -= dx * .003; else cam.yaw -= dx * .006;
      cam.pitch = clamp(cam.pitch + dy * .004, .12, 1.25);
      $('help').classList.add('off');
    }
  });
  const up = e => {
    if (ptrs.size === 1 && moved <= 6 && S.mode === 'walk') clickMove(e);
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); });
  el.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * .1), 5, 40); }, { passive: false });
  window.addEventListener('keydown', e => {
    if ($('app').hidden || e.target.closest && e.target.closest('input,textarea')) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); }
    if (k === ' ' && S.mode === 'aim') { e.preventDefault(); if (!e.repeat) startCharge(); }
    if (k === 'e' && S.mode === 'walk') enterAim();
    if (k === 'escape' && S.mode === 'aim') exitAim();
    if (k === 'c' && S.mode === 'aim') { S.club = (S.club + 1) % 4; S.clubAuto = false; lastActKey = ''; }
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === ' ' && S.mode === 'aim') { e.preventDefault(); releaseCharge(); } });
  window.addEventListener('blur', () => keys.clear());
}
function clickMove(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
  const hit = ray.intersectObject(ground)[0]; if (!hit) return;
  let x = hit.point.x, z = hit.point.z;
  if (!canStand(x, z)) { toast('거긴 들어갈 수 없어요', 1000); return; }
  me.moveT = [x, z]; moveRing.position.set(x, .05, z); moveRing.material.opacity = .9; moveRing.scale.setScalar(1);
  $('help').classList.add('off');
}

// ================= 카메라 =================
function snapCam() { cam.tx = me.x; cam.ty = 1.6; cam.tz = me.z; cam.px = me.x - Math.sin(cam.yaw) * cam.dist; cam.py = 6; cam.pz = me.z - Math.cos(cam.yaw) * cam.dist; }
function updateCamera(dt) {
  let tx, ty, tz, px, py, pz;
  if (S.mode === 'aim') {
    const f = [Math.sin(S.aimYaw), Math.cos(S.aimYaw)];
    tx = S.ball.x + f[0] * 12; ty = .8; tz = S.ball.z + f[1] * 12;
    px = S.ball.x - f[0] * 7; py = 3.4; pz = S.ball.z - f[1] * 7; cam.yaw = S.aimYaw;
  } else if (cam.mode === 'ball' && S.ballVis) {
    const b = S.ball; const sp = Math.hypot(b.vx, b.vz);
    const dirx = sp > .5 ? b.vx / sp : Math.sin(cam.yaw), dirz = sp > .5 ? b.vz / sp : Math.cos(cam.yaw);
    tx = b.x; ty = b.y + .5; tz = b.z;
    px = b.x - dirx * 11; py = b.y + 5; pz = b.z - dirz * 11; cam.yaw = Math.atan2(dirx, dirz);
  } else {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    tx = me.x; ty = 1.6; tz = me.z;
    // 카메라와 캐릭터 사이에 나무가 끼면 카메라를 앞으로 당겨요
    let dist = cam.dist; const bx = -Math.sin(cam.yaw), bz = -Math.cos(cam.yaw), horiz = cp * cam.dist;
    for (const t of TREES) {
      const rx = t.x - me.x, rz = t.z - me.z, along = rx * bx + rz * bz;
      if (along < 1.5 || along > horiz + t.cr) continue;
      const side = Math.abs(rx * bz - rz * bx);
      if (side < t.cr + .6) dist = Math.min(dist, Math.max(4, (along - t.cr - .8) / cp));
    }
    px = me.x - Math.sin(cam.yaw) * cp * dist; py = 1.6 + sp * dist; pz = me.z - Math.cos(cam.yaw) * cp * dist;
  }
  const k = Math.min(1, dt * (cam.mode === 'ball' ? 3 : 6));
  cam.tx += (tx - cam.tx) * k; cam.ty += (ty - cam.ty) * k; cam.tz += (tz - cam.tz) * k;
  cam.px += (px - cam.px) * k; cam.py += (py - cam.py) * k; cam.pz += (pz - cam.pz) * k;
  if (cam.py < .8) cam.py = .8;
  camera.position.set(cam.px, cam.py, cam.pz); camera.lookAt(cam.tx, cam.ty, cam.tz);
  for (const t of TREES) if (t.g) t.g.visible = Math.hypot(t.x - cam.px, t.z - cam.pz) > t.cr + 4.5;
  sun.position.set(me.x + 40, 80, me.z + 25); sun.target.position.set(me.x, 0, me.z);
}

// ================= 위치 전송 =================
function sendPos(force) {
  if (!NET.ch) return;
  const yaw = ((me.yaw % TAU) + TAU) % TAU;
  const bv = S.ballVis && S.ball.state === 'rest' ? 1 : 0;
  const msg = { t: 'pos', h: S.hole, x: Math.round(me.x * 10), z: Math.round(me.z * 10), r: Math.round(yaw * 10), a: me.anim, bx: Math.round(S.ball.x * 10), bz: Math.round(S.ball.z * 10), bv };
  const key = `${msg.h},${msg.x},${msg.z},${msg.r},${msg.a},${msg.bx},${msg.bz},${bv}`, now = performance.now();
  if (!force && key === NET.lastSent && now - NET.lastSentT < 4000) return;
  NET.lastSent = key; NET.lastSentT = now; sendNet(msg);
}

// ================= 미니맵 =================
const mm = $('minimap'), mctx = mm.getContext('2d');
function drawMinimap() {
  const W = mm.width, s = W / (MAP * 2), px = x => (x + MAP) * s;
  mctx.drawImage(groundCanvas, 0, 0, W, W);
  for (const h of HOLES) { mctx.fillStyle = '#d2442c'; mctx.fillRect(px(h.cup[0]) - 1.5, px(h.cup[1]) - 9, 3, 9); }
  const c = hole().cup; mctx.strokeStyle = '#fff'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(px(c[0]), px(c[1]), 9, 0, TAU); mctx.stroke();
  mctx.fillStyle = '#5e3d24'; mctx.fillRect(px(SHADE.x) - 7, px(SHADE.z) - 6, 14, 12);
  for (const o of NET.others.values()) { mctx.fillStyle = o.color; mctx.beginPath(); mctx.arc(px(o.x), px(o.z), 5, 0, TAU); mctx.fill(); }
  if (S.ballVis) { mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.arc(px(S.ball.x), px(S.ball.z), 4, 0, TAU); mctx.fill(); }
  mctx.save(); mctx.translate(px(me.x), px(me.z)); mctx.rotate(-me.yaw);
  mctx.fillStyle = '#f08a2f'; mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(0, 10); mctx.lineTo(7, -6); mctx.lineTo(-7, -6); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
}

// ================= 메인 루프 =================
let mmT = 0, sendT = 0, actT = 0;
function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

  // 내 이동
  me.anim = 0;
  if (S.mode === 'walk' || S.mode === 'wait' || S.mode === 'flight') {
    let vx = 0, vz = 0;
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
    if (keys.has('w') || keys.has('arrowup')) { vx += fx; vz += fz; }
    if (keys.has('s') || keys.has('arrowdown')) { vx -= fx; vz -= fz; }
    if (keys.has('d') || keys.has('arrowright')) { vx += rx; vz += rz; }
    if (keys.has('a') || keys.has('arrowleft')) { vx -= rx; vz -= rz; }
    if (vx || vz) { me.moveT = null; $('help').classList.add('off'); }
    else if (me.moveT) { const dx = me.moveT[0] - me.x, dz = me.moveT[1] - me.z, d = Math.hypot(dx, dz); if (d < .25) me.moveT = null; else { vx = dx / d; vz = dz / d; } }
    const l = Math.hypot(vx, vz);
    if (l > 0) {
      vx /= l; vz /= l; const sp = 6.5 * dt;
      const nx = me.x + vx * sp, nz = me.z + vz * sp;
      if (canStand(nx, nz)) { me.x = nx; me.z = nz; } else if (canStand(nx, me.z)) me.x = nx; else if (canStand(me.x, nz)) me.z = nz; else me.moveT = null;
      me.yaw += angDiff(me.yaw, Math.atan2(vx, vz)) * Math.min(1, dt * 12); me.anim = 1;
    }
  }
  if (S.mode === 'aim') {
    for (const k of ['arrowleft', 'a']) if (keys.has(k)) S.aimYaw += dt * 1.1;
    for (const k of ['arrowright', 'd']) if (keys.has(k)) S.aimYaw -= dt * 1.1;
    const rx = -Math.cos(S.aimYaw), rz = Math.sin(S.aimYaw);
    me.x += (S.ball.x - rx * 1.0 - me.x) * Math.min(1, dt * 10); me.z += (S.ball.z - rz * 1.0 - me.z) * Math.min(1, dt * 10);
    me.yaw += angDiff(me.yaw, Math.atan2(rx, rz)) * Math.min(1, dt * 10); me.anim = 2;
    if (S.charge) { S.power = chargePower(); $('pow').style.width = (S.power * 100) + '%'; }
    $('powLabel').textContent = `${CLUBS[S.club].name}${S.charge ? ' ' + Math.round(S.power * 100) + '%' : ''}`;
    const pr = predict(S.charge ? Math.max(S.power, .05) : 1);
    aimArrow.visible = true; aimArrow.position.set(S.ball.x, .06, S.ball.z); aimArrow.rotation.z = S.aimYaw + Math.PI;
    landRing.visible = S.club !== 3 || S.buff === 'carrot'; landRing.position.set(pr.land[0], .07, pr.land[1]);
    if (S.buff === 'carrot') { pathLine.geometry.setFromPoints(pr.pts); pathLine.computeLineDistances(); pathLine.visible = true; }
  }
  if (me.swingT > 0) me.anim = 3;
  animateAvatar(me.av, me, dt, t);

  // 공
  if (S.mode === 'flight') {
    for (let i = 0; i < 4; i++) { const e = stepBall(S.ball, dt / 4, false); if (e) { onBallEvent(e); break; } }
    if (S.mode === 'flight' && (S.ball.state === 'fly' || S.ball.state === 'roll') && Math.random() < .02) updHud();
  }
  if (S.ball.state === 'sinking') S.ball.y = Math.max(-.4, S.ball.y - dt * 1.5);
  ballMesh.visible = S.ballVis; ballMesh.position.set(S.ball.x, S.ball.y + .2, S.ball.z);

  // 그늘집에 처음 들어오면 메뉴 안내
  const inShade = Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 6;
  if (inShade && !S.shadeSeen && !S.buff && S.mode === 'walk') { S.shadeSeen = true; toast('그늘집이에요. 메뉴판을 볼 수 있어요', 2000); }
  if (!inShade) S.shadeSeen = false;

  // 다른 사람
  for (const o of NET.others.values()) {
    if (!o.av) attachOther(o);
    const k = Math.min(1, dt * 8);
    const moving = Math.hypot(o.tx - o.x, o.tz - o.z) > .05;
    o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; o.yaw += angDiff(o.yaw, o.tyaw) * k;
    o.anim = o.a === 3 ? 0 : (moving && o.a !== 2) ? 1 : o.a;
    if (o.a === 3 && !o.swingT) o.swingT = .01;
    if (o.a !== 3 && o.swingT > 1) o.swingT = 0;
    animateAvatar(o.av, o, dt, t);
    o.ball.visible = !!o.bv; o.ball.position.set(o.bx, .2, o.bz);
  }

  updateLife(dt, t);
  if (moveRing.material.opacity > 0) { moveRing.material.opacity = Math.max(0, moveRing.material.opacity - dt * 1.2); moveRing.scale.multiplyScalar(1 + dt * .8); }
  updateCamera(dt);
  renderer.render(scene, camera);

  // 이름표
  const W = stage.clientWidth, H = stage.clientHeight;
  const place = (tag, x, y, z) => {
    tmpV.set(x, y, z); const d = camera.position.distanceTo(tmpV); tmpV.project(camera);
    if (tmpV.z > 1 || d > 70) { tag.style.display = 'none'; return; }
    tag.style.display = ''; tag.style.transform = `translate(${(tmpV.x * .5 + .5) * W}px, ${(-tmpV.y * .5 + .5) * H}px) translate(-50%,-100%)`;
    tag.style.opacity = d > 45 ? String(1 - (d - 45) / 25) : '1';
  };
  place(me.tag, me.x, 3 + (me.jump > 0 ? .9 : 0), me.z);
  for (const o of NET.others.values()) if (o.tag) place(o.tag, o.x, 3, o.z);

  mmT -= dt; if (mmT <= 0) { mmT = .1; drawMinimap(); }
  sendT -= dt; if (sendT <= 0) { sendT = .12; sendPos(false); }
  actT -= dt; if (actT <= 0) { actT = .15; updActions(); if (S.mode === 'walk' || S.mode === 'aim') updHud(); }
}

// ================= 시작 =================
function enterGame() {
  if (!NET.nick) { NET.nick = localNick(); $('nick').textContent = NET.nick; }
  $('lobby').hidden = true; $('app').hidden = false;
  if (!T) { stage.insertAdjacentHTML('beforeend', '<div class="nogl"><p>3D 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</p></div>'); return; }
  if (!build()) return;
  me.tag.querySelector('.nm').textContent = NET.nick;
  audio(); startAmbience(); setMaster(true);
  resetRound(false);
  const t = HOLES[0].tee; me.x = t[0] - 1; me.z = t[1] + 6; me.yaw = Math.PI; cam.yaw = Math.PI; snapCam();
  updChannelBadge(); resize();
  sendPos(true);
  if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  setTimeout(() => $('help').classList.add('off'), 12000);
}

renderCard();
connect();
})();
