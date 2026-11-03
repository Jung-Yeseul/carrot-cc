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
// 홀마다 테마(ev)가 있어요
const HOLES = [
  { name: '단풍길', ev: 'warm', par: 3, tee: [-60, 85], cup: [-62, 30], green: 9, fair: [[-60, 85], [-62, 30]], fw: 12,
    sand: [[-52, 36, 3.5], [-71, 40, 3]], water: [] },
  { name: '당근밭', ev: 'rabbit', par: 3, tee: [55, -25], cup: [70, 28], green: 9, fair: [[55, -25], [70, 28]], fw: 11,
    sand: [[62, 21, 3], [79, 34, 3]], water: [] },
  { name: '악어 연못', ev: 'croc', par: 4, tee: [-45, 10], cup: [25, -55], green: 10, fair: [[-45, 10], [-20, -25], [25, -55]], fw: 13,
    sand: [[34, -48, 3.5], [-28, -32, 3]], water: [[-6, -12, 10]] },
  { name: '바람의 언덕', ev: 'wind', wind: [0, -3.2], par: 4, tee: [60, 75], cup: [-15, 70], green: 10, fair: [[60, 75], [25, 92], [-15, 70]], fw: 13,
    sand: [[-5, 63, 3.5]], water: [[26, 68, 8]] },
  { name: '보물찾기', ev: 'zones', par: 3, tee: [-85, 95], cup: [-95, 40], green: 9, fair: [[-85, 95], [-95, 40]], fw: 13,
    sand: [[-86, 44, 3]], water: [],
    zones: [{ t: 'jump', x: -88.5, z: 76, r: 4 }, { t: 'gold', x: -86.5, z: 64, r: 3.5 }, { t: 'box', x: -96, z: 57, r: 3.5 }] },
  { name: '오리 연못', ev: 'duck', par: 4, tee: [-95, 15], cup: [-70, -85], green: 10, fair: [[-95, 15], [-95, -45], [-70, -85]], fw: 13,
    sand: [[-78, -78, 3]], water: [[-84, -18, 7]] },
  { name: '멧돼지 숲', ev: 'boar', par: 3, tee: [-55, -90], cup: [0, -95], green: 9, fair: [[-55, -90], [0, -95]], fw: 10,
    sand: [[-6, -88, 3]], water: [] },
  { name: '까마귀 언덕', ev: 'crow', par: 4, tee: [40, -95], cup: [92, -45], green: 10, fair: [[40, -95], [88, -85], [92, -45]], fw: 13,
    sand: [[84, -50, 3.5]], water: [] },
  { name: '갤러리 홀', ev: 'gallery', par: 4, tee: [92, -15], cup: [90, 58], green: 11, fair: [[92, -15], [90, 58]], fw: 14,
    sand: [[82, 50, 3.5], [98, 50, 3]], water: [] },
];
const HOLE_EV = {
  warm: ['몸풀기 홀', '천천히 감 잡는 홀이에요. 특별한 이벤트는 없어요.'],
  rabbit: ['토끼 도우미 홀', '공이 러프에 멈추면 토끼가 핀 쪽으로 공을 밀어줄 때가 있어요.'],
  croc: ['악어 홀', '연못에 악어가 세 마리! 물가에 공이 멈추면 훔쳐가요. 단, 한 홀에 한 번만이에요.'],
  wind: ['바람 홀', '언덕 위라 바람이 세게 불어요. 공이 바람에 밀려요.'],
  zones: ['보물찾기 홀', '페어웨이 위 트램펄린·황금 당근·물음표 상자를 맞혀 보세요!'],
  duck: ['오리 홀', '연못에 오리 가족이 살아요. 공이 빠져도 오리가 건져다 줘요(무벌타).'],
  boar: ['멧돼지 홀', '숲에 멧돼지가 살아요. 공을 툭 차고 지나갈 수 있어요.'],
  crow: ['까마귀 홀', '까마귀들이 공을 노려요. 공에서 눈을 떼지 마세요!'],
  gallery: ['갤러리 홀', '마지막 홀! 갤러리가 지켜보고 있어요. 넣으면 큰 박수를 받아요.'],
};
const TOTAL_PAR = HOLES.reduce((a, h) => a + h.par, 0);
const SHADE = { x: 6, z: 32 };   // 그늘집 위치
const RR = { x: -9, z: 31 };     // 화장실 위치 (문은 동쪽, 그늘집 쪽을 봐요)
const RR_DOORS = { m: [-5.9, 29.5], w: [-5.9, 32.5] };
const PATHS = [[[-62, 30], [-58, 18], [-45, 10]], [[25, -55], [42, -42], [55, -25]], [[70, 28], [64, 52], [60, 75]], [[-15, 70], [-2, 50], [6, 32]], [[6, 32], [-20, 22], [-45, 10]], [[6, 32], [36, 10], [55, -25]], [[-60, 85], [-38, 76], [-15, 70]],
  [[-38, 76], [-60, 97], [-85, 102]], [[-95, 40], [-102, 28], [-95, 15]], [[-62, 30], [-80, 30], [-95, 40]], [[-70, -85], [-62, -92], [-55, -90]], [[0, -95], [20, -102], [40, -95]], [[25, -55], [30, -80], [40, -95]], [[92, -45], [100, -30], [92, -15]], [[90, 58], [75, 70], [60, 75]], [[70, 28], [84, 0], [92, -15]], [[-45, 10], [-75, -5], [-95, 15]]];
const CLUBS = [
  { name: '드라이버', loft: .55, v: 27.4 },
  { name: '아이언', loft: .70, v: 22.6 },
  { name: '웨지', loft: 1.0, v: 19.9 },
  { name: '퍼터', loft: 0, v: 13 },
];
const ROLL = { green: [.9, .5], fairway: [1.5, 1.2], tee: [1.5, 1.2], path: [1.2, 1], rough: [3, 3.5], sand: [8, 6] };
const LIE = { green: '그린', fairway: '페어웨이', tee: '티잉 구역', path: '카트 도로', rough: '러프', sand: '벙커' };
const EMOTES = ['나이스샷!', '굿 퍼팅', '아깝다~', '오잘공!', '당근이지!', '캐디님 감사']; // 서버 EMOTES 개수와 맞추기
const MENU = [
  { id: 'carrot', name: '갓 짠 당근주스', price: '12,000원', eff: 'OK권 2장 + 처음 먹으면 공이 날아갈 길이 미리 보여요.', chip: '당근주스: 궤적 미리보기', tix: [0, 2] },
  { id: 'ramen', name: '그늘집 컵라면', price: '9,000원', eff: '멀리건 1장 + 처음 먹으면 비거리 +20%.', chip: '컵라면: 비거리 +20%', tix: [1, 0] },
  { id: 'makgeolli', name: '막걸리 한 잔', price: '15,000원', eff: '멀리건 1장·OK권 1장 + 처음 먹으면 홀컵이 크게 보여요(손 떨림).', chip: '막걸리: 홀컵 크게, 손 떨림', tix: [1, 1] },
  { id: 'odeng', name: '오뎅 꼬치', price: '11,000원', eff: '멀리건 2장. 동반자가 너그러워져요.', chip: '오뎅: 너그러운 동반자', tix: [2, 0] },
  { id: 'tteok', name: '매운 떡볶이', price: '13,000원', eff: '멀리건 1장·OK권 1장 + 처음 먹으면 매워서 정신이 번쩍! 파워바가 천천히 움직여요.', chip: '떡볶이: 파워바 느리게', tix: [1, 1] },
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
  return Math.hypot(x - SHADE.x, z - SHADE.z) < 9 + pad || Math.hypot(x - RR.x, z - RR.z) < 7 + pad;
}
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ================= 지형 높이 (언덕, 벙커 웅덩이, 연못) =================
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function baseH(x, z) { return 1.1 * Math.sin(x * .045 + 1) * Math.cos(z * .038) + .6 * Math.sin(x * .09 + z * .07) + .35 * Math.cos(z * .11 - x * .05) + .22 * Math.sin(x * .21) * Math.sin(z * .17); }
const EDGE_H = 5;
const TEE_LV = HOLES.map(h => baseH(h.tee[0], h.tee[1]) * .55 + .35);
const GREEN_LV = HOLES.map(h => baseH(h.cup[0], h.cup[1]) * .55);
const GREEN_TILT = HOLES.map((h, i) => { const a = i * 2.1 + .7, m = .028 + (i % 2) * .012; return [Math.cos(a) * m, Math.sin(a) * m]; });
const POND_LV = HOLES.map(h => h.water.map(w => baseH(w[0], w[1]) * .55 - .35));
const SHADE_LV = baseH(SHADE.x, SHADE.z) * .55;
function heightAt(x, z) {
  let y = baseH(x, z);
  // 페어웨이는 부드럽게 출렁이도록 기복을 줄여요
  let fw = 0;
  for (const h of HOLES) for (let i = 0; i < h.fair.length - 1; i++) { const d = segD(x, z, h.fair[i], h.fair[i + 1]); if (d < h.fw / 2 + 9) fw = Math.max(fw, 1 - smooth(h.fw / 2, h.fw / 2 + 9, d)); }
  y *= 1 - .45 * fw;
  // 코스 가장자리는 둔덕
  const e = Math.max(Math.abs(x), Math.abs(z)), ek = smooth(98, 119, e); y = y * (1 - ek) + EDGE_H * ek;
  HOLES.forEach((h, i) => {
    let d = Math.hypot(x - h.tee[0], z - h.tee[1]);
    if (d < 9) { const k = 1 - smooth(5, 9, d); y = y * (1 - k) + TEE_LV[i] * k; }
    d = Math.hypot(x - h.cup[0], z - h.cup[1]);
    if (d < h.green + 6) {
      const gy = GREEN_LV[i] + GREEN_TILT[i][0] * (x - h.cup[0]) + GREEN_TILT[i][1] * (z - h.cup[1]) + .18 * Math.cos(Math.min(1, d / h.green) * Math.PI * .5);
      const k = 1 - smooth(h.green, h.green + 6, d); y = y * (1 - k) + gy * k;
    }
    h.water.forEach((w, j) => {
      const d2 = Math.hypot(x - w[0], z - w[1]), L = POND_LV[i][j];
      if (d2 < w[2] + 5) { const k = 1 - smooth(w[2], w[2] + 5, d2); y = y * (1 - k) + L * k; }
      if (d2 < w[2]) y = L - .1 - 1.3 * (1 - (d2 / w[2]) ** 2);
    });
    for (const sd of h.sand) {
      const d3 = Math.hypot(x - sd[0], z - sd[1]), r = sd[2];
      if (d3 < r) y += -1.1 * (1 - (d3 / r) ** 2) + .38 * smooth(r * .7, r, d3);
      else if (d3 < r + 1.3) y += .38 * (1 - smooth(r, r + 1.3, d3));
    }
  });
  const ds = Math.hypot(x - SHADE.x, z - SHADE.z);
  if (ds < 14) { const k = 1 - smooth(9, 14, ds); y = y * (1 - k) + SHADE_LV * k; }
  const dr = Math.hypot(x - RR.x, z - RR.z);
  if (dr < 9) { const k = 1 - smooth(6, 9, dr); y = y * (1 - k) + SHADE_LV * k; }
  return y;
}
function slopeAt(x, z) { const e = .35; return [(heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e)]; }
function waterY(i, j) { return POND_LV[i][j] - .05; }

// 나무 위치 (고정 시드)
const TREES = [];
(() => {
  const R = rng(20261103);
  for (let k = 0; k < 2000 && TREES.length < 95; k++) {
    const x = (R() * 2 - 1) * (MAP - 4), z = (R() * 2 - 1) * (MAP - 4);
    if (nearCourse(x, z, 4.5)) continue;
    if (TREES.some(t => Math.hypot(t.x - x, t.z - z) < 5)) continue;
    const s = .8 + R() * .7, kind = R() < .45 ? 'pine' : R() < .75 ? 'maple' : 'oak';
    TREES.push({ x, z, y: heightAt(x, z), s, kind, tr: .35 * s, ch: (kind === 'pine' ? 3.4 : 3.6) * s, cr: (kind === 'pine' ? 1.6 : 2) * s, c: R() });
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

// ================= 카트 도로 (경로 찾기) =================
const NODES = [], NADJ = [];
(() => {
  const idx = new Map(), id = p => { const k = p[0] + ',' + p[1]; if (!idx.has(k)) { idx.set(k, NODES.length); NODES.push(p); NADJ.push([]); } return idx.get(k); };
  for (const path of PATHS) for (let i = 1; i < path.length; i++) { const a = id(path[i - 1]), b = id(path[i]), d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); NADJ[a].push([b, d]); NADJ[b].push([a, d]); }
})();
function legClear(a, b) { for (const h of HOLES) for (const w of h.water) if (segD(w[0], w[1], a, b) < w[2] + 1.8) return false; return true; }
function planRoute(sx, sz, tx, tz) {
  const s = [sx, sz], t = [tx, tz], OFF = 2.5; // 도로 밖 구간은 비싸게 쳐서 되도록 도로로 다녀요
  if (legClear(s, t) && Math.hypot(tx - sx, tz - sz) < 28) return [t];
  const dist = NODES.map(() => Infinity), prev = NODES.map(() => -1), done = NODES.map(() => false);
  NODES.forEach((n, i) => { if (legClear(s, n)) dist[i] = Math.hypot(n[0] - sx, n[1] - sz) * OFF; });
  for (;;) {
    let u = -1; for (let i = 0; i < NODES.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break; done[u] = true;
    for (const [v, d] of NADJ[u]) if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; }
  }
  let best = -1, bd = legClear(s, t) ? Math.hypot(tx - sx, tz - sz) * OFF : Infinity;
  NODES.forEach((n, i) => { if (dist[i] < Infinity && legClear(n, t)) { const d = dist[i] + Math.hypot(n[0] - tx, n[1] - tz) * OFF; if (d < bd) { bd = d; best = i; } } });
  if (best < 0) return [t];
  const route = []; for (let u = best; u >= 0; u = prev[u]) route.unshift(NODES[u]);
  if (route.length && Math.hypot(route[0][0] - sx, route[0][1] - sz) < 3) route.shift();
  route.push(t); return route;
}

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
      NET.id = m.id; NET.color = m.color; setNick(m.nick);
      { const saved = savedNick(); if (saved && saved !== m.nick) sendNet({ t: 'nick', name: saved }); }
      setLive(m);
      if (NET.wantCh && !$('app').hidden) sendNet({ t: 'join', ch: NET.wantCh });
      break;
    case 'lobby': setLive(m); break;
    case 'hof': NET.hof = m; renderHof(); break;
    case 'hofnew': if (m.id !== NET.id) feed(`${m.e.nick} 님이 ${m.e.h + 1}번 홀 홀인원! 명예의 전당 등극`); else toast('명예의 전당에 이름이 올라갔어요!', 2400); break;
    case 'nick': setNick(m.nick); saveNick(m.nick); nickDone(); break;
    case 'nickerr': nickError(m.msg); break;
    case 'rename': { const o = NET.others.get(m.id); if (!o) return; feed(`${o.nick} 님이 이름표를 ${m.nick}(으)로 바꿨어요`); o.nick = m.nick; if (o.tag) o.tag.querySelector('.nm').textContent = m.nick; break; }
    case 'total': NET.total = m.total; updChannelBadge(); break;
    case 'full': feed('지금은 모든 채널이 꽉 찼어요. 혼자 라운딩으로 시작할게요.'); if (pendingJoin) { clearTimeout(pendingJoin); pendingJoin = 0; enterGame(); } break;
    case 'joined':
      NET.ch = m.ch; NET.cap = m.cap; NET.wantCh = 0; clearOthers();
      try { if (location.hash !== '#ch' + m.ch) history.replaceState(null, '', '#ch' + m.ch); } catch {}
      for (const p of m.players) addOther(p);
      if (myLook) sendNet({ t: 'look', lk: myLook });
      if (pendingJoin) { clearTimeout(pendingJoin); pendingJoin = 0; enterGame(); } else feed(`${m.ch}채널에 다시 들어왔어요`);
      updChannelBadge(); break;
    case 'enter': addOther(m.p); feed(`${m.p.nick} 님이 티업했어요`); updChannelBadge(); break;
    case 'leave': removeOther(m.id); updChannelBadge(); break;
    case 'pos': {
      const o = NET.others.get(m.id); if (!o) return;
      const x = m.x / 10, z = m.z / 10;
      if (!o.seen || Math.hypot(o.x - x, o.z - z) > 30) { o.x = x; o.z = z; }
      o.tx = x; o.tz = z; o.tyaw = m.r / 10; o.a = m.a; o.h = m.h; o.bx = m.bx / 10; o.bz = m.bz / 10; o.bv = m.bv; o.st = m.st || 0; o.sc = m.sc || 0; o.dn = m.dn || 0; o.seen = true;
      break;
    }
    case 'emo': { const o = NET.others.get(m.id); if (!o) return; showBubble(o, EMOTES[m.e]); o.jump = 1; break; }
    case 'look': { const o = NET.others.get(m.id); if (!o || !Array.isArray(m.lk) || !HATS[m.lk[0]] || !TOPS[m.lk[1]]) return; o.lk = normLook(m.lk); if (o.av) { applyLook(o.av, o.lk, o.color); o.jump = 1; } break; }
    case 'res': {
      const name = m.one ? '홀인원' : ({ '-1': '버디', '-2': '이글', '-3': '알바트로스', '-4': '콘도르' })[m.d] || '파';
      feed(`${m.nick} 님 ${m.h + 1}번 홀 ${name}! 축하해 주세요`);
      { const o = NET.others.get(m.id); if (o && built) { const y = heightAt(o.x, o.z) + 9, n = m.one ? 5 : m.d <= -2 ? 3 : 1; for (let i = 0; i < n; i++) rocket(o.x, y, o.z, i * 450); showBubble(o, `${name}!`); o.jump = 1; } }
      break;
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
$('teeUp').onclick = () => joinChannel(invitedCh());
function exitToEntry() {
  sendNet({ t: 'leave' }); NET.ch = 0; NET.wantCh = 0; clearOthers();
  $('app').hidden = true; $('lobby').hidden = false; running = false; setMaster(false);
}
$('toLobby').onclick = () => openGameMenu();
// ---- 닉네임 ----
const NICK_RE = /^[가-힣a-zA-Z0-9 _]+$/;
const NICK_BANNED = ['씨발', '시발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '지랄', '꺼져', '섹스', '자지', '보지', '니미', '애미', '애비', '느금', 'fuck', 'shit', 'sex', 'bitch', '관리자', '운영자', '운영진', 'admin', '캐디봇'];
function checkNick(raw) {
  const n = String(raw || '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < 2 || n.length > 10) return { err: '이름은 2~10자로 정해 주세요.' };
  if (!NICK_RE.test(n)) return { err: '한글, 영문, 숫자만 쓸 수 있어요.' };
  if (NICK_BANNED.some(w => n.replace(/[\s_]/g, '').toLowerCase().includes(w))) return { err: '쓸 수 없는 단어가 들어 있어요.' };
  return { nick: n };
}
function savedNick() { try { return localStorage.getItem('carrot-cc-nick') || ''; } catch { return ''; } }
function saveNick(n) { try { localStorage.setItem('carrot-cc-nick', n); } catch {} }
function setNick(n) {
  NET.nick = n; $('lobbyNick').textContent = n; $('nick').textContent = n;
  if (me.tag) me.tag.querySelector('.nm').textContent = n;
}
let nickErrEl = null, nickPending = 0;
function submitNick(raw, errEl) {
  nickErrEl = errEl; errEl.textContent = '';
  const r = checkNick(raw); if (r.err) { errEl.textContent = r.err; return; }
  if (NET.open) { sendNet({ t: 'nick', name: r.nick }); clearTimeout(nickPending); nickPending = setTimeout(() => { setNick(r.nick); saveNick(r.nick); nickDone(); }, 2500); }
  else { setNick(r.nick); saveNick(r.nick); nickDone(); }
}
function nickDone() { clearTimeout(nickPending); $('nickForm').hidden = true; $('nickEdit').hidden = false; if (!$('overlay').hidden && $('nickCard')) closeOverlay(); toastIfGame(`이름표를 ${NET.nick}(으)로 바꿨어요`); }
function nickError(msg) { clearTimeout(nickPending); if (nickErrEl) nickErrEl.textContent = msg; }
function toastIfGame(t) { if (!$('app').hidden) toast(t); }
$('nickEdit').onclick = () => { $('nickForm').hidden = false; $('nickEdit').hidden = true; const i = $('nickInput'); i.value = NET.nick || ''; i.focus(); i.select(); };
$('nickForm').onsubmit = e => { e.preventDefault(); submitNick($('nickInput').value, $('nickErr')); };
$('nickRandom').onclick = () => { $('nickInput').value = localNick(); $('nickInput').focus(); };
$('nick').onclick = () => {
  overlay(`<div id="nickCard"><span class="eyebrow">이름표 바꾸기</span></div><h2>뭐라고 불러드릴까요?</h2>
    <form id="nickForm2" class="nickform"><label for="nickInput2" class="sr">닉네임</label><input id="nickInput2" maxlength="10" placeholder="2~10자, 한글·영문·숫자" autocomplete="off" spellcheck="false" value="${esc(NET.nick)}">
    <button class="btn" type="submit">저장</button><button class="ghost" type="button" id="nickRandom2">랜덤</button><p class="nickerr" id="nickErr2" role="alert"></p></form>
    <button class="btn sub" id="nickCancel" type="button">그대로 둘게요</button>`);
  const i = $('nickInput2'); i.focus(); i.select();
  $('nickForm2').onsubmit = e => { e.preventDefault(); submitNick(i.value, $('nickErr2')); };
  $('nickRandom2').onclick = () => { i.value = localNick(); i.focus(); };
  $('nickCancel').onclick = closeOverlay;
};
function localNick() { const a = ['아삭한', '느긋한', '조용한', '주황빛', '포근한', '산뜻한', '은은한', '나른한'], b = ['당근', '버디', '퍼터', '캐디', '이글', '티샷', '그린', '웨지']; return a[Math.random() * a.length | 0] + ' ' + b[Math.random() * b.length | 0]; }
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
  const g = new T.Group(), cheeks = [];
  const orange = mat(0xf08a2f, { emissive: 0x8a3a00 }), dark = mat(0x2a1a10), leaf = mat(0x3f9a4e, { emissive: 0x123a12 }), white = mat(0xffffff), vis = mat(new T.Color(visor), { emissive: new T.Color(visor).multiplyScalar(.25) });
  const body = new T.Mesh(new T.ConeGeometry(.6, 1.7, 16), orange); body.rotation.x = Math.PI; body.position.y = 1.05; body.castShadow = true; g.add(body);
  const top = new T.Mesh(new T.SphereGeometry(.6, 16, 8, 0, TAU, 0, Math.PI / 2), orange); top.position.y = 1.9; top.scale.y = .4; top.castShadow = true; g.add(top);
  const ridge = mat(0xc95f14);
  for (const [y, a] of [[1.25, .9], [.9, -1.1], [.6, 2.4]]) { const r = .6 * (y - .2) / 1.7; const m = new T.Mesh(new T.BoxGeometry(.18, .035, .04), ridge); m.position.set(Math.sin(a) * r, y, Math.cos(a) * r); m.rotation.y = a; g.add(m); }
  for (const [rz, rx] of [[0, 0], [.55, .2], [-.55, .2], [0, -.5]]) { const l = new T.Mesh(new T.ConeGeometry(.12, .8, 6), leaf); l.position.set(Math.sin(rz) * .15, 2.35, Math.sin(rx) * .15); l.rotation.set(rx, 0, -rz); l.castShadow = true; g.add(l); }
  for (const s of [-1, 1]) {
    const e = new T.Mesh(new T.SphereGeometry(.075, 10, 8), dark); e.position.set(s * .19, 1.62, .47); g.add(e);
    const hl = new T.Mesh(new T.SphereGeometry(.025, 6, 6), white); hl.position.set(s * .19 + .025, 1.65, .54); g.add(hl);
    const ck = new T.Mesh(new T.SphereGeometry(.09, 8, 6), mat(0xff8a8a)); ck.scale.set(1, .55, .4); ck.position.set(s * .32, 1.48, .4); g.add(ck); cheeks.push(ck);
  }
  const mouth = new T.Mesh(new T.TorusGeometry(.07, .018, 6, 12, Math.PI), dark); mouth.position.set(0, 1.5, .46); mouth.rotation.z = Math.PI; g.add(mouth);
  const band = new T.Mesh(new T.CylinderGeometry(.6, .6, .13, 18, 1, true), vis); band.position.y = 1.82; band.material.side = T.DoubleSide; g.add(band);
  const brim = new T.Mesh(new T.BoxGeometry(.62, .04, .38), vis); brim.position.set(0, 1.78, .66); brim.rotation.x = .12; g.add(brim);
  const arm = new T.Mesh(new T.SphereGeometry(.11, 8, 6), orange); arm.position.set(.5, 1.2, .15); g.add(arm);
  const club = new T.Group(); club.position.set(.52, 1.2, .2); g.add(club);
  const shaft = new T.Mesh(new T.CylinderGeometry(.025, .025, 1.25, 6), mat(0x8a918a)); shaft.position.y = -.62; club.add(shaft);
  const head = new T.Mesh(new T.BoxGeometry(.12, .1, .26), mat(0x5d635d)); head.position.set(0, -1.25, .08); club.add(head);
  club.rotation.set(.15, 0, .2);
  g.userData = { club, body: [body, top], cheeks, vis, outfit: null };
  return g;
}
// ---- 락커: 모자 색과 옷 ----
const HATS = [['흰색', '#ffffff'], ['당근', '#ff8a2a'], ['빨강', '#e0453a'], ['핑크', '#ff8fb8'], ['하늘', '#5ab4f0'], ['초록', '#3f9a4e'], ['노랑', '#ffd23f'], ['검정', '#2b2b2b']]; // 서버 LOOK_HATS와 개수 맞추기
const TOPS = ['기본', '폴로 셔츠', '니트 조끼', '턱시도', '하와이안']; // 서버 LOOK_TOPS와 개수 맞추기
const ACCS = ['없음', '선글라스', '리본', '헤드폰', '꽃 장식']; // 서버 LOOK_ACCS와 개수 맞추기
// 예전에 저장한 [모자, 옷] 두 칸짜리도 그대로 읽어요
const normLook = v => { const a = Array.isArray(v) ? v : []; const h = a[0] | 0, t = a[1] | 0, c = a[2] | 0; return [HATS[h] ? h : 0, TOPS[t] ? t : 0, ACCS[c] ? c : 0]; };
let myLook = (() => { try { const v = JSON.parse(localStorage.getItem('carrotLook')); if (Array.isArray(v) && v[0] >= 0 && v[0] < HATS.length && v[1] >= 0 && v[1] < TOPS.length) return normLook(v); } catch {} return null; })();
function saveLook() { try { localStorage.setItem('carrotLook', JSON.stringify(myLook)); } catch {} sendNet({ t: 'look', lk: myLook }); }
const TOP_TEX = {};
function topTexture(i) {
  if (TOP_TEX[i]) return TOP_TEX[i];
  // 원기둥 텍스처의 가운데(w/2)가 몸 앞쪽에 오도록 offset을 줘요
  const tx = textTexture(512, 128, (c, w, h) => {
    if (i === 1) { c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, w, h); c.fillStyle = '#2b4e8c'; c.fillRect(0, h - 22, w, 10); c.fillStyle = '#e9711f'; c.fillRect(0, h - 10, w, 6); c.fillStyle = '#d8d8d0'; c.fillRect(w / 2 - 5, 0, 10, 52); c.fillStyle = '#9a9a92'; for (const y of [14, 32]) { c.beginPath(); c.arc(w / 2, y, 4, 0, TAU); c.fill(); } }
    if (i === 2) { c.fillStyle = '#f1e6cc'; c.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { const x = k * 64; c.fillStyle = k % 2 ? '#c8463a' : '#2e5e36'; c.beginPath(); c.moveTo(x, h / 2 - 50); c.lineTo(x + 32, h / 2); c.lineTo(x, h / 2 + 50); c.lineTo(x - 32, h / 2); c.fill(); } c.strokeStyle = '#d9b45a'; c.lineWidth = 3; for (let k = -2; k < 20; k++) { c.beginPath(); c.moveTo(k * 32, 0); c.lineTo(k * 32 + h, h); c.moveTo(k * 32 + h, 0); c.lineTo(k * 32, h); c.stroke(); } c.fillStyle = '#2e5e36'; c.fillRect(0, h - 12, w, 12); }
    if (i === 3) { c.fillStyle = '#1d1d22'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(w / 2 - 46, 0); c.lineTo(w / 2 + 46, 0); c.lineTo(w / 2, h); c.fill(); c.fillStyle = '#1d1d22'; for (const y of [44, 72, 98]) { c.beginPath(); c.arc(w / 2, y, 4, 0, TAU); c.fill(); } }
    if (i === 4) { c.fillStyle = '#2aa3c9'; c.fillRect(0, 0, w, h); const R = rng(4); for (let k = 0; k < 22; k++) { const x = R() * w, y = R() * h, r = 9 + R() * 8; c.fillStyle = ['#ffd23f', '#ff6f91', '#ffffff'][k % 3]; for (let a = 0; a < 5; a++) { c.beginPath(); c.arc(x + Math.cos(a * 1.26) * r * .7, y + Math.sin(a * 1.26) * r * .7, r * .5, 0, TAU); c.fill(); } c.fillStyle = '#e9711f'; c.beginPath(); c.arc(x, y, r * .3, 0, TAU); c.fill(); } c.fillStyle = '#1b6f8a'; c.fillRect(w / 2 - 2, 0, 4, h); }
  });
  tx.wrapS = T.RepeatWrapping; tx.offset.x = .5; TOP_TEX[i] = tx; return tx;
}
function applyLook(av, lk, fallback) {
  const ud = av.userData; if (!ud) return;
  const col = new T.Color(lk ? HATS[lk[0]][1] : fallback || '#ffffff');
  if (ud.vis) { ud.vis.color.copy(col); ud.vis.emissive.copy(col).multiplyScalar(.25); }
  if (ud.outfit) { av.remove(ud.outfit); ud.outfit = null; }
  const top = lk ? lk[1] | 0 : 0, acc = lk ? lk[2] | 0 : 0; if (!top && !acc) return;
  const o = new T.Group(), r = y => .6 * (y - .2) / 1.7 + .03;
  av.add(o); ud.outfit = o; addAcc(o, acc); if (!top) return;
  const shirt = new T.Mesh(new T.CylinderGeometry(r(1.4), r(.9), .5, 24, 1, true), new T.MeshLambertMaterial({ map: topTexture(top), side: T.DoubleSide }));
  shirt.position.y = 1.15; o.add(shirt);
  if (top === 1) for (const s of [-1, 1]) { const cl = new T.Mesh(new T.BoxGeometry(.2, .03, .14), mat(0xf7f7f2)); cl.position.set(s * .1, 1.41, .42); cl.rotation.set(-.5, s * .5, s * .35); o.add(cl); }
  if (top === 3) { const bm = mat(0xd2442c); const k = new T.Mesh(new T.BoxGeometry(.07, .07, .05), bm); k.position.set(0, 1.36, .45); o.add(k); for (const s of [-1, 1]) { const w = new T.Mesh(new T.ConeGeometry(.07, .12, 4), bm); w.rotation.z = s * Math.PI / 2; w.position.set(s * .08, 1.36, .44); o.add(w); } }
}
function addAcc(o, acc) {
  const put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const k = new T.Mesh(geo, m); k.position.set(x, y, z); k.rotation.set(rx, ry, rz); o.add(k); return k; };
  if (acc === 1) { const dk = new T.MeshPhongMaterial({ color: 0x1a1a1f, shininess: 90 }); for (const s of [-1, 1]) put(new T.BoxGeometry(.24, .14, .04), dk, s * .19, 1.63, .54, 0, s * .25); put(new T.BoxGeometry(.14, .03, .03), dk, 0, 1.66, .56); }
  if (acc === 2) { const pk = mat(0xff6f91); for (const s of [-1, 1]) put(new T.ConeGeometry(.12, .24, 4), pk, s * .16, 2.12, .1, 0, 0, s * Math.PI / 2); put(new T.SphereGeometry(.07, 8, 6), pk, 0, 2.12, .1); }
  if (acc === 3) { const hp = mat(0x2b2b2b), pad = mat(0xff8a2a); put(new T.TorusGeometry(.63, .045, 6, 20, Math.PI), hp, 0, 1.62, 0); for (const s of [-1, 1]) put(new T.CylinderGeometry(.15, .15, .12, 14), pad, s * .55, 1.6, 0, 0, 0, Math.PI / 2); }
  if (acc === 4) { const pet = mat(0xffffff), mid = mat(0xffd23f); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; put(new T.SphereGeometry(.07, 6, 5), pet, .42 + Math.cos(a) * .08, 1.98 + Math.sin(a) * .08, .38); } put(new T.SphereGeometry(.05, 6, 5), mid, .42, 1.98, .42); }
}

function makeCaddie() {
  const g = new T.Group(); const fur = mat(0xf4f1ea, { emissive: 0x3a3a36 }), vest = mat(0x2e7a3f, { emissive: 0x0c2a12 }), pink = mat(0xf2b5b5), dark = mat(0x222222), orange = mat(0xe9711f, { emissive: 0x5a2400 });
  const body = new T.Mesh(new T.SphereGeometry(.38, 12, 10), fur); body.scale.set(1, 1.2, .9); body.position.y = .62; body.castShadow = true; g.add(body);
  const v = new T.Mesh(new T.CylinderGeometry(.4, .43, .5, 14, 1, true), vest); v.material.side = T.DoubleSide; v.position.y = .62; g.add(v);
  const head = new T.Mesh(new T.SphereGeometry(.3, 12, 10), fur); head.position.y = 1.25; head.castShadow = true; g.add(head);
  for (const s of [-1, 1]) {
    const ear = new T.Mesh(new T.BoxGeometry(.11, .55, .06), fur); ear.position.set(s * .12, 1.72, -.02); ear.rotation.z = s * -.1; g.add(ear);
    const inner = new T.Mesh(new T.PlaneGeometry(.06, .4), pink); inner.position.set(s * .12, 1.72, .015); inner.rotation.z = s * -.1; g.add(inner);
    const eye = new T.Mesh(new T.SphereGeometry(.04, 8, 6), dark); eye.position.set(s * .11, 1.3, .26); g.add(eye);
    const arm = new T.Mesh(new T.SphereGeometry(.09, 8, 6), fur); arm.position.set(s * .2, .95, .38); g.add(arm);
  }
  const nose = new T.Mesh(new T.SphereGeometry(.04, 6, 6), pink); nose.position.set(0, 1.22, .3); g.add(nose);
  const band = new T.Mesh(new T.CylinderGeometry(.31, .31, .08, 16, 1, true), orange); band.material.side = T.DoubleSide; band.position.y = 1.4; g.add(band);
  const brim = new T.Mesh(new T.BoxGeometry(.34, .03, .22), orange); brim.position.set(0, 1.38, .36); g.add(brim);
  g.scale.setScalar(.95); return g;
}
function makeCart(withCaddie) {
  const g = new T.Group(); g.rotation.order = 'YXZ';
  const cream = mat(0xf3efe4), orange = mat(0xe9711f, { emissive: 0x5a2400 }), dark = mat(0x2b2b2b), seat = mat(0x7a5233), roof = mat(0xfbf8f0), green = mat(0x2e7a3f);
  const add = (geo, m, x, y, z, sh = true) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sh; g.add(o); return o; };
  add(new T.BoxGeometry(1.7, .3, 2.8), cream, 0, .52, 0);
  add(new T.BoxGeometry(1.7, .55, .95), orange, 0, .9, 1.0);
  add(new T.BoxGeometry(1.6, .5, .1), cream, 0, 1.12, .52);
  add(new T.BoxGeometry(1.5, .22, .8), seat, 0, .8, -.32);
  add(new T.BoxGeometry(1.5, .7, .14), seat, 0, 1.16, -.78);
  const bag = add(new T.CylinderGeometry(.22, .22, 1.1, 10), green, 0, 1.15, -1.22); bag.rotation.x = -.25;
  for (const [x, z] of [[.78, .98], [-.78, .98], [.78, -1.28], [-.78, -1.28]]) add(new T.CylinderGeometry(.04, .04, 2.2, 6), dark, x, 1.75, z, false);
  add(new T.BoxGeometry(1.95, .1, 2.95), roof, 0, 2.86, -.15);
  add(new T.BoxGeometry(1.97, .12, .12), orange, 0, 2.82, 1.32, false);
  for (const [x, z] of [[.86, .95], [-.86, .95], [.86, -.95], [-.86, -.95]]) { const w = add(new T.CylinderGeometry(.33, .33, .26, 14), dark, x, .33, z); w.rotation.z = Math.PI / 2; }
  const wheel = add(new T.TorusGeometry(.2, .035, 6, 16), dark, .38, 1.38, .42, false); wheel.rotation.x = -1.0;
  const logo = new T.Mesh(new T.PlaneGeometry(1.2, .32), new T.MeshLambertMaterial({ map: textTexture(256, 70, (c, w, h) => { c.fillStyle = '#e9711f'; c.fillRect(0, 0, w, h); c.fillStyle = '#fffaf3'; c.font = `400 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('당근 CC', w / 2, h / 2 + 3); }) }));
  logo.position.set(0, .92, 1.48); g.add(logo);
  const orn = makeMiniCarrot(1.1); orn.position.set(0, 2.92, .9); g.add(orn);
  if (withCaddie) { const cd = makeCaddie(); cd.position.set(.38, .6, -.3); g.add(cd); }
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
let aimTipPos = null;
const GUIDE_N = 220; let guideDots, ballBeacon, ballTag, guideKey = '';
// 공에서 그린까지 남은 공략 경로를 땅 위에 노란 점으로 찍어요
function updateGuideDots() {
  const h = hole(), dc = distToCup(), key = `${S.hole},${S.ball.x.toFixed(1)},${S.ball.z.toFixed(1)}`;
  if (key === guideKey) return; guideKey = key;
  const pts = [[S.ball.x, S.ball.z]];
  for (const w of h.fair.slice(1, -1)) if (Math.hypot(w[0] - h.cup[0], w[1] - h.cup[1]) < dc - 6) pts.push(w);
  pts.push(h.cup);
  const a = guideDots.geometry.attributes.position.array; let n = 0, carry = 1.8;
  for (let i = 1; i < pts.length && n < GUIDE_N; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], L = Math.hypot(x1 - x0, z1 - z0);
    for (let d = carry; d < L && n < GUIDE_N; d += 2.4) { const x = x0 + (x1 - x0) * d / L, z = z0 + (z1 - z0) * d / L; a[n * 3] = x; a[n * 3 + 1] = heightAt(x, z) + .15; a[n * 3 + 2] = z; n++; carry = d + 2.4 - L; }
  }
  guideDots.geometry.attributes.position.needsUpdate = true; guideDots.geometry.setDrawRange(0, n);
}
const TRAIL_N = 160; let trail, trailN = 0, trailFade = 0;
function trailReset() { trailN = 0; trailFade = 1; if (trail) { trail.geometry.setDrawRange(0, 0); trail.material.opacity = .75; trail.visible = true; } }
function trailPush(x, y, z) {
  if (!trail || trailN >= TRAIL_N) return; const a = trail.geometry.attributes.position.array;
  a[trailN * 3] = x; a[trailN * 3 + 1] = y; a[trailN * 3 + 2] = z; trailN++;
  trail.geometry.attributes.position.needsUpdate = true; trail.geometry.setDrawRange(0, trailN);
}
let ballMesh, aimArrow, landRing, pathLine, moveRing, ribbon, caddieTag, cupMeshes = [];
const RIB_N = 180;
function setRibbon(x0, z0, x1, z1, w) {
  const L = Math.hypot(x1 - x0, z1 - z0) || .01, n = Math.max(2, Math.min(RIB_N, Math.ceil(L / .7) + 1));
  const dx = (x1 - x0) / L, dz = (z1 - z0) / L, px = -dz * w / 2, pz = dx * w / 2, a = ribbon.geometry.attributes.position.array;
  for (let i = 0; i < RIB_N; i++) { const t = Math.min(i, n - 1) / (n - 1), x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = heightAt(x, z) + .1; a[i * 6] = x + px; a[i * 6 + 1] = y; a[i * 6 + 2] = z + pz; a[i * 6 + 3] = x - px; a[i * 6 + 4] = y; a[i * 6 + 5] = z - pz; }
  ribbon.geometry.attributes.position.needsUpdate = true;
}
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
  skyMesh = new T.Mesh(skyGeo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false })); scene.add(skyMesh);

  // 빛
  scene.add(new T.HemisphereLight(0xe8f4ff, 0x56743d, .55));
  sun = new T.DirectionalLight(0xfff1d6, .75);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260; sun.shadow.bias = -.0006;
  scene.add(sun); scene.add(sun.target);

  // 땅
  paintGround();
  const gt = new T.CanvasTexture(groundCanvas); gt.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const gg = new T.PlaneGeometry(MAP * 2, MAP * 2, 240, 240), gp = gg.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setZ(i, heightAt(gp.getX(i), -gp.getY(i)));
  gg.computeVertexNormals();
  ground = new T.Mesh(gg, new T.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const os = new T.Shape(); os.moveTo(-700, -700); os.lineTo(700, -700); os.lineTo(700, 700); os.lineTo(-700, 700); os.lineTo(-700, -700);
  const hole_ = new T.Path(); const q = MAP - .5; hole_.moveTo(-q, -q); hole_.lineTo(-q, q); hole_.lineTo(q, q); hole_.lineTo(q, -q); hole_.lineTo(-q, -q); os.holes.push(hole_);
  const outer = new T.Mesh(new T.ShapeGeometry(os), mat(0x4f8a43)); outer.rotation.x = -Math.PI / 2; outer.position.y = EDGE_H - .05; scene.add(outer);

  // 먼 산
  const R = rng(9);
  for (let i = 0; i < 22; i++) {
    const a = i / 22 * TAU + R() * .2, d = 260 + R() * 90, h = 50 + R() * 90;
    const m = new T.Mesh(new T.ConeGeometry(55 + R() * 50, h, 6), new T.MeshPhongMaterial({ color: new T.Color().setHSL(.32 + R() * .06, .25, .32 + R() * .1), flatShading: true, shininess: 0 }));
    m.position.set(Math.cos(a) * d, h / 2 + EDGE_H - 4, Math.sin(a) * d); m.rotation.y = R() * TAU; scene.add(m);
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
    const s = new T.Mesh(stakeGeo, stakeMat); s.position.set(x, heightAt(x, z) + .55, z); s.castShadow = true; scene.add(s);
  }

  // 나무
  const trunkMat = mat(0x6b4a2e), trunkGeo = new T.CylinderGeometry(.25, .38, 2.4, 6);
  const pineGeo = new T.ConeGeometry(1.7, 4.2, 7), roundGeo = new T.IcosahedronGeometry(2, 0);
  const pineMats = [0x2f5f34, 0x386b38, 0x2a5530].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  const mapleMats = [0xd9481f, 0xe8792b, 0xf2b33d, 0xb8352a, 0xe35d2a].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  const oakMats = [0x4f8a3a, 0x6f9a3a, 0xa8a23a].map(c => new T.MeshPhongMaterial({ color: c, flatShading: true, shininess: 4 }));
  for (const t of TREES) {
    const g = new T.Group(); g.position.set(t.x, t.y - .1, t.z); g.scale.setScalar(t.s); g.rotation.y = t.c * TAU;
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
    const a = R() * TAU, d = R() * 3.5, lx = t.x + Math.cos(a) * d, lz = t.z + Math.sin(a) * d; l.position.set(lx, heightAt(lx, lz) + .04, lz); scene.add(l);
  }
  // 당근 밭
  for (const p of PATCHES) { const c = makeMiniCarrot(1.2); c.position.set(p[0], heightAt(p[0], p[1]), p[1]); c.rotation.y = p[2]; scene.add(c); }

  // 연못 + 악어
  HOLES.forEach((h, hi) => h.water.forEach((w, wi) => {
    const wy = waterY(hi, wi);
    const wm = new T.Mesh(new T.CircleGeometry(w[2], 48), new T.MeshPhongMaterial({ color: 0x3a8cc0, shininess: 80, transparent: true, opacity: .78 }));
    wm.rotation.x = -Math.PI / 2; wm.position.set(w[0], wy, w[1]); scene.add(wm);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU + R() * .3; const r = new T.Mesh(new T.DodecahedronGeometry(.5 + R() * .5, 0), mat(0x8a8a80, { flatShading: true })); r.position.set(w[0] + Math.cos(a) * (w[2] + .3), wy + .1, w[1] + Math.sin(a) * (w[2] + .3)); r.scale.y = .5; scene.add(r); }
    for (let i = 0; i < 8; i++) { const a = R() * TAU; const reed = new T.Mesh(new T.ConeGeometry(.06, 1.4 + R(), 4), mat(0x6f8f3a)); reed.position.set(w[0] + Math.cos(a) * (w[2] - .4), wy + .5, w[1] + Math.sin(a) * (w[2] - .4)); scene.add(reed); }
    CROCS.push(makeCroc(w, wy)); if (h.ev === 'croc') { CROCS.push(makeCroc(w, wy)); CROCS.push(makeCroc(w, wy)); }
  }));

  // 홀: 깃발, 컵, 티 마커, 안내판
  HOLES.forEach((h, i) => {
    const cy = heightAt(h.cup[0], h.cup[1]);
    const cup = new T.Mesh(new T.CircleGeometry(.36, 20), mat(0x111111)); cup.rotation.x = -Math.PI / 2; cup.position.set(h.cup[0], cy + .05, h.cup[1]); scene.add(cup); cupMeshes.push(cup);
    const pole = new T.Mesh(new T.CylinderGeometry(.05, .05, 3.4, 6), mat(0xf4f1e8)); pole.position.set(h.cup[0], cy + 1.7, h.cup[1]); pole.castShadow = true; scene.add(pole);
    const ft = textTexture(128, 84, (g, w, hh) => { g.fillStyle = '#f08a2f'; g.fillRect(0, 0, w, hh); g.fillStyle = '#fff'; g.font = `700 60px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), w / 2, hh / 2 + 3); });
    const fg = new T.PlaneGeometry(1.4, .9, 10, 1); fg.translate(.7, 0, 0);
    const flag = new T.Mesh(fg, new T.MeshLambertMaterial({ map: ft, side: T.DoubleSide })); flag.position.set(h.cup[0], cy + 2.9, h.cup[1]); flag.castShadow = true; scene.add(flag);
    const base = Float32Array.from(fg.attributes.position.array);
    FLAGS.push({ flag, base });
    const top = makeMiniCarrot(.9); top.position.set(h.cup[0], cy + 3.35, h.cup[1]); scene.add(top);
    const nx = h.fair[1][0] - h.tee[0], nz = h.fair[1][1] - h.tee[1], nl = Math.hypot(nx, nz), dx = nx / nl, dz = nz / nl;
    for (const s of [-1, 1]) { const m = makeMiniCarrot(1.6), mx = h.tee[0] - dz * 2.8 * s, mz = h.tee[1] + dx * 2.8 * s; m.position.set(mx, heightAt(mx, mz), mz); scene.add(m); }
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
    const sx = h.tee[0] + dz * 5.5 - dx * 1.5, sz = h.tee[1] - dx * 5.5 - dz * 1.5; sign.position.set(sx, heightAt(sx, sz) - .05, sz); sign.rotation.y = Math.atan2(-dx, -dz); scene.add(sign);
  });

  // 벙커: 움푹 파인 모래 (지면보다 촘촘한 메쉬로 따로 깔아요)
  const sandTex = textTexture(256, 256, (c, w, h) => { c.fillStyle = '#ecdcaa'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { c.fillStyle = Math.random() < .5 ? 'rgba(170,140,80,.28)' : 'rgba(255,255,240,.35)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.strokeStyle = 'rgba(170,140,80,.25)'; c.lineWidth = 2; for (let y = 8; y < h; y += 14) { c.beginPath(); for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * .08) * 2); c.stroke(); } });
  sandTex.wrapS = sandTex.wrapT = T.RepeatWrapping;
  const sandMat = new T.MeshLambertMaterial({ map: sandTex }), lipMat = mat(0x6fae58);
  for (const h of HOLES) for (const sd of h.sand) {
    const geo = new T.RingGeometry(.01, sd[2], 56, 10), gpos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < gpos.count; i++) { const lx = gpos.getX(i), ly = gpos.getY(i); gpos.setZ(i, heightAt(sd[0] + lx, sd[1] - ly) + .04); uv.setXY(i, lx / 4, ly / 4); }
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, sandMat); m.rotation.x = -Math.PI / 2; m.position.set(sd[0], 0, sd[1]); m.receiveShadow = true; scene.add(m);
    const lg = new T.RingGeometry(sd[2], sd[2] + .45, 56, 2), lp = lg.attributes.position;
    for (let i = 0; i < lp.count; i++) lp.setZ(i, heightAt(sd[0] + lp.getX(i), sd[1] - lp.getY(i)) + .05);
    lg.computeVertexNormals();
    const lm = new T.Mesh(lg, lipMat); lm.rotation.x = -Math.PI / 2; lm.position.set(sd[0], 0, sd[1]); lm.receiveShadow = true; scene.add(lm);
  }
  buildShadeHouse(); buildRestroom(); buildDucks(); buildZones(); buildGallery();
  // 그늘집 옆에 세워둔 카트
  for (const [ox, oz, ry] of [[9.5, -2.5, .2], [10.5, 1.5, -.1]]) { const c = makeCart(false); c.position.set(SHADE.x + ox, SHADE_LV, SHADE.z + oz); c.rotation.y = ry; scene.add(c); }
  // 내가 타는 카트 (토끼 캐디가 운전)
  me.cart = makeCart(true); me.cart.visible = false; scene.add(me.cart);
  caddieTag = makeTag('토끼 캐디', false); caddieTag.classList.add('caddie'); caddieTag.style.display = 'none';

  // 내 공, 조준 표시
  ballMesh = new T.Mesh(new T.SphereGeometry(.2, 16, 12), new T.MeshPhongMaterial({ color: 0xffffff, shininess: 60 })); ballMesh.castShadow = true; scene.add(ballMesh);
  const ag = new T.PlaneGeometry(.35, 7); ag.translate(0, 3.5, 0);
  aimArrow = new T.Mesh(ag, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })); aimArrow.rotation.x = -Math.PI / 2; aimArrow.visible = false; scene.add(aimArrow);
  const rg = new T.BufferGeometry(); rg.setAttribute('position', new T.BufferAttribute(new Float32Array(RIB_N * 6), 3));
  const ri = []; for (let i = 0; i < RIB_N - 1; i++) { const a = i * 2; ri.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } rg.setIndex(ri);
  ribbon = new T.Mesh(rg, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .82, depthWrite: false, side: T.DoubleSide })); ribbon.frustumCulled = false; ribbon.visible = false; scene.add(ribbon);
  landRing = new T.Mesh(new T.RingGeometry(.9, 1.25, 32), new T.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: .85, depthWrite: false })); landRing.rotation.x = -Math.PI / 2; landRing.visible = false; scene.add(landRing);
  const tg = new T.BufferGeometry(); tg.setAttribute('position', new T.BufferAttribute(new Float32Array(TRAIL_N * 3), 3)); tg.setDrawRange(0, 0);
  trail = new T.Points(tg, new T.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, transparent: true, opacity: .75, depthWrite: false })); trail.frustumCulled = false; scene.add(trail);
  const gdg = new T.BufferGeometry(); gdg.setAttribute('position', new T.BufferAttribute(new Float32Array(GUIDE_N * 3), 3)); gdg.setDrawRange(0, 0);
  guideDots = new T.Points(gdg, new T.PointsMaterial({ color: 0xffd166, size: 7, sizeAttenuation: false, transparent: true, opacity: .85, depthWrite: false })); guideDots.frustumCulled = false; scene.add(guideDots);
  ballBeacon = new T.Mesh(new T.CylinderGeometry(.22, .22, 16, 10, 1, true), new T.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: .38, depthWrite: false, side: T.DoubleSide })); ballBeacon.visible = false; scene.add(ballBeacon);
  ballTag = makeTag('내 공', false); ballTag.classList.add('balltag'); ballTag.style.display = 'none';
  pathLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: 0xffb27a, dashSize: .6, gapSize: .4 })); pathLine.visible = false; pathLine.frustumCulled = false; scene.add(pathLine);
  moveRing = new T.Mesh(new T.RingGeometry(.4, .6, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); moveRing.rotation.x = -Math.PI / 2; scene.add(moveRing);

  // 나
  me.av = makeCarrot('#ffffff'); scene.add(me.av); applyLook(me.av, myLook, '#ffffff');
  me.tag = makeTag(NET.nick || '나', true);

  // 토끼
  for (let i = 0; i < 5; i++) RABBITS.push(makeRabbit(PATCHES[(i * 7) % PATCHES.length]));

  resize(); window.addEventListener('resize', resize);
  bindInput();
  return true;
}
function buildShadeHouse() {
  const g = new T.Group(); g.position.set(SHADE.x, SHADE_LV, SHADE.z);
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
  const menuT = textTexture(256, 340, (c, w, h) => { c.fillStyle = '#26332a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4e9cf'; c.font = `400 40px ${FONT}`; c.textAlign = 'center'; c.fillText('오늘의 메뉴', w / 2, 52); c.font = `400 25px ${FONT}`; c.textAlign = 'left'; MENU.forEach((m, i) => { c.fillStyle = '#f4e9cf'; c.fillText(m.name.replace('갓 짠 ', '').replace('그늘집 ', '').replace('매운 ', ''), 16, 104 + i * 48); c.fillStyle = '#ffd166'; c.textAlign = 'right'; c.fillText(m.price, w - 14, 104 + i * 48); c.textAlign = 'left'; }); });
  const menu = new T.Mesh(new T.PlaneGeometry(1.2, 1.6), new T.MeshLambertMaterial({ map: menuT })); menu.position.set(2.6, 1.3, 4.6); menu.rotation.x = -.15; g.add(menu);
  const easel = new T.Mesh(new T.BoxGeometry(1.3, .08, .08), dark); easel.position.set(2.6, .45, 4.65); g.add(easel);
  for (const x of [-3.6, 3.6]) { const lan = new T.Mesh(new T.SphereGeometry(.28, 12, 8), new T.MeshLambertMaterial({ color: 0xffa64d, emissive: 0xff7a1a, emissiveIntensity: .7 })); lan.position.set(x, 3.3, 3.5); g.add(lan); }
  // 그늘집 사장님 (앞치마 두른 토끼)
  ownerAv = makeCaddie(); ownerAv.position.set(2.3, .45, -1.7); ownerAv.rotation.y = Math.atan2(-3.4, 1.7); g.add(ownerAv);
  const apron = new T.Mesh(new T.PlaneGeometry(.5, .55), mat(0xfaf6ee, { side: T.DoubleSide })); apron.position.set(0, .55, .37); ownerAv.add(apron);
  scene.add(g);
  ownerTag = makeTag('그늘집 사장님', false); ownerTag.classList.add('owner');
}
function pictogram(kind) {
  return textTexture(200, 200, (c, w, h) => {
    c.fillStyle = kind === 'm' ? '#2f6fd6' : '#d6453d'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(70, 52, 20, 0, TAU); c.fill();
    if (kind === 'm') { c.fillRect(52, 78, 36, 52); c.fillRect(52, 128, 15, 46); c.fillRect(73, 128, 15, 46); }
    else { c.beginPath(); c.moveTo(70, 76); c.lineTo(98, 140); c.lineTo(42, 140); c.closePath(); c.fill(); c.fillRect(56, 138, 12, 36); c.fillRect(73, 138, 12, 36); }
    c.font = `400 72px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(kind === 'm' ? '남' : '여', 148, 112);
  });
}
function buildRestroom() {
  const g = new T.Group(); g.position.set(RR.x, SHADE_LV, RR.z);
  const wall = mat(0xf1ece0), trim = mat(0x6b4a2e), roofM = mat(0x46505a, { flatShading: true }), doorM = mat(0x8a5a35);
  const add = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  add(new T.BoxGeometry(4.5, 3, 7), wall, 0, 1.5, 0);
  add(new T.BoxGeometry(4.5, .25, 7), trim, 0, .12, 0);
  add(new T.BoxGeometry(5.2, .35, 7.8), roofM, 0, 3.15, 0);
  add(new T.BoxGeometry(1.3, 2.3, .15), wall, 2.85, 1.15, 0);          // 남녀 사이 가림벽
  for (const [k, z] of [['m', -1.5], ['w', 1.5]]) {
    add(new T.BoxGeometry(.12, 2.1, 1.1), doorM, 2.28, 1.05, z);
    const knob = add(new T.SphereGeometry(.06, 8, 6), mat(0xd9c27a), 2.36, 1.05, z + (k === 'm' ? .38 : -.38)); knob.castShadow = false;
    const sign = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshLambertMaterial({ map: pictogram(k) })); sign.rotation.y = Math.PI / 2; sign.position.set(2.27, 2.55, z); g.add(sign);
    const mat_ = new T.Mesh(new T.PlaneGeometry(.9, 1.2), mat(k === 'm' ? 0x2f6fd6 : 0xd6453d)); mat_.rotation.set(-Math.PI / 2, 0, 0); mat_.position.set(2.9, .02, z); g.add(mat_);
  }
  const top = new T.Mesh(new T.PlaneGeometry(2.6, .55), new T.MeshLambertMaterial({ map: textTexture(320, 70, (c, w, h) => { c.fillStyle = '#26332a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4e9cf'; c.font = `400 44px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('화장실 · WC', w / 2, h / 2 + 2); }) }));
  top.rotation.y = Math.PI / 2; top.position.set(2.62, 3.15, 0); g.add(top);
  // 세면대와 화분
  add(new T.BoxGeometry(.6, .9, .9), wall, 2.6, .45, -3.2);
  for (const z of [-3.2, 3.2]) { const pot = add(new T.CylinderGeometry(.3, .24, .5, 10), mat(0xb5653a), 2.8, .25, z === -3.2 ? 3.2 : 3.4); const leaf = add(new T.IcosahedronGeometry(.45, 0), mat(0x3f8a3f, { flatShading: true }), 2.8, .8, z === -3.2 ? 3.2 : 3.4); leaf.castShadow = true; pot.castShadow = true; }
  scene.add(g);
}
function makeCroc(w, wy) {
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
  g.position.set(w[0], wy - .1, w[1]); g.userData.jaw = jaw; scene.add(g);
  return { g, jaw, w, wy, a: Math.random() * TAU, tx: w[0], tz: w[1], x: w[0], z: w[1], yaw: 0, y: -.04, state: 'swim', wait: 0, chomp: 0 };
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
  g.position.set(r.x, heightAt(r.x, r.z), r.z); scene.add(g); return r;
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
  const o = { st: p.st || 0, sc: p.sc || 0, dn: p.dn || 0, id: p.id, nick: p.nick, color: p.color, x: (p.x || 0) / 10, z: (p.z || 0) / 10, tx: (p.x || 0) / 10, tz: (p.z || 0) / 10, yaw: 0, tyaw: (p.r || 0) / 10, a: p.a || 0, h: p.h || 0, bx: 0, bz: 0, bv: 0, seen: !!p.x, ph: 0, jump: 0, lk: Array.isArray(p.lk) ? normLook(p.lk) : null };
  if (built) attachOther(o);
  NET.others.set(p.id, o);
}
function attachOther(o) {
  o.av = makeCarrot(o.color); o.av.position.set(o.x, 0, o.z); scene.add(o.av); if (o.lk) applyLook(o.av, o.lk, o.color);
  o.tag = makeTag(o.nick, false);
  o.ball = new T.Mesh(new T.SphereGeometry(.2, 10, 8), new T.MeshLambertMaterial({ color: new T.Color(o.color) })); o.ball.castShadow = true; o.ball.visible = false; scene.add(o.ball);
}
function removeOther(id) {
  const o = NET.others.get(id); if (!o) return;
  if (o.av) { scene.remove(o.av); scene.remove(o.ball); o.tag.remove(); if (o.cart) scene.remove(o.cart); }
  NET.others.delete(id);
}
function clearOthers() { for (const id of [...NET.others.keys()]) removeOther(id); }

// ================= 게임 상태 =================
const me = { x: 0, z: 0, yaw: 0, anim: 0, ph: 0, moveT: null, av: null, tag: null, swingT: 0, jump: 0 };
const cam = { yaw: 0, aimYaw: 0, pitch: .38, dist: 13, mode: 'follow', tx: 0, ty: 0, tz: 0, px: 0, py: 10, pz: 0 };
const S = { hole: 0, strokes: 0, scores: Array(HOLES.length).fill(null), buff: null, mulligans: 0, mode: 'walk', club: 0, clubAuto: true, aimYaw: 0,
  charge: false, chargeT: 0, okTix: 0, zoneUsed: {}, st: null, shotChance: false, chance: 2, chanceT: null, chanceBusy: false, chanceHit: false, power: 0, prev: null, last: null, ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'rest' }, ballVis: true, shadeSeen: false, shots: 0 };
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
const sndEat = () => { for (let i = 0; i < 3; i++) noise(.06, 1800, 2, .12, i * .16); };
const sndDoor = () => { tone(180, .08, 'square', .06); noise(.12, 500, 1, .1, .05); };
const sndFlush = () => { noise(1.6, 700, .4, .35); noise(1.2, 300, .6, .25, .4); for (let i = 0; i < 6; i++) tone(200 + Math.random() * 300, .1, 'sine', .05, .6 + i * .12); };
const sndWash = () => { noise(1.4, 3500, .4, .12); };
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
$('cardBtn').onclick = () => { const s = $('cardSheet'); s.hidden = !s.hidden; $('peopleSheet').hidden = true; $('cardBtn').setAttribute('aria-expanded', String(!s.hidden)); $('peopleBtn').setAttribute('aria-expanded', 'false'); };
function closeSheets() { $('cardSheet').hidden = true; $('peopleSheet').hidden = true; $('cardBtn').setAttribute('aria-expanded', 'false'); $('peopleBtn').setAttribute('aria-expanded', 'false'); }
$('cardClose').onclick = closeSheets;
window.addEventListener('keydown', e => { if (e.key === 'Escape') { closeSheets(); $('creditCard').hidden = true; } });
// 만든 사람 정보
document.querySelectorAll('[data-credit]').forEach(b => b.onclick = () => { closeSheets(); $('creditCard').hidden = false; $('creditClose').focus(); });
$('creditClose').onclick = () => { $('creditCard').hidden = true; };
$('creditCard').onclick = e => { if (e.target.id === 'creditCard') $('creditCard').hidden = true; };

// ---- 같이 치는 사람: 누가 몇 번 홀 어디에 있는지 ----
let focusId = 0;
function whereText(x, z, a, h, done) {
  if (done >= HOLES.length) return '라운딩 끝, 코스 산책 중';
  if (a === 4) return '카트 타고 이동 중';
  if (Math.hypot(x - SHADE.x, z - SHADE.z) < 7) return '그늘집에서 쉬는 중';
  const hh = HOLES[h] || HOLES[0], d = Math.round(Math.hypot(x - hh.cup[0], z - hh.cup[1]) * M_PER_U);
  const lie = surface(x, z); const place = lie === 'water' ? '연못가' : LIE[lie] || '';
  return `${h + 1}번 홀 ${place} · 핀까지 ${d}m${a === 2 ? ' · 샷 준비 중' : a === 3 ? ' · 스윙!' : ''}`;
}
function scoreText(sc, done, st, h) { const tot = done ? (sc === 0 ? 'E' : sc > 0 ? `+${sc}` : `${sc}`) : '-'; return `${done}/${HOLES.length}홀 ${tot}${st ? ` · ${h + 1}H ${st}타` : ''}`; }
function inviteURL() { return `${location.origin && location.origin !== 'null' ? location.origin : ''}${location.pathname}#ch${NET.ch || 1}`; }
function renderPeople() {
  $('peopleN').textContent = NET.others.size + 1;
  if ($('peopleSheet').hidden) return;
  const busy = S.mode !== 'walk';
  const rows = [{ id: 0, nick: NET.nick, color: '#ffffff', x: me.x, z: me.z, a: me.anim, h: S.hole, st: S.strokes, sc: totalDiff(), dn: S.scores.filter(v => v != null).length, mine: true },
    ...[...NET.others.values()].sort((p, q) => (q.dn - p.dn) || (q.h - p.h))];
  // 목록 구성이 바뀔 때만 새로 만들고, 나머지는 글자만 바꿔요 (버튼이 눌리는 도중 사라지지 않게)
  const ul = $('plist'), sig = rows.map(o => o.id + ':' + o.nick).join('|');
  if (ul.dataset.sig !== sig) {
    ul.dataset.sig = sig;
    ul.innerHTML = rows.map(o => `<li class="${o.mine ? 'me' : ''}" data-id="${o.id}"><i style="background:${esc(o.color)}"></i><span class="pn">${esc(o.nick)}${o.mine ? ' (나)' : ''}</span><span class="ps"></span><span class="pw"></span>${o.mine ? '' : `<button type="button" data-go="${o.id}">카트로 가기</button>`}</li>`).join('');
  }
  rows.forEach((o, i) => { const li = ul.children[i]; if (!li) return; li.querySelector('.ps').textContent = scoreText(o.sc, o.dn, o.st, o.h); li.querySelector('.pw').textContent = whereText(o.x, o.z, o.a, o.h, o.dn); const bt = li.querySelector('button'); if (bt) bt.disabled = busy; });
  ul.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const o = NET.others.get(+b.dataset.go); if (!o || S.mode !== 'walk') return;
    focusId = o.id; $('peopleSheet').hidden = true; $('peopleBtn').setAttribute('aria-expanded', 'false');
    const a = Math.random() * TAU; cartTo(o.x + Math.cos(a) * 2.5, o.z + Math.sin(a) * 2.5, false, `${o.nick} 님 계신 데로 모실게요~`, whereText(o.x, o.z, o.a, o.h, o.dn).replace(' · ', '에 계세요. '));
  });
  $('peopleSub').textContent = NET.ch ? `${NET.ch}채널 · ${NET.others.size + 1}명이 같이 치고 있어요` : '지금은 혼자 라운딩 중이에요. 서버에 연결되면 같은 채널 사람들이 보여요.';
  const inp = $('inviteLink'); if (document.activeElement !== inp) inp.value = inviteURL();
}
$('peopleBtn').onclick = () => { const s = $('peopleSheet'); s.hidden = !s.hidden; $('cardSheet').hidden = true; $('cardBtn').setAttribute('aria-expanded', 'false'); $('peopleBtn').setAttribute('aria-expanded', String(!s.hidden)); renderPeople(); };
$('peopleClose').onclick = () => { $('peopleSheet').hidden = true; $('peopleBtn').setAttribute('aria-expanded', 'false'); };
$('inviteCopy').onclick = () => {
  const inp = $('inviteLink'), b = $('inviteCopy'); inp.value = inviteURL();
  const done = () => { b.textContent = '복사됨'; setTimeout(() => { b.textContent = '복사'; }, 1500); };
  try { navigator.clipboard.writeText(inp.value).then(done, () => { inp.select(); b.textContent = '선택됨, 복사하세요'; }); } catch { inp.select(); }
};
setInterval(() => { if (!$('app').hidden) renderPeople(); }, 1000);
// 초대 링크(#ch12)로 들어오면 그 채널로 바로
function invitedCh() { const m = /^#ch(\d{1,3})$/.exec(location.hash); return m ? +m[1] : 0; }
function showInvited() { const c = invitedCh(), el = $('invited'); if (c) { el.hidden = false; el.textContent = `친구가 초대한 ${c}채널로 들어가요`; } else el.hidden = true; }
window.addEventListener('hashchange', showInvited); showInvited();
$('emoToggle').onclick = () => { const w = $('emoToggle').parentElement; w.classList.toggle('open'); $('emoToggle').setAttribute('aria-expanded', String(w.classList.contains('open'))); };
$('emotes').innerHTML = EMOTES.map((e, i) => `<button type="button" data-e="${i}">${e}</button>`).join('');
$('emotes').querySelectorAll('button').forEach(b => b.onclick = () => {
  const e = +b.dataset.e; showBubble(me, EMOTES[e]); me.jump = 1; sendNet({ t: 'emo', e });
  const all = $('emotes').querySelectorAll('button'); all.forEach(x => x.disabled = true); setTimeout(() => all.forEach(x => x.disabled = false), 900);
});

function windText() {
  const h = hole(); if (!h.wind) return '';
  const d = [h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]], L = Math.hypot(...d), side = (h.wind[0] * d[1] - h.wind[1] * d[0]) / L, along = (h.wind[0] * d[0] + h.wind[1] * d[1]) / L;
  return ` · 바람 ${Math.abs(side) > Math.abs(along) ? (side > 0 ? '→' : '←') : along > 0 ? '뒷바람' : '맞바람'} ${Math.hypot(...h.wind).toFixed(1)}m/s`;
}
function updHud() {
  const h = hole();
  $('holeNo').textContent = S.hole + 1; $('holeName').textContent = h.name;
  $('holePar').textContent = `PAR ${h.par} · ${S.strokes}타 쳤어요`;
  const lie = LIE[surface(S.ball.x, S.ball.z)] || '';
  $('holeDist').textContent = `핀까지 ${Math.round(distToCup() * M_PER_U)}m · ${lie}${windText()}`;
  $('strokes').textContent = S.strokes;
}
let lastActKey = '';
function updActions() {
  const near = Math.hypot(me.x - S.ball.x, me.z - S.ball.z) < 3.2;
  const inShade = Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 6;
  let key;
  if (S.mode === 'aim') key = `aim${S.club}${S.chance}${S.chanceBusy ? 1 : 0}${S.readLie ? 1 : 0}`;
  const nearRR = Math.hypot(me.x - RR_DOORS.m[0], me.z - (RR_DOORS.m[1] + RR_DOORS.w[1]) / 2) < 5;
  if (S.mode === 'walk') key = `walk${S.ball.state}${near}${inShade}${nearRR}${S.mulligans && S.prev ? 1 : 0}${okReady() ? 1 : 0}${S.okTix}${S.ballVis}`;
  else if (S.mode !== 'aim') key = S.mode;
  if (S.mode === 'ride') key = 'ride';
  if (S.mode === 'range') key = `range${RG.club}`;
  if (S.mode === 'club') key = `club${LB.zone}${LB.lockerUI ? 1 : 0}`;
  if (S.mode === 'cine') key = 'cine';
  if (key === lastActKey) return; lastActKey = key;
  const a = $('actions'); let html = '';
  if (S.mode === 'aim') {
    html = `<button class="act sub round" id="aL" aria-label="왼쪽으로">◀</button>
      <button class="act swing" id="swing">누르고 있다가 떼기</button>
      <button class="act sub round" id="aR" aria-label="오른쪽으로">▶</button>
      <button class="act sub" id="clubBtn">${CLUBS[S.club].name}</button>
      <button class="act chance" id="chanceBtn" ${S.chance <= 0 || S.chanceBusy ? 'disabled' : ''}>${S.chanceBusy ? '캐디가 보는 중…' : `캐디 찬스 ${S.chance}`}</button>
      <button class="act sub" id="cancel">취소</button>`;
  } else if (S.mode === 'walk') {
    if (S.ball.state === 'rest') {
      if (near) html += '<button class="act" id="ready">샷 준비 (E)</button>';
      else html += '<button class="act" id="warpBall">공으로 순간이동</button><button class="act sub" id="goBall">걸어가기</button><button class="act sub" id="cartBall">카트</button>';
    }
    if (inShade) html += '<button class="act" id="menuBtn">그늘집 메뉴판 보기</button>';
    if (nearRR) html += '<button class="act wc m" id="wcM">남자 화장실</button><button class="act wc w" id="wcW">여자 화장실</button>';
    if (S.mulligans && S.prev && S.ball.state === 'rest') html += `<button class="act sub" id="mull">멀리건 (${S.mulligans})</button>`;
    if (okReady()) html += `<button class="act" id="okBtn">OK 받기 (OK권 ${S.okTix})</button>`;
    if (S.ball.state === 'rest' && S.ballVis) html += '<button class="act sub" id="pickBtn">홀아웃</button>';
  }
  if (S.mode === 'ride') html = '<button class="act sub" id="skipRide">바로 내리기</button>';
  if (S.mode === 'range') html = `<button class="act sub round" id="aL" aria-label="왼쪽으로">◀</button>
      <button class="act swing" id="swing">누르고 있다가 떼기</button>
      <button class="act sub round" id="aR" aria-label="오른쪽으로">▶</button>
      <button class="act sub" id="rClub">${CLUBS[RG.club].name} ▸</button>
      <button class="act" id="rLobby">🏛️ 로비로</button>`;
  if (S.mode === 'club' && !LB.lockerUI) {
    if (LB.zone === 'out') html = '<button class="act" id="clEnter">🚪 클럽하우스 입장</button>';
    else if (LB.zone === 'locker') html = '<button class="act" id="clDress">👕 옷 갈아입기</button><button class="act sub" id="clLobby">🏛️ 로비로</button>';
    else html = '<button class="act sub" id="clLocker">👕 락커룸</button><button class="act sub" id="clRange">🏌️ 드라이빙 레인지</button><button class="act" id="clCourse">⛳ 1번 홀로</button>';
  }
  if (S.mode === 'eat') html = '<button class="act sub" id="eatDone">다 먹었어요</button>';
  if (S.mode === 'flight') html = '<button class="act sub" id="skipFlight">공 멈춘 곳 바로 보기 ▸▸</button>';
  a.innerHTML = html;
  const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
  on('skipRide', skipRide); on('eatDone', () => { EAT.t = EAT_SEC; }); on('skipFlight', skipFlight); on('ready', enterAim); on('goBall', walkToBall); on('cartBall', () => cartTo(S.ball.x, S.ball.z, true)); on('warpBall', warpToBall); on('menuBtn', showShade); on('mull', mulligan); on('okBtn', useOk); on('pickBtn', pickUp);
  on('wcM', () => useRestroom('m')); on('wcW', () => useRestroom('w'));
  on('cancel', exitAim); on('clubBtn', () => { S.club = (S.club + 1) % 4; S.clubAuto = false; lastActKey = ''; clearChance('클럽을 바꿔서 캐디 찬스가 풀렸어요'); }); on('chanceBtn', caddieChance); on('lieBtn', toggleLie);
  on('rClub', () => { RG.club = (RG.club + 1) % 3; rangeHud(); lastActKey = ''; }); on('rLobby', () => backToClub('range'));
  on('clEnter', () => startCine('enter')); on('clDress', openDress); on('clLobby', () => walkPath([[-13, 0], [-9, 0], [-2, -2.2]]));
  on('clLocker', () => { closeDesk(true); walkPath([[-3, .5], [-10, 0], [-13.5, -.8]]); }); on('clRange', () => { closeDesk(true); walkPath([[3, -.5], [6, -3], [10.2, -4.5]]); }); on('clCourse', () => { closeDesk(true); walkPath([[3, 1.5], [6, 3], [10.2, 4.5]]); });
  const hold = (id, d) => { const el = $(id); if (!el) return; let iv = 0; const stop = () => clearInterval(iv); el.onpointerdown = e => { e.preventDefault(); iv = setInterval(() => { if (S.mode === 'range') RG.yaw = clamp(RG.yaw + d * .008, -.6, .6); else S.aimYaw += d * .012; }, 16); }; el.onpointerup = stop; el.onpointerleave = stop; el.onpointercancel = stop; };
  hold('aL', 1); hold('aR', -1);
  const sw = $('swing');
  if (sw && S.mode === 'range') { sw.onpointerdown = e => { e.preventDefault(); try { sw.setPointerCapture(e.pointerId); } catch {} rangeCharge(true); }; sw.onpointerup = e => { e.preventDefault(); rangeCharge(false); }; sw.onpointercancel = () => { RG.charge = false; }; }
  else if (sw) { sw.onpointerdown = e => { e.preventDefault(); try { sw.setPointerCapture(e.pointerId); } catch {} startCharge(); }; sw.onpointerup = e => { e.preventDefault(); releaseCharge(); }; sw.onpointercancel = () => { S.charge = false; swingLabel(); }; }
}

// ================= 이동 =================
function canStand(x, z) {
  if (inClub(x, z)) return clubCanStand(x, z);
  if (Math.abs(x) > MAP - 1 || Math.abs(z) > MAP - 1) return false;
  for (const h of HOLES) for (const w of h.water) if (Math.hypot(x - w[0], z - w[1]) < w[2] + .5) return false;
  for (const t of TREES) if (Math.hypot(x - t.x, z - t.z) < t.tr + .55) return false;
  if (x > RR.x - 2.7 && x < RR.x + 2.7 && z > RR.z - 3.9 && z < RR.z + 3.9) return false; // 화장실 건물
  return true;
}
$('lbSkip') && ($('lbSkip').onclick = () => skipCine());
// 공 있는 곳으로 순간이동 (뿅!)
function warpToBall() {
  if (S.mode !== 'walk' || S.ball.state !== 'rest') return;
  const tg = aimTarget(), a = Math.atan2(tg[0] - S.ball.x, tg[1] - S.ball.z);
  let tx = S.ball.x - Math.sin(a) * 1.4, tz = S.ball.z - Math.cos(a) * 1.4;
  if (!canStand(tx, tz)) { tx = S.ball.x; tz = S.ball.z; }
  me.moveT = null; S.mode = 'wait'; tone(1200, .12, 'sine', .12); tone(600, .18, 'sine', .1, .08);
  fireworks(me.x, heightAt(me.x, me.z) + 1, me.z, 50); $('fade').classList.add('on');
  setTimeout(() => {
    me.x = tx; me.z = tz; me.yaw = a; cam.yaw = a; snapCam(); fireworks(tx, heightAt(tx, tz) + 1, tz, 50); me.jump = .6;
    tone(600, .1, 'sine', .1); tone(1200, .16, 'sine', .12, .08);
    setTimeout(() => { $('fade').classList.remove('on'); S.mode = 'walk'; lastActKey = ''; }, 120);
  }, 260);
}
function walkToBall() {
  const tg = aimTarget(), a = Math.atan2(tg[0] - S.ball.x, tg[1] - S.ball.z);
  let tx = S.ball.x - Math.sin(a) * 1.4, tz = S.ball.z - Math.cos(a) * 1.4;
  if (!canStand(tx, tz)) { tx = S.ball.x; tz = S.ball.z; }
  me.moveT = [tx, tz];
}
// 카트: 토끼 캐디가 운전하고 나는 옆자리. 카트 도로를 따라 달려요
const RIDE = { x: 0, z: 0, yaw: 0, sp: 0, pts: [], i: 0, dest: null, face: null, mid: '', midSaid: false, total: 0 };
const HOLE_TIPS = ['그린 앞 양쪽 벙커만 조심하세요.', '그린 양옆에 벙커가 있어요. 러프에 가면 토끼가 도와줄지도요.', '오른쪽에 악어 연못 있어요. 왼쪽으로 꺾이는 데까지 끊어 가세요.', '그린 쪽으로 바로 치면 오른쪽 연못에 빠져요. 바람도 계산하세요!', '트램펄린은 공을 튕겨주고, 황금 당근은 캐디 찬스를 줘요. 상자는 열어봐야 알아요.', '오리 연못은 빠져도 괜찮아요. 꺾이는 데까지 똑바로 가세요.', '페어웨이가 좁아요. 숲에 들어가면 멧돼지 조심!', '까마귀가 많아요. 그린까지 빨리 가는 게 상책이에요.', '마지막 홀이에요. 갤러리 앞에서 멋지게 마무리하세요!'];
const holeTalk = i => `${i + 1}번 홀 ${HOLES[i].name}, PAR ${HOLES[i].par}이에요. ${HOLE_TIPS[i] || ''}`;
const ballTalk = () => `남은 거리 ${Math.round(distToCup() * M_PER_U)}m예요. ${CLUBS[autoClub()].name} 잡으시면 될 것 같아요.`;
let caddieT = 0;
function caddieSay(text, ms = 3600) {
  if (!caddieTag) return; const b = caddieTag.querySelector('.bub'); b.textContent = text; b.hidden = false;
  clearTimeout(caddieT); caddieT = setTimeout(() => { b.hidden = true; }, ms);
}
let eng = null;
function startEngine() {
  const a = audio(), m = out(); if (!a || !m || eng) return;
  const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
  const g = a.createGain(); g.gain.value = 0; g.gain.setTargetAtTime(.06, a.currentTime, .2);
  o.connect(f).connect(g).connect(m); o.start(); eng = { o, g };
}
function stopEngine() { if (!eng) return; const e = eng; eng = null; e.g.gain.setTargetAtTime(0, AC.currentTime, .15); setTimeout(() => { try { e.o.stop(); } catch {} }, 700); }
function cartTo(x, z, toBall, say, mid) {
  let tx = x, tz = z, face = null;
  if (toBall) { const tg = aimTarget(), a = Math.atan2(tg[0] - x, tg[1] - z); tx = x - Math.sin(a) * 1.4; tz = z - Math.cos(a) * 1.4; face = a; }
  for (let k = 0; k < 20 && !canStand(tx, tz); k++) { tx += rand(-1.5, 1.5); tz += rand(-1.5, 1.5); }
  rideTo(tx, tz, face, say || (toBall ? '공 있는 데로 모실게요~' : '출발합니다~ 꽉 잡으세요!'), mid || (toBall ? ballTalk() : ''));
}
function rideTo(dx, dz, face, say, mid) {
  if (S.mode === 'ride' || !me.cart) return;
  // 카트를 내 옆에 대고 출발
  const route = planRoute(me.x, me.z, dx, dz);
  const first = route[0], yaw0 = Math.atan2(first[0] - me.x, first[1] - me.z);
  RIDE.x = me.x + Math.cos(yaw0) * .4; RIDE.z = me.z - Math.sin(yaw0) * .4; RIDE.yaw = yaw0; RIDE.sp = 0;
  // 도착 지점은 목적지 바로 옆 (내리면 그 자리에 서도록)
  RIDE.pts = route; RIDE.i = 0; RIDE.dest = [dx, dz]; RIDE.face = face; RIDE.mid = mid; RIDE.midSaid = !mid;
  RIDE.total = route.reduce((a, p, i) => a + Math.hypot(p[0] - (i ? route[i - 1][0] : me.x), p[1] - (i ? route[i - 1][1] : me.z)), 0);
  me.cart.visible = true; S.mode = 'ride'; me.moveT = null; cam.mode = 'follow'; lastActKey = '';
  placeCart(); caddieSay(say); startEngine(); tone(660, .07, 'square', .05); tone(660, .07, 'square', .05, .12);
  $('help').classList.add('off');
}
function placeCart() {
  const c = me.cart, fx = Math.sin(RIDE.yaw), fz = Math.cos(RIDE.yaw);
  const hf = heightAt(RIDE.x + fx * 1.3, RIDE.z + fz * 1.3), hb = heightAt(RIDE.x - fx * 1.3, RIDE.z - fz * 1.3);
  const pitch = -Math.atan2(hf - hb, 2.6);
  c.position.set(RIDE.x, (hf + hb) / 2, RIDE.z); c.rotation.set(pitch, RIDE.yaw, 0);
  c.updateMatrixWorld(true);
  const v = new T.Vector3(-.38, .55, -.3); c.localToWorld(v);
  me.x = v.x; me.z = v.z; me.yaw = RIDE.yaw; me.seat = v; me.seatPitch = pitch; me.anim = 4;
}
function updateRide(dt) {
  const tgt = RIDE.pts[RIDE.i];
  if (!tgt) return arrive();
  let rem = Math.hypot(tgt[0] - RIDE.x, tgt[1] - RIDE.z); for (let i = RIDE.i + 1; i < RIDE.pts.length; i++) rem += Math.hypot(RIDE.pts[i][0] - RIDE.pts[i - 1][0], RIDE.pts[i][1] - RIDE.pts[i - 1][1]);
  const want = Math.min(RIDE.rush ? 20 : 13, rem * 1.4 + 1.2);
  RIDE.sp += clamp(want - RIDE.sp, -14 * dt, 7 * dt);
  const dx = tgt[0] - RIDE.x, dz = tgt[1] - RIDE.z, d = Math.hypot(dx, dz);
  const head = Math.atan2(dx, dz); RIDE.yaw += angDiff(RIDE.yaw, head) * Math.min(1, dt * 4);
  const st = Math.min(d, RIDE.sp * dt); RIDE.x += dx / (d || 1) * st; RIDE.z += dz / (d || 1) * st;
  if (d < .5) RIDE.i++;
  placeCart();
  cam.yaw += angDiff(cam.yaw, RIDE.yaw) * Math.min(1, dt * 1.5);
  if (eng) eng.o.frequency.setTargetAtTime(45 + RIDE.sp * 4, AC.currentTime, .1);
  if (!RIDE.midSaid && rem < RIDE.total * .6) { RIDE.midSaid = true; caddieSay(RIDE.mid, 4200); }
  if (RIDE.i >= RIDE.pts.length) arrive();
}
function arrive() {
  RIDE.rush = false;
  stopEngine(); tone(880, .08, 'sine', .08); tone(990, .1, 'sine', .08, .1);
  const [dx, dz] = RIDE.dest; me.x = dx; me.z = dz; me.seat = null; me.anim = 0;
  if (RIDE.face != null) { me.yaw = RIDE.face; cam.yaw = RIDE.face; }
  // 카트는 내린 자리 옆에 세워둬요
  const side = (RIDE.face != null ? RIDE.face : RIDE.yaw) + Math.PI / 2;
  RIDE.x = dx + Math.sin(side) * 2.4; RIDE.z = dz + Math.cos(side) * 2.4;
  if (!canStand(RIDE.x, RIDE.z)) { RIDE.x = dx - Math.sin(side) * 2.4; RIDE.z = dz - Math.cos(side) * 2.4; }
  const sx = me.x, sz = me.z, sy = me.yaw; placeCart(); me.x = sx; me.z = sz; me.yaw = sy; me.seat = null; me.anim = 0;
  S.mode = 'walk'; lastActKey = ''; caddieSay(['도착했습니다~ 나이스 샷 하세요!', '여기서 내리시면 돼요~', '도착! 천천히 치세요~'][Math.random() * 3 | 0], 2600);
  me.jump = .6;
}
function skipRide() { if (S.mode !== 'ride') return; RIDE.i = RIDE.pts.length; const [dx, dz] = RIDE.dest; RIDE.x = dx; RIDE.z = dz; arrive(); snapCam(); }

// ================= 샷 =================
function enterAim() {
  if (S.mode !== 'walk' || S.ball.state !== 'rest') return;
  if (Math.hypot(me.x - S.ball.x, me.z - S.ball.z) > 3.2) return;
  S.mode = 'aim'; S.club = autoClub(); S.clubAuto = true;
  const tgt = aimTarget(); S.aimYaw = Math.atan2(tgt[0] - S.ball.x, tgt[1] - S.ball.z); cam.aimYaw = S.aimYaw;
  $('power').hidden = false; $('pow').style.width = '0%'; $('powLabel').textContent = CLUBS[S.club].name;
  $('help').classList.add('off'); lastActKey = '';
  if (me.cart && me.cart.visible && Math.hypot(me.cart.position.x - S.ball.x, me.cart.position.z - S.ball.z) < 9) { me.cart.visible = false; caddieSay('여기서 기다릴게요~', 1500); }
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
// ---- 퍼팅 라이 읽기 ----
let lieArrows = null;
function buildLieArrows() {
  if (lieArrows) scene.remove(lieArrows);
  lieArrows = new T.Group(); const h = hole(), [cx, cz] = h.cup, R = h.green;
  const geo = new T.ConeGeometry(.16, .55, 3); geo.rotateX(Math.PI / 2);
  for (let x = -R; x <= R; x += 1.4) for (let z = -R; z <= R; z += 1.4) {
    if (x * x + z * z > (R - .6) ** 2) continue;
    const px = cx + x, pz = cz + z, [gx, gz] = slopeAt(px, pz), m = Math.hypot(gx, gz); if (m < .008) continue;
    const k = Math.min(1, m / .07), col = new T.Color().setHSL(.33 - .33 * k, .9, .55);
    const a = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, transparent: true, opacity: .85, depthWrite: false }));
    a.position.set(px, heightAt(px, pz) + .06, pz); a.rotation.y = Math.atan2(-gx, -gz); a.scale.setScalar(.7 + k * .6); lieArrows.add(a);
  }
  scene.add(lieArrows);
}
function lieAdvice() {
  const b = S.ball, cup = hole().cup, dx = cup[0] - b.x, dz = cup[1] - b.z, L = Math.hypot(dx, dz) || 1, fx = dx / L, fz = dz / L;
  const up = heightAt(cup[0], cup[1]) - heightAt(b.x, b.z), deg = Math.atan(up / L) * 180 / Math.PI;
  let side = 0; for (const t of [.25, .5, .75]) { const x = b.x + dx * t, z = b.z + dz * t; side += heightAt(x - fz * 1.5, z + fx * 1.5) - heightAt(x + fz * 1.5, z - fx * 1.5); } side /= 3;
  const cups = Math.min(4, Math.round(Math.abs(side) * L * 2.2 * 2) / 2);
  const slope = Math.abs(deg) < .4 ? '거의 평지예요' : deg > 0 ? `오르막 ${deg.toFixed(1)}°라 조금 세게` : `내리막 ${(-deg).toFixed(1)}°라 살살`;
  const brk = cups < .5 ? '거의 똑바로 가요. 컵 정면을 보세요.' : side > 0 ? `오른쪽으로 휘어요. 컵 ${cups}개 왼쪽을 보세요.` : `왼쪽으로 휘어요. 컵 ${cups}개 오른쪽을 보세요.`;
  return `<b>라이 읽기</b> 핀까지 ${(L * M_PER_U).toFixed(1)}m, ${slope}. ${brk}<br><small>화살표는 공이 흘러내리는 방향이에요. 빨갈수록 가팔라요.</small>`;
}
function toggleLie() { if (S.readLie) { stopLie(); return; } if (S.mode !== 'aim' || S.club !== 3) return; S.readLie = true; buildLieArrows(); lieArrows.visible = true; showCaddieTip(lieAdvice()); tone(220, .1, 'triangle', .08); tone(180, .14, 'triangle', .08, .1); showBubble(me, ['흠…', '어디 보자…', '살짝 휘는데?'][Math.random() * 3 | 0]); lastActKey = ''; }
function stopLie() { if (!S.readLie) return; S.readLie = false; if (lieArrows) lieArrows.visible = false; if (!S.chanceT) $('caddieTip').hidden = true; lastActKey = ''; }
function exitAim() { stopLie(); clearChance(); S.mode = 'walk'; S.charge = false; S.aimDrag = false; $('power').hidden = true; aimArrow.visible = landRing.visible = pathLine.visible = ribbon.visible = false; lastActKey = ''; }
function swingLabel() { const sw = $('swing'); if (!sw) return; sw.classList.toggle('on', S.charge); sw.textContent = S.charge ? '떼면 샷!' : '누르고 있다가 떼기'; }
function startCharge() { if (S.mode !== 'aim' || S.charge) return; stopLie(); audio(); S.charge = true; S.chargeT = performance.now(); swingLabel(); }
function releaseCharge() {
  if (!S.charge) return; S.charge = false; swingLabel();
  if (S.power < .03) return;
  // 캐디 찬스: 반짝이는 칸에서 떼면 캐디가 계산한 그대로
  if (S.chanceT && Math.abs(S.power - S.chanceT.p) <= CHANCE_BAND && Math.abs(angDiff(S.aimYaw, S.chanceT.yaw)) < .004) { S.power = S.chanceT.p; S.chanceHit = true; toast('캐디 말 들었더니 딱이네요!', 1400); }
  else if (S.chanceT) { S.chanceHit = false; toast(Math.abs(S.power - S.chanceT.p) > CHANCE_BAND ? (S.power > S.chanceT.p ? '앗, 조금 셌어요' : '앗, 조금 약했어요') : '라인이 조금 틀어졌어요', 1400); }
  clearChance();
  shoot(S.power);
}
function chargePower() { const t = (performance.now() - S.chargeT) / 1000 * (S.buff === 'tteok' ? .5 : .75); const f = t % 2; return f < 1 ? f : 2 - f; }
function launchVel(p, yaw, club, lie) {
  const c = CLUBS[club];
  let v = c.v * p * (S.buff === 'ramen' ? 1.2 : 1);
  if (club !== 3) v *= lie === 'rough' ? .85 : lie === 'sand' ? (club === 2 ? .8 : .55) : 1;
  const h = Math.cos(c.loft) * v;
  return { vx: Math.sin(yaw) * h, vy: Math.sin(c.loft) * v, vz: Math.cos(yaw) * h, putt: club === 3 };
}
function shoot(p) {
  let yaw = S.aimYaw; if (S.buff === 'makgeolli' && !S.chanceHit) yaw += rand(-.05, .05); S.chanceHit = false;
  const lie = surface(S.ball.x, S.ball.z);
  const v = launchVel(p, yaw, S.club, lie);
  S.prev = { x: S.ball.x, z: S.ball.z, strokes: S.strokes }; S.last = { x: S.ball.x, z: S.ball.z };
  S.strokes++; S.shots++; S.shotChance = S.chanceHit; recStart();
  // 다운스윙: 올라간 채를 내려쳐요
  me.swingFrom = .2 + p * (S.club === 3 ? 1 : 2.8); me.swingT = .01; me.chargeP = 0; sndSwish();
  S.mode = 'swing'; S.aimDrag = false; $('power').hidden = true; aimArrow.visible = landRing.visible = pathLine.visible = ribbon.visible = false; $('aimTip').hidden = true;
  lastActKey = '';
  setTimeout(() => {
    Object.assign(S.ball, { y: heightAt(S.ball.x, S.ball.z), vx: v.vx, vy: v.vy, vz: v.vz, state: v.putt ? 'roll' : 'fly', tree: false, lip: false, landed: false, rollT: 0 });
    sndHit(p, v.putt); trailReset();
    // 친 사람 반대쪽 뒤에서 공이 솟는 걸 올려다봐요
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx;
    cam.shotX = S.ball.x + rx * 2.5 - fx * 8; cam.shotZ = S.ball.z + rz * 2.5 - fz * 8; cam.shotY = heightAt(cam.shotX, cam.shotZ) + 2.6; cam.shotT = 0;
    S.mode = 'flight'; cam.mode = v.putt ? 'follow' : 'ball'; lastActKey = ''; updHud();
  }, v.putt ? 120 : 160);
}
function mulligan() {
  if (!(S.mulligans > 0 && S.prev && S.mode === 'walk')) return;
  Object.assign(S.ball, { x: S.prev.x, y: 0, z: S.prev.z, vx: 0, vy: 0, vz: 0, state: 'rest' }); S.strokes = S.prev.strokes; S.prev = null; S.mulligans--; renderTix();
  toast('멀리건! 없던 샷으로'); cartTo(S.ball.x, S.ball.z, true); updHud(); lastActKey = '';
}

// 공 물리 (sim=true면 예측용, 부수 효과 없음) — 땅 기울기를 따라 튀고 굴러요
const GRAV_ROLL = .55;
function stepBall(b, dt, sim) {
  const h = hole();
  if (b.state === 'fly') {
    if (h.wind) { b.vx += h.wind[0] * dt; b.vz += h.wind[1] * dt; }
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (!b.tree) for (const t of TREES) {
      const dx = b.x - t.x, dz = b.z - t.z;
      if (dx * dx + dz * dz < t.cr * t.cr && b.y < t.y + t.ch + t.cr * .8 && b.y > t.y + .3) { b.vx *= -.2; b.vz *= -.2; b.vy = Math.min(b.vy, 0) * .2; b.tree = true; if (!sim) { sndTree(); toast('나무 맞았어요!', 1200); } break; }
    }
    if (Math.abs(b.x) > MAP - 1.5 || Math.abs(b.z) > MAP - 1.5) return 'ob';
    const gh = heightAt(b.x, b.z);
    if (b.y <= gh) {
      b.y = gh; const s = surface(b.x, b.z);
      if (s === 'water') return 'water';
      if (s === 'sand') { b.vx *= .1; b.vz *= .1; b.vy = 0; b.state = 'roll'; return sim ? 'land' : null; }
      const land = sim && !b.landed; b.landed = true;
      const [gx, gz] = slopeAt(b.x, b.z), nl = Math.hypot(gx, 1, gz), nx = -gx / nl, ny = 1 / nl, nz = -gz / nl;
      const vn = b.vx * nx + b.vy * ny + b.vz * nz;
      if (vn < -4) {
        const e = s === 'green' ? .2 : s === 'rough' ? .18 : .3;
        b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; b.vz -= (1 + e) * vn * nz;
        const k = s === 'rough' ? .5 : s === 'green' ? .6 : .72; b.vx *= k; b.vz *= k; b.y = gh + .01;
      } else { b.vx -= vn * nx; b.vz -= vn * nz; b.vy = 0; b.state = 'roll'; }
      if (land) return 'land';
    }
    return null;
  }
  if (b.state === 'roll') {
    const s = surface(b.x, b.z);
    if (s === 'water') return 'water';
    const [fr, c] = ROLL[s] || ROLL.rough, [gx, gz] = slopeAt(b.x, b.z);
    b.vx -= G * GRAV_ROLL * gx * dt; b.vz -= G * GRAV_ROLL * gz * dt;
    const sp = Math.hypot(b.vx, b.vz);
    const dx = h.cup[0] - b.x, dz = h.cup[1] - b.z, d = Math.hypot(dx, dz);
    if (d < cupR() && sp < 3.4) return 'sink';
    if (d < cupR() && sp >= 3.4 && !sim && !b.lip) { b.lip = true; toast('아깝다, 홀컵 돌고 나왔어요', 1200); }
    if (d < cupR() + .5 && sp < 2.5 && d > 0) { b.vx += dx / d * dt * 5; b.vz += dz / d * dt * 5; }
    const ns = Math.max(0, sp - (sp * fr + c) * dt);
    if (sp > 0) { b.vx *= ns / sp; b.vz *= ns / sp; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    for (const t of TREES) { const tx = b.x - t.x, tz = b.z - t.z, td = Math.hypot(tx, tz); if (td < t.tr + .2 && td > 0) { const nx = tx / td, nz = tz / td, vn = b.vx * nx + b.vz * nz; if (vn < 0) { b.vx -= 1.6 * vn * nx; b.vz -= 1.6 * vn * nz; } b.x = t.x + nx * (t.tr + .2); b.z = t.z + nz * (t.tr + .2); } }
    if (Math.abs(b.x) > MAP - 1.5 || Math.abs(b.z) > MAP - 1.5) return 'ob';
    b.y = heightAt(b.x, b.z);
    b.rollT = (b.rollT || 0) + dt;
    const slopeAcc = G * GRAV_ROLL * Math.hypot(gx, gz);
    if ((ns < .3 && (slopeAcc < c * 1.6 || b.rollT > 3)) || b.rollT > 6) { b.vx = b.vz = 0; b.state = 'rest'; return 'stop'; }
  }
  return null;
}
function predict(p) {
  const lie = surface(S.ball.x, S.ball.z), v = launchVel(p, S.aimYaw, S.club, lie);
  const b = { x: S.ball.x, y: S.ball.y, z: S.ball.z, vx: v.vx, vy: v.vy, vz: v.vz, state: v.putt ? 'roll' : 'fly' };
  const pts = [new T.Vector3(b.x, b.y + .15, b.z)]; let land = null;
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
  if (e === 'water' && h.ev === 'duck') { duckRescue(); updHud(); return; }
  if (e === 'water') {
    S.mode = 'wait'; S.ballVis = false; sndSplash(); splash(b.x, b.z);
    const eaten = !S.crocDone && crocEats(b.x, b.z); if (eaten) S.crocDone = true;
    toast(eaten ? '악어가 공을 물어갔어요! 1벌타' : '퐁당! 해저드 1벌타', 2200);
    if (eaten) { S.st.croc++; recMark('악어가 공을 물어감', `${S.hole + 1}번 홀 · 1벌타`); recStopIn(3200); } else { S.st.water++; recStopIn(1500); }
    setTimeout(() => penaltyReturn(), eaten ? 2200 : 1300);
  } else if (e === 'ob') {
    S.mode = 'wait'; toast('OB! 1벌타'); S.st.ob++; recStopIn(1200); setTimeout(() => penaltyReturn(), 1200);
  } else if (e === 'sink') {
    S.mode = 'wait'; b.state = 'sinking'; b.x = h.cup[0]; b.z = h.cup[1]; sndCup();
    setTimeout(() => { S.ballVis = false; finishHole(''); }, 700);
  } else if (e === 'stop') {
    const s = surface(b.x, b.z), d = distToCup();
    if (s === 'green' && d < 1.6 && !S.okTix && !S.okHinted) { S.okHinted = true; setTimeout(() => toast('OK 거리인데 OK권이 없어요. 그늘집에서 사 먹으면 받아요!', 2400), 900); }
    if (S.strokes >= h.par * 2) { S.mode = 'wait'; finishHole('양파! 픽업'); return; }
    const thief = crocNear(b.x, b.z);
    if (thief && !S.crocDone && (h.ev === 'croc' || Math.random() < .6)) { S.crocDone = true; crocSteal(thief); return; }
    if (holeStopEvent(s)) return;
    toast(`${LIE[s]} · 핀까지 ${Math.round(d * M_PER_U)}m`, 1600);
    S.mode = 'wait'; setTimeout(() => { S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; updActions(); }, 250);
  }
  updHud();
}
// 공이 멈출 때까지 기다리지 않고 결과로 바로 넘어가요
function skipFlight() {
  if (S.mode !== 'flight') return;
  for (let i = 0; i < 20000; i++) { const e = stepBall(S.ball, 1 / 120, false); if (e) { onBallEvent(e); return; } }
}
// ---- 쉬러 가기: 그늘집, 화장실 ----
function restMenu() {
  if (S.mode !== 'walk') return;
  overlay(`<span class="eyebrow">잠깐 쉬어가기</span><h2>어디로 모실까요?</h2>
    <div class="btns"><button class="btn" id="goEat">그늘집 (배고파요)</button><button class="btn" id="goWC">화장실 (급해요)</button></div>
    <button class="btn sub" id="restNo">괜찮아요</button>`, true);
  $('restNo').onclick = closeOverlay;
  $('goEat').onclick = () => { closeOverlay(); cartTo(SHADE.x + rand(-1, 1), SHADE.z + 5.3, false, '배고프시죠? 그늘집으로 모실게요~', '오늘은 당근주스가 제일 잘 나가요!'); };
  $('goWC').onclick = () => { closeOverlay(); RIDE.rush = true; cartTo(RR_DOORS.m[0] + 1.6, (RR_DOORS.m[1] + RR_DOORS.w[1]) / 2, false, '급하시죠? 꽉 잡으세요, 밟습니다!', '거의 다 왔어요, 조금만 참으세요!'); };
}
// 오른쪽 위 [그늘집 가기] [화장실 가기]: 언제든 누르면 캐디가 바로 데려가요
function canTravel() {
  if (S.mode === 'aim') { exitAim(); return true; }
  if (S.mode === 'walk') return true;
  toast(S.mode === 'ride' ? '이미 카트 타고 가는 중이에요' : S.mode === 'restroom' ? '아직 화장실 안이에요' : S.mode === 'eat' ? '먹는 중이에요. 다 먹고 가요~' : '공이 멈추면 갈 수 있어요', 1400);
  return false;
}
$('goShadeBtn').onclick = () => {
  closeSheets(); if (!canTravel()) return;
  if (Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 6) { showShade(); return; }
  closeOverlay(); cartTo(SHADE.x + rand(-1, 1), SHADE.z + 5.3, false, '배고프시죠? 그늘집으로 모실게요~', '오늘은 당근주스가 제일 잘 나가요!');
};
$('goWCBtn').onclick = () => {
  closeSheets(); if (!canTravel()) return;
  if (Math.hypot(me.x - RR_DOORS.m[0], me.z - RR.z) < 5) { toast('바로 앞이에요! 남자/여자 화장실 버튼을 눌러주세요', 1600); return; }
  closeOverlay(); RIDE.rush = true; cartTo(RR_DOORS.m[0] + 1.6, (RR_DOORS.m[1] + RR_DOORS.w[1]) / 2, false, '급하시죠? 꽉 잡으세요, 밟습니다!', '거의 다 왔어요, 조금만 참으세요!');
};
function useRestroom(kind) {
  if (S.mode !== 'walk') return;
  const door = RR_DOORS[kind]; S.mode = 'restroom'; me.moveT = null; lastActKey = '';
  $('fade').classList.add('on'); sndDoor();
  const name = kind === 'm' ? '남자 화장실' : '여자 화장실';
  setTimeout(() => {
    me.av.visible = false; me.tag.style.visibility = 'hidden'; me.x = door[0] - 1.2; me.z = door[1];
    overlay(`<span class="eyebrow">${name}</span><h2 id="wcTitle">볼일 보는 중…</h2><div class="power wcbar"><div class="bar"><i id="wcPow"></i></div></div><p id="wcSub">잠시만 기다려 주세요. 노크는 사절이에요.</p><button class="btn sub" id="wcOut">급하게 나가기</button>`);
    $('fade').classList.remove('on');
    let t = 0; const steps = [[0, '볼일 보는 중…', '잠시만 기다려 주세요. 노크는 사절이에요.'], [2.4, '물 내리는 중…', '쏴아아~'], [3.6, '손 씻는 중…', '비누로 30초 꼼꼼하게!']];
    const iv = setInterval(() => {
      t += .1; const bar = $('wcPow'); if (!bar) { clearInterval(iv); return; }
      bar.style.width = Math.min(100, t / 5 * 100) + '%';
      for (const [at, h, sub] of steps) if (Math.abs(t - at) < .05) { $('wcTitle').textContent = h; $('wcSub').textContent = sub; if (at === 2.4) sndFlush(); if (at === 3.6) sndWash(); }
      if (t >= 5) { clearInterval(iv); leave(); }
    }, 100);
    const leave = () => {
      clearInterval(iv); closeOverlay(); sndDoor();
      me.x = door[0] + 1.2; me.z = door[1]; me.yaw = Math.PI / 2; me.av.visible = true; me.tag.style.visibility = '';
      S.mode = 'walk'; lastActKey = ''; me.jump = .8; showBubble(me, ['개운하다~', '살았다!', '이제 좀 치겠네'][Math.random() * 3 | 0]);
    };
    $('wcOut').onclick = leave;
  }, 450);
}
function okReady() { return S.okTix > 0 && S.ball.state === 'rest' && S.ballVis && surface(S.ball.x, S.ball.z) === 'green' && distToCup() < 1.6; }
function useOk() { if (!okReady() || S.mode !== 'walk') return; S.okTix--; renderTix(); S.strokes++; S.mode = 'wait'; showBubble(me, 'OK 감사합니다~'); finishHole('OK! 컨시드'); }
function pickUp() {
  if (S.mode !== 'walk') return;
  overlay(`<span class="eyebrow">${S.hole + 1}번 홀 · PAR ${hole().par}</span><h2>이 홀은 여기까지 할까요?</h2><p>홀아웃하면 이 홀은 <b>더블파(${hole().par * 2}타)</b>로 기록되고 다음 홀로 넘어가요.</p>
    <div class="btns"><button class="btn" id="pickYes">홀아웃할게요</button><button class="btn sub" id="pickNo">계속 칠게요</button></div>`, true);
  $('pickNo').onclick = closeOverlay;
  $('pickYes').onclick = () => { closeOverlay(); S.strokes = hole().par * 2; S.mode = 'wait'; S.ballVis = false; showBubble(me, '다음 홀에서 만회!'); finishHole('홀아웃'); };
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
  const d = s - h.par, level = s === 1 ? 3 : d <= -2 ? 2 : d === -1 ? 1 : 0;
  if (level === 3) { S.st.hio++; sendNet({ t: 'hio', h: S.hole, c: S.shotChance ? 1 : 0 }); } else if (level === 2) S.st.eagle++; else if (level === 1) S.st.birdie++;
  if (level) { recMark(s === 1 ? '홀인원' : d <= -3 ? '알바트로스' : d === -2 ? '이글' : '버디', `${S.hole + 1}번 홀 ${s}타 · ${fmtDiff(d)}`); recStopIn([0, 3200, 4200, 5600][level]); } else recStopIn(900);
  if (h.ev === 'gallery') { galleryCheer(true); if (!level) { confetti(160, false); toast('갤러리: 와아아~~ 수고하셨습니다!', 2200); } }
  if (level) celebrate(level, s === 1 ? '홀인원!!!' : d <= -3 ? '알바트로스!!' : d === -2 ? '이글!!' : '버디!', `${S.hole + 1}번 홀 ${s}타 · ${fmtDiff(d)}`);
  const go = () => { cam.mode = 'follow'; if (S.hole === HOLES.length - 1) endRound(); else nextHoleCard(s); };
  const hi = S.hole;
  setTimeout(() => { if (level === 3) showPlaque(hi, go); else go(); }, [1600, 3000, 3800, 5200][level]);
}
function nextHoleCard(s) {
  const done = S.hole, n = HOLES[done + 1];
  const shade = done === 3 || (done === 5 && !S.mulligans && !S.okTix);
  overlay(`<span class="eyebrow">${done + 1}번 홀 ${s}타 (${fmtDiff(s - HOLES[done].par)}) · 합계 ${fmtDiff(totalDiff())}</span>
    <h2>다음은 ${done + 2}번 홀, ${esc(n.name)}</h2><p class="evtag"><b>${HOLE_EV[n.ev][0]}</b> ${HOLE_EV[n.ev][1]}</p><p>PAR ${n.par}. ${shade ? '그늘집에 들러 보세요. 음식을 사 먹으면 멀리건·OK권을 받아요.' : '노란 점선이 공략 경로예요. 아래 T가 티, 위 깃발이 그린이에요.'}</p>
    <canvas class="guide-map" id="guideMap" width="560" height="500" aria-label="다음 홀 지도"></canvas>
    <p class="guide-tip"><b>토끼 캐디</b> ${esc(HOLE_TIPS[done + 1] || '')}</p>
    <div class="btns">${shade ? '<button class="btn" id="goShade">그늘집 들르기</button>' : ''}<button class="btn${shade ? ' sub' : ''}" id="goCart">카트 타고 티로</button><button class="btn sub" id="goWalk">걸어가기</button></div>`);
  S.hole = done + 1; S.strokes = 0; S.prev = null; S.last = null; S.zoneUsed = {}; S.okHinted = false; S.crocDone = false;
  const t = HOLES[S.hole].tee; Object.assign(S.ball, { x: t[0], y: 0, z: t[1], vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
  S.mode = 'walk'; lastActKey = ''; updHud(); renderCard(); bindGuide(S.hole);
  $('goCart').onclick = () => { closeOverlay(); cartTo(t[0], t[1], true, '다음 홀로 모실게요~', holeTalk(S.hole)); };
  $('goWalk').onclick = () => { closeOverlay(); walkToBall(); };
  if (shade) $('goShade').onclick = () => { closeOverlay(); cartTo(SHADE.x + rand(-1, 1), SHADE.z + 5.3, false, '그늘집으로 모실게요~', '당근주스가 진짜 맛있어요. 꼭 드셔보세요!'); };
}
let shadeTimer = 0;
function shadeNames() {
  const list = [...NET.others.values()].filter(o => Math.hypot(o.x - SHADE.x, o.z - SHADE.z) < 7).map(o => o.nick);
  return list.length ? `지금 그늘집에 ${esc(list.slice(0, 5).join(', '))}${list.length > 5 ? ` 외 ${list.length - 5}명` : ''} 님이 쉬고 있어요.` : '그늘집이 한산하네요. 혼자 여유롭게 쉬어가세요.';
}
function showShade() {
  const had = S.buff && MENU.find(m => m.id === S.buff);
  overlay(`<span class="eyebrow">그늘집 · 오늘의 메뉴</span><h2>${had ? '또 오셨네요!' : '잠깐 쉬었다 가세요'}</h2>
    <p>${had ? `이미 ${esc(had.chip)} 효과가 있어요. 이번엔 간식으로 맛있게만 드세요~` : '하나 고르면 라운딩 끝까지 효과가 있어요.'}</p>
    <div class="menu">${MENU.map(m => `<button type="button" data-id="${m.id}"><span class="it">${m.name}</span><span class="pc">${m.price}</span><span class="ef">${m.eff}</span></button>`).join('')}</div>
    <div class="shade-now" id="shadeNow">${shadeNames()}</div><button class="btn sub" id="shadeClose">그냥 구경만 할게요</button>`);
  shadeTimer = setInterval(() => { const el = $('shadeNow'); if (el) el.innerHTML = shadeNames(); }, 1500);
  $('shadeClose').onclick = closeOverlay;
  document.querySelectorAll('.menu button').forEach(b => b.onclick = () => { eatFood(MENU.find(x => x.id === b.dataset.id)); });
  document.querySelector('.menu button').focus();
}
const MASCOT = document.querySelector('.lobby .mascot').outerHTML;
function endRound() {
  const tot = S.scores.reduce((a, b) => a + b, 0), d = tot - TOTAL_PAR, best = getBest(), nb = best == null || tot < best;
  if (nb) setBest(tot);
  const line = d <= -3 ? '당근 CC 클럽 챔피언 감이에요.' : d <= 0 ? '오늘 샷감 좋네요.' : d <= 4 ? '무난한 라운딩이었어요.' : '다음엔 그늘집부터 들르세요.';
  const card = storyCard(), cardUrl = card.toDataURL('image/png');
  overlay(`<span class="eyebrow">라운딩 완료 · ${esc(NET.nick)}</span><h2>${tot}타 · ${fmtDiff(d)}</h2>
    <p>PAR ${TOTAL_PAR} 기준. ${nb ? '새 베스트 기록이에요. ' : `베스트 ${best}타. `}${line}</p>
    <img class="story" src="${cardUrl}" alt="라운딩 결과 카드">
    <div class="btns">${IS_DEMO() ? '<p class="cs">미리보기에서는 저장이 안 돼요. 실제 사이트에서 저장·공유할 수 있어요.</p>' : `<a class="btn" href="${cardUrl}" download="carrot-cc-round.png">결과 카드 저장</a>${navigator.canShare ? '<button class="btn sub" type="button" id="cardShare">스토리에 공유</button>' : ''}`}</div>
    <div class="btns"><button class="btn sub" id="again">다시 라운딩</button><button class="btn sub" id="stroll">코스 산책하기</button></div>`);
  if ($('cardShare')) $('cardShare').onclick = () => card.toBlob(async b => { if (!(await shareBlob(b, 'carrot-cc-round.png', `당근 CC ${tot}타! ${siteHost()} @ttanjit.lab`))) toast('이 기기에서는 바로 공유가 안 돼요. 저장 후 올려 주세요', 2200); }, 'image/png');
  $('again').onclick = () => { closeOverlay(); resetRound(true); };
  $('stroll').onclick = () => { closeOverlay(); S.mode = 'walk'; S.ballVis = false; S.ball.state = 'done'; lastActKey = ''; toast('천천히 둘러보세요. 오른쪽 위 스코어카드에서 새 라운딩을 시작할 수 있어요', 2800); showAgainInSheet(); };
}
function showAgainInSheet() { const s = $('cardSheet'); if (!$('againSheet')) s.insertAdjacentHTML('beforeend', '<button class="btn" id="againSheet">새 라운딩 시작</button>'); $('againSheet').onclick = () => { s.hidden = true; $('againSheet').remove(); resetRound(true); }; }
function renderCard() {
  const cell = (s, i) => { if (s == null) return ''; const d = s - HOLES[i].par; const k = d <= -2 ? 'e' : d === -1 ? 'b' : d === 1 ? 'bo' : d >= 2 ? 'db' : ''; return `<span class="mk ${k}">${s}</span>`; };
  let h = '<tr><th class="rl">HOLE</th>', p = '<tr><td class="rl">PAR</td>', s = '<tr><td class="rl">타수</td>';
  HOLES.forEach((ho, i) => {
    if (i === 4) { h += '<th class="shade-col">쉼</th>'; p += '<td class="shade-col" rowspan="2">그늘집</td>'; }
    const cur = i === S.hole && S.scores[i] == null ? ' class="cur"' : '';
    h += `<th${cur}>${i + 1}</th>`; p += `<td>${ho.par}</td>`; s += `<td${cur}>${cell(S.scores[i], i)}</td>`;
  });
  const played = S.scores.filter(x => x != null); const tot = played.reduce((a, b) => a + b, 0);
  $('sc').innerHTML = h + '<th>합계</th></tr>' + p + `<td>${TOTAL_PAR}</td></tr>` + s + `<td>${played.length ? tot : ''}</td></tr>`;
}
function resetRound(teleport) {
  closeOverlay(); S.scores.fill(null); S.buff = null; S.mulligans = 0; S.okTix = 0; S.zoneUsed = {}; S.okHinted = false; S.crocDone = false; S.chance = CHANCE_MAX; S.spent = 0; renderSpent(); S.st = newStats(); S.hole = 0; S.strokes = 0; S.prev = null; S.last = null; S.mode = 'walk';
  $('buffChip').hidden = true;
  const t = HOLES[0].tee; Object.assign(S.ball, { x: t[0], y: 0, z: t[1], vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
  if (teleport) cartTo(t[0], t[1], true, '1번 홀로 다시 모실게요~', holeTalk(0));
  lastActKey = ''; updHud(); renderCard();
}

// ================= 캐디 찬스: 캐디가 방향과 파워를 미리 계산해 줘요 =================
const CHANCE_MAX = 2, CHANCE_BAND = .025;
function simShot(yaw, p, club, dt) {
  const lie = surface(S.ball.x, S.ball.z), v = launchVel(p, yaw, club, lie);
  const b = { x: S.ball.x, y: heightAt(S.ball.x, S.ball.z), z: S.ball.z, vx: v.vx, vy: v.vy, vz: v.vz, state: v.putt ? 'roll' : 'fly' };
  for (let i = 0; i < 3000; i++) {
    const e = stepBall(b, dt, true);
    if (e === 'sink') return { sink: true, d: 0, x: b.x, z: b.z };
    if (e === 'water' || e === 'ob') return { sink: false, d: 999, x: b.x, z: b.z };
    if (e === 'stop') break;
  }
  const h = hole(); return { sink: false, d: Math.hypot(b.x - h.cup[0], b.z - h.cup[1]), x: b.x, z: b.z };
}
function caddieChance() {
  if (S.mode !== 'aim' || S.chanceBusy) return;
  if (S.chance <= 0) { toast('캐디 찬스를 다 썼어요', 1400); return; }
  S.chanceBusy = true; lastActKey = '';
  showCaddieTip('<b>토끼 캐디</b> 잠깐만요, 라이 좀 볼게요…');
  setTimeout(() => {
    const h = hole(), onGreen = surface(S.ball.x, S.ball.z) === 'green';
    const base = Math.atan2(h.cup[0] - S.ball.x, h.cup[1] - S.ball.z), tg = aimTarget(), base2 = Math.atan2(tg[0] - S.ball.x, tg[1] - S.ball.z);
    const ac = autoClub(), clubs = onGreen ? [3] : [...new Set([ac, Math.max(0, ac - 1), Math.min(2, ac + 1)])];
    let best = null;
    const consider = (yaw, p, club, dt) => { const r = simShot(yaw, p, club, dt); const score = r.sink ? -1 : r.d; if (!best || score < best.score) best = { yaw, p, club, score, r }; };
    // 1단계: 넓게 훑기 (핀 방향과 공략 지점 방향 둘 다)
    const bases = Math.abs(angDiff(base, base2)) < .05 ? [base] : [base, base2];
    for (const club of clubs) for (const b0 of bases) for (let dy = -.35; dy <= .351; dy += .07) for (let p = .16; p <= 1.001; p += .08) consider(b0 + dy, Math.min(1, p), club, 1 / 40);
    // 2단계: 가장 좋은 곳 주변을 촘촘하게
    const c = best;
    for (let dy = -.05; dy <= .051; dy += .01) for (let dp = -.07; dp <= .071; dp += .014) { const p = clamp(c.p + dp, .05, 1); consider(c.yaw + dy, p, c.club, 1 / 100); }
    // 실제 샷과 같은 촘촘한 계산으로 한 번 더 확인
    const fin = simShot(best.yaw, best.p, best.club, 1 / 200); best.r = fin;
    S.chanceBusy = false; S.chance--; S.st.chance++; S.club = best.club; S.clubAuto = false; S.aimYaw = best.yaw; cam.aimYaw = best.yaw;
    S.chanceT = { yaw: best.yaw, p: best.p, club: best.club };
    const exp = fin.sink ? S.strokes + 1 : S.strokes + 2, nm = scoreName(exp, h.par).replace('!', '');
    const side = angDiff(base, best.yaw), dir = Math.abs(side) < .03 ? '핀 정면' : side > 0 ? '핀 왼쪽' : '핀 오른쪽';
    const pct = Math.round(best.p * 100);
    const line = fin.sink ? (S.strokes === 0 ? `이대로만 치면 <b>홀인원 각</b>이에요!!` : `이대로면 <b>들어가요</b>! ${nm} 찬스!`)
      : fin.d < 1.1 ? `OK 거리에 붙어요. 성공하면 <b>${nm}</b>!` : `핀까지 ${Math.round(fin.d * M_PER_U)}m 남기는 게 최선이에요.`;
    showCaddieTip(`<b>토끼 캐디</b> ${dir} 보고 <b>${CLUBS[best.club].name} ${pct}%</b>로 치세요. ${line} <br><small>파워바 반짝이는 칸에서 떼면 캐디 말대로 쳐져요 · 남은 찬스 ${S.chance}번</small>`);
    const pt = $('powTarget'); pt.hidden = false; pt.style.left = `${Math.max(0, (best.p - CHANCE_BAND) * 100)}%`; pt.style.width = `${CHANCE_BAND * 200}%`;
    lastActKey = ''; tone(880, .08, 'sine', .1); tone(1175, .12, 'sine', .1, .1);
  }, 60);
}
function showCaddieTip(html) { const el = $('caddieTip'); el.innerHTML = html; el.hidden = false; }
function clearChance(msg) {
  if (!S.chanceT) return; S.chanceT = null; $('powTarget').hidden = true; $('caddieTip').hidden = true; if (msg) toast(msg, 1400);
}

// ================= 그늘집에서 먹기 =================
const EAT_LINES = {
  carrot: ['쭈욱~', '눈이 맑아진다!', '당근은 역시 당근주스', '핀이 또렷하게 보여요'],
  ramen: ['후루룩~', '국물이 끝내줘요', '골프장 컵라면은 9,000원의 맛', '면발 쫄깃!'],
  makgeolli: ['캬~!', '파전도 하나 시킬걸', '한 잔만 더…?', '얼굴이 화끈화끈'],
  odeng: ['호호, 뜨거워', '국물 리필 되나요?', '꼬치가 두 개 더 있었네', '속이 든든~'],
  tteok: ['스읍… 맵다!', '하아 하아 물 주세요', '어묵도 들어있네', '정신이 번쩍 들어요'],
};
const EAT_SEC = 4.8, EAT = { on: false, t: 0, m: null, food: null, steam: null, step: -1, first: false };
let ownerTag = null, ownerT = 0, ownerAv = null;
function ownerSay(text, ms = 3200) { if (!ownerTag) return; const b = ownerTag.querySelector('.bub'); b.textContent = text; b.hidden = false; clearTimeout(ownerT); ownerT = setTimeout(() => { b.hidden = true; }, ms); }
function steamPuff(n) {
  const g = new T.BufferGeometry(), a = new Float32Array(n * 3); g.setAttribute('position', new T.BufferAttribute(a, 3));
  const p = new T.Points(g, new T.PointsMaterial({ color: 0xffffff, size: 10, sizeAttenuation: false, transparent: true, opacity: .55, depthWrite: false }));
  p.userData.seed = Array.from({ length: n }, () => [rand(-.06, .06), Math.random(), rand(-.06, .06)]); p.frustumCulled = false; return p;
}
function makeFood(id) {
  const g = new T.Group(), ph = (c, o = {}) => new T.MeshPhongMaterial({ color: c, shininess: 30, ...o });
  const add = (geo, m, x, y, z) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  let steamY = 0;
  if (id === 'carrot') {
    add(new T.CylinderGeometry(.13, .11, .36, 18, 1, true), ph(0xffffff, { transparent: true, opacity: .3, side: T.DoubleSide, shininess: 90 }), 0, .18, 0);
    add(new T.CylinderGeometry(.12, .1, .3, 18), ph(0xf0861f, { emissive: 0x6a2a00 }), 0, .15, 0);
    const st = add(new T.CylinderGeometry(.013, .013, .5, 6), ph(0xd2442c), .04, .36, 0); st.rotation.z = -.28;
    const c = makeMiniCarrot(.55); c.position.set(-.1, .3, 0); c.rotation.z = .5; g.add(c);
  } else if (id === 'ramen') {
    add(new T.CylinderGeometry(.17, .12, .32, 20), ph(0xfdfbf6), 0, .16, 0);
    add(new T.CylinderGeometry(.172, .158, .1, 20, 1, true), ph(0xd2442c, { side: T.DoubleSide }), 0, .21, 0);
    const n = add(new T.CircleGeometry(.155, 20), ph(0xe8c46a, { emissive: 0x3a2a00 }), 0, .31, 0); n.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; add(new T.TorusGeometry(.04, .012, 5, 10), ph(0xf0d27a), Math.cos(a) * .08, .32, Math.sin(a) * .08).rotation.x = Math.PI / 2; }
    for (const z of [-.03, .03]) { const c = add(new T.CylinderGeometry(.008, .008, .55, 6), ph(0x8a5a35), .05, .36, z); c.rotation.z = Math.PI / 2 - .15; }
    const lid = add(new T.PlaneGeometry(.3, .3), ph(0xfdfbf6, { side: T.DoubleSide }), -.12, .42, -.08); lid.rotation.set(-.6, 0, .4);
    steamY = .35;
  } else if (id === 'makgeolli') {
    add(new T.CylinderGeometry(.2, .13, .14, 22), ph(0xd9b45a, { shininess: 100, specular: 0xffffff }), 0, .07, 0);
    const lq = add(new T.CircleGeometry(.185, 22), ph(0xf6f1e4), 0, .135, 0); lq.rotation.x = -Math.PI / 2;
    add(new T.CylinderGeometry(.15, .17, .32, 18), ph(0xd9b45a, { shininess: 100, specular: 0xffffff }), .42, .16, 0);
    const sp = add(new T.CylinderGeometry(.02, .035, .2, 8), ph(0xd9b45a), .6, .26, 0); sp.rotation.z = -1;
    add(new T.SphereGeometry(.05, 8, 6), ph(0xd9b45a), .42, .35, 0);
    add(new T.CylinderGeometry(.26, .26, .02, 20), ph(0xffffff), -.45, .01, .05);
    add(new T.CylinderGeometry(.22, .22, .045, 20), ph(0xd99a3a, { emissive: 0x3a1a00 }), -.45, .045, .05); // 파전
    for (let i = 0; i < 5; i++) add(new T.BoxGeometry(.18, .012, .025), ph(0x3f9a4e), -.45 + rand(-.1, .1), .07, .05 + rand(-.1, .1)).rotation.y = Math.random() * 3;
  } else if (id === 'tteok') {
    add(new T.CylinderGeometry(.3, .26, .06, 24), ph(0xffffff), 0, .03, 0);
    const sauce = add(new T.CylinderGeometry(.25, .25, .03, 24), ph(0xd6301c, { emissive: 0x3a0800, shininess: 80 }), 0, .07, 0);
    for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rand(-.2, .2), r = rand(.04, .19), t2 = add(new T.CylinderGeometry(.03, .03, .16, 8), ph(0xf2e6d8, { emissive: 0x3a1206 }), Math.cos(a) * r, .1, Math.sin(a) * r); t2.rotation.set(Math.PI / 2, 0, a); t2.material.color.setHex(0xe8573a); }
    for (let i = 0; i < 3; i++) { const f = add(new T.BoxGeometry(.12, .02, .07), ph(0xd9a066), rand(-.12, .12), .11, rand(-.12, .12)); f.rotation.y = Math.random() * 3; }
    const egg = add(new T.SphereGeometry(.06, 10, 8), ph(0xffffff), .1, .12, -.05); egg.scale.y = .8; add(new T.SphereGeometry(.035, 8, 6), ph(0xffc21a), .1, .155, -.04);
    const fork = add(new T.CylinderGeometry(.008, .008, .32, 5), ph(0xd8b98a), -.2, .18, .1); fork.rotation.z = 1.1;
    steamY = .12;
  } else if (id === 'odeng') {
    add(new T.CylinderGeometry(.1, .08, .22, 16), ph(0xfdfbf6), 0, .11, 0);
    const br = add(new T.CircleGeometry(.095, 16), ph(0xc9a46a), 0, .2, 0); br.rotation.x = -Math.PI / 2;
    for (let k = 0; k < 3; k++) {
      const sk = new T.Group(); sk.position.set(.3 + k * .14, .05, -.05 + k * .05); sk.rotation.set(0, k * .4, .9); g.add(sk);
      const stick = new T.Mesh(new T.CylinderGeometry(.008, .008, .7, 5), ph(0xd8b98a)); stick.position.y = .2; sk.add(stick);
      for (let j = 0; j < 4; j++) { const f = new T.Mesh(new T.BoxGeometry(.16, .07, .03), ph(0xc8925a, { emissive: 0x2a1400 })); f.position.set(j % 2 ? .04 : -.04, .1 + j * .08, 0); f.rotation.z = j % 2 ? .4 : -.4; sk.add(f); }
    }
    steamY = .24;
  }
  if (steamY) { const s = steamPuff(18); s.position.y = steamY; s.userData.h = .7; g.add(s); g.userData.steam = s; }
  return g;
}
function updateSteam(s, dt) {
  const a = s.geometry.attributes.position.array, seed = s.userData.seed;
  seed.forEach((q, i) => { q[1] = (q[1] + dt * .45) % 1; a[i * 3] = q[0] + Math.sin(q[1] * 9 + i) * .04; a[i * 3 + 1] = q[1] * s.userData.h; a[i * 3 + 2] = q[2]; });
  s.geometry.attributes.position.needsUpdate = true; s.material.opacity = .45;
}
const sndSlurp = () => { const a = audio(), m = out(); if (!a || !m) return; noise(.35, 900, 2, .18); const o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(300, a.currentTime); o.frequency.exponentialRampToValueAtTime(900, a.currentTime + .3); g.gain.setValueAtTime(.05, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .32); o.connect(g).connect(m); o.start(); o.stop(a.currentTime + .33); };
const sndGulp = () => { tone(180, .12, 'sine', .2); tone(120, .14, 'sine', .18, .13); };
const sndChew = () => { noise(.06, 1500, 2, .14); noise(.06, 1300, 2, .12, .14); };
const sndKya = () => { const a = audio(), m = out(); if (!a || !m) return; const o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(500, a.currentTime); o.frequency.linearRampToValueAtTime(900, a.currentTime + .12); o.frequency.linearRampToValueAtTime(400, a.currentTime + .4); g.gain.setValueAtTime(.04, a.currentTime); g.gain.exponentialRampToValueAtTime(.001, a.currentTime + .45); o.connect(g).connect(m); o.start(); o.stop(a.currentTime + .46); };
const EAT_SND = { carrot: sndGulp, ramen: sndSlurp, makgeolli: sndGulp, odeng: sndChew, tteok: sndChew };
const priceOf = m => +m.price.replace(/[^0-9]/g, '');
function eatFood(m) {
  closeOverlay(); EAT.first = !S.buff; S.mode = 'eat'; lastActKey = ''; me.moveT = null;
  const sx = SHADE.x - .6 + rand(-.5, .5), seat = new T.Vector3(sx, SHADE_LV + .62, SHADE.z + 1.35);
  me.x = seat.x; me.z = seat.z; me.yaw = Math.PI; me.seat = seat; me.seatPitch = 0; me.anim = 4; me.eating = true;
  const food = makeFood(m.id); food.position.set(sx, SHADE_LV + 1.33, SHADE.z + .3); food.rotation.y = rand(-.4, .4); scene.add(food);
  Object.assign(EAT, { on: true, t: 0, m, food, step: -1 });
  ownerSay(`${m.name} 나왔습니다~ 맛있게 드세요!`); tone(880, .06, 'sine', .08); tone(1320, .1, 'sine', .08, .08);
  showCaddieTip(`<b>그늘집</b> ${esc(m.name)} 먹는 중…<span class="eatbar"><i id="eatPow"></i></span>`);
}
function updateEat(dt, t) {
  if (!EAT.on) return;
  EAT.t += dt; const k = Math.min(1, EAT.t / EAT_SEC), lines = EAT_LINES[EAT.m.id];
  const step = Math.floor(EAT.t / 1.15);
  if (step !== EAT.step && step < lines.length) { EAT.step = step; showBubble(me, lines[step]); (EAT_SND[EAT.m.id] || sndChew)(); if (EAT.m.id === 'makgeolli' && step === 0) setTimeout(sndKya, 250); }
  const sc = 1 - k * .65; EAT.food.scale.setScalar(sc);
  if (EAT.food.userData.steam) updateSteam(EAT.food.userData.steam, dt);
  const bar = $('eatPow'); if (bar) bar.style.width = (k * 100) + '%';
  if (k >= 1) finishEat();
}
function finishEat() {
  if (!EAT.on) return; EAT.on = false;
  const m = EAT.m; scene.remove(EAT.food); EAT.food = null;
  me.seat = null; me.anim = 0; me.eating = false; me.x = SHADE.x - .6; me.z = SHADE.z + 2.6; me.yaw = 0; me.jump = .7; cam.yaw = Math.PI;
  S.mode = 'walk'; lastActKey = ''; $('caddieTip').hidden = true;
  S.spent = (S.spent || 0) + priceOf(m); renderSpent(); S.st.menus.push(m.name.replace('갓 짠 ', '').replace('그늘집 ', ''));
  toast(`${m.price} 결제 완료 · 그늘집 가격은 원래 이래요`, 2200);
  S.mulligans += m.tix[0]; S.okTix += m.tix[1]; renderTix(); setTimeout(() => toast(`${m.tix[0] ? `멀리건 ${m.tix[0]}장 ` : ''}${m.tix[1] ? `OK권 ${m.tix[1]}장 ` : ''}받았어요!`, 2000), 4600);
  if (EAT.first) { S.buff = m.id; const c = $('buffChip'); c.textContent = m.chip; c.hidden = false; setTimeout(() => toast(`${m.chip} 효과가 생겼어요`, 2000), 2300); }
  if (m.id === 'makgeolli') { S.st.tipsy = true; me.tipsy = 60; setTimeout(() => toast('취기가 올라와요… 1분 동안 비틀비틀', 2000), EAT.first ? 4500 : 2300); }
  showBubble(me, ['배부르다~', '잘 먹었습니다!', '역시 그늘집은 비싸도 맛있어'][Math.random() * 3 | 0]);
  setTimeout(() => ownerSay('또 오세요~ 라운딩 끝나고도 열려 있어요'), 1200);
}
function renderTix() { const c = $('tixChip'); c.hidden = !(S.mulligans || S.okTix); c.textContent = `멀리건 ${S.mulligans} · OK권 ${S.okTix}`; lastActKey = ''; }
function renderSpent() { const el = $('spent'); if (!el) return; el.hidden = !S.spent; el.innerHTML = `오늘 그늘집에서 쓴 돈 <b>${(S.spent || 0).toLocaleString('ko-KR')}원</b>`; }

// ================= 하이라이트 자동 녹화 (세로 9:16, 소리 포함) =================
const REC = { canvas: null, g: null, rec: null, chunks: [], on: false, mark: null, stopAt: 0, t0: 0, ov: null, pending: false, clips: [], audioDest: null };
const REC_RANK = { '홀인원': 5, '알바트로스': 4, '이글': 4, '악어한테 공 뺏김': 3, '악어가 공을 물어감': 3, '버디': 2, '고라니 출몰': 2, '멧돼지 출몰': 2, '까마귀가 공 가져감': 2, '거위 가족 행차': 1 };
const canRecord = () => !!(window.MediaRecorder && HTMLCanvasElement.prototype.captureStream && renderer);
function recMime() { for (const m of ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {} } return ''; }
function recStart() {
  if (!canRecord()) return;
  if (REC.on) { if (REC.mark) { REC.pending = true; REC.stopAt = performance.now(); } else { REC.discard = true; REC.pending = true; try { REC.rec.stop(); } catch {} } return; }
  if (!REC.canvas) { REC.canvas = document.createElement('canvas'); REC.canvas.width = 720; REC.canvas.height = 1280; REC.g = REC.canvas.getContext('2d'); }
  let stream; try { stream = REC.canvas.captureStream(30); } catch { return; }
  try { const a = audio(), m = out(); if (a && m && a.createMediaStreamDestination) { if (!REC.audioDest) { REC.audioDest = a.createMediaStreamDestination(); m.connect(REC.audioDest); } const tr = REC.audioDest.stream.getAudioTracks()[0]; if (tr) stream.addTrack(tr); } } catch {}
  const mime = recMime(); REC.chunks = [];
  try { REC.rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined); } catch { try { REC.rec = new MediaRecorder(stream); } catch { return; } }
  REC.rec.ondataavailable = e => { if (e.data && e.data.size) REC.chunks.push(e.data); };
  REC.rec.onstop = () => {
    clearTimeout(REC.watch);
    const mark = REC.discard ? null : REC.mark; REC.on = false; REC.mark = null; REC.ov = null; REC.discard = false; $('recDot') && ($('recDot').hidden = true);
    const size = REC.chunks.reduce((a, c) => a + c.size, 0);
    if (mark && size < 4000) toast('이 화면에서는 영상 녹화가 안 됐어요. 크롬·사파리 최신 버전의 실제 사이트에서 해 보세요', 3000);
    else if (mark && REC.chunks.length) addClip(new Blob(REC.chunks, { type: (REC.rec.mimeType || mime || 'video/webm').split(';')[0] }), mark);
    if (REC.pending) { REC.pending = false; recStart(); }
  };
  try { REC.rec.start(400); } catch { return; }
  REC.on = true; REC.mark = null; REC.stopAt = 0; REC.t0 = performance.now(); REC.ov = null;
}
function recMark(title, sub) {
  if (!REC.on) recStart(); if (!REC.on) return;
  if (!REC.mark || (REC_RANK[title] || 0) >= (REC_RANK[REC.mark.title] || 0)) REC.mark = { title, sub: sub || '', at: new Date() };
  REC.ov = { title, sub: sub || '', t: performance.now() }; REC.stopAt = 0; REC.lastMark = performance.now();
  const d = $('recDot'); if (d) { d.hidden = false; d.querySelector('span').textContent = `'${REC.mark.title}' 녹화 중`; }
}
function recStopIn(ms) { if (REC.on && !REC.pending) REC.stopAt = performance.now() + ms; }
function carrotIcon(g, x, y, s) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = '#3f9a4e'; g.beginPath(); g.ellipse(-3, -12, 2.4, 6, -.4, 0, TAU); g.ellipse(3, -12, 2.4, 6, .4, 0, TAU); g.ellipse(0, -13, 2.4, 6.5, 0, 0, TAU); g.fill(); g.fillStyle = '#f08a2f'; g.beginPath(); g.moveTo(-7, -7); g.quadraticCurveTo(0, -10, 7, -7); g.quadraticCurveTo(4, 4, 0, 16); g.quadraticCurveTo(-4, 4, -7, -7); g.fill(); g.restore(); }
function recFrame() {
  if (!REC.on) return;
  const g = REC.g, W = 720, H = 1280, src = renderer.domElement, sw = src.width, sh = src.height;
  const cw = Math.min(sw, sh * W / H), chh = cw * H / W, sx = (sw - cw) / 2, sy = Math.max(0, (sh - chh) / 2);
  g.fillStyle = '#4c8b40'; g.fillRect(0, 0, W, H);
  try { g.drawImage(src, sx, sy, cw, Math.min(sh, chh), 0, chh > sh ? (H - sh * W / cw) / 2 : 0, W, chh > sh ? sh * W / cw : H); } catch {}
  const fx = $('fx'); if (fx && fx.width) { const fsc = fx.width / sw; try { g.drawImage(fx, sx * fsc, sy * fsc, cw * fsc, Math.min(sh, chh) * fsc, 0, 0, W, H); } catch {} }
  // 위: 로고 / 아래: 주소
  let gr = g.createLinearGradient(0, 0, 0, 170); gr.addColorStop(0, 'rgba(10,20,12,.7)'); gr.addColorStop(1, 'rgba(10,20,12,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 170);
  carrotIcon(g, 52, 70, 2.2); g.fillStyle = '#ff9248'; g.font = `400 54px ${FONT}`; g.textBaseline = 'middle'; g.fillText('당근 CC', 88, 72);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `600 24px "IBM Plex Sans KR",sans-serif`; g.textAlign = 'right'; g.fillText(`${S.hole + 1}번 홀 · ${S.strokes}타`, W - 34, 72); g.textAlign = 'start';
  gr = g.createLinearGradient(0, H - 190, 0, H); gr.addColorStop(0, 'rgba(10,20,12,0)'); gr.addColorStop(1, 'rgba(10,20,12,.75)'); g.fillStyle = gr; g.fillRect(0, H - 190, W, 190);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `700 30px "IBM Plex Sans KR",sans-serif`; g.fillText(NET.nick || '당근 골퍼', W / 2, H - 98);
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `500 24px "IBM Plex Sans KR",sans-serif`; g.fillText(`${siteHost()} 에서 같이 쳐요 · @ttanjit.lab`, W / 2, H - 56);
  // 하이라이트 글자
  if (REC.ov) {
    const k = (performance.now() - REC.ov.t) / 1000;
    if (k < 3.2) {
      const sc = k < .35 ? .4 + k / .35 * .75 : 1.15 - Math.min(.15, (k - .35) * .5), al = k > 2.7 ? 1 - (k - 2.7) / .5 : 1;
      g.save(); g.globalAlpha = Math.max(0, al); g.translate(W / 2, H * .3); g.scale(sc, sc); g.rotate(Math.sin(k * 6) * .03);
      g.font = `400 120px ${FONT}`; g.lineJoin = 'round'; g.lineWidth = 16; g.strokeStyle = '#b8521a'; g.strokeText(REC.ov.title, 0, 0); g.fillStyle = REC.ov.title.includes('홀인원') ? '#fff6c8' : '#ffffff'; g.fillText(REC.ov.title, 0, 0);
      if (REC.ov.sub) { g.font = `700 34px "IBM Plex Sans KR",sans-serif`; g.lineWidth = 8; g.strokeStyle = 'rgba(10,20,12,.8)'; g.strokeText(REC.ov.sub, 0, 92); g.fillStyle = '#fff'; g.fillText(REC.ov.sub, 0, 92); }
      g.restore();
    }
  }
  g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  const now = performance.now();
  if (!REC.stopAt && !REC.mark && now - REC.t0 > 20000) REC.stopAt = now; // 아무 일 없으면 20초에서 끊기
  if (now - REC.t0 > 30000 && !REC.stopAt) REC.stopAt = now;              // 길어도 30초
  if (REC.mark && !REC.stopAt && now - REC.lastMark > 7000) REC.stopAt = now; // 장면이 끝났는데 멈춤 신호가 없으면 7초 뒤 저장
  if (REC.mark && REC.stopAt) { const d = $('recDot'); if (d) d.querySelector('span').textContent = `'${REC.mark.title}' 저장까지 ${Math.max(0, Math.ceil((REC.stopAt - now) / 1000))}초`; }
  if (REC.stopAt && now >= REC.stopAt) { REC.stopAt = 0; const hadMark = !!REC.mark; try { REC.rec.stop(); } catch { REC.on = false; }
    if (hadMark) { const d = $('recDot'); if (d) d.querySelector('span').textContent = '영상 만드는 중…'; }
    clearTimeout(REC.watch); REC.watch = setTimeout(() => { if (!REC.on) return; REC.on = false; REC.mark = null; $('recDot').hidden = true; if (hadMark) toast('영상 저장에 실패했어요. 이 브라우저에서는 녹화가 안 될 수 있어요', 2800); }, 15000); }
}
const siteHost = () => (location.host && !/^(localhost|127\.|null)/.test(location.host) && !location.host.includes('claude') ? location.host : 'carrot-cc.onrender.com');
const IS_DEMO = () => !!window.__CARROT_DEMO__;
async function shareBlob(blob, name, text) {
  try { const f = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text }); return true; } } catch {}
  return false;
}
function addClip(blob, mark) {
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm', url = URL.createObjectURL(blob);
  REC.clips.unshift({ blob, url, ext, ...mark });
  while (REC.clips.length > 6) URL.revokeObjectURL(REC.clips.pop().url);
  const b = $('clipBtn'); b.hidden = false; $('clipN').textContent = REC.clips.length; b.classList.remove('new'); void b.offsetWidth; b.classList.add('new');
  // 저장됐다는 걸 영상 썸네일과 함께 보여줘요
  const pop = $('clipPop'); pop.innerHTML = `<video src="${url}" muted autoplay loop playsinline></video><div><b>하이라이트 저장 완료</b><span>${esc(mark.title)} · ${(blob.size / 1e6).toFixed(1)}MB</span><button type="button" class="btn" id="clipPopOpen">보기·저장</button></div><button type="button" class="xbtn" id="clipPopX" aria-label="닫기">✕</button>`;
  pop.hidden = false; clearTimeout(addClip.t); addClip.t = setTimeout(() => { pop.hidden = true; }, 7000);
  $('clipPopX').onclick = () => { pop.hidden = true; }; $('clipPopOpen').onclick = () => { pop.hidden = true; $('clipBtn').click(); };
  renderClips();
}
function renderClips() {
  const box = $('clips'); if (!box) return;
  if (!REC.clips.length) { box.innerHTML = `<p class="empty">${canRecord() ? '아직 하이라이트가 없어요. 버디나 악어를 만나면 자동으로 녹화돼요.' : '이 브라우저는 영상 녹화를 지원하지 않아요. 크롬이나 사파리 최신 버전에서 열어 주세요.'}</p>`; return; }
  const canShare = !!navigator.canShare && !IS_DEMO();
  box.innerHTML = REC.clips.map((c, i) => `<div class="clip"><video src="${c.url}" muted playsinline loop preload="metadata" aria-label="${esc(c.title)} 영상"></video><div><div class="ct">${esc(c.title)}</div><div class="cs">${esc(c.sub)} · ${c.at.getHours()}:${String(c.at.getMinutes()).padStart(2, '0')}</div>
    <div class="btns">${IS_DEMO() ? '<span class="cs">미리보기에서는 저장이 안 돼요. 실제 사이트에서 저장할 수 있어요.</span>' : `<a class="btn" href="${c.url}" download="carrot-cc-${i + 1}.${c.ext}">영상 저장</a>${canShare ? `<button class="btn sub" type="button" data-share="${i}">공유</button>` : ''}`}</div></div></div>`).join('');
  box.querySelectorAll('video').forEach(v => { v.onmouseenter = () => v.play().catch(() => {}); v.onmouseleave = () => v.pause(); v.onclick = () => (v.paused ? v.play() : v.pause()).catch?.(() => {}); });
  box.querySelectorAll('[data-share]').forEach(b => b.onclick = async () => { const c = REC.clips[+b.dataset.share]; if (!(await shareBlob(c.blob, `carrot-cc.${c.ext}`, `당근 CC에서 ${c.title}! ${siteHost()} @ttanjit.lab`))) toast('이 기기에서는 바로 공유가 안 돼요. 영상 저장 후 올려 주세요', 2200); });
}
$('clipBtn').onclick = () => { const s = $('clipSheet'); const open = s.hidden; closeSheets(); s.hidden = !open; $('clipBtn').setAttribute('aria-expanded', String(open)); $('clipBtn').classList.remove('new'); renderClips(); };
$('clipClose').onclick = () => { $('clipSheet').hidden = true; $('clipBtn').setAttribute('aria-expanded', 'false'); };

// ================= 라운딩 결과 카드 (스토리용 1080×1920) =================
function newStats() { return { croc: 0, crow: 0, animals: [], chance: 0, menus: [], birdie: 0, eagle: 0, hio: 0, tipsy: false, ob: 0, water: 0 }; }
function roundTitle(st, d) {
  if (st.hio) return '홀인원 레전드';
  if (st.eagle) return '이글 사냥꾼';
  if (st.croc >= 2) return '악어 전용 공 공급책';
  if (st.tipsy) return '막걸리 골퍼';
  if ((S.spent || 0) >= 30000) return '그늘집 VIP';
  if (st.birdie >= 2) return '버디 수집가';
  if (st.animals.length >= 3) return '당근 CC 동물 박사';
  if (d <= 0) return '언더파 장인';
  return '당근 CC 정회원';
}
function storyCard() {
  const W = 1080, H = 1920, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const st = S.st || newStats(), tot = S.scores.reduce((a, b) => a + (b || 0), 0), d = tot - TOTAL_PAR;
  let gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2f6a35'); gr.addColorStop(1, '#1d3f22'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = .07; g.fillStyle = '#fff'; for (let y = 0; y < H; y += 120) g.fillRect(0, y, W, 60); g.restore();
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(W + 80, 260, 420, 0, TAU); g.fill();
  carrotIcon(g, 110, 150, 4.2); g.fillStyle = '#ff9248'; g.font = `400 96px ${FONT}`; g.textBaseline = 'middle'; g.fillText('당근 CC', 180, 154);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `600 30px "IBM Plex Mono",monospace`; g.fillText('ROUND REPORT', 186, 232);
  const dt = new Date(); g.textAlign = 'right'; g.fillText(`${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`, W - 80, 232); g.textAlign = 'start';
  // 이름과 칭호
  g.fillStyle = '#fff'; g.font = `400 84px ${FONT}`; g.fillText(NET.nick || '당근 골퍼', 80, 380);
  const title = roundTitle(st, d); g.font = `700 36px "IBM Plex Sans KR",sans-serif`; const tw = g.measureText(title).width + 48;
  g.fillStyle = '#ffd166'; g.beginPath(); g.roundRect ? g.roundRect(80, 432, tw, 64, 32) : g.rect(80, 432, tw, 64); g.fill(); g.fillStyle = '#3d2a08'; g.fillText(title, 104, 466);
  // 큰 점수
  g.fillStyle = '#fff'; g.font = `400 260px ${FONT}`; g.fillText(`${tot}`, 70, 680); const nw = g.measureText(`${tot}`).width;
  g.font = `400 80px ${FONT}`; g.fillStyle = 'rgba(255,255,255,.8)'; g.fillText('타', 90 + nw, 720);
  g.fillStyle = d <= 0 ? '#ffd166' : '#ff9248'; g.font = `400 120px ${FONT}`; g.textAlign = 'right'; g.fillText(fmtDiff(d).replace(' (이븐)', ''), W - 80, 690); g.textAlign = 'start';
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `500 30px "IBM Plex Sans KR",sans-serif`; g.textAlign = 'right'; g.fillText(`PAR ${TOTAL_PAR} 기준`, W - 80, 780); g.textAlign = 'start';
  // 홀별 점수
  const cw = (W - 160) / HOLES.length;
  HOLES.forEach((h, i) => {
    const x = 80 + i * cw, y = 840, sc = S.scores[i], dd = sc == null ? null : sc - h.par;
    g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.roundRect ? g.roundRect(x + 4, y, cw - 8, 170, 18) : g.rect(x + 4, y, cw - 8, 170); g.fill();
    g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `600 26px "IBM Plex Sans KR",sans-serif`; g.fillText(`${i + 1}H`, x + cw / 2, y + 36); g.font = `500 20px "IBM Plex Sans KR",sans-serif`; g.fillText(`P${h.par}`, x + cw / 2, y + 156);
    g.fillStyle = dd == null ? 'rgba(255,255,255,.4)' : dd < 0 ? '#ffd166' : '#fff'; g.font = `400 66px ${FONT}`; g.fillText(sc == null ? '-' : String(sc), x + cw / 2, y + 104);
    if (dd != null && dd < 0) { g.strokeStyle = '#ffd166'; g.lineWidth = 4; g.beginPath(); g.arc(x + cw / 2, y + 100, 38, 0, TAU); g.stroke(); }
    g.textAlign = 'start';
  });
  // 오늘의 기록
  const lines = [];
  const nice = [st.hio && `홀인원 ${st.hio}번`, st.eagle && `이글 ${st.eagle}개`, st.birdie && `버디 ${st.birdie}개`].filter(Boolean);
  lines.push(['명장면', nice.length ? nice.join(' · ') : '오늘은 파 행진']);
  lines.push(['악어에게 뺏긴 공', `${st.croc}개${st.croc >= 2 ? ' (악어 배부름)' : ''}`]);
  lines.push(['그늘집에서 쓴 돈', `${(S.spent || 0).toLocaleString('ko-KR')}원${st.menus.length ? ` · ${st.menus.slice(0, 2).join(', ')}` : ''}`]);
  lines.push(['만난 동물', st.animals.length ? st.animals.join(', ') : '조용한 하루']);
  lines.push(['캐디 찬스', `${st.chance}번 사용${st.chance === 0 ? ' (실력파)' : ''}`]);
  if (st.crow) lines.push(['까마귀가 옮긴 공', `${st.crow}개`]);
  g.fillStyle = '#fff'; g.font = `400 52px ${FONT}`; g.fillText('오늘의 기록', 80, 1100);
  lines.slice(0, 6).forEach(([k, v], i) => {
    const y = 1180 + i * 92; g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(80, y + 36, W - 160, 2);
    g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `500 32px "IBM Plex Sans KR",sans-serif`; g.fillText(k, 80, y);
    g.fillStyle = '#fff'; g.font = `700 34px "IBM Plex Sans KR",sans-serif`; g.textAlign = 'right'; let vv = v; while (g.measureText(vv).width > 560 && vv.length > 4) vv = vv.slice(0, -2); g.fillText(vv === v ? v : vv + '…', W - 80, y); g.textAlign = 'start';
  });
  // 아래
  carrotIcon(g, W / 2, 1735, 3); g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `700 36px "IBM Plex Sans KR",sans-serif`; g.fillText('같이 치러 와요 · @ttanjit.lab', W / 2, 1840);
  g.fillStyle = '#ffd166'; g.font = `600 34px "IBM Plex Mono",monospace`; g.fillText(siteHost(), W / 2, 1888); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
  return c;
}

// ================= 명예의 전당 =================
function relTime(at) { const m = Math.round((Date.now() - at) / 60000); if (m >= 1440 * 7) { const d = new Date(at); return `${d.getFullYear() % 100}.${d.getMonth() + 1}.${d.getDate()}`; } return m < 1 ? '방금' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; }
function renderHof() {
  const h = NET.hof; if (!h) return;
  document.querySelectorAll('.hofToday').forEach(e => e.textContent = h.today); document.querySelectorAll('.hofTotal').forEach(e => e.textContent = h.total);
  const top = (h.top || []).filter(t => t.n > 1);
  const topHtml = top.length ? `<li class="hof-top">${top.map((t, i) => `<span>${['🥇', '🥈', '🥉', '4위', '5위'][i]} ${esc(t.nick)} <b>${t.n}회</b></span>`).join('')}</li>` : '';
  const html = h.list.length ? topHtml + h.list.slice(0, 20).map((e, i) => `<li><span class="rk">#${h.total - i}</span><span class="nm">${esc(e.nick)}<small>${(e.h | 0) + 1}번 홀${e.c ? ' · 캐디 찬스' : ''}</small></span><span class="tm">${relTime(e.at)}</span></li>`).join('')
    : '<li class="empty">아직 아무도 없어요. 첫 주인공이 되어보세요!</li>';
  document.querySelectorAll('.hof-list').forEach(e => e.innerHTML = html);
}
setInterval(renderHof, 30000);

// ================= 축하 이벤트 (버디·이글·홀인원) =================
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const FIREWORKS = [];
function fireworks(x, y, z, n = 140) {
  if (!scene) return;
  const cols = [0xff8a3d, 0xffd166, 0x78c587, 0xff6f91, 0x7fd3ff, 0xffffff], col = cols[Math.random() * cols.length | 0];
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const u = Math.random() * 2 - 1, th = Math.random() * TAU, r = Math.sqrt(1 - u * u), sp = 9 + Math.random() * 5;
    vel.push(r * Math.cos(th) * sp, u * sp, r * Math.sin(th) * sp);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
  const m = new T.Points(g, new T.PointsMaterial({ color: col, size: 6, sizeAttenuation: false, transparent: true, opacity: 1, depthWrite: false, blending: T.AdditiveBlending }));
  m.frustumCulled = false; scene.add(m); FIREWORKS.push({ m, vel, t: 0 });
  noise(.08, 900, .7, .25); tone(70, .5, 'sine', .25, .02);
}
function rocket(x, y, z, delay) {
  setTimeout(() => { tone(400, .5, 'sine', .04); setTimeout(() => fireworks(x + rand(-4, 4), y + rand(-1, 3), z + rand(-4, 4)), 450); }, delay);
}
function updateFireworks(dt) {
  for (let i = FIREWORKS.length - 1; i >= 0; i--) {
    const f = FIREWORKS[i]; f.t += dt; const a = f.m.geometry.attributes.position.array;
    for (let j = 0; j < f.vel.length; j += 3) { f.vel[j + 1] -= 7 * dt; f.vel[j] *= .985; f.vel[j + 1] *= .985; f.vel[j + 2] *= .985; a[j] += f.vel[j] * dt; a[j + 1] += f.vel[j + 1] * dt; a[j + 2] += f.vel[j + 2] * dt; }
    f.m.geometry.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, 1 - f.t / 2.2);
    if (f.t > 2.2) { scene.remove(f.m); f.m.geometry.dispose(); FIREWORKS.splice(i, 1); }
  }
}
// 화면 색종이 (2D)
let confettiOn = false;
function confetti(count, rain) {
  if (reduceMotion) return;
  const c = $('fx'), g = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; const W = c.width, H = c.height;
  const cols = ['#e9711f', '#ffd166', '#78c587', '#ff6f91', '#7fd3ff', '#ffffff', '#3f9a4e'];
  const P = [];
  for (let i = 0; i < count; i++) {
    const left = i % 2 === 0, base = rain ? { x: Math.random() * W, y: -Math.random() * H * .6, vx: rand(-60, 60), vy: rand(80, 220) }
      : { x: left ? -10 : W + 10, y: H * rand(.55, .85), vx: (left ? 1 : -1) * rand(380, 900) * dpr, vy: -rand(700, 1300) * dpr };
    P.push({ ...base, w: rand(6, 12) * dpr, h: rand(8, 16) * dpr, r: Math.random() * 6, vr: rand(-10, 10), c: cols[i % cols.length], flip: Math.random() * 6, carrot: Math.random() < .12 });
  }
  let last = performance.now(), t = 0; confettiOn = true;
  const step = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt; g.clearRect(0, 0, W, H);
    let alive = 0;
    for (const p of P) {
      p.vy += 900 * dpr * dt * (rain ? .25 : 1); p.vx *= .99; p.vy = Math.min(p.vy, 420 * dpr); p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.flip += dt * 8;
      if (p.y < H + 40) alive++;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.cos(p.flip)) + .15);
      if (p.carrot) { g.fillStyle = '#f08a2f'; g.beginPath(); g.moveTo(-p.w * .6, -p.h * .5); g.lineTo(p.w * .6, -p.h * .5); g.lineTo(0, p.h * .9); g.fill(); g.fillStyle = '#3f9a4e'; g.fillRect(-p.w * .2, -p.h * .9, p.w * .4, p.h * .4); }
      else { g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      g.restore();
    }
    if (alive && t < 7) requestAnimationFrame(step); else { g.clearRect(0, 0, W, H); confettiOn = false; }
  };
  requestAnimationFrame(step);
}
function fanfare(level) {
  const notes = level >= 3 ? [523, 659, 784, 1047, 784, 1047, 1319] : level === 2 ? [523, 659, 784, 1047, 1319] : [659, 784, 1047];
  notes.forEach((f, i) => { tone(f, .28, 'triangle', .16, i * .13); tone(f / 2, .28, 'square', .04, i * .13); });
  const end = notes.length * .13; tone(notes[notes.length - 1], .9, 'triangle', .14, end); tone(notes[notes.length - 1] * 1.5, .9, 'sine', .06, end);
  if (level >= 2) { noise(2.2, 1400, .35, .12, .3); noise(1.8, 2600, .5, .08, .6); } // 환호성
}
function bigText(text, sub, cls, ms) {
  const el = $('celebrate'); el.className = 'celebrate ' + cls;
  el.innerHTML = `<div class="big">${[...text].map((ch, i) => `<span style="animation-delay:${i * 60}ms,${700 + i * 80}ms">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}`;
  el.hidden = false; clearTimeout(bigText.t); bigText.t = setTimeout(() => { el.hidden = true; }, ms);
}
// level: 1 버디, 2 이글·알바트로스, 3 홀인원
function celebrate(level, name, sub) {
  const h = hole(), cy = heightAt(h.cup[0], h.cup[1]);
  me.jump = 1; me.spin = 1.1; showBubble(me, level >= 3 ? '내가 홀인원이라니!' : level === 2 ? '이글이다!!' : '버디!');
  if (me.cart && me.cart.visible) caddieSay(level >= 3 ? '홀인원!!! 기념식수 하셔야겠어요!' : level === 2 ? '이글이요?! 오늘 날이네요!' : '나이스 버디~!', 3500);
  fanfare(level);
  bigText(name, sub, level >= 3 ? 'hio' : level === 2 ? 'eagle' : 'birdie', level >= 3 ? 4600 : level === 2 ? 3400 : 2600);
  confetti(level >= 3 ? 260 : level === 2 ? 200 : 140, false);
  if (level >= 3) setTimeout(() => confetti(220, true), 900);
  const bursts = level >= 3 ? 9 : level === 2 ? 4 : 1;
  for (let i = 0; i < bursts; i++) rocket(h.cup[0], cy + 11 + (i % 3) * 2, h.cup[1], i * (level >= 3 ? 420 : 520));
}
// 홀인원 기념패
function plaqueCanvas(hi) {
  const c = document.createElement('canvas'); c.width = 680; c.height = 480; const g = c.getContext('2d'), h = HOLES[hi];
  const wood = g.createLinearGradient(0, 0, 680, 480); wood.addColorStop(0, '#6b4226'); wood.addColorStop(1, '#3f2614');
  g.fillStyle = wood; g.fillRect(0, 0, 680, 480);
  g.strokeStyle = 'rgba(255,255,255,.08)'; for (let y = 10; y < 480; y += 9) { g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(200, y + 6, 480, y - 6, 680, y + 3); g.stroke(); }
  const gold = g.createLinearGradient(0, 60, 0, 420); gold.addColorStop(0, '#f6e3a1'); gold.addColorStop(.5, '#d9b45a'); gold.addColorStop(1, '#b8902f');
  g.fillStyle = gold; g.fillRect(60, 50, 560, 380); g.strokeStyle = '#8a6a1f'; g.lineWidth = 4; g.strokeRect(74, 64, 532, 352);
  g.fillStyle = '#3d2a08'; g.textAlign = 'center';
  g.font = `400 30px ${FONT}`; g.fillText('당근 컨트리클럽', 340, 118);
  g.font = `700 70px ${FONT}`; g.fillText('HOLE IN ONE', 340, 196);
  g.font = `400 46px ${FONT}`; g.fillText(NET.nick || '당근 골퍼', 340, 266);
  const len = Math.round(routeOf(hi).reduce((a, p, j, r) => j ? a + Math.hypot(p[0] - r[j - 1][0], p[1] - r[j - 1][1]) : 0, 0) * M_PER_U);
  g.font = `400 28px ${FONT}`; g.fillText(`${hi + 1}번 홀 ${h.name} · PAR ${h.par} · ${len}m`, 340, 320);
  const d = new Date(); g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`, 340, 362);
  g.font = `400 22px ${FONT}`; g.fillText('위 골퍼의 홀인원을 축하하며 이 패를 드립니다', 340, 400);
  // 귀퉁이 당근
  for (const [x, y] of [[96, 96], [584, 96]]) { g.fillStyle = '#f08a2f'; g.beginPath(); g.moveTo(x - 12, y - 8); g.lineTo(x + 12, y - 8); g.lineTo(x, y + 22); g.fill(); g.fillStyle = '#3f9a4e'; g.fillRect(x - 4, y - 18, 8, 10); }
  return c;
}
function showPlaque(hi, then) {
  const c = plaqueCanvas(hi), url = c.toDataURL('image/png');
  const canSave = !window.__CARROT_DEMO__;
  overlay(`<span class="eyebrow">축하합니다</span><h2>홀인원 기념패</h2><img class="plaque" src="${url}" alt="${hi + 1}번 홀 홀인원 기념패"><p>평생 한 번 할까 말까 한 홀인원이에요.${NET.ch ? ' 명예의 전당에도 이름이 올라갔어요!' : ''} 하이라이트 영상도 자동으로 저장됐어요.</p>
    <div class="btns">${canSave ? `<a class="btn sub" id="plaqueSave" href="${url}" download="carrot-cc-hole-in-one.png">기념패 저장</a>` : ''}<button class="btn" type="button" id="plaqueNext">계속하기</button></div>`);
  $('plaqueNext').onclick = () => { closeOverlay(); then(); }; $('plaqueNext').focus();
}

// ================= 동물 =================
function crocEats(x, z) {
  const c = CROCS.filter(c => Math.hypot(x - c.w[0], z - c.w[1]) < c.w[2]).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
  if (!c) return false;
  c.tx = x; c.tz = z; c.chomp = 2.2; c.state = 'swim'; setTimeout(sndChomp, 700); return true;
}
// 물가(연못 가장자리에서 6유닛 안)에 멈춘 공 근처의 악어
function crocNear(x, z) { const rng = hole().ev === 'croc' ? 10 : 6; return CROCS.find(c => { const d = Math.hypot(x - c.w[0], z - c.w[1]); return d > c.w[2] && d < c.w[2] + rng && c.chomp <= 0 && !c.steal; }); }
function crocSteal(c) {
  S.mode = 'wait'; cam.mode = 'steal';
  const b = S.ball, dx = b.x - c.w[0], dz = b.z - c.w[1], dl = Math.hypot(dx, dz);
  const edge = [c.w[0] + dx / dl * (c.w[2] - 1), c.w[1] + dz / dl * (c.w[2] - 1)];
  c.x = edge[0]; c.z = edge[1]; c.y = -.04; c.state = 'swim';
  c.steal = { ph: 'look', t: 0, edge, ball: [b.x, b.z] };
  // 공과 악어가 옆에서 같이 보이게 카메라를 옮겨요
  const nx = -dz / dl, nz = dx / dl, mx = (b.x + edge[0]) / 2, mz = (b.z + edge[1]) / 2;
  cam.steal = { tx: mx, tz: mz, px: mx + nx * 9 + dx / dl * 2, pz: mz + nz * 9 + dz / dl * 2 };
  toast('어? 물가에서 뭔가 움직여요…', 1600); tone(140, .5, 'sine', .08); tone(150, .5, 'sine', .08, .6);
}
function updateSteal(c, dt) {
  const st = c.steal; st.t += dt; const [bx, bz] = st.ball, [ex, ez] = st.edge;
  const face = (x, z) => { c.yaw += angDiff(c.yaw, Math.atan2(x - c.x, z - c.z)) * Math.min(1, dt * 8); };
  if (st.ph === 'look') { face(bx, bz); c.y = -.04 + Math.min(1, st.t) * .1; if (st.t > 1.2) { st.ph = 'crawl'; st.t = 0; toast('악어다!! 내 공!!', 1800); recMark('악어한테 공 뺏김', `${S.hole + 1}번 홀 · 1벌타`); showBubble(me, '안돼 내 공!!'); me.jump = 1; sndChomp(); } }
  else if (st.ph === 'crawl') { face(bx, bz); const d = Math.hypot(bx - c.x, bz - c.z); if (d > 1.3) { const sp = 5 * dt; c.x += (bx - c.x) / d * sp; c.z += (bz - c.z) / d * sp; } else { st.ph = 'bite'; st.t = 0; } c.jaw.rotation.x = -Math.abs(Math.sin(st.t * 6)) * .35; }
  else if (st.ph === 'bite') { c.jaw.rotation.x = -Math.abs(Math.sin(st.t * 9)) * .7; if (st.t > .5 && S.ballVis) { S.ballVis = false; sndChomp(); } if (st.t > 1) { st.ph = 'back'; st.t = 0; } }
  else if (st.ph === 'back') { face(c.w[0], c.w[1]); const d = Math.hypot(ex - c.x, ez - c.z); if (d > .4) { const sp = 6 * dt; c.x += (ex - c.x) / d * sp; c.z += (ez - c.z) / d * sp; } else { st.ph = 'dive'; st.t = 0; splash(c.x, c.z); sndSplash(); } c.jaw.rotation.x = -.15; }
  else if (st.ph === 'dive') { c.y -= dt * .8; c.jaw.rotation.x = 0; if (st.t > 1.4) { c.steal = null; c.state = 'dive'; S.st.croc++; recStopIn(1600); toast('악어가 공을 훔쳐갔어요! 1벌타', 2200); setTimeout(() => { cam.mode = 'follow'; penaltyReturn(); }, 1400); } }
  const onLand = Math.hypot(c.x - c.w[0], c.z - c.w[1]) > c.w[2] - .5;
  c.g.position.set(c.x, onLand ? heightAt(c.x, c.z) + .22 : c.wy - .06 + c.y, c.z); c.g.rotation.y = c.yaw;
}
function splash(x, z) {
  const m = new T.Mesh(new T.RingGeometry(.3, .45, 24), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .9, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, Math.max(heightAt(x, z), ...CROCS.map(c => Math.hypot(c.x - x, c.z - z) < c.w[2] + 2 ? c.wy : -9)) + .06, z); scene.add(m); SPLASHES.push({ m, t: 0 });
}
function randInPond(w) { const a = Math.random() * TAU, d = Math.random() * (w[2] - 3); return [w[0] + Math.cos(a) * d, w[1] + Math.sin(a) * d]; }
let nextBirds = 8;
function updateLife(dt, t) {
  for (const c of CROCS) {
    if (c.steal) { updateSteal(c, dt); continue; }
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
    c.g.position.set(c.x, c.wy - .06 + c.y, c.z); c.g.rotation.y = c.yaw;
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
    r.g.position.set(r.x, heightAt(r.x, r.z) + hop, r.z); r.g.rotation.y = r.yaw; r.g.rotation.x = r.state === 'sit' ? Math.sin(t * 6) * .04 : 0;
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

// ================= 홀 테마 이벤트 =================
// 공이 멈춘 뒤 홀 테마에 따라 벌어지는 일 (true면 이벤트가 진행 중)
function holeStopEvent(lie) {
  const h = hole(), b = S.ball;
  if (lie === 'green') return false;
  if (h.ev === 'rabbit' && lie === 'rough' && Math.random() < .6) {
    S.mode = 'wait'; const r = RABBITS[0]; r.x = b.x - 2; r.z = b.z - 1.5; r.state = 'sit'; r.t = 9;
    toast('토끼가 다가와요…', 1400); recMark('토끼 도우미', `${S.hole + 1}번 홀`);
    setTimeout(() => { const k = .3, tx = b.x + (h.cup[0] - b.x) * k, tz = b.z + (h.cup[1] - b.z) * k; const from = [b.x, b.z]; slideBall(from, [tx, tz], 1.1); r.tx = tx - 1; r.tz = tz - 1; r.state = 'hop';
      toast(`토끼가 공을 핀 쪽으로 ${Math.round(Math.hypot(tx - from[0], tz - from[1]) * M_PER_U)}m 밀어줬어요!`, 2200); showBubble(me, '고마워 토끼야!'); sndHonk(1); recStopIn(2400);
      setTimeout(() => { S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; guideKey = ''; updHud(); }, 1300); }, 1200);
    return true;
  }
  if (h.ev === 'boar' && Math.random() < .5) { S.mode = 'wait'; setTimeout(() => { spawnCritter('boar', [b.x, b.z]); S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; }, 500); return true; }
  if (h.ev === 'crow' && Math.random() < .55) { S.mode = 'wait'; setTimeout(() => { spawnCritter('crow'); S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; }, 500); return true; }
  return false;
}
function slideBall(from, to, sec) {
  const t0 = performance.now(), go = () => { const k = Math.min(1, (performance.now() - t0) / (sec * 1000)), e = 1 - (1 - k) ** 3; S.ball.x = from[0] + (to[0] - from[0]) * e; S.ball.z = from[1] + (to[1] - from[1]) * e; if (k < 1) requestAnimationFrame(go); };
  go();
}
function duckRescue() {
  const h = hole(), b = S.ball, w = h.water[0], dx = (S.last ? S.last.x : h.tee[0]) - w[0], dz = (S.last ? S.last.z : h.tee[1]) - w[1], dl = Math.hypot(dx, dz) || 1;
  S.mode = 'wait'; S.ballVis = false; sndSplash(); splash(b.x, b.z); toast('퐁당! 앗, 오리 가족이 헤엄쳐 와요', 1800); recMark('오리가 공을 건져줌', `${S.hole + 1}번 홀 · 무벌타`);
  if (DUCKS) { DUCKS.target = [b.x, b.z]; }
  setTimeout(sndQuack, 600);
  setTimeout(() => {
    const nx = w[0] + dx / dl * (w[2] + 2), nz = w[1] + dz / dl * (w[2] + 2);
    Object.assign(S.ball, { x: nx, z: nz, y: heightAt(nx, nz), vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = true;
    if (DUCKS) DUCKS.target = [w[0] + dx / dl * (w[2] - 1.5), w[1] + dz / dl * (w[2] - 1.5)];
    toast('오리가 공을 건져다 줬어요! (무벌타)', 2400); showBubble(me, '오리 최고!!'); sndQuack(4); recStopIn(2600);
    S.mode = 'walk'; cam.mode = 'follow'; lastActKey = ''; guideKey = ''; updHud();
  }, 2600);
}
// 오리 연못에 사는 오리 가족
let DUCKS = null;
function buildDucks() {
  const h = HOLES.find(x => x.ev === 'duck'); if (!h) return; const w = h.water[0], hi = HOLES.indexOf(h);
  DUCKS = { g: [], w, wy: waterY(hi, 0), target: null, a: 0 };
  for (let i = 0; i < 5; i++) { const d = makeGoose(i ? .6 : 1.1, true); scene.add(d); DUCKS.g.push(d); }
}
function updateDucks(dt, t) {
  if (!DUCKS) return; const D = DUCKS; D.a += dt * .25;
  let hx = D.w[0] + Math.cos(D.a) * D.w[2] * .55, hz = D.w[1] + Math.sin(D.a) * D.w[2] * .55;
  if (D.target) { const d = Math.hypot(D.target[0] - D.lx, D.target[1] - D.lz); hx = D.target[0]; hz = D.target[1]; if (d < .5 && D.tT == null) D.tT = t; if (D.tT != null && t - D.tT > 4) { D.target = null; D.tT = null; } }
  D.lx = D.lx == null ? hx : D.lx + (hx - D.lx) * Math.min(1, dt * (D.target ? 1.2 : 3)); D.lz = D.lz == null ? hz : D.lz + (hz - D.lz) * Math.min(1, dt * (D.target ? 1.2 : 3));
  let px = D.lx, pz = D.lz, py = D.prevYaw || 0;
  D.g.forEach((g, i) => { const tx = i ? D.g[i - 1].position.x : D.lx, tz = i ? D.g[i - 1].position.z : D.lz;
    if (!i) { g.position.set(D.lx, D.wy - .3, D.lz); } else { const dx = g.position.x - tx, dz = g.position.z - tz, dl = Math.hypot(dx, dz) || 1, sp = 1.1; if (dl > sp) { g.position.x = tx + dx / dl * sp; g.position.z = tz + dz / dl * sp; } g.position.y = D.wy - .18; }
    const ny = Math.atan2(tx - g.position.x, tz - g.position.z); if (i || Math.hypot(hx - px, hz - pz) > .01) g.rotation.y = i ? ny : Math.atan2(hx - (D.ox || hx), hz - (D.oz || hz)) || g.rotation.y; g.rotation.z = Math.sin(t * 3 + i) * .06; });
  D.ox = D.lx; D.oz = D.lz;
}
// 보물찾기 홀: 트램펄린·황금 당근·물음표 상자
const ZONE_MESH = [];
function buildZones() {
  for (const h of HOLES) for (const z of (h.zones || [])) {
    const g = new T.Group(), y = heightAt(z.x, z.z); g.position.set(z.x, y, z.z);
    const ring = new T.Mesh(new T.RingGeometry(z.r - .35, z.r, 40), new T.MeshBasicMaterial({ color: z.t === 'gold' ? 0xffd166 : z.t === 'jump' ? 0x4d9de0 : 0xb07bd8, transparent: true, opacity: .9, side: T.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .08; g.add(ring);
    if (z.t === 'jump') { const pad = new T.Mesh(new T.CylinderGeometry(z.r * .7, z.r * .7, .25, 24), mat(0x2f6fd6)); pad.position.y = .3; g.add(pad); const mat2 = new T.Mesh(new T.CylinderGeometry(z.r * .62, z.r * .62, .27, 24), mat(0x1b1b22)); mat2.position.y = .31; g.add(mat2); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, l = new T.Mesh(new T.CylinderGeometry(.06, .06, .35, 6), mat(0x888888)); l.position.set(Math.cos(a) * z.r * .65, .12, Math.sin(a) * z.r * .65); g.add(l); } }
    if (z.t === 'gold') { const c = makeMiniCarrot(4); c.traverse(o => { if (o.isMesh && o.material.color.getHex() === 0xf08a2f) o.material = new T.MeshPhongMaterial({ color: 0xffc83d, emissive: 0x7a5200, shininess: 120, specular: 0xffffff }); }); c.position.y = 1.2; g.add(c); g.userData.spin = c; }
    if (z.t === 'box') { const bx = new T.Mesh(new T.BoxGeometry(1.4, 1.4, 1.4), new T.MeshLambertMaterial({ map: textTexture(128, 128, (c, w, hh) => { c.fillStyle = '#b07bd8'; c.fillRect(0, 0, w, hh); c.strokeStyle = '#fff'; c.lineWidth = 8; c.strokeRect(6, 6, w - 12, hh - 12); c.fillStyle = '#fff'; c.font = `400 96px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, hh / 2 + 4); }) })); bx.position.y = 1.1; bx.castShadow = true; g.add(bx); g.userData.spin = bx; }
    scene.add(g); ZONE_MESH.push({ z, g, h });
  }
}
function updateZones(dt, t) {
  for (const m of ZONE_MESH) { if (m.g.userData.spin) { m.g.userData.spin.rotation.y += dt * 1.2; m.g.userData.spin.position.y = 1.2 + Math.sin(t * 2) * .2; } m.g.visible = !(S.zoneUsed[m.z.t] && hole() === m.h) ; }
  const h = hole(), b = S.ball;
  if (S.mode !== 'flight' || !h.zones) return;
  if (b.y - heightAt(b.x, b.z) > .5) return;
  for (const z of h.zones) {
    if (S.zoneUsed[z.t] || Math.hypot(b.x - z.x, b.z - z.z) > z.r) continue;
    S.zoneUsed[z.t] = true; triggerZone(z); break;
  }
}
function triggerZone(z) {
  const h = hole(), b = S.ball;
  if (z.t === 'jump') {
    const dx = h.cup[0] - b.x, dz = h.cup[1] - b.z, dl = Math.hypot(dx, dz) || 1, sp = Math.min(13, dl * .55);
    Object.assign(b, { state: 'fly', vx: dx / dl * sp, vz: dz / dl * sp, vy: 13, y: heightAt(b.x, b.z) + .4, landed: false, tree: true });
    tone(300, .15, 'sine', .2); tone(600, .3, 'sine', .15, .1); toast('트램펄린! 공이 하늘 높이 튕겨요!', 2000); recMark('트램펄린 점프', `${S.hole + 1}번 홀`);
  } else if (z.t === 'gold') {
    S.chance++; lastActKey = ''; fireworks(z.x, heightAt(z.x, z.z) + 4, z.z, 80); toast('황금 당근 발견! 캐디 찬스 +1', 2200); recMark('황금 당근', `${S.hole + 1}번 홀 · 캐디 찬스 +1`);
  } else if (z.t === 'box') {
    const r = Math.random(); fireworks(z.x, heightAt(z.x, z.z) + 2, z.z, 60);
    if (r < .3) { setTimeout(() => { const a = Math.random() * TAU; Object.assign(b, { x: h.cup[0] + Math.cos(a) * 3, z: h.cup[1] + Math.sin(a) * 3, vx: 0, vy: 0, vz: 0, state: 'roll' }); }, 300); toast('물음표 상자: 행운의 순간이동! 공이 그린으로!', 2400); recMark('행운의 순간이동', `${S.hole + 1}번 홀`); }
    else if (r < .55) { S.okTix++; renderTix(); toast('물음표 상자: OK권 1장 당첨!', 2200); recMark('OK권 당첨', `${S.hole + 1}번 홀`); }
    else if (r < .8) { toast('물음표 상자: 고라니가 튀어나왔다!!', 2000); setTimeout(() => spawnCritter('deer'), 1500); }
    else { toast('물음표 상자: 꽝! 다음 기회에~', 2000); }
  }
}
// 갤러리 홀: 그린 옆 관중
const GALLERY = [];
function buildGallery() {
  const h = HOLES.find(x => x.ev === 'gallery'); if (!h) return; const cols = ['#ffd166', '#4d9de0', '#e15a97', '#78c587', '#b07bd8', '#ffffff', '#3bc4b4'];
  const [cx, cz] = h.cup;
  for (let i = 0; i < 16; i++) {
    const a = Math.PI * .1 + i / 15 * Math.PI * .8, r = h.green + 4 + (i % 2) * 1.6, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const g = makeCarrot(cols[i % cols.length]); g.scale.setScalar(.85); g.position.set(x, heightAt(x, z), z); g.rotation.y = Math.atan2(cx - x, cz - z); scene.add(g); GALLERY.push({ g, y: heightAt(x, z), ph: Math.random() * 6, cheer: 0 });
  }
  const sign = new T.Mesh(new T.PlaneGeometry(5, 1.2), new T.MeshLambertMaterial({ map: textTexture(512, 120, (c, w, hh) => { c.fillStyle = '#e9711f'; c.fillRect(0, 0, w, hh); c.fillStyle = '#fff'; c.font = `400 72px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('당근 CC 화이팅!', w / 2, hh / 2 + 4); }), side: T.DoubleSide }));
  const sx = cx, sz = cz + h.green + 8; sign.position.set(sx, heightAt(sx, sz) + 2.2, sz); sign.rotation.y = Math.PI; scene.add(sign);
}
function updateGallery(dt, t) {
  const near = hole().ev === 'gallery';
  for (const p of GALLERY) { p.cheer = Math.max(0, p.cheer - dt); const j = p.cheer > 0 ? Math.abs(Math.sin(t * 9 + p.ph)) * .8 : near ? Math.abs(Math.sin(t * 2 + p.ph)) * .08 : 0; p.g.position.y = p.y + j; }
}
function galleryCheer(big) { for (const p of GALLERY) p.cheer = big ? 4 : 1.6; noise(big ? 2.4 : 1.2, 1500, .4, big ? .25 : .12); if (big) noise(2, 2600, .6, .1, .3); }

// ================= 깜짝 동물: 고라니, 멧돼지, 거위 가족, 까마귀 =================
const CRITTERS = []; let nextCritter = 18, shakeT = 0, lastKind = '';
function legs(g, m, xs, zs, y, h, r) { const out = []; for (const x of xs) for (const z of zs) { const l = new T.Mesh(new T.CylinderGeometry(r, r * .8, h, 6), m); l.position.set(x, y - h / 2, z); l.geometry.translate(0, 0, 0); g.add(l); out.push(l); } return out; }
function makeDeer() {
  const g = new T.Group(), fur = mat(0x9a7350, { flatShading: true }), dark = mat(0x3a2a1c), light = mat(0xd9c3a3);
  const body = new T.Mesh(new T.BoxGeometry(.55, .55, 1.25), fur); body.position.y = 1.05; g.add(body);
  const belly = new T.Mesh(new T.BoxGeometry(.5, .12, 1.1), light); belly.position.y = .79; g.add(belly);
  const neck = new T.Mesh(new T.BoxGeometry(.25, .6, .25), fur); neck.position.set(0, 1.45, .55); neck.rotation.x = .5; g.add(neck);
  const head = new T.Mesh(new T.BoxGeometry(.3, .3, .5), fur); head.position.set(0, 1.75, .78); g.add(head);
  for (const s of [-1, 1]) { const ear = new T.Mesh(new T.ConeGeometry(.08, .28, 5), fur); ear.position.set(s * .15, 1.95, .65); ear.rotation.z = s * -.6; g.add(ear);
    const tusk = new T.Mesh(new T.ConeGeometry(.025, .16, 4), mat(0xfafaf0)); tusk.position.set(s * .08, 1.58, .98); tusk.rotation.x = Math.PI; g.add(tusk); // 고라니 송곳니
    const eye = new T.Mesh(new T.SphereGeometry(.04, 6, 5), dark); eye.position.set(s * .15, 1.8, .9); g.add(eye); }
  const nose = new T.Mesh(new T.SphereGeometry(.06, 6, 5), dark); nose.position.set(0, 1.72, 1.04); g.add(nose);
  const tail = new T.Mesh(new T.SphereGeometry(.09, 6, 5), light); tail.position.set(0, 1.2, -.66); g.add(tail);
  g.userData.legs = legs(g, fur, [-.18, .18], [-.45, .45], .8, .8, .05); g.userData.gait = 'gallop';
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function makeBoar() {
  const g = new T.Group(), fur = mat(0x4a3b30, { flatShading: true }), dark = mat(0x1e1712);
  const body = new T.Mesh(new T.SphereGeometry(.6, 10, 8), fur); body.scale.set(.85, .8, 1.35); body.position.y = .75; g.add(body);
  const mane = new T.Mesh(new T.BoxGeometry(.12, .25, 1.1), dark); mane.position.set(0, 1.25, .05); g.add(mane);
  const head = new T.Mesh(new T.ConeGeometry(.38, .8, 7), fur); head.rotation.x = Math.PI / 2; head.position.set(0, .72, 1.05); g.add(head);
  const snout = new T.Mesh(new T.CylinderGeometry(.12, .12, .08, 10), mat(0x8a6a5a)); snout.rotation.x = Math.PI / 2; snout.position.set(0, .7, 1.45); g.add(snout);
  for (const s of [-1, 1]) { const tusk = new T.Mesh(new T.ConeGeometry(.035, .22, 5), mat(0xf4efe0)); tusk.position.set(s * .14, .78, 1.3); tusk.rotation.set(-.6, 0, s * .4); g.add(tusk);
    const ear = new T.Mesh(new T.ConeGeometry(.09, .2, 4), fur); ear.position.set(s * .22, 1.08, .78); g.add(ear);
    const eye = new T.Mesh(new T.SphereGeometry(.04, 6, 5), mat(0xff5a3a, { emissive: 0x5a0a00 })); eye.position.set(s * .17, .9, 1.12); g.add(eye); }
  g.userData.legs = legs(g, dark, [-.25, .25], [-.45, .45], .4, .4, .07); g.userData.gait = 'trot';
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function makeGoose(scale, duck) {
  const baby = scale < 1;
  const g = new T.Group(), white = mat(duck ? (baby ? 0xf6d65a : 0x8a6a48) : baby ? 0xf4e7a8 : 0xfafaf5), orange = mat(duck ? 0xf2b134 : 0xf08a2f), dark = mat(0x222222);
  const headM = duck && !baby ? mat(0x1f7a4a, { emissive: 0x08301a }) : white;
  const body = new T.Mesh(new T.SphereGeometry(.3, 10, 8), white); body.scale.set(.8, .75, 1.2); body.position.y = .42; g.add(body);
  const neck = new T.Mesh(new T.CylinderGeometry(.07, .09, duck ? .3 : .5, 8), headM); neck.position.set(0, duck ? .68 : .78, .25); neck.rotation.x = -.15; g.add(neck);
  if (duck && !baby) { const ring = new T.Mesh(new T.TorusGeometry(.085, .02, 5, 12), mat(0xffffff)); ring.rotation.x = Math.PI / 2; ring.position.set(0, .56, .25); g.add(ring); }
  const head = new T.Mesh(new T.SphereGeometry(.11, 8, 6), headM); g.add(head);
  const dy = duck ? -.2 : 0; head.position.set(0, 1.04 + dy, .3);
  const beak = new T.Mesh(duck ? new T.BoxGeometry(.1, .04, .16) : new T.ConeGeometry(.05, .18, 6), orange); if (!duck) beak.rotation.x = Math.PI / 2; beak.position.set(0, 1.02 + dy, .44); g.add(beak);
  for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(.022, 5, 4), dark); e.position.set(s * .07, 1.07 + dy, .37); g.add(e); }
  g.userData.legs = legs(g, orange, [-.1, .1], [0], .2, .2, .025); g.userData.gait = 'waddle'; g.userData.body = body;
  g.scale.setScalar(scale); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); return g;
}
function makeCrow() {
  const g = new T.Group(), black = mat(0x1b1b22, { flatShading: true });
  const body = new T.Mesh(new T.SphereGeometry(.2, 8, 6), black); body.scale.set(.8, .8, 1.4); g.add(body);
  const head = new T.Mesh(new T.SphereGeometry(.12, 8, 6), black); head.position.set(0, .1, .27); g.add(head);
  const beak = new T.Mesh(new T.ConeGeometry(.04, .16, 5), mat(0x333333)); beak.rotation.x = Math.PI / 2; beak.position.set(0, .08, .42); g.add(beak);
  const wm = new T.MeshLambertMaterial({ color: 0x1b1b22, side: T.DoubleSide });
  const wl = new T.Mesh(new T.PlaneGeometry(.55, .22).rotateX(-Math.PI / 2).translate(-.28, 0, 0), wm), wr = new T.Mesh(new T.PlaneGeometry(.55, .22).rotateX(-Math.PI / 2).translate(.28, 0, 0), wm);
  g.add(wl, wr); g.userData.wings = [wl, wr];
  const held = new T.Mesh(new T.SphereGeometry(.1, 8, 6), mat(0xffffff)); held.position.set(0, .02, .5); held.visible = false; g.add(held); g.userData.held = held;
  return g;
}
const sndGorani = () => { const a = audio(), m = out(); if (!a || !m) return; for (let i = 0; i < 2; i++) { const t0 = a.currentTime + i * .45, o = a.createOscillator(), g = a.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(700, t0); o.frequency.linearRampToValueAtTime(1500, t0 + .08); o.frequency.exponentialRampToValueAtTime(500, t0 + .38); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.08, t0 + .03); g.gain.exponentialRampToValueAtTime(.001, t0 + .4); o.connect(g).connect(m); o.start(t0); o.stop(t0 + .42); noise(.35, 2200, 1, .06, i * .45); } };
const sndBoar = () => { for (let i = 0; i < 3; i++) { tone(85 + Math.random() * 20, .22, 'sawtooth', .12, i * .28); noise(.2, 300, 1, .15, i * .28); } };
const sndHonk = (n = 3) => { for (let i = 0; i < n; i++) { tone(420, .14, 'square', .06, i * .3); tone(380, .12, 'sawtooth', .05, i * .3 + .05); } };
const sndQuack = (n = 3) => { for (let i = 0; i < n; i++) { tone(640, .09, 'square', .05, i * .22); tone(560, .1, 'sawtooth', .04, i * .22 + .04); } };
const sndCaw = () => { tone(520, .2, 'sawtooth', .06); tone(470, .22, 'sawtooth', .06, .3); };
function spawnCritter(force, center) {
  const pool = ['deer', 'boar', 'geese', 'ducks', 'croc'].filter(k => k !== lastKind);
  if (S.ball.state === 'rest' && S.ballVis && S.strokes > 0 && Math.hypot(me.x - S.ball.x, me.z - S.ball.z) > 18 && lastKind !== 'crow' && Math.random() < .35) pool.splice(0, pool.length, 'crow');
  const kind = force || pool[Math.random() * pool.length | 0]; lastKind = kind;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx, side = Math.random() < .5 ? 1 : -1;
  if (kind === 'crow') {
    const c = makeCrow(), sx = S.ball.x + rand(-25, 25), sz = S.ball.z + rand(-25, 25);
    c.position.set(sx, heightAt(sx, sz) + 14, sz); scene.add(c);
    CRITTERS.push({ kind, g: c, st: 'in', t: 0, sx, sz }); sndCaw(); return;
  }
  // 내 앞 6~8m를 천천히 가로질러요. 가운데쯤에서 잠깐 멈춰 나를 쳐다봐요
  const fam = kind === 'geese' || kind === 'ducks';
  const ahead = rand(6, 8), cx = center ? center[0] : me.x + fx * ahead, cz = center ? center[1] : me.z + fz * ahead, half = fam ? 9 : kind === 'croc' ? 8 : 15;
  const from = [cx - rx * side * half, cz - rz * side * half], to = [cx + rx * side * half, cz + rz * side * half];
  const n = fam ? 5 : 1, members = [];
  for (let i = 0; i < n; i++) {
    const g = kind === 'deer' ? makeDeer() : kind === 'boar' ? makeBoar() : kind === 'croc' ? makeCroc([0, 0, 1], 0).g : makeGoose(i ? .7 : 1.35, kind === 'ducks');
    if (kind === 'deer' || kind === 'boar') g.scale.setScalar(1.3); if (kind === 'croc') g.scale.setScalar(1.25);
    scene.add(g); members.push({ g, lag: i * 1.15 });
  }
  const speed = { deer: 5, boar: 4, geese: 1.5, ducks: 1.8, croc: 1.1 }[kind];
  const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  CRITTERS.push({ kind, members, from, to, len, d: 0, speed, yaw: Math.atan2(to[0] - from[0], to[1] - from[1]), said: false, t: 0, pauseAt: len * .45, pause: { deer: 1.8, boar: 1.4, geese: 1.2, ducks: 1, croc: 2 }[kind], paused: 0, kick: !!center });
  cam.focus = CRITTERS[CRITTERS.length - 1]; me.moveT = null; $('critterSkip').hidden = false; $('cine').hidden = false;
  const nm = { deer: '고라니', boar: '멧돼지', geese: '거위 가족', ducks: '오리 가족', croc: '악어' }[kind]; if (!S.st.animals.includes(nm)) S.st.animals.push(nm);
  recMark(fam ? `${nm} 행차` : `${nm} 출몰`, `${S.hole + 1}번 홀`);
  if (kind === 'ducks') { sndQuack(); toast('오리 가족이 쪼르르~ 지나가요', 2400); setTimeout(() => showBubble(me, '귀여워…'), 1200); }
  if (kind === 'croc') { sndChomp(); toast('악어가 산책 나왔어요!! 가만히 있어요', 2400); setTimeout(() => showBubble(me, '숨 참아…'), 800); }
  if (kind === 'deer') { sndGorani(); toast('앗! 고라니다!!', 1800); setTimeout(() => showBubble(me, '깜짝이야!!'), 300); me.jump = .8; }
  if (kind === 'boar') { sndBoar(); toast('멧돼지 출몰 주의!!', 1800); shakeT = 1.2; setTimeout(() => showBubble(me, '으악 멧돼지!'), 300); me.jump = 1; }
  if (kind === 'geese') { sndHonk(); toast('거위 가족이 길을 건너요~ 잠깐 멈춤!', 2200); setTimeout(() => showBubble(me, '줄 서서 간다 ㅋㅋ'), 1500); }
}
function len2(c) { return c.len; }
function endFocus() { cam.focus = null; $('critterSkip').hidden = true; $('cine').hidden = true; }
$('critterSkip').onclick = endFocus;
function animLegs(g, ph, amp) { const L = g.userData.legs; if (!L) return; L.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * amp; }); }
function updateCritters(dt) {
  if (!scene) return;
  const free = S.mode === 'walk' || S.mode === 'ride';
  if (free) nextCritter -= dt;
  if (nextCritter <= 0 && free && !$('app').hidden && CRITTERS.length === 0) { nextCritter = rand(35, 70); spawnCritter(); }
  for (let i = CRITTERS.length - 1; i >= 0; i--) {
    const c = CRITTERS[i]; c.t += dt;
    if (c.kind === 'crow') {
      const g = c.g, ws = g.userData.wings; ws[0].rotation.z = Math.sin(c.t * 14) * .7; ws[1].rotation.z = -Math.sin(c.t * 14) * .7;
      const by = heightAt(S.ball.x, S.ball.z);
      if (c.st === 'in') { const k = Math.min(1, c.t / 2.2); g.position.set(c.sx + (S.ball.x - c.sx) * k, by + .25 + 14 * (1 - k) ** 2, c.sz + (S.ball.z - c.sz) * k); g.rotation.y = Math.atan2(S.ball.x - c.sx, S.ball.z - c.sz);
        if (k >= 1) { c.st = 'grab'; c.t = 0; sndCaw(); g.userData.held.visible = true; S.ballVis = false;
          const a = Math.random() * TAU; let nx, nz, ok = false; for (let k2 = 0; k2 < 30 && !ok; k2++) { const d = rand(2, 4); nx = S.ball.x + Math.cos(a + k2) * d; nz = S.ball.z + Math.sin(a + k2) * d; ok = ['fairway', 'rough', 'green'].includes(surface(nx, nz)) && canStand(nx, nz); }
          c.drop = ok ? [nx, nz] : [S.ball.x, S.ball.z]; c.from = [S.ball.x, S.ball.z]; } }
      else if (c.st === 'grab') { const k = Math.min(1, c.t / 1.6); const x = c.from[0] + (c.drop[0] - c.from[0]) * k, z = c.from[1] + (c.drop[1] - c.from[1]) * k; g.position.set(x, heightAt(x, z) + .3 + Math.sin(k * Math.PI) * 3, z); g.rotation.y = Math.atan2(c.drop[0] - c.from[0], c.drop[1] - c.from[1]);
        if (k >= 1) { g.userData.held.visible = false; S.ball.x = c.drop[0]; S.ball.z = c.drop[1]; S.ballVis = true; guideKey = ''; c.st = 'out'; c.t = 0; sndCaw();
          S.st.crow++; recMark('까마귀가 공 가져감', `${S.hole + 1}번 홀 · 무벌타`);
          toast(`까마귀가 공을 ${Math.round(Math.hypot(c.drop[0] - c.from[0], c.drop[1] - c.from[1]) * M_PER_U)}m 옮겨놨어요! (무벌타)`, 2400); showBubble(me, '야! 내 공!!'); lastActKey = ''; } }
      else { g.position.y += dt * 6; g.position.x += Math.sin(g.rotation.y) * dt * 8; g.position.z += Math.cos(g.rotation.y) * dt * 8; if (c.t > 3) { scene.remove(g); CRITTERS.splice(i, 1); recStopIn(500); } }
      continue;
    }
    // 가운데쯤에서 잠깐 멈춰서 나를 쳐다봐요
    let stopped = false;
    if (c.kick && c.d >= len2(c) * .5 && !c.kicked) { c.kicked = true; const a = c.yaw + rand(-.4, .4), d = rand(3, 6); let nx = S.ball.x + Math.sin(a) * d, nz = S.ball.z + Math.cos(a) * d; if (!canStand(nx, nz) || surface(nx, nz) === 'water') { nx = S.ball.x; nz = S.ball.z; }
      slideBall([S.ball.x, S.ball.z], [nx, nz], .6); guideKey = ''; sndBoar(); toast(`멧돼지가 공을 ${Math.round(Math.hypot(nx - S.ball.x, nz - S.ball.z) * M_PER_U)}m 차고 갔어요! (무벌타)`, 2400); showBubble(me, '야 이 멧돼지야!'); recMark('멧돼지가 공 참', `${S.hole + 1}번 홀`); }
    if (!c.kick && c.d >= c.pauseAt && c.paused < c.pause) { c.paused += dt; stopped = true;
      if (c.paused - dt <= 0) { if (c.kind === 'deer') { sndGorani(); showBubble(me, '눈 마주쳤어…'); } if (c.kind === 'boar') sndBoar(); if (c.kind === 'geese') sndHonk(2); if (c.kind === 'ducks') sndQuack(2); if (c.kind === 'croc') { sndChomp(); showBubble(me, '으아 입 벌렸다!'); } } }
    else c.d += c.speed * dt;
    let alive = false;
    for (const m of c.members) {
      const d = c.d - m.lag; const k = d / c.len; m.g.visible = k > 0 && k < 1; if (k < 1) alive = true;
      const kk = clamp(k, 0, 1), x = c.from[0] + (c.to[0] - c.from[0]) * kk, z = c.from[1] + (c.to[1] - c.from[1]) * kk;
      const ph = stopped ? 0 : c.t * (c.kind === 'deer' ? 9 : c.kind === 'boar' ? 10 : c.kind === 'croc' ? 5 : 9) - m.lag;
      const bob = stopped ? 0 : c.kind === 'deer' ? Math.abs(Math.sin(ph)) * .45 : c.kind === 'boar' ? Math.abs(Math.sin(ph)) * .12 : 0;
      // 멈췄을 때는 내 쪽으로 고개를 돌려요
      const look = stopped ? angDiff(c.yaw, Math.atan2(me.x - x, me.z - z)) * Math.min(1, c.paused * 2) * .8 : 0;
      m.g.position.set(x, heightAt(x, z) + bob + (c.kind === 'croc' ? .2 : 0), z); m.g.rotation.y = c.yaw + look;
      if (c.kind === 'croc') { const jaw = m.g.children.find(o => o.children && o.children.length > 3); m.g.rotation.z = stopped ? 0 : Math.sin(ph) * .06; if (m.g.userData.jaw) m.g.userData.jaw.rotation.x = stopped ? -Math.abs(Math.sin(c.paused * 5)) * .6 : 0; }
      if (c.kind === 'deer') m.g.rotation.x = Math.sin(ph) * .12;
      if (c.kind === 'geese' || c.kind === 'ducks') m.g.rotation.z = stopped ? 0 : Math.sin(ph) * .14;
      animLegs(m.g, ph, c.kind === 'deer' ? .9 : c.kind === 'boar' ? .6 : .5);
    }
    if (c.kind === 'geese' && !c.said && c.d > c.len * .4) { c.said = true; sndHonk(2); if (me.cart && me.cart.visible) caddieSay('잠깐만요~ 거위 지나가요!', 2200); }
    if (!alive) { for (const m of c.members) scene.remove(m.g); CRITTERS.splice(i, 1); recStopIn(1200); if (cam.focus === c) endFocus(); }
  }
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
}

// ================= 클럽하우스 (정문 · 로비 · 락커룸) =================
// 코스 밖 (0, 520) 근처에 따로 지었어요. 아래 좌표는 모두 LB 기준 로컬 좌표(lx, lz)예요.
//   로비: x -10~10, z -10~10 / 락커룸: x -22~-10, z -7~7 / 정문 밖 정원: z 10~44
//   로비 오른쪽 벽의 두 출입구: 드라이빙 레인지(z -6~-3), 골프 코스(z 3~6)
const LB = { x: 0, z: 520, built: false, staff: null, panels: null, doorK: 0, myLocker: null, floors: [], zone: 'out', desk: 'idle', deskSnooze: false, portalLock: false, welcome: null, cine: null, lockerUI: false, cam: null };
const CL = {
  allow: [[-9.4, 9.4, -9.4, 9.4], [-10.7, -9.3, -1.3, 1.3], [-21.0, -10.6, -6.4, 6.4], [-1.6, 1.6, 9.3, 10.9], [-30, 30, 10.8, 44], [9.3, 10.5, -5.8, -3.2], [9.3, 10.5, 3.2, 5.8]],
  block: [[-4.2, 4.2, -10, -4.2], [-7.8, -5.4, 3.0, 7.2], [5.4, 7.8, 3.0, 7.2], [-17.8, -14.2, .3, 1.7], [-21.0, -11.2, 5.5, 6.4], [-9.5, -4.5, 10.8, 12.6], [4.5, 9.5, 10.8, 12.6]],
  circles: [[-8.6, 8.6, .9], [8.6, 8.6, .9], [-8.6, -8.4, .9], [8.6, -8.4, .9], [0, 24, 2.7], [-3, 12.2, .65], [3, 12.2, .65]],
};
const inClub = (x, z) => Math.abs(z - LB.z) < 70 && Math.abs(x - LB.x) < 70;
const clubZone = (lx, lz) => lz > 10.2 ? 'out' : lx < -10 ? 'locker' : 'lobby';
function clubCanStand(x, z) {
  const lx = x - LB.x, lz = z - LB.z, inR = r => lx >= r[0] && lx <= r[1] && lz >= r[2] && lz <= r[3];
  if (!CL.allow.some(inR) || CL.block.some(inR)) return false;
  return !CL.circles.some(c => Math.hypot(lx - c[0], lz - c[1]) < c[2]);
}
function buildLobby() {
  if (LB.built) return; LB.built = true;
  const g = new T.Group(), y0 = EDGE_H; g.position.set(LB.x, y0, LB.z); LB.g = g;
  const add = (geo, m, x, y, z, sh = false) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.receiveShadow = true; o.castShadow = sh; g.add(o); return o; };
  const plane = (w, h, m, x, y, z, ry = 0, rx = 0) => { const o = add(new T.PlaneGeometry(w, h), m, x, y, z); o.rotation.set(rx, ry, 0); return o; };
  const signTex = (w, h, top, sub, bg = '#2d5a3a', fg = '#e8c873') => textTexture(w, h, (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.strokeStyle = fg; c.lineWidth = Math.max(4, H * .05); c.strokeRect(c.lineWidth, c.lineWidth, W - c.lineWidth * 2, H - c.lineWidth * 2); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `400 ${H * (sub ? .42 : .55)}px ${FONT}`; c.fillText(top, W / 2, H * (sub ? .4 : .52)); if (sub) { c.font = `600 ${H * .17}px "IBM Plex Mono",monospace`; c.fillText(sub, W / 2, H * .76); } });
  const cream = mat(0xf4ecdb), wood = mat(0x6a4529), darkWood = mat(0x4a2f1b), brass = mat(0xd4af5a, { emissive: 0x3a2a00 }), deep = mat(0x2d5a3a), roofM = new T.MeshPhongMaterial({ color: 0x2b5a3c, flatShading: true, shininess: 6 });
  const warm = new T.MeshBasicMaterial({ color: 0xfff0c8 });

  // ---- 바닥: 크림 대리석(로비) · 원목(락커룸) · 잔디와 돌길(정원) ----
  const marbleT = textTexture(512, 512, (c, w, h) => { c.fillStyle = '#f2ebdc'; c.fillRect(0, 0, w, h); const R = rng(21); c.lineWidth = 2; for (let i = 0; i < 16; i++) { c.strokeStyle = `rgba(150,138,116,${.08 + R() * .14})`; c.beginPath(); let x = R() * w, y = R() * h; c.moveTo(x, y); for (let k = 0; k < 7; k++) { x += (R() - .5) * 110; y += R() * 70; c.lineTo(x, y); } c.stroke(); } c.strokeStyle = 'rgba(140,118,84,.35)'; c.lineWidth = 3; c.strokeRect(1, 1, w - 2, h - 2); });
  marbleT.wrapS = marbleT.wrapT = T.RepeatWrapping; marbleT.repeat.set(5, 5);
  const fl = plane(20, 20, new T.MeshLambertMaterial({ map: marbleT }), 0, .01, 0, 0, -Math.PI / 2);
  const plankT = textTexture(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#a77a52' : '#b4875c'; c.fillRect(0, i * 32, w, 32); c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(0, i * 32, w, 2); c.fillRect((i * 97) % w, i * 32, 2, 32); } });
  plankT.wrapS = plankT.wrapT = T.RepeatWrapping; plankT.repeat.set(3, 3);
  const lfl = plane(12, 14, new T.MeshLambertMaterial({ map: plankT }), -16, .01, 0, 0, -Math.PI / 2);
  const lawnT = textTexture(64, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#6aa64f' : '#77b45a'; c.fillRect(0, i * 32, w, 32); } });
  lawnT.wrapS = lawnT.wrapT = T.RepeatWrapping; lawnT.repeat.set(12, 6);
  const lawn = plane(90, 40, new T.MeshLambertMaterial({ map: lawnT }), 0, .005, 30, 0, -Math.PI / 2);
  LB.floors = [fl, lfl, lawn];
  const stoneT = textTexture(128, 128, (c, w, h) => { c.fillStyle = '#e6dcc6'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,100,70,.28)'; c.lineWidth = 3; for (let i = 0; i <= 2; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); } c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 64); c.moveTo(32, 64); c.lineTo(32, 128); c.moveTo(96, 64); c.lineTo(96, 128); c.stroke(); });
  stoneT.wrapS = stoneT.wrapT = T.RepeatWrapping; stoneT.repeat.set(2, 17);
  plane(4.4, 34, new T.MeshLambertMaterial({ map: stoneT }), 0, .02, 27, 0, -Math.PI / 2);
  const plaza = add(new T.CircleGeometry(6.2, 40), mat(0xe6dcc6), 0, .025, 24); plaza.rotation.x = -Math.PI / 2;
  const plazaRim = add(new T.RingGeometry(6.2, 6.6, 40), mat(0xc9b48a), 0, .026, 24); plazaRim.rotation.x = -Math.PI / 2;

  // ---- 벽 (안팎 모두 크림색) ----
  const wall = (w, h, d, x, z, y = h / 2, m = cream) => add(new T.BoxGeometry(w, h, d), m, x, y, z, true);
  wall(20.8, 7, .4, 0, -10);                                   // 로비 뒷벽
  wall(8.2, 7, .4, -6.1, 10); wall(8.2, 7, .4, 6.1, 10); wall(4, 2, .4, 0, 10, 6);   // 정문 벽 (문 높이 5)
  wall(.4, 7, 8.8, -10, -5.8); wall(.4, 7, 8.8, -10, 5.8); wall(.4, 2.4, 2.8, -10, 0, 5.8); // 락커룸 쪽 벽
  wall(.4, 7, 4.4, 10, -8.0); wall(.4, 7, 6.4, 10, 0); wall(.4, 7, 4.4, 10, 8.0); for (const z of [-4.5, 4.5]) wall(.4, 2.2, 2.8, 10, z, 5.9);
  wall(12.2, 6, .4, -16, -7); wall(12.2, 6, .4, -16, 7); wall(.4, 6, 14.4, -22, 0);  // 락커룸
  // 실내 걸레받이(원목)와 천장 간접조명
  for (const [w, x, z, ry] of [[20, 0, -9.78, 0], [8.4, -9.78, -5.8, Math.PI / 2], [8.4, -9.78, 5.8, Math.PI / 2], [4.2, 9.78, -8, Math.PI / 2], [6, 9.78, 0, Math.PI / 2], [4.2, 9.78, 8, Math.PI / 2], [8, -6.1, 9.78, 0], [8, 6.1, 9.78, 0]]) { const b = add(new T.BoxGeometry(w, 1.1, .06), wood, x, .55, z); b.rotation.y = ry; const s = add(new T.BoxGeometry(w, .06, .08), brass, x, 1.12, z); s.rotation.y = ry; }
  for (const [w, x, z, ry] of [[19.4, 0, -9.7, 0], [19.4, -9.7, 0, Math.PI / 2], [19.4, 9.7, 0, Math.PI / 2], [19.4, 0, 9.7, 0]]) { const s = add(new T.BoxGeometry(w, .12, .12), warm, x, 6.8, z); s.rotation.y = ry; }
  plane(20, 20, mat(0xfbf6ea), 0, 7, 0, 0, Math.PI / 2); plane(12, 14, mat(0xfbf6ea), -16, 6, 0, 0, Math.PI / 2);

  // ---- 지붕 (딥그린) ----
  const pyramid = (sx, h, sz, x, y, z) => { const o = add(new T.ConeGeometry(Math.SQRT1_2, 1, 4), roofM, x, y + h / 2, z, true); o.rotation.y = Math.PI / 4; o.scale.set(sx, h, sz); return o; };
  add(new T.BoxGeometry(22.6, .4, 22.6), deep, 0, 7.2, 0, true); pyramid(22.6, 4.6, 22.6, 0, 7.4, 0);
  add(new T.BoxGeometry(12.8, .35, 15), deep, -16, 6.2, 0, true); pyramid(12.8, 3, 15, -16, 6.35, 0);
  // 정면 박공 + 금색 간판
  wall(22, 2.2, .5, 0, 10.05, 8.3);
  const sign = plane(15, 1.8, new T.MeshLambertMaterial({ map: signTex(1200, 144, 'CARROT COUNTRY CLUB', '') }), 0, 8.35, 10.32);
  // 기둥과 캐노피
  for (const x of [-3, 3]) { add(new T.CylinderGeometry(.42, .5, 5.2, 14), cream, x, 2.6, 12.2, true); add(new T.BoxGeometry(1.2, .3, 1.2), brass, x, .15, 12.2); add(new T.BoxGeometry(1.1, .25, 1.1), brass, x, 5.1, 12.2); }
  add(new T.BoxGeometry(8.8, .45, 3.6), deep, 0, 5.35, 11.9, true);
  plane(8.8, .45, new T.MeshLambertMaterial({ map: signTex(880, 46, 'EST. 2026 · PRIVATE GOLF CLUB', '', '#2d5a3a', '#e8c873') }), 0, 5.35, 13.71);
  // 바깥 창문 (따뜻한 실내 불빛)
  for (const x of [-6.5, 6.5]) { plane(3.4, 2.6, new T.MeshBasicMaterial({ color: 0xffe9bb }), x, 3, 10.22); for (const [w, h, ox, oy] of [[3.6, .16, 0, 1.38], [3.6, .16, 0, -1.38], [.16, 2.9, 1.72, 0], [.16, 2.9, -1.72, 0], [.1, 2.6, 0, 0], [3.4, .1, 0, 0]]) add(new T.BoxGeometry(w, h, .1), wood, x + ox, 3 + oy, 10.25); }
  // 유리 정문 (양쪽으로 열려요)
  for (const [w, h, x, y] of [[.25, 5, -2.05, 2.5], [.25, 5, 2.05, 2.5], [4.35, .3, 0, 5.05]]) add(new T.BoxGeometry(w, h, .5), wood, x, y, 10);
  const glassM = new T.MeshPhongMaterial({ color: 0xcfe9ef, transparent: true, opacity: .32, shininess: 90, specular: 0xffffff, depthWrite: false });
  LB.panels = [-1, 1].map(s => { const p = new T.Group(); p.position.set(s, 0, 10); g.add(p); const gl = new T.Mesh(new T.BoxGeometry(1.95, 4.8, .06), glassM); gl.position.y = 2.45; p.add(gl); for (const [w, h, x, y] of [[2, .12, 0, .1], [2, .12, 0, 4.8], [.12, 4.8, -.95, 2.45], [.12, 4.8, .95, 2.45]]) { const f = new T.Mesh(new T.BoxGeometry(w, h, .1), wood); f.position.set(x, y, 0); p.add(f); } const hd = new T.Mesh(new T.BoxGeometry(.06, 1.2, .14), brass); hd.position.set(-s * .7, 2.4, 0); p.add(hd); p.userData.s = s; return p; });

  // ---- 정원: 화단, 나무, 가로등, 당근 조형물 ----
  const soil = mat(0x6b4a2e);
  const FLOWER_N = 70, flowers = new T.InstancedMesh(new T.IcosahedronGeometry(.18, 0), new T.MeshLambertMaterial(), FLOWER_N * 2), M4 = new T.Matrix4(), FC = [0xff8fb8, 0xffd23f, 0xffffff, 0xe0453a, 0xb07bd8].map(c => new T.Color(c));
  let fi = 0; const R = rng(33);
  for (const [x0, x1] of [[-9.5, -4.5], [4.5, 9.5]]) {
    add(new T.BoxGeometry(x1 - x0, .35, 1.8), soil, (x0 + x1) / 2, .17, 11.7);
    add(new T.BoxGeometry(x1 - x0 + .2, .4, .2), mat(0xc9b48a), (x0 + x1) / 2, .2, 12.65);
    for (let i = 0; i < FLOWER_N; i++) { M4.makeTranslation(x0 + .2 + R() * (x1 - x0 - .4), .45 + R() * .15, 10.9 + R() * 1.6); flowers.setMatrixAt(fi, M4); flowers.setColorAt(fi, FC[(R() * FC.length) | 0]); fi++; }
  }
  flowers.instanceMatrix.needsUpdate = true; if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true; g.add(flowers);
  const leafM = new T.MeshPhongMaterial({ color: 0x3f8a3f, flatShading: true, shininess: 4 }), trunkM = mat(0x6b4a2e);
  for (const [x, z, s] of [[-17, 18, 1.2], [17, 18, 1.2], [-24, 30, 1.4], [24, 30, 1.4], [-13, 38, 1], [13, 38, 1], [-27, 14, 1.1], [27, 14, 1.1]]) {
    add(new T.CylinderGeometry(.25 * s, .35 * s, 2.2 * s, 7), trunkM, x, 1.1 * s, z, true);
    const cn = add(new T.IcosahedronGeometry(1.9 * s, 0), leafM, x, 3.2 * s, z, true); cn.scale.y = 1.15; CL.circles.push([x, z, .9 * s]);
  }
  for (const [x, z] of [[-2.9, 17], [2.9, 17], [-2.9, 33], [2.9, 33]]) { add(new T.CylinderGeometry(.07, .1, 3.2, 6), darkWood, x, 1.6, z, true); add(new T.SphereGeometry(.3, 10, 8), warm, x, 3.35, z); CL.circles.push([x, z, .35]); }
  for (const z of [36, 39, 42]) for (const x of [-3.3, 3.3]) { add(new T.BoxGeometry(1.4, .8, 1.4), mat(0x3a7a3a, { flatShading: true }), x, .4, z, true); CL.circles.push([x, z, .9]); }
  add(new T.CylinderGeometry(1.8, 2.1, 1.1, 20), cream, 0, .55, 24, true); add(new T.CylinderGeometry(1.85, 1.85, .12, 20), brass, 0, 1.12, 24);
  const statue = makeCarrot('#d4af5a'); statue.position.set(0, 1.15, 24); statue.scale.setScalar(1.25); statue.rotation.y = 0; g.add(statue); statue.userData.club.visible = false; LB.statue = statue;
  plane(1.6, .5, new T.MeshLambertMaterial({ map: signTex(320, 100, 'EST. 2026', '', '#3d2a08', '#e8c873') }), 0, .6, 26.11);

  // ---- 로비 실내 ----
  const carpetB = plane(3.6, 14.2, brass, 0, .015, 3, 0, -Math.PI / 2); const carpet = plane(3.2, 14, mat(0x1f4a2e), 0, .02, 3, 0, -Math.PI / 2);
  // 프론트 데스크 (원목 + 대리석 상판 + 황동)
  const desk = new T.Group(); desk.position.set(0, 0, -5.2); g.add(desk);
  const dm = new T.Mesh(new T.BoxGeometry(8, 1.15, 1.3), darkWood); dm.position.y = .58; desk.add(dm);
  const top = new T.Mesh(new T.BoxGeometry(8.4, .12, 1.6), new T.MeshLambertMaterial({ map: marbleT })); top.position.y = 1.2; desk.add(top);
  for (const y of [.18, 1.05]) { const s = new T.Mesh(new T.BoxGeometry(8.02, .06, .04), brass); s.position.set(0, y, .66); desk.add(s); }
  const front = new T.Mesh(new T.PlaneGeometry(4.2, .6), new T.MeshLambertMaterial({ map: textTexture(512, 74, (c, w, h) => { c.fillStyle = '#4a2f1b'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c873'; c.font = `400 52px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FRONT · 프론트', w / 2, h / 2 + 3); }) })); front.position.set(0, .62, .661); desk.add(front);
  const bell = new T.Mesh(new T.SphereGeometry(.14, 12, 8, 0, TAU, 0, Math.PI / 2), brass); bell.position.set(2.4, 1.27, .2); desk.add(bell);
  const book = new T.Mesh(new T.BoxGeometry(.7, .06, .5), deep); book.position.set(-1.6, 1.29, .2); book.rotation.y = .2; desk.add(book);
  const lamp = new T.Mesh(new T.CylinderGeometry(.22, .3, .35, 12), mat(0xfff1c8, { emissive: 0x6a5a30 })); lamp.position.set(-3.2, 1.75, -.1); desk.add(lamp); const ls = new T.Mesh(new T.CylinderGeometry(.04, .04, .5, 6), brass); ls.position.set(-3.2, 1.45, -.1); desk.add(ls);
  // 토끼 리셉셔니스트
  const staff = makeCaddie(); staff.position.set(.3, .55, -6.2); staff.scale.setScalar(1.2); g.add(staff); LB.staff = staff;
  const bow = new T.Mesh(new T.BoxGeometry(.22, .1, .05), mat(0xd2442c)); bow.position.set(0, 1.05, .33); staff.add(bow);
  // 뒷벽 로고, 트로피, 명예의 전당 액자
  const logo = new T.Mesh(new T.PlaneGeometry(8, 1.9), new T.MeshLambertMaterial({ map: textTexture(1024, 240, (c, w, h) => { c.fillStyle = '#2d5a3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e8c873'; c.lineWidth = 10; c.strokeRect(12, 12, w - 24, h - 24); carrotIcon(c, 120, 122, 5); c.fillStyle = '#e8c873'; c.font = `400 104px ${FONT}`; c.textBaseline = 'middle'; c.fillText('당근 컨트리클럽', 210, 104); c.font = `600 32px "IBM Plex Mono",monospace`; c.fillText('CARROT COUNTRY CLUB · EST. 2026', 214, 184); }) }));
  logo.position.set(0, 4.5, -9.78); g.add(logo);
  add(new T.BoxGeometry(3.4, .12, .6), darkWood, -6.2, 2.4, -9.6);
  for (let i = 0; i < 4; i++) { const cup = new T.Group(); cup.position.set(-7.4 + i * .8, 2.46, -9.55); const b = new T.Mesh(new T.CylinderGeometry(.06, .12, .1, 10), brass); b.position.y = .05; cup.add(b); const st = new T.Mesh(new T.CylinderGeometry(.03, .03, .25, 6), brass); st.position.y = .22; cup.add(st); const bw = new T.Mesh(new T.CylinderGeometry(.16, .08, .22, 12), brass); bw.position.y = .44; cup.add(bw); g.add(cup); }
  const hof = new T.Mesh(new T.PlaneGeometry(2.6, 1.8), new T.MeshLambertMaterial({ map: textTexture(320, 220, (c, w, h) => { c.fillStyle = '#3d2a08'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8c873'; c.fillRect(10, 10, w - 20, h - 20); c.fillStyle = '#3d2a08'; c.textAlign = 'center'; c.font = `400 38px ${FONT}`; c.fillText('명예의 전당', w / 2, 60); c.font = `400 26px ${FONT}`; c.fillText('HOLE IN ONE', w / 2, 100); c.font = `400 22px ${FONT}`; c.fillText('홀인원하면 이름이 올라가요', w / 2, 150); }) }));
  hof.position.set(6.3, 3, -9.78); g.add(hof);
  // 라운지: 소파, 티 테이블, 화분, 샹들리에
  for (const x of [-6.6, 6.6]) { const so = new T.Group(); so.position.set(x, 0, 5.1); g.add(so); const base = new T.Mesh(new T.BoxGeometry(1.3, .5, 3.6), deep); base.position.y = .45; so.add(base); const back = new T.Mesh(new T.BoxGeometry(.32, 1, 3.6), deep); back.position.set(x < 0 ? -.55 : .55, .95, 0); so.add(back); for (const z of [-1.9, 1.9]) { const arm = new T.Mesh(new T.BoxGeometry(1.3, .75, .25), deep); arm.position.set(0, .6, z); so.add(arm); } const tb = new T.Mesh(new T.CylinderGeometry(.6, .6, .08, 18), new T.MeshLambertMaterial({ map: marbleT })); tb.position.set(x < 0 ? 1.4 : -1.4, .55, 0); so.add(tb); const tl = new T.Mesh(new T.CylinderGeometry(.06, .1, .5, 8), brass); tl.position.set(x < 0 ? 1.4 : -1.4, .27, 0); so.add(tl); }
  for (const [x, z] of [[-8.6, 8.6], [8.6, 8.6], [-8.6, -8.4], [8.6, -8.4]]) { add(new T.CylinderGeometry(.45, .35, .8, 12), mat(0xb5653a), x, .4, z, true); const lf = add(new T.IcosahedronGeometry(.9, 0), mat(0x3f8a3f, { flatShading: true }), x, 1.5, z, true); lf.scale.y = 1.3; }
  for (const [x, z] of [[-4, -1], [4, -1], [0, 5]]) { add(new T.SphereGeometry(.38, 12, 8), warm, x, 6.2, z); add(new T.CylinderGeometry(.02, .02, .8, 4), brass, x, 6.6, z); }
  for (const [x, z] of [[0, -1], [-16, 0]]) { const pl = new T.PointLight(0xffe2b0, .8, 22); pl.position.set(x, 5.6, z); g.add(pl); }
  // 출입구 표지판 (실내)
  const hang = (w, top, sub, x, y, z, ry) => { const s = plane(w, w * .26, new T.MeshLambertMaterial({ map: signTex(640, 166, top, sub) }), x, y, z, ry); return s; };
  hang(2.6, '락커룸', 'LOCKER ROOM', -9.76, 5.3, 0, Math.PI / 2);
  hang(2.6, '드라이빙 레인지', 'DRIVING RANGE', 9.76, 5.4, -4.5, -Math.PI / 2);
  hang(2.6, '골프 코스 · 1번 홀', 'GOLF COURSE', 9.76, 5.4, 4.5, -Math.PI / 2);
  hang(2.8, '정문', 'MAIN ENTRANCE', 0, 5.6, 9.76, Math.PI);
  hang(2.6, '로비', 'LOBBY', -10.24, 5.3, 0, -Math.PI / 2);
  // 오른쪽 출입구 너머: 밝은 바깥 풍경 + 황동 문틀
  const outT = textTexture(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#bfe0f2'); gr.addColorStop(.55, '#eaf6f0'); gr.addColorStop(.56, '#8fcf6e'); gr.addColorStop(1, '#5fa04a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  for (const z of [-4.5, 4.5]) { plane(2.8, 4.8, new T.MeshBasicMaterial({ map: outT }), 10.45, 2.4, z, -Math.PI / 2); for (const dz of [-1.42, 1.42]) add(new T.BoxGeometry(.5, 4.8, .14), brass, 10, 2.4, z + dz); }
  // 바닥 안내 화살표
  const arrowT = textTexture(256, 128, (c, w, h) => { c.fillStyle = 'rgba(232,200,115,.9)'; c.beginPath(); c.moveTo(20, 44); c.lineTo(160, 44); c.lineTo(160, 14); c.lineTo(236, 64); c.lineTo(160, 114); c.lineTo(160, 84); c.lineTo(20, 84); c.fill(); });
  const arrowM = new T.MeshBasicMaterial({ map: arrowT, transparent: true, depthWrite: false });
  for (const [x, z, ry] of [[-7.6, 0, Math.PI], [7.4, -4.5, 0], [7.4, 4.5, 0]]) { const a = plane(1.8, .9, arrowM, x, .03, z, 0, -Math.PI / 2); a.rotation.set(-Math.PI / 2, 0, ry); }

  // ---- 락커룸 ----
  const lockN = 10; LB.lockers = [];
  for (let i = 0; i < lockN; i++) {
    const z = -5.85 + i * 1.3, num = 101 + i;
    add(new T.BoxGeometry(1, 3, 1.3), darkWood, -21.5, 1.5, z, true);
    const pivot = new T.Group(); pivot.position.set(-20.98, 1.5, z - .62); g.add(pivot);
    const door = new T.Mesh(new T.BoxGeometry(.06, 2.8, 1.22), new T.MeshLambertMaterial({ map: textTexture(64, 160, (c, w, h) => { c.fillStyle = '#7a5233'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12); c.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < 4; k++) c.fillRect(16, 14 + k * 7, 32, 3); c.fillStyle = '#e8c873'; c.fillRect(18, 52, 28, 16); c.fillStyle = '#3d2a08'; c.font = '700 13px sans-serif'; c.textAlign = 'center'; c.fillText(num, 32, 65); }) }));
    door.position.z = .61; pivot.add(door);
    const knob = new T.Mesh(new T.SphereGeometry(.05, 8, 6), brass); knob.position.set(.05, 0, 1.1); pivot.add(knob);
    LB.lockers.push({ pivot, num, z });
  }
  add(new T.BoxGeometry(1, .2, 13.4), brass, -21.5, 3.1, 0);
  // 전신 거울
  add(new T.BoxGeometry(2, 3.5, .12), brass, -16, 2.05, -6.76);
  const mirT = textTexture(128, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#dfeef2'); gr.addColorStop(.5, '#b9d3db'); gr.addColorStop(1, '#e8f3f5'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(20, 0); c.lineTo(50, 0); c.lineTo(10, 120); c.lineTo(0, 120); c.fill(); c.beginPath(); c.moveTo(70, 0); c.lineTo(82, 0); c.lineTo(30, 200); c.lineTo(22, 200); c.fill(); });
  plane(1.75, 3.25, new T.MeshPhongMaterial({ map: mirT, shininess: 120, specular: 0xffffff }), -16, 2.05, -6.69);
  // 벤치
  add(new T.BoxGeometry(3.2, .22, .9), deep, -16, .62, 1, true); add(new T.BoxGeometry(3.3, .08, 1), wood, -16, .48, 1);
  for (const x of [-17.4, -14.6]) add(new T.BoxGeometry(.14, .45, .8), brass, x, .23, 1);
  // 옷걸이와 골프웨어
  add(new T.CylinderGeometry(.03, .03, 8.6, 6), brass, -16, 2.5, 6.4).rotation.z = Math.PI / 2;
  for (const x of [-20.2, -11.8]) add(new T.CylinderGeometry(.05, .05, 2.5, 6), brass, x, 1.25, 6.4);
  const wearC = [0xf7f7f2, 0x2aa3c9, 0x1d1d22, 0xc8463a, 0x2b4e8c, 0xffd23f, 0xf1e6cc, 0xff8fb8];
  for (let i = 0; i < 12; i++) { const x = -19.6 + i * .66, c = wearC[i % wearC.length]; const sh = add(new T.BoxGeometry(.5, .95, .14), mat(c), x, 1.9, 6.35, true); sh.rotation.y = (i % 2 ? .12 : -.12); add(new T.BoxGeometry(.5, .04, .04), brass, x, 2.42, 6.35); }
  add(new T.BoxGeometry(8.4, .08, .6), wood, -16, 3.3, 6.5);
  for (let i = 0; i < 6; i++) { const cap = add(new T.SphereGeometry(.22, 10, 6, 0, TAU, 0, Math.PI / 2), mat([0xffffff, 0xff8a2a, 0x5ab4f0, 0x3f9a4e, 0xffd23f, 0x2b2b2b][i]), -19.5 + i * 1.4, 3.34, 6.45); cap.scale.y = .7; }
  for (const [x, z] of [[-11, -6.2], [-21, 6.4]]) { add(new T.CylinderGeometry(.35, .28, .7, 12), mat(0xb5653a), x, .35, z, true); add(new T.IcosahedronGeometry(.7, 0), mat(0x3f8a3f, { flatShading: true }), x, 1.3, z, true); }
  const lsign = plane(3, .78, new T.MeshLambertMaterial({ map: signTex(640, 166, '락커룸', 'LOCKER ROOM') }), -16, 4.4, -6.78);
  scene.add(g);
}

// ---- 상태 전환 ----
function setClubUI(on) { $('app').classList.toggle('inclub', on); $('app').classList.remove('inlobby'); if (!on) { $('lobbyUI').hidden = true; $('clubTitle').hidden = true; $('lbSkip').hidden = true; } }
function placeClub(lx, lz, yaw) { me.x = LB.x + lx; me.z = LB.z + lz; me.yaw = yaw; me.moveT = null; me.path = null; cam.yaw = yaw; LB.cam = null; }
// where: 'outside'(정원) | 'lobby' | 'range'(연습장 출입구) | 'course'(코스 출입구) | 'gate'(정문으로 나가는 연출)
function startClubAt(where) {
  buildLobby(); closeOverlay(); setClubUI(true); $('power').hidden = true; landRing.visible = false;
  LB.lockerUI = false; LB.desk = 'idle'; LB.deskSnooze = false; LB.welcome = null; LB.portalLock = true; LB.cine = null; $('lobbyUI').hidden = true; $('lobbyUI').classList.remove('locker');
  if (where === 'outside') placeClub(0, 31, Math.PI);
  else if (where === 'range') placeClub(8.2, -4.5, -Math.PI / 2);
  else if (where === 'course') placeClub(8.2, 4.5, -Math.PI / 2);
  else if (where === 'gate') { placeClub(0, 5, 0); startCine('exit'); return; }
  else placeClub(0, 2, Math.PI);
  S.mode = 'club'; lastActKey = '';
}
function fadeTo(fn) { $('fade').classList.add('on'); sndCart(); setTimeout(() => { fn(); setTimeout(() => $('fade').classList.remove('on'), 150); }, 500); }

// ---- 입장·퇴장 연출 ----
function startCine(kind) {
  S.mode = 'cine'; me.moveT = null; me.path = null; LB.cam = null; lastActKey = ''; $('lobbyUI').hidden = true;
  if (kind === 'enter') {
    const sx = clamp(me.x - LB.x, -2.5, 2.5);
    const lz0 = me.z - LB.z, side = me.x - LB.x < 0 ? -3.8 : 3.8;
    // 당근 조형물(정원 가운데)을 돌아서 정문으로
    const lead = lz0 > 21 ? [[side, Math.min(lz0, 27.5)], [side, 20.5], [0, 15]] : [[sx * .5, 15]];
    LB.cine = { kind, t: 0, path: [...lead, [0, 12.5], [0, 8.5], [0, 3.6]] };
    const t = $('clubTitle'); t.hidden = false; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on');
    tone(523, .3, 'sine', .1); tone(659, .3, 'sine', .1, .18); tone(784, .5, 'sine', .1, .36);
  } else {
    LB.cine = { kind, t: 0, path: [[0, 8.6], [0, 12.5], [0, 17.5]] };
  }
  $('lbSkip').hidden = false; $('lbSkip').textContent = '건너뛰기 ▸';
}
function finishCine() {
  const c = LB.cine; if (!c) return; LB.cine = null; $('lbSkip').hidden = true;
  const end = c.path.length ? c.path[c.path.length - 1] : null;
  if (end) { me.x = LB.x + end[0]; me.z = LB.z + end[1]; }
  S.mode = 'club'; me.anim = 0; lastActKey = ''; LB.cam = null;
  if (c.kind === 'enter') {
    me.yaw = Math.PI; cam.yaw = Math.PI;
    setTimeout(() => { $('clubTitle').hidden = true; }, 900);
    LB.welcome = [me.x, me.z]; openDesk(true);
  } else { me.yaw = 0; cam.yaw = Math.PI; toast('정문 밖이에요. 언제든 다시 입장할 수 있어요', 2200); }
}
function skipCine() {
  const c = LB.cine; if (!c) return;
  c.path = c.path.length ? [c.path[c.path.length - 1]] : []; finishCine();
}

// ---- 프론트 데스크 ----
function lbShow(name, say, btns) {
  $('lobbyUI').hidden = false; $('lobbyUI').classList.remove('locker');
  $('lbName').textContent = name; typeSay(say);
  $('lbBtns').className = 'lb-btns';
  $('lbBtns').innerHTML = btns.map(([t, a, cls]) => `<button type="button" class="btn${cls ? ' ' + cls : ''}" data-a="${a}">${esc(t)}</button>`).join('');
  $('lbBtns').querySelectorAll('[data-a]').forEach(b => b.onclick = () => lobbyAct(b.dataset.a));
  if (LB.staff) LB.staff.userData.talk = 1.2;
}
function openDesk(welcome) {
  LB.desk = 'open';
  lbShow('프론트 토끼 매니저', welcome ? `어서 오세요, ${NET.nick} 님! 당근 컨트리클럽입니다. 오늘은 무엇을 도와드릴까요?` : '어서 오세요! 당근 컨트리클럽입니다. 오늘은 무엇을 도와드릴까요?',
    [['락커룸 안내', 'g-locker'], ['드라이빙 레인지 안내', 'g-range', 'sub'], ['골프 코스 안내', 'g-course', 'sub'], ['이름 바꾸기', 'nick', 'link']]);
  tone(1568, .4, 'sine', .08);
}
function closeDesk(snooze) { LB.desk = 'idle'; LB.welcome = null; if (snooze) LB.deskSnooze = true; if (!LB.lockerUI) $('lobbyUI').hidden = true; }
function walkPath(pts) { const w = pts.map(([lx, lz]) => [LB.x + lx, LB.z + lz]); me.moveT = w.shift(); me.path = w; }
function lobbyAct(a) {
  tone(660, .05, 'square', .04);
  const guide = (say, pts) => { lbShow('프론트 토끼 매니저', say, []); setTimeout(() => { closeDesk(true); walkPath(pts); }, 1100); };
  if (a === 'g-locker') guide('락커룸은 왼쪽 문이에요. 모셔다 드릴게요!', [[-5, 0], [-10, 0], [-13.5, -.8]]);
  else if (a === 'g-range') guide('드라이빙 레인지는 오른쪽 앞 문이에요. 문으로 들어가시면 바로 연습장이에요!', [[5.5, -2.6], [10.2, -4.5]]);
  else if (a === 'g-course') guide('골프 코스는 오른쪽 뒤 문이에요. 1번 홀 단풍길로 이어져요!', [[5.5, 2.6], [10.2, 4.5]]);
  else if (a === 'nick') { $('nick').click(); const iv = setInterval(() => { if ($('overlay').hidden) { clearInterval(iv); if (LB.desk === 'open') openDesk(false); } }, 300); }
  else if (a === 'lkdone') closeLocker();
  else if (a === 'lklobby') { closeLocker(); walkPath([[-13, 0], [-9, 0], [-2, -2.2]]); }
}
let typeT = 0;
function typeSay(text) {
  clearInterval(typeT); const el = $('lbSay'); let n = 0; el.textContent = '';
  typeT = setInterval(() => { n += 2; el.textContent = text.slice(0, n); if (n % 6 === 0) tone(1100 + Math.random() * 200, .025, 'square', .015); if (n >= text.length) clearInterval(typeT); }, 30);
  el.onclick = () => { clearInterval(typeT); el.textContent = text; };
}

// ---- 락커룸: 거울 앞에서 옷 갈아입기 ----
function myLockerIdx() { return Math.abs([...(NET.nick || 'a')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % LB.lockers.length; }
function openDress() {
  if (S.mode !== 'club') return;
  const go = () => { LB.lockerUI = true; me.yaw = Math.PI; LB.cam = null; LB.myLocker = myLockerIdx(); closeDesk(); renderLocker(); lastActKey = ''; };
  const lx = me.x - LB.x, lz = me.z - LB.z;
  if (Math.hypot(lx + 16, lz + 3.8) < .6) go(); else { walkPath(lz > 1.8 || lz < .2 ? [[-16, -3.8]] : [[-12.5, -1.5], [-16, -3.8]]); LB.afterWalk = go; }
}
function closeLocker() { LB.lockerUI = false; LB.myLocker = null; $('lobbyUI').hidden = true; $('lobbyUI').classList.remove('locker'); LB.cam = null; lastActKey = ''; toast('오늘 룩 저장했어요. 어디서든 이 옷으로 보여요', 1800); }
function renderLocker() {
  const lk = normLook(myLook);
  $('lobbyUI').hidden = false; $('lobbyUI').classList.add('locker');
  $('lbName').textContent = `락커 ${LB.lockers[LB.myLocker ?? 0].num}번 · 오늘의 라운딩 룩`;
  clearInterval(typeT); $('lbSay').textContent = '고르는 즉시 거울에 비쳐요. 클럽하우스·연습장·코스 어디서든 이 옷으로 보여요!';
  $('lbBtns').className = 'lb-btns lk';
  $('lbBtns').innerHTML = `<div class="lk-row"><span class="lk-lab">모자</span><div class="lk-sw">${HATS.map(([n, c], i) => `<button type="button" class="sw${i === lk[0] ? ' on' : ''}" data-hat="${i}" style="--c:${c}" aria-label="${n} 모자" title="${n}"></button>`).join('')}</div></div>
    <div class="lk-row"><span class="lk-lab">옷</span><div class="lk-tops">${TOPS.map((n, i) => `<button type="button" class="tp${i === lk[1] ? ' on' : ''}" data-top="${i}">${n}</button>`).join('')}</div></div>
    <div class="lk-row"><span class="lk-lab">소품</span><div class="lk-tops">${ACCS.map((n, i) => `<button type="button" class="tp${i === lk[2] ? ' on' : ''}" data-acc="${i}">${n}</button>`).join('')}</div></div>
    <div class="lk-row end"><button type="button" class="btn sub" data-a="lklobby">로비로 돌아가기</button><button type="button" class="btn" data-a="lkdone">다 입었어요</button></div>`;
  $('lbBtns').querySelectorAll('[data-hat],[data-top],[data-acc]').forEach(b => b.onclick = () => {
    const cur = normLook(myLook).slice();
    if (b.dataset.hat != null) cur[0] = +b.dataset.hat; else if (b.dataset.top != null) cur[1] = +b.dataset.top; else cur[2] = +b.dataset.acc;
    myLook = cur; saveLook(); applyLook(me.av, myLook, '#ffffff'); me.jump = 1; tone(880 + cur[1] * 60, .08, 'triangle', .08); tone(1320, .08, 'triangle', .06, .07);
    renderLocker();
  });
  $('lbBtns').querySelectorAll('[data-a]').forEach(b => b.onclick = () => lobbyAct(b.dataset.a));
}

// ---- 공간 이동: 연습장 · 코스 ----
function goRangeFromClub() { closeDesk(); fadeTo(() => { setClubUI(false); startRange(); }); }
function backToClub(where) { fadeTo(() => { if (S.mode === 'range') { $('app').classList.remove('inrange'); const cs = document.querySelector('.holecard .count span'); if (cs) cs.textContent = '타'; if (RG.ball && RG.ball.state === 'tee') { RG.ball.state = 'free'; RG.ball.m.visible = false; } RG.charge = false; updHud(); } startClubAt(where); }); }
function goCourseDoor() {
  me.moveT = null; me.path = null; closeDesk();
  const saved = !roundHasProgress() && loadRound();
  if (!roundHasProgress() && !saved) { if (S.scores.every(x => x != null)) resetRound(false); enterCourse(false); return; }
  const d = roundHasProgress() ? { hole: S.hole, strokes: S.strokes, sc: totalDiff(), done: S.scores.filter(x => x != null).length } : { hole: saved.hole, strokes: saved.strokes, sc: saved.scores.reduce((d, s, i) => s == null ? d : d + s - HOLES[i].par, 0), done: saved.scores.filter(x => x != null).length };
  me.x = LB.x + 8.3; lastActKey = '';
  overlay(`<span class="eyebrow">골프 코스 입구</span><h2>다시 오셨군요! 이어서 라운딩하시겠어요?</h2>
    <p>${d.hole + 1}번 홀 · 이번 홀 ${d.strokes}타 · 합계 ${fmtDiff(d.sc)} (${d.done}/${HOLES.length}홀 완료)</p>
    <div class="btns col"><button class="btn" id="rcGo">이어서 라운딩하기</button><button class="btn sub" id="rcNew">새 라운딩 시작하기</button><button class="btn sub" id="rcBack">클럽하우스로 돌아가기</button></div>`);
  $('rcGo').onclick = () => { closeOverlay(); if (saved) applyRound(saved); enterCourse(true); };
  $('rcNew').onclick = () => {
    overlay(`<span class="eyebrow">새 라운딩</span><h2>지금 라운딩 기록을 지우고 새로 시작할까요?</h2><p>이번 라운딩 타수와 공 위치가 초기화돼요. 명예의 전당과 베스트 기록은 그대로 남아요.</p>
      <div class="btns"><button class="btn" id="rcYes">새로 시작</button><button class="btn sub" id="rcNo">취소</button></div>`);
    $('rcYes').onclick = () => { closeOverlay(); resetRound(false); clearRound(); enterCourse(false); };
    $('rcNo').onclick = () => goCourseDoor();
  };
  $('rcBack').onclick = () => { closeOverlay(); LB.portalLock = true; };
}
function enterCourse(resume) {
  fadeTo(() => {
    setClubUI(false); updHud(); renderCard(); renderTix();
    goFirstTee();
    if (resume) toast(`${S.hole + 1}번 홀, ${S.strokes}타째부터 이어서 쳐요`, 2200);
  });
}
function leaveCourse(where) {
  if (S.mode === 'aim') exitAim();
  if (S.mode !== 'walk') { toast(S.mode === 'ride' ? '카트에서 내린 뒤에 이동할 수 있어요' : '공이 멈춘 뒤에 이동할 수 있어요', 1600); return; }
  closeOverlay(); saveRound(); keys.clear(); me.moveT = null;
  fadeTo(() => startClubAt(where));
}

// ---- 라운딩 저장·이어하기 (브라우저에 저장, 다른 사람과는 무관) ----
const ROUND_KEY = 'carrotRound';
function roundHasProgress() { const done = S.scores.filter(x => x != null).length; return done < HOLES.length && (S.strokes > 0 || done > 0); }
function clearRound() { try { localStorage.removeItem(ROUND_KEY); } catch {} }
function saveRound() {
  if (!roundHasProgress()) { if (S.scores.every(x => x != null)) clearRound(); return; }
  const d = { v: 1, at: Date.now(), hole: S.hole, strokes: S.strokes, scores: S.scores.slice(), ball: { x: S.ball.x, z: S.ball.z }, ballVis: S.ballVis, buff: S.buff, mulligans: S.mulligans, okTix: S.okTix, chance: S.chance, spent: S.spent || 0, st: S.st, crocDone: !!S.crocDone, zoneUsed: S.zoneUsed || {} };
  try { localStorage.setItem(ROUND_KEY, JSON.stringify(d)); } catch {}
}
function loadRound() {
  try { const d = JSON.parse(localStorage.getItem(ROUND_KEY)); if (!d || d.v !== 1 || !Array.isArray(d.scores) || d.scores.length !== HOLES.length || !d.ball) return null; if (Date.now() - d.at > 3 * 86400e3) return null; if (d.scores.every(x => x != null)) return null; return d; } catch { return null; }
}
function applyRound(d) {
  S.hole = clamp(d.hole | 0, 0, HOLES.length - 1); S.strokes = Math.max(0, d.strokes | 0); d.scores.forEach((v, i) => { S.scores[i] = v == null ? null : +v; });
  Object.assign(S.ball, { x: +d.ball.x || HOLES[S.hole].tee[0], z: +d.ball.z || HOLES[S.hole].tee[1], y: 0, vx: 0, vy: 0, vz: 0, state: 'rest' }); S.ballVis = d.ballVis !== false;
  S.buff = d.buff || null; S.mulligans = d.mulligans | 0; S.okTix = d.okTix | 0; S.chance = d.chance ?? CHANCE_MAX; S.spent = d.spent || 0; S.st = d.st || newStats(); S.crocDone = !!d.crocDone; S.zoneUsed = d.zoneUsed || {}; S.prev = null; S.last = null;
  const m = S.buff && MENU.find(x => x.id === S.buff); $('buffChip').hidden = !m; if (m) $('buffChip').textContent = m.chip;
  renderSpent(); renderTix(); renderCard(); updHud();
}
setInterval(() => { if (built && ['walk', 'aim', 'wait', 'flight', 'ride', 'eat'].includes(S.mode)) saveRound(); }, 4000);
window.addEventListener('pagehide', () => { if (built && !['club', 'cine', 'range'].includes(S.mode)) saveRound(); });

// ---- 메뉴 (왼쪽 위 당근 CC 버튼) ----
function openGameMenu() {
  if (!built || S.mode === 'cine') return;
  const inCourse = !['club', 'range'].includes(S.mode);
  if (inCourse) overlay(`<span class="eyebrow">메뉴 · ${NET.ch ? NET.ch + '채널' : '혼자 라운딩'}</span><h2>${S.hole + 1}번 홀 · ${S.strokes}타째</h2>
    <p>합계 ${fmtDiff(totalDiff())} · ${S.scores.filter(x => x != null).length}/${HOLES.length}홀 완료. 클럽하우스에 다녀와도 지금 위치에서 이어서 칠 수 있어요.</p>
    <div class="btns col"><button class="btn" id="gmGo">▶ 라운딩 계속하기</button><button class="btn sub" id="gmClub">🏛️ 클럽하우스로 돌아가기</button><button class="btn sub" id="gmGate">🚪 정문으로 나가기</button></div>
    <button type="button" class="linkbtn" id="gmExit">입장 화면(채널 선택)으로 나가기</button>`);
  else overlay(`<span class="eyebrow">메뉴</span><h2>${S.mode === 'range' ? '드라이빙 레인지' : '클럽하우스'}</h2>
    <p>${roundHasProgress() ? `진행 중인 라운딩: ${S.hole + 1}번 홀 · 합계 ${fmtDiff(totalDiff())}` : '골프 코스 1번 홀로 바로 갈 수 있어요.'}</p>
    <div class="btns col"><button class="btn" id="gmGo">▶ 계속 둘러보기</button><button class="btn sub" id="gmCourse">⛳ 골프 코스로</button>${S.mode === 'range' ? '<button class="btn sub" id="gmLobby">🏛️ 로비로 돌아가기</button>' : ''}<button class="btn sub" id="gmGate">🚪 정문으로 나가기</button></div>
    <button type="button" class="linkbtn" id="gmExit">입장 화면(채널 선택)으로 나가기</button>`);
  $('gmGo').onclick = closeOverlay;
  if ($('gmClub')) $('gmClub').onclick = () => leaveCourse('course');
  if ($('gmLobby')) $('gmLobby').onclick = () => { closeOverlay(); backToClub('range'); };
  if ($('gmCourse')) $('gmCourse').onclick = () => { closeOverlay(); if (S.mode === 'range') backToClub('course'); else { placeClub(8.3, 4.5, -Math.PI / 2); goCourseDoor(); } };
  $('gmGate').onclick = () => { if (inCourse) leaveCourse('gate'); else { closeOverlay(); if (S.mode === 'range') backToClub('gate'); else fadeTo(() => startClubAt('gate')); } };
  $('gmExit').onclick = () => { closeOverlay(); saveRound(); exitToEntry(); };
}

// ---- 매 프레임 ----
function updateLobby(dt, t) {
  if (!LB.built) return;
  const lx = me.x - LB.x, lz = me.z - LB.z, here = inClub(me.x, me.z) && (S.mode === 'club' || S.mode === 'cine');
  // 정문: 가까이 가면 양쪽으로 스르륵
  const want = here && Math.hypot(lx, (lz - 10) * 1.3) < 4.6 ? 1 : 0;
  LB.doorK += (want - LB.doorK) * Math.min(1, dt * 5);
  if (LB.panels) for (const p of LB.panels) p.position.x = p.userData.s * (1 + LB.doorK * 1.9);
  if (want && !LB.doorSnd) { LB.doorSnd = true; noise(.35, 900, .6, .05); } else if (!want) LB.doorSnd = false;
  for (const [i, L] of LB.lockers.entries()) { const tgt = LB.lockerUI && i === LB.myLocker ? 1.5 : 0; L.pivot.rotation.y += (tgt - L.pivot.rotation.y) * Math.min(1, dt * 4); }
  const sf = LB.staff; if (sf) { sf.userData.talk = Math.max(0, (sf.userData.talk || 0) - dt); sf.position.y = .55 + (sf.userData.talk > 0 ? Math.abs(Math.sin(t * 10)) * .06 : 0); sf.rotation.z = Math.sin(t * 1.5) * .04; }
  if (LB.statue) LB.statue.rotation.y = Math.sin(t * .4) * .25;
  if (!here) return;
  if (S.mode === 'cine') {
    const c = LB.cine; c.t += dt;
    if (c.path.length) {
      const [tx, tz] = c.path[0], dx = LB.x + tx - me.x, dz = LB.z + tz - me.z, d = Math.hypot(dx, dz);
      // 문이 반쯤 열릴 때까지 문 앞에서 잠깐 기다려요
      const atDoor = Math.abs(lz - 10) < 2.2 && LB.doorK < .55;
      if (d < .12) c.path.shift();
      else if (!atDoor) { const sp = Math.min(d, (lz > 13 ? 7 : 4.2) * dt); me.x += dx / d * sp; me.z += dz / d * sp; me.yaw = Math.atan2(dx, dz); me.anim = 1; }
    } else { c.wait = (c.wait || 0) + dt; if (c.wait > .35) finishCine(); }
    return;
  }
  LB.zone = clubZone(lx, lz);
  if (LB.afterWalk && !me.moveT) { const f = LB.afterWalk; LB.afterWalk = null; f(); }
  if (keys.size && LB.afterWalk) LB.afterWalk = null;
  if (LB.lockerUI && (keys.size || me.moveT)) closeLocker();
  // 프론트 근처에 오면 토끼가 먼저 말을 걸어요
  const dDesk = Math.hypot(lx, lz + 3.4);
  if (LB.welcome && Math.hypot(me.x - LB.welcome[0], me.z - LB.welcome[1]) > 1.5) LB.welcome = null;
  if (!LB.lockerUI) {
    if (dDesk > 3.8) LB.deskSnooze = false;
    if (dDesk < 2.6 && LB.desk !== 'open' && !LB.deskSnooze && !me.moveT) openDesk(false);
    else if (LB.desk === 'open' && !LB.welcome && dDesk > 3.8) closeDesk();
  }
  // 오른쪽 출입구로 걸어 들어가면 연습장 / 코스로
  if (lx < 8.6) LB.portalLock = false;
  if (lx > 9.6 && !LB.portalLock) {
    LB.portalLock = true;
    if (lz < 0) goRangeFromClub(); else goCourseDoor();
  }
}
function lobbyCamera(dt) {
  const y0 = EDGE_H, lx = me.x - LB.x, lz = me.z - LB.z;
  let tg;
  if (S.mode === 'cine') {
    const c = LB.cine;
    if (c.kind === 'enter') tg = lz > 9.6 ? { tx: LB.x, ty: y0 + 2.6, tz: LB.z + 10, px: LB.x + 2.2, py: y0 + 3.4, pz: me.z + 8 } : { tx: me.x, ty: y0 + 1.5, tz: me.z - 2.5, px: LB.x + 4.6, py: y0 + 3.9, pz: LB.z + 8.8 };
    else tg = { tx: me.x, ty: y0 + 2, tz: me.z, px: LB.x + 4.5, py: y0 + 3.8, pz: LB.z + 24 };
  } else if (LB.lockerUI) {
    tg = { tx: me.x, ty: y0 + 1.3, tz: me.z, px: me.x + .35, py: y0 + 1.9, pz: LB.z - 6.5 };
  } else {
    const zone = clubZone(lx, lz), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const dist = zone === 'out' ? Math.max(9, cam.dist) : Math.min(cam.dist, 7.5);
    let px = me.x - Math.sin(cam.yaw) * cp * dist, pz = me.z - Math.cos(cam.yaw) * cp * dist, py = y0 + 1.6 + sp * dist;
    const r = zone === 'lobby' ? [-9.3, 9.3, -9.3, 9.3] : zone === 'locker' ? [-21.2, -10.5, -6.5, 6.5] : null;
    if (r) { px = clamp(px, LB.x + r[0], LB.x + r[1]); pz = clamp(pz, LB.z + r[2], LB.z + r[3]); py = Math.min(py, y0 + (zone === 'lobby' ? 6.2 : 5.3)); }
    else if (pz < LB.z + 11 && px > LB.x - 23 && px < LB.x + 11) pz = LB.z + 11;
    tg = { tx: me.x, ty: y0 + 1.5, tz: me.z, px, py: Math.max(py, y0 + 1.2), pz };
  }
  if (!LB.cam) LB.cam = { ...tg };
  const k = Math.min(1, dt * (S.mode === 'cine' ? 2.6 : 6)); for (const key in tg) LB.cam[key] += (tg[key] - LB.cam[key]) * k;
  return LB.cam;
}
function goFirstTee() {
  const t = HOLES[S.hole].tee; me.x = t[0] - 1 + rand(-3, 3); me.z = t[1] + 6 + rand(-1, 1.5); me.yaw = Math.PI; cam.yaw = Math.PI; S.mode = 'walk'; me.path = null; me.moveT = null;
  if (S.ball.state === 'rest' && S.strokes > 0) { const a = Math.atan2(hole().cup[0] - S.ball.x, hole().cup[1] - S.ball.z); for (const r of [2, 3, 4.5]) { const x = S.ball.x - Math.sin(a) * r, z = S.ball.z - Math.cos(a) * r; if (canStand(x, z)) { me.x = x; me.z = z; break; } } me.yaw = a; cam.yaw = a; }
  snapCam(); lastActKey = '';
  sendPos(true);
  setTimeout(() => { if (S.hole === 0 && S.strokes === 0 && $('overlay').hidden && S.mode === 'walk') showGuide(0); }, 900);
  setTimeout(() => $('help').classList.add('off'), window.innerWidth < 640 ? 7000 : 12000);
}

// ================= 드라이빙 레인지 =================
let skyMesh = null;
// 클럽하우스 뒤쪽 별도 공간. 점수와 상관없이 클럽별로 마음껏 쳐 보고 비거리를 확인해요.
const RG = { x: 0, z: 640, built: false, club: 0, yaw: 0, charge: false, power: 0, ball: null, pool: [], npcs: [], shots: 0, waitT: 0, last: '', best: [0, 0, 0], cam: null, targets: [] };
const RANGE_CLUBS = [0, 1, 2]; // 드라이버·아이언·웨지 (퍼터는 연습 그린에서)
try { const b = JSON.parse(localStorage.getItem('carrotRangeBest')); if (Array.isArray(b)) RG.best = [0, 1, 2].map(i => +b[i] || 0); } catch {}
const RANGE_M = d => Math.round(d * M_PER_U);
function buildRange() {
  if (RG.built) return; RG.built = true;
  const g = new T.Group(), y0 = EDGE_H; g.position.set(RG.x, y0, RG.z); RG.g = g;
  const add = (geo, m, x, y, z, sh = false) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.receiveShadow = true; o.castShadow = sh; g.add(o); return o; };
  // 잔디: 깎은 줄무늬
  const gt = textTexture(64, 512, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#6db257' : '#7fc568'; c.fillRect(0, i * 32, w, 32); } });
  gt.wrapS = gt.wrapT = T.RepeatWrapping; gt.repeat.set(6, 3);
  const field = add(new T.PlaneGeometry(90, 110), new T.MeshLambertMaterial({ map: gt }), 0, .03, 45); field.rotation.x = -Math.PI / 2;
  // 타석 데크와 지붕
  add(new T.BoxGeometry(46, .3, 7), mat(0xcfc6b4), 0, .15, -3.2);
  const roofM = mat(0x2e5e36), postM = mat(0x7a5233);
  add(new T.BoxGeometry(48, .35, 8), roofM, 0, 4.4, -3.6, true);
  add(new T.BoxGeometry(48, .5, .3), mat(0xe9711f, { emissive: 0x4a1d00 }), 0, 4.05, .3);
  for (const x of [-23.8, -12, -4, 4, 12, 23.8]) add(new T.BoxGeometry(.3, 4.3, .3), postM, x, 2.2, .1, true);
  add(new T.BoxGeometry(48, 4.4, .3), mat(0xf3ead8), 0, 2.2, -7.4);
  const banner = new T.Mesh(new T.PlaneGeometry(14, 1.6), new T.MeshLambertMaterial({ map: textTexture(900, 104, (c, w, h) => { c.fillStyle = '#2e5e36'; c.fillRect(0, 0, w, h); carrotIcon(c, 60, 52, 2.4); c.fillStyle = '#f4e9cf'; c.font = `400 64px ${FONT}`; c.textBaseline = 'middle'; c.fillText('당근 CC 드라이빙 레인지', 110, 56); }) }));
  banner.position.set(0, 4.05, .47); g.add(banner);
  // 타석 매트 5개 (가운데가 내 자리)
  RG.bays = [-16, -8, 0, 8, 16];
  for (const x of RG.bays) {
    add(new T.BoxGeometry(2.6, .08, 2.2), mat(0x2f6b3a), x, .34, .2);
    const basket = add(new T.CylinderGeometry(.35, .28, .4, 12), mat(0xe9711f), x + 2, .5, -.8, true);
    for (let k = 0; k < 6; k++) add(new T.SphereGeometry(.12, 8, 6), mat(0xffffff), x + 2 + rand(-.18, .18), .74, -.8 + rand(-.18, .18));
  }
  // 거리 표지판과 바닥 선
  for (const m of [50, 100, 150, 200]) {
    const z = m / M_PER_U;
    const line = add(new T.PlaneGeometry(80, .35), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55 }), 0, .05, z); line.rotation.x = -Math.PI / 2;
    for (const sx of [-30, 30]) {
      const bd = new T.Group(); bd.position.set(sx, 0, z); g.add(bd);
      for (const px of [-1.1, 1.1]) { const p_ = new T.Mesh(new T.BoxGeometry(.2, 2.4, .2), postM); p_.position.set(px, 1.2, 0); bd.add(p_); }
      const sg = new T.Mesh(new T.PlaneGeometry(3.4, 1.6), new T.MeshLambertMaterial({ map: textTexture(256, 120, (c, w, h) => { c.fillStyle = m === 100 ? '#e9711f' : '#ffffff'; c.fillRect(0, 0, w, h); c.fillStyle = m === 100 ? '#ffffff' : '#2e5e36'; c.font = `400 76px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(m + 'm', w / 2, h / 2 + 4); }), side: T.DoubleSide }));
      sg.position.y = 2.6; sg.rotation.y = Math.PI; bd.add(sg);
    }
  }
  // 타깃 그린 (웨지 60m · 아이언 90m · 드라이버 125m 근처)
  RG.targets = [];
  for (const [x, m, col] of [[-7, 60, 0xd2442c], [6, 90, 0xffd23f], [-3, 125, 0x4d9de0]]) {
    const z = m / M_PER_U, r = 4.2;
    const gr = add(new T.CircleGeometry(r, 36), mat(0x9ee07f), x, .06, z); gr.rotation.x = -Math.PI / 2;
    const rim = add(new T.RingGeometry(r - .25, r, 36), new T.MeshBasicMaterial({ color: 0xffffff }), x, .07, z); rim.rotation.x = -Math.PI / 2;
    add(new T.CylinderGeometry(.06, .06, 3.2, 6), mat(0xffffff), x, 1.6, z, true);
    const fl = add(new T.PlaneGeometry(1.2, .75), new T.MeshBasicMaterial({ color: col, side: T.DoubleSide }), x + .6, 2.8, z); fl.userData.flag = true;
    RG.targets.push({ x: RG.x + x, z: RG.z + z, r, m, flag: fl });
  }
  // 양옆 그물과 끝 펜스
  const netM = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .14, side: T.DoubleSide, depthWrite: false }), poleM = mat(0x6b6b6b);
  for (const sx of [-42, 42]) { const n = add(new T.PlaneGeometry(105, 16), netM, sx, 8, 46); n.rotation.y = Math.PI / 2; for (let z = -5; z <= 100; z += 15) add(new T.CylinderGeometry(.15, .15, 16.5, 6), poleM, sx, 8.2, z, true); }
  add(new T.PlaneGeometry(84, 16), netM, 0, 8, 99);
  // 다른 타석의 당근들 (가끔 쳐요)
  RG.npcs = [];
  for (const [bx, col, lk] of [[-8, '#4d9de0', [4, 1]], [16, '#e15a97', [6, 4]]]) {
    const o = { x: RG.x + bx + 1, z: RG.z + .6, yaw: -Math.PI / 2, anim: 2, ph: 0, jump: 0, swingT: 0, chargeP: 0, bx: RG.x + bx, next: rand(2, 5) };
    o.av = makeCarrot(col); applyLook(o.av, lk, col); scene.add(o.av); RG.npcs.push(o);
  }
  scene.add(g);
}
function rangeBall() {
  let b = RG.pool.find(b => b.state === 'free');
  if (!b) { if (RG.pool.length < 40) { const m = new T.Mesh(new T.SphereGeometry(.2, 12, 10), new T.MeshPhongMaterial({ color: 0xffffff, shininess: 60 })); m.castShadow = true; scene.add(m); b = { m }; RG.pool.push(b); } else { b = RG.pool.filter(b => b.state === 'rest').sort((a, c) => a.t - c.t)[0] || RG.pool[0]; } }
  b.state = 'tee'; b.t = performance.now(); b.m.visible = true; return b;
}
function rangeStep(b, dt) {
  const y0 = EDGE_H;
  if (b.state === 'fly') {
    b.vy -= G * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.y <= y0) { b.y = y0; if (b.carry == null) b.carry = [b.x, b.z]; if (b.vy < -4) { b.vy = -b.vy * .3; b.vx *= .72; b.vz *= .72; } else { b.vy = 0; b.state = 'roll'; } }
  } else if (b.state === 'roll') {
    const sp = Math.hypot(b.vx, b.vz), ns = Math.max(0, sp - (sp * 1.5 + 1.2) * dt);
    if (sp > 0) { b.vx *= ns / sp; b.vz *= ns / sp; } b.x += b.vx * dt; b.z += b.vz * dt; b.rollT = (b.rollT || 0) + dt;
    if (ns < .3 || b.rollT > 6) { b.state = 'rest'; b.vx = b.vz = 0; return 'stop'; }
  }
  return null;
}
function launchRange(b, club, p, yaw) {
  const v = launchVel(p, yaw, club, 'tee');
  Object.assign(b, { vx: v.vx, vy: v.vy, vz: v.vz, state: 'fly', carry: null, rollT: 0, t: performance.now() });
}
function startRange() {
  buildRange(); S.mode = 'range'; RG.charge = false; RG.yaw = 0; RG.cam = null; RG.waitT = 0;
  $('app').classList.add('inrange'); $('power').hidden = false;
  if (!RANGE_CLUBS.includes(RG.club)) RG.club = 0;
  rangeTee(); rangeHud(); lastActKey = '';
  toast('드라이빙 레인지예요. 연습 기록은 라운딩 스코어와 상관없어요', 2400);
  setTimeout(() => $('help').classList.add('off'), 100);
}
function rangeTee() {
  const b = RG.ball = rangeBall(); b.x = RG.x; b.z = RG.z + .6; b.y = EDGE_H + .34; b.state = 'tee'; b.vx = b.vy = b.vz = 0;
}
function rangeHud() {
  $('holeNo').textContent = '연'; $('holeName').textContent = '드라이빙 레인지';
  const c = RG.club;
  $('holePar').textContent = `${CLUBS[c].name} 최고 ${RG.best[c] ? RG.best[c] + 'm' : '—'}`;
  $('holeDist').textContent = RG.last || '공을 쳐서 비거리를 재 보세요';
  $('strokes').textContent = RG.shots; const cs = document.querySelector('.holecard .count span'); if (cs) cs.textContent = '구';
}
function rangeCharge(on) {
  if (S.mode !== 'range') return;
  if (on) { if (RG.charge || !RG.ball || RG.ball.state !== 'tee') return; audio(); RG.charge = true; S.chargeT = performance.now(); }
  else {
    if (!RG.charge) return; RG.charge = false;
    if (RG.power >= .03) {
      const p = RG.power, b = RG.ball; me.swingFrom = .2 + p * 2.8; me.swingT = .01; me.chargeP = 0; sndSwish();
      setTimeout(() => { launchRange(b, RG.club, p, RG.yaw); b.y = EDGE_H; sndHit(p, false); trailReset(); RG.flying = b; RG.shots++; rangeHud(); }, 160);
    }
  }
  const sw = $('swing'); if (sw) { sw.classList.toggle('on', RG.charge); sw.textContent = RG.charge ? '떼면 샷!' : '누르고 있다가 떼기'; }
}
function rangeResult(b) {
  const tx = RG.x, tz = RG.z + .6;
  const carry = b.carry ? RANGE_M(Math.hypot(b.carry[0] - tx, b.carry[1] - tz)) : 0, total = RANGE_M(Math.hypot(b.x - tx, b.z - tz));
  const side = RANGE_M(b.x - tx), sideTxt = Math.abs(side) < 3 ? '똑바로' : `${side > 0 ? '왼쪽' : '오른쪽'} ${Math.abs(side)}m`;
  RG.lastBall = b; RG.last = `캐리 ${carry}m · 총 ${total}m · ${sideTxt}`;
  const c = RG.club, best = total > RG.best[c] && RG.shots > 0;
  if (best) { RG.best[c] = total; try { localStorage.setItem('carrotRangeBest', JSON.stringify(RG.best)); } catch {} }
  const hit = RG.targets.find(t => Math.hypot(b.x - t.x, b.z - t.z) < t.r);
  if (hit) { toast(`${hit.m}m 타깃 안착! 굿샷`, 1800); tone(1046, .12, 'triangle', .12); tone(1318, .16, 'triangle', .12, .1); tone(1568, .25, 'triangle', .12, .2); rocket(b.x, EDGE_H + 9, b.z, 0); me.jump = 1; }
  else if (best) { toast(`${CLUBS[c].name} 최고 기록! ${total}m`, 1800); tone(988, .1, 'triangle', .1); tone(1318, .2, 'triangle', .1, .1); }
  else toast(`${total}m`, 1200);
  rangeHud();
}
function updateRange(dt, t) {
  // NPC 당근들
  for (const o of RG.npcs) {
    o.next -= dt;
    if (o.next <= 0 && !o.swingT) { o.swingFrom = 2.6; o.swingT = .01; o.next = rand(4, 8); const b = rangeBall(); b.x = o.bx; b.z = RG.z + .6; b.y = EDGE_H; b.npc = true; setTimeout(() => launchRange(b, [0, 1, 2][Math.random() * 3 | 0], rand(.7, .98), rand(-.12, .12)), 160); }
    animateAvatar(o.av, o, dt, t);
  }
  for (const b of RG.pool) {
    if (b.state === 'fly' || b.state === 'roll') {
      const ts = b.state === 'roll' ? 1.8 : 1.15;
      for (let i = 0; i < 4; i++) { const e = rangeStep(b, dt * ts / 4); if (e === 'stop') { if (b === RG.flying) { RG.flying = null; rangeResult(b); RG.waitT = 1.4; } break; } }
      if (b === RG.flying && b.state === 'fly') { RG.trailT = (RG.trailT || 0) + dt; if (RG.trailT > .025) { RG.trailT = 0; trailPush(b.x, b.y + .2, b.z); } if (trail) trail.material.opacity = .75; }
    }
    if (b.state !== 'free') b.m.position.set(b.x, b.y + .2, b.z);
  }
  if (S.mode !== 'range') return;
  if (RG.waitT > 0) { RG.waitT -= dt; if (RG.waitT <= 0) { RG.lastBall = null; rangeTee(); lastActKey = ''; } }
  for (const k of ['arrowleft', 'a']) if (keys.has(k)) RG.yaw += dt * 1.1;
  for (const k of ['arrowright', 'd']) if (keys.has(k)) RG.yaw -= dt * 1.1;
  RG.yaw = clamp(RG.yaw, -.6, .6);
  // 공 옆에 서서 어드레스
  const bx = RG.x, bz = RG.z + .6, rx = -Math.cos(RG.yaw), rz = Math.sin(RG.yaw);
  me.x = bx - rx; me.z = bz - rz; me.yaw = Math.atan2(rx, rz); me.anim = 2;
  if (RG.charge) { RG.power = chargePower(); $('pow').style.width = (RG.power * 100) + '%'; }
  me.chargeP = RG.charge ? RG.power : 0;
  $('powLabel').textContent = RG.charge ? `${CLUBS[RG.club].name} ${Math.round(RG.power * 100)}% · 예상 캐리 ${RANGE_M(rangeCarry(Math.max(RG.power, .05)))}m` : `${CLUBS[RG.club].name} · 풀스윙 캐리 ${RANGE_M(rangeCarry(1))}m`;
  // 착지 예상 지점 (기존 조준 링 재사용)
  const pc = rangeCarry(RG.charge ? Math.max(RG.power, .05) : 1), showRing = !RG.flying && RG.ball && RG.ball.state === 'tee';
  landRing.visible = showRing; if (showRing) landRing.position.set(bx + Math.sin(RG.yaw) * pc, EDGE_H + .1, bz + Math.cos(RG.yaw) * pc);
  if (RG.flagT == null) RG.flagT = 0; RG.flagT += dt; for (const tg of RG.targets) tg.flag.rotation.y = Math.sin(RG.flagT * 3 + tg.m) * .25;
}
function rangeCarry(p) { const v = launchVel(p, 0, RG.club, 'tee'); return 2 * v.vy / G * Math.hypot(v.vx, v.vz); }
function rangeCamera(dt) {
  const y0 = EDGE_H, bx = RG.x, bz = RG.z + .6, fx = Math.sin(RG.yaw), fz = Math.cos(RG.yaw);
  let tg;
  const f = RG.flying;
  if (f && (f.state === 'fly' || f.state === 'roll')) {
    // 공을 뒤에서 따라가요. 지붕(높이 4) 아래에서는 낮게, 지붕을 벗어나면 조금씩 올라가요
    const pz = bz - 6 + Math.max(0, f.z - bz) * .55, out = Math.max(0, pz - (RG.z + .8));
    const py = out > 0 ? y0 + 3 + Math.min(4, out * .12 + Math.max(0, f.y - y0) * .25) : y0 + 2.9;
    tg = { tx: f.x, ty: f.y + .3, tz: f.z, px: bx + (f.x - bx) * .5 - 1.3, py, pz };
  }
  else if (RG.waitT > 0 && RG.lastBall) tg = null;
  else { const nar = camera.aspect < 1, back = nar ? 8.5 : 6.5; tg = { tx: bx + fx * 26, ty: y0 + .6, tz: bz + fz * 26, px: bx - fx * back + .2, py: y0 + (nar ? 3.5 : 2.9), pz: bz - fz * back }; }
  if (!tg) tg = RG.cam;
  if (!RG.cam) RG.cam = { ...tg };
  const k = Math.min(1, dt * (f ? 4 : 3)); for (const key in tg) RG.cam[key] += (tg[key] - RG.cam[key]) * k;
  return RG.cam;
}
function leaveRange() {
  if (S.mode !== 'range') return;
  RG.charge = false; $('fade').classList.add('on'); sndCart();
  setTimeout(() => {
    $('app').classList.remove('inrange'); $('power').hidden = true; landRing.visible = false; const cs = document.querySelector('.holecard .count span'); if (cs) cs.textContent = '타';
    if (RG.ball && RG.ball.state === 'tee') { RG.ball.state = 'free'; RG.ball.m.visible = false; }
    goFirstTee(); updHud(); setTimeout(() => $('fade').classList.remove('on'), 150);
  }, 500);
}

// ================= 아바타 애니메이션 =================
function animateAvatar(av, o, dt, t) {
  av.rotation.order = 'YXZ';
  if (o.anim === 4 && o.seat) { // 카트에 앉아 있어요
    av.position.copy(o.seat); av.rotation.set(o.seatPitch || 0, o.yaw, 0); av.scale.setScalar(.82);
    if (o.eating) { av.position.y += Math.abs(Math.sin(t * 9)) * .05; av.rotation.x = -.12 + Math.sin(t * 9) * .07; }
    av.userData.club.rotation.set(.15, 0, .2); return;
  }
  const walking = o.anim === 1, aiming = o.anim === 2;
  o.ph += dt * (walking ? 11 : 2);
  const hop = walking ? Math.abs(Math.sin(o.ph)) * .28 : 0;
  if (o.jump > 0) o.jump = Math.max(0, o.jump - dt * 1.6);
  if (o.spin > 0) o.spin = Math.max(0, o.spin - dt);
  if (o.tipsy > 0) o.tipsy = Math.max(0, o.tipsy - dt);
  const ch = av.userData.cheeks; if (ch) { const tp = o.tipsy > 0; for (const c of ch) { c.scale.set(tp ? 1.6 : 1, tp ? .8 : .55, .4); c.material.color.setHex(tp ? 0xff3b5c : 0xff8a8a); } }
  const jy = o.jump > 0 ? Math.sin((1 - o.jump) * Math.PI) * .9 : 0;
  av.position.set(o.x, heightAt(o.x, o.z) + hop + jy, o.z); av.rotation.set(0, o.yaw + (o.spin > 0 ? (1 - o.spin / 1.1) * TAU : 0), o.tipsy > 0 ? Math.sin(t * 2.6) * .14 : 0);
  const sq = walking ? 1 + Math.sin(o.ph * 2) * .04 : 1 + Math.sin(t * 2) * .015;
  av.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  const club = av.userData.club;
  if (o.swingT > 0 && o.swingFrom != null) {
    o.swingT += dt; const k = o.swingT, top = o.swingFrom;
    if (k < .16) club.rotation.set(.15, 0, top - (top + 1.9) * (k / .16) ** 2);
    else if (k < .9) club.rotation.set(.15, 0, -1.9 - Math.sin((k - .16) * 3) * .15);
    else { o.swingT = 0; o.swingFrom = null; }
    av.rotation.y = o.yaw + (k < .16 ? -.5 * (top / 3) * (1 - k / .16) : .25 * Math.min(1, (k - .16) * 5));
  } else if (o === me && S.readLie && S.mode === 'aim') {
    // 쪼그려 앉아 한쪽 눈 감고 라인 읽기
    av.scale.set(1.1, .55, 1.1); av.position.y -= .05; av.rotation.x = .25; club.rotation.set(1.3, 0, .5);
  } else if (aiming && o.chargeP > 0) {
    // 누르고 있는 동안 파워만큼 채가 뒤로 올라가요
    club.rotation.set(.15, 0, .2 + o.chargeP * 2.8); av.rotation.y = o.yaw - .5 * o.chargeP;
  } else if (o.swingT > 0) {
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
  el.addEventListener('pointerdown', e => {
    audio(); closeSheets(); el.focus({ preventScroll: true }); el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = ptrs.size > 1 ? 99 : 0; pinch = 0;
    if (S.mode === 'aim' && ptrs.size === 1 && !S.charge) { S.aimDrag = true; aimFromPointer(e); $('aimTip').classList.add('used'); } else S.aimDrag = false;
  });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.dist = clamp(cam.dist * pinch / d, 5, 40); pinch = d; return; }
    moved += Math.abs(dx) + Math.abs(dy);
    if (S.aimDrag) { aimFromPointer(e); return; }
    if (S.mode === 'range' && !RG.charge) { RG.yaw = clamp(RG.yaw - dx * .003, -.6, .6); return; }
    if (moved > 6) {
      cam.yaw -= dx * .006;
      cam.pitch = clamp(cam.pitch + dy * .004, .12, 1.25);
      $('help').classList.add('off');
    }
  });
  const up = e => {
    if (ptrs.size === 1 && moved <= 6 && (S.mode === 'walk' || (S.mode === 'club' && !LB.lockerUI))) clickMove(e);
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0; S.aimDrag = false;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); });
  el.addEventListener('wheel', e => { e.preventDefault(); cam.dist = clamp(cam.dist * (1 + Math.sign(e.deltaY) * .1), 5, 40); }, { passive: false });
  window.addEventListener('keydown', e => {
    if ($('app').hidden || e.target.closest && e.target.closest('input,textarea')) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { keys.add(k); e.preventDefault(); }
    if (k === ' ' && S.mode === 'range') { e.preventDefault(); if (!e.repeat) rangeCharge(true); }
    if (k === 'c' && S.mode === 'range') { RG.club = (RG.club + 1) % 3; rangeHud(); lastActKey = ''; }
    if (k === ' ' && S.mode === 'aim') { e.preventDefault(); if (!e.repeat) startCharge(); }
    else if (k === ' ' && S.mode === 'flight' && !e.repeat) { e.preventDefault(); skipFlight(); }
    if (k === 'e' && S.mode === 'walk') enterAim();
    if (k === 'escape' && S.mode === 'aim') exitAim();
    if (k === 'c' && S.mode === 'aim') { S.club = (S.club + 1) % 4; S.clubAuto = false; lastActKey = ''; }
  });
  window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === ' ' && S.mode === 'aim') { e.preventDefault(); releaseCharge(); } if (k === ' ' && S.mode === 'range') { e.preventDefault(); rangeCharge(false); } });
  window.addEventListener('blur', () => keys.clear());
}
function groundPoint(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
  const hit = ray.intersectObject(ground)[0]; return hit ? hit.point : null;
}
// 조준 중 드래그: 라인 끝을 잡아 끄는 느낌으로 방향을 옮겨요
function aimFromPointer(e) {
  const p = groundPoint(e); if (!p) return;
  const dx = p.x - S.ball.x, dz = p.z - S.ball.z; if (Math.hypot(dx, dz) < 1.2) return;
  S.aimYaw = Math.atan2(dx, dz);
}
function clickMove(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
  const hit = ray.intersectObjects(S.mode === 'club' ? LB.floors : [ground])[0]; if (!hit) return;
  let x = hit.point.x, z = hit.point.z;
  me.path = null;
  if (!canStand(x, z)) { toast('거긴 들어갈 수 없어요', 1000); return; }
  me.moveT = [x, z]; moveRing.position.set(x, heightAt(x, z) + .06, z); moveRing.material.opacity = .9; moveRing.scale.setScalar(1);
  $('help').classList.add('off');
}

// ================= 카메라 =================
function snapCam() { const y = heightAt(me.x, me.z); cam.tx = me.x; cam.ty = y + 1.6; cam.tz = me.z; cam.px = me.x - Math.sin(cam.yaw) * cam.dist; cam.py = y + 6; cam.pz = me.z - Math.cos(cam.yaw) * cam.dist; }
function updateCamera(dt) {
  let tx, ty, tz, px, py, pz;
  if (S.mode === 'club' || S.mode === 'cine') {
    const c = lobbyCamera(dt); camera.position.set(c.px, c.py, c.pz); camera.lookAt(c.tx, c.ty, c.tz); cam.px = c.px; cam.py = c.py; cam.pz = c.pz; cam.tx = c.tx; cam.ty = c.ty; cam.tz = c.tz;
    sun.position.set(LB.x + 40, 80, LB.z + 25); sun.target.position.set(LB.x, EDGE_H, LB.z); return;
  }
  if (S.mode === 'range') {
    const c = rangeCamera(dt); camera.position.set(c.px, c.py, c.pz); camera.lookAt(c.tx, c.ty, c.tz); cam.px = c.px; cam.py = c.py; cam.pz = c.pz; cam.tx = c.tx; cam.ty = c.ty; cam.tz = c.tz;
    sun.position.set(RG.x + 40, 80, RG.z + 25); sun.target.position.set(RG.x, EDGE_H, RG.z + 10); return;
  }
  const fc = cam.focus && (S.mode === 'walk' || S.mode === 'ride') ? cam.focus : null;
  if (fc) {
    // 동물이 지나가는 동안 그 장면에 카메라를 고정해요
    const vis = fc.members.filter(m => m.g.visible); const P = vis.length ? vis : fc.members;
    let fx = 0, fz = 0; for (const m of P) { fx += m.g.position.x; fz += m.g.position.z; } fx /= P.length; fz /= P.length;
    const dx = fx - me.x, dz = fz - me.z, dl = Math.hypot(dx, dz) || 1;
    tx = fx; tz = fz; ty = heightAt(fx, fz) + .7;
    px = me.x - dx / dl * 3.5 + dz / dl * 1.5; pz = me.z - dz / dl * 3.5 - dx / dl * 1.5; py = heightAt(me.x, me.z) + 2.6;
    cam.yaw = Math.atan2(dx, dz);
  } else if (cam.mode === 'steal' && cam.steal) {
    const c = cam.steal; tx = c.tx; tz = c.tz; ty = heightAt(tx, tz) + .6; px = c.px; pz = c.pz; py = heightAt(px, pz) + 4.2;
  } else if (S.mode === 'eat') {
    // 먹는 동안은 테이블 맞은편에서 클로즈업
    tx = me.x; ty = SHADE_LV + 1.55; tz = SHADE.z + .8;
    px = me.x + 1.3; py = SHADE_LV + 2.25; pz = SHADE.z - 1.9; cam.yaw = Math.PI;
  } else if (S.mode === 'aim' && S.readLie) {
    // 공 뒤에 쪼그려 앉아 땅바닥 높이에서 컵을 봐요
    if (!S.aimDrag) cam.aimYaw += angDiff(cam.aimYaw, S.aimYaw) * Math.min(1, dt * 3);
    const f = [Math.sin(cam.aimYaw), Math.cos(cam.aimYaw)], cup = hole().cup;
    // 쪼그린 내 어깨 너머로 낮게
    px = S.ball.x - f[0] * 2.6; pz = S.ball.z - f[1] * 2.6; py = heightAt(px, pz) + .45;
    tx = cup[0]; tz = cup[1]; ty = heightAt(cup[0], cup[1]) + .15; cam.yaw = cam.aimYaw;
  } else if (S.mode === 'aim' || S.mode === 'swing') {
    if (!S.aimDrag) cam.aimYaw += angDiff(cam.aimYaw, S.aimYaw) * Math.min(1, dt * 3);
    const f = [Math.sin(cam.aimYaw), Math.cos(cam.aimYaw)], by = heightAt(S.ball.x, S.ball.z);
    const ahead = S.club === 3 ? 6 : 14;
    tx = S.ball.x + f[0] * ahead; ty = heightAt(tx, S.ball.z + f[1] * ahead) + .6; tz = S.ball.z + f[1] * ahead;
    px = S.ball.x - f[0] * 7; py = by + (S.club === 3 ? 2.6 : 3.6); pz = S.ball.z - f[1] * 7; cam.yaw = cam.aimYaw;
  } else if (cam.mode === 'ball' && S.ballVis) {
    const b = S.ball; const sp = Math.hypot(b.vx, b.vz);
    const dirx = sp > .5 ? b.vx / sp : Math.sin(cam.yaw), dirz = sp > .5 ? b.vz / sp : Math.cos(cam.yaw);
    cam.shotT = (cam.shotT || 0) + dt;
    tx = b.x; ty = b.y + .3; tz = b.z;
    // 처음 1초는 친 자리에 서서 공이 하늘로 솟는 걸 올려다보고, 그다음 땅 높이 기준으로 공 뒤를 따라가요
    const follow = smooth(.6, 2.2, cam.shotT);
    const fx = b.x - dirx * 13, fz = b.z - dirz * 13, fy = heightAt(fx, fz) + 4.5;
    px = cam.shotX + (fx - cam.shotX) * follow; py = cam.shotY + (fy - cam.shotY) * follow; pz = cam.shotZ + (fz - cam.shotZ) * follow;
    cam.yaw = Math.atan2(dirx, dirz);
  } else {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    tx = me.x; ty = heightAt(me.x, me.z) + 1.6; tz = me.z;
    // 카메라와 캐릭터 사이에 나무가 끼면 카메라를 앞으로 당겨요
    let dist = cam.dist; const bx = -Math.sin(cam.yaw), bz = -Math.cos(cam.yaw), horiz = cp * cam.dist;
    for (const t of TREES) {
      const rx = t.x - me.x, rz = t.z - me.z, along = rx * bx + rz * bz;
      if (along < 1.5 || along > horiz + t.cr) continue;
      const side = Math.abs(rx * bz - rz * bx);
      if (side < t.cr + .6) dist = Math.min(dist, Math.max(4, (along - t.cr - .8) / cp));
    }
    px = me.x - Math.sin(cam.yaw) * cp * dist; py = ty + sp * dist; pz = me.z - Math.cos(cam.yaw) * cp * dist;
  }
  const k = Math.min(1, dt * (cam.mode === 'ball' ? 3 : 6)), kt = cam.mode === 'ball' && S.mode === 'flight' ? Math.min(1, dt * 9) : k;
  cam.tx += (tx - cam.tx) * kt; cam.ty += (ty - cam.ty) * kt; cam.tz += (tz - cam.tz) * kt;
  cam.px += (px - cam.px) * k; cam.py += (py - cam.py) * k; cam.pz += (pz - cam.pz) * k;
  const floor = heightAt(cam.px, cam.pz) + 1; if (cam.py < floor) cam.py = floor;
  const sh = shakeT > 0 ? shakeT * .18 : 0;
  camera.position.set(cam.px + rand(-sh, sh), cam.py + rand(-sh, sh), cam.pz + rand(-sh, sh)); camera.lookAt(cam.tx, cam.ty, cam.tz);
  for (const t of TREES) if (t.g) t.g.visible = Math.hypot(t.x - cam.px, t.z - cam.pz) > t.cr + 4.5;
  sun.position.set(me.x + 40, 80, me.z + 25); sun.target.position.set(me.x, heightAt(me.x, me.z), me.z);
}

// ================= 위치 전송 =================
function sendPos(force) {
  if (!NET.ch || S.mode === 'club' || S.mode === 'cine' || S.mode === 'range') return;
  const yaw = ((me.yaw % TAU) + TAU) % TAU;
  const bv = S.ballVis && S.ball.state === 'rest' ? 1 : 0;
  const dn = S.scores.filter(x => x != null).length;
  const msg = { t: 'pos', h: S.hole, x: Math.round(me.x * 10), z: Math.round(me.z * 10), r: Math.round(yaw * 10), a: S.mode === 'eat' ? 0 : me.anim, bx: Math.round(S.ball.x * 10), bz: Math.round(S.ball.z * 10), bv, st: Math.min(40, S.strokes), sc: clamp(totalDiff(), -40, 99), dn };
  const key = `${msg.h},${msg.x},${msg.z},${msg.r},${msg.a},${msg.bx},${msg.bz},${bv},${msg.st},${msg.sc},${dn}`, now = performance.now();
  if (!force && key === NET.lastSent && now - NET.lastSentT < 4000) return;
  NET.lastSent = key; NET.lastSentT = now; sendNet(msg);
}

// ================= 미니맵 =================
const mm = $('minimap'), mctx = mm.getContext('2d');
// ---- 지도: 이번 홀을 티가 아래, 그린이 위로 오게 돌려서 그려요 (야디지북처럼) ----
let mmMode = 'hole'; // 'hole' | 'course'
function routeOf(hi) { const h = HOLES[hi]; return [h.tee, ...h.fair.slice(1, -1), h.cup]; }
function holeView(hi, W, H, pad) {
  const h = HOLES[hi], d = [h.cup[0] - h.tee[0], h.cup[1] - h.tee[1]];
  const r = -Math.PI / 2 - Math.atan2(d[1], d[0]), cr = Math.cos(r), sr = Math.sin(r);
  const rot = (x, z) => [x * cr - z * sr, x * sr + z * cr];
  let a = [1e9, -1e9, 1e9, -1e9];
  const grow = (x, z, m) => { const q = rot(x, z); a = [Math.min(a[0], q[0] - m), Math.max(a[1], q[0] + m), Math.min(a[2], q[1] - m), Math.max(a[3], q[1] + m)]; };
  for (const p of h.fair) grow(p[0], p[1], h.fw / 2 + 5);
  grow(h.tee[0], h.tee[1], 8); grow(h.cup[0], h.cup[1], h.green + 5);
  const s = Math.min((W - 2 * pad) / (a[1] - a[0]), (H - 2 * pad) / (a[3] - a[2]));
  const cx = (a[0] + a[1]) / 2, cy = (a[2] + a[3]) / 2;
  return { r, s, cx, cy, to: (x, z) => { const q = rot(x, z); return [W / 2 + (q[0] - cx) * s, H / 2 + (q[1] - cy) * s]; } };
}
function courseView(W, H) { const s = Math.min(W, H) / (MAP * 2); return { r: 0, s, cx: 0, cy: 0, to: (x, z) => [W / 2 + x * s, H / 2 + z * s] }; }
function pin(g, x, y, k) { g.strokeStyle = '#fff'; g.lineWidth = 2 * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 16 * k); g.stroke(); g.fillStyle = '#e9711f'; g.beginPath(); g.moveTo(x, y - 16 * k); g.lineTo(x + 11 * k, y - 12 * k); g.lineTo(x, y - 8 * k); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, 2.5 * k, 0, TAU); g.fill(); }
function label(g, text, x, y, k, bg) {
  g.font = `600 ${12 * k}px "IBM Plex Sans KR",sans-serif`; const w = g.measureText(text).width + 10 * k;
  g.fillStyle = bg || 'rgba(12,22,15,.78)'; g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - 9 * k, w, 18 * k, 9 * k) : g.rect(x - w / 2, y - 9 * k, w, 18 * k); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + .5 * k); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
}
function drawMap(g, W, H, hi, mode, big) {
  const k = big ? 1.6 : 1, v = mode === 'course' ? courseView(W, H) : holeView(hi, W, H, big ? 34 : 20);
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#4c8b40'; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2 - v.cx * v.s, H / 2 - v.cy * v.s); g.scale(v.s, v.s); g.rotate(v.r); g.translate(-MAP, -MAP); g.scale(1 / PPU, 1 / PPU);
  g.drawImage(groundCanvas, 0, 0); g.restore();
  const P = (x, z) => v.to(x, z);
  // 나무 (장애물이 보이도록)
  g.fillStyle = 'rgba(25,60,28,.85)';
  for (const t of TREES) { const [x, y] = P(t.x, t.z); if (x < -10 || y < -10 || x > W + 10 || y > H + 10) continue; g.beginPath(); g.arc(x, y, Math.max(2, t.cr * v.s * .8), 0, TAU); g.fill(); }
  const holes = mode === 'course' ? HOLES.map((_, i) => i) : [hi];
  for (const i of holes) {
    const h = HOLES[i], route = routeOf(i), cur = i === S.hole;
    // 공략 경로: 티 → 꺾이는 지점 → 그린
    g.setLineDash([8 * k, 6 * k]); g.lineWidth = (cur ? 3 : 2) * k; g.strokeStyle = cur ? '#ffd166' : 'rgba(255,255,255,.6)';
    g.beginPath(); route.forEach((p, j) => { const [x, y] = P(p[0], p[1]); j ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]);
    const [tx, ty] = P(h.tee[0], h.tee[1]);
    g.fillStyle = '#fff'; g.strokeStyle = '#2e7a3f'; g.lineWidth = 2 * k; g.beginPath(); g.arc(tx, ty, 8 * k, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#2e7a3f'; g.font = `700 ${10 * k}px "IBM Plex Sans KR",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(mode === 'course' ? String(i + 1) : 'T', tx, ty + .5); g.textAlign = 'start'; g.textBaseline = 'alphabetic';
    const [fx, fy] = P(h.cup[0], h.cup[1]); pin(g, fx, fy, k);
    if (mode !== 'course' && cur) {
      // 꺾이는 지점마다 티에서부터의 거리
      let acc = 0;
      for (let j = 1; j < route.length; j++) {
        acc += Math.hypot(route[j][0] - route[j - 1][0], route[j][1] - route[j - 1][1]);
        const [x, y] = P(route[j][0], route[j][1]), last = j === route.length - 1;
        if (!last) { g.fillStyle = '#ffd166'; g.beginPath(); g.arc(x, y, 5 * k, 0, TAU); g.fill(); label(g, `1타 목표 · ${Math.round(acc * M_PER_U)}m`, x, y - 16 * k, k); }
        else label(g, `그린 · ${Math.round(acc * M_PER_U)}m`, x, y - 28 * k, k, 'rgba(210,68,44,.9)');
      }
      label(g, '티잉 구역', tx, ty + 22 * k, k, 'rgba(46,122,63,.92)');
    }
  }
  if (mode === 'course') {
    const [sx, sy] = P(SHADE.x, SHADE.z); g.fillStyle = '#5e3d24'; g.fillRect(sx - 6 * k, sy - 5 * k, 12 * k, 10 * k);
    const [wx, wy] = P(RR.x, RR.z); g.fillStyle = '#2f6fd6'; g.fillRect(wx - 5 * k, wy - 7 * k, 10 * k, 14 * k);
  }
  // 다른 사람
  g.font = `600 ${11 * k}px "IBM Plex Sans KR",sans-serif`; g.textAlign = 'center';
  for (const o of NET.others.values()) {
    const [ox, oy] = P(o.x, o.z); if (ox < 0 || oy < 0 || ox > W || oy > H) continue;
    g.fillStyle = o.color; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(ox, oy, 5 * k, 0, TAU); g.fill(); g.stroke();
    if (big || NET.others.size <= 6 || o.id === focusId) { const lb = o.nick.length > 5 ? o.nick.slice(0, 5) + '…' : o.nick; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)'; g.strokeText(lb, ox, oy - 9 * k); g.fillStyle = '#fff'; g.fillText(lb, ox, oy - 9 * k); }
  }
  g.textAlign = 'start';
  // 내 공과 나
  if (S.ballVis) { const [bx, by] = P(S.ball.x, S.ball.z); g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, 4.5 * k, 0, TAU); g.fill(); g.stroke(); }
  const [mx, my] = P(me.x, me.z);
  g.save(); g.translate(mx, my); g.rotate(v.r - me.yaw); g.scale(k, k);
  g.fillStyle = '#f08a2f'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 10); g.lineTo(7, -6); g.lineTo(-7, -6); g.closePath(); g.fill(); g.stroke(); g.restore();
  if (!big) { g.fillStyle = 'rgba(12,22,15,.72)'; g.fillRect(0, 0, W, 34); g.fillStyle = '#fff'; g.font = '600 19px "IBM Plex Sans KR",sans-serif'; g.fillText(mode === 'course' ? '전체 코스' : `${S.hole + 1}번 홀 · PAR ${HOLES[S.hole].par}`, 10, 24); }
}
function drawMinimap() { drawMap(mctx, mm.width, mm.height, S.hole, mmMode, false); }
// 홀 공략도: 미니맵을 누르거나 새 홀에 들어설 때 크게 보여줘요
function guideHTML(hi) {
  const h = HOLES[hi], len = Math.round(routeOf(hi).reduce((a, p, j, r) => j ? a + Math.hypot(p[0] - r[j - 1][0], p[1] - r[j - 1][1]) : 0, 0) * M_PER_U);
  return `<span class="eyebrow">${hi + 1}번 홀 공략도 · PAR ${h.par} · ${len}m</span><h2>${esc(h.name)}</h2>
    <div class="guide-tabs" role="tablist"><button type="button" role="tab" class="on" data-gm="hole">이번 홀</button><button type="button" role="tab" data-gm="course">전체 코스</button></div>
    <canvas class="guide-map" id="guideMap" width="560" height="640" aria-label="${hi + 1}번 홀 지도"></canvas>
    <p class="evtag"><b>${HOLE_EV[h.ev][0]}</b> ${HOLE_EV[h.ev][1]}</p><p class="guide-tip"><b>토끼 캐디</b> ${esc(HOLE_TIPS[hi] || '')} 노란 점선을 따라가면 돼요. 아래 T가 티, 위의 깃발이 그린이에요.</p>`;
}
function bindGuide(hi) {
  let mode = 'hole';
  const draw = () => { const c = $('guideMap'); if (c) drawMap(c.getContext('2d'), c.width, c.height, hi, mode, true); };
  document.querySelectorAll('[data-gm]').forEach(b => b.onclick = () => { mode = b.dataset.gm; document.querySelectorAll('[data-gm]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  draw(); return draw;
}
function showGuide(hi = S.hole) {
  closeSheets();
  overlay(`${guideHTML(hi)}<button class="btn" type="button" id="guideOk">확인했어요</button>`);
  const draw = bindGuide(hi); const iv = setInterval(() => { if ($('guideMap')) draw(); else clearInterval(iv); }, 500);
  $('guideOk').onclick = closeOverlay; $('guideOk').focus();
}
mm.style.cursor = 'pointer'; mm.title = '눌러서 홀 공략도 크게 보기';
mm.addEventListener('click', () => { if (!$('app').hidden) showGuide(); });

// ================= 메인 루프 =================
let mmT = 0, sendT = 0, actT = 0, trailT = 0;
function frame() {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;

  // 내 이동
  if (S.mode !== 'ride' && S.mode !== 'eat') me.anim = 0;
  if (S.mode === 'walk' || S.mode === 'club' || S.mode === 'wait' || (S.mode === 'flight' && me.swingT === 0)) {
    let vx = 0, vz = 0;
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw), rx = -fz, rz = fx;
    if (keys.has('w') || keys.has('arrowup')) { vx += fx; vz += fz; }
    if (keys.has('s') || keys.has('arrowdown')) { vx -= fx; vz -= fz; }
    if (keys.has('d') || keys.has('arrowright')) { vx += rx; vz += rz; }
    if (keys.has('a') || keys.has('arrowleft')) { vx -= rx; vz -= rz; }
    if (cam.focus && (vx || vz)) { vx = vz = 0; }
    if (vx || vz) { me.moveT = null; me.path = null; $('help').classList.add('off'); }
    else if (me.moveT) { const dx = me.moveT[0] - me.x, dz = me.moveT[1] - me.z, d = Math.hypot(dx, dz); if (d < .25) me.moveT = me.path && me.path.length ? me.path.shift() : null; else { vx = dx / d; vz = dz / d; } }
    const l = Math.hypot(vx, vz);
    if (l > 0) {
      vx /= l; vz /= l; if (me.tipsy > 0) { const w = Math.sin(performance.now() / 260) * .55; const nx = vx - vz * w, nz = vz + vx * w, nl = Math.hypot(nx, nz); vx = nx / nl; vz = nz / nl; } const sp = 6.5 * dt;
      const nx = me.x + vx * sp, nz = me.z + vz * sp;
      if (canStand(nx, nz)) { me.x = nx; me.z = nz; } else if (canStand(nx, me.z)) me.x = nx; else if (canStand(me.x, nz)) me.z = nz; else me.moveT = null;
      me.yaw += angDiff(me.yaw, Math.atan2(vx, vz)) * Math.min(1, dt * 12); me.anim = 1;
    }
  }
  if (S.mode === 'aim') {
    for (const k of ['arrowleft', 'a']) if (keys.has(k)) S.aimYaw += dt * 1.1;
    for (const k of ['arrowright', 'd']) if (keys.has(k)) S.aimYaw -= dt * 1.1;
    const rx = -Math.cos(S.aimYaw), rz = Math.sin(S.aimYaw);
    if (S.readLie) { // 공 바로 뒤에 쪼그려 앉아 컵을 바라봐요
      const fx = Math.sin(S.aimYaw), fz = Math.cos(S.aimYaw);
      const tx2 = S.ball.x - rx * 1.9 - fx * .5, tz2 = S.ball.z - rz * 1.9 - fz * .5;
      me.x += (tx2 - me.x) * Math.min(1, dt * 8); me.z += (tz2 - me.z) * Math.min(1, dt * 8);
      me.yaw += angDiff(me.yaw, S.aimYaw) * Math.min(1, dt * 8);
    } else {
      me.x += (S.ball.x - rx * 1.0 - me.x) * Math.min(1, dt * 10); me.z += (S.ball.z - rz * 1.0 - me.z) * Math.min(1, dt * 10);
      me.yaw += angDiff(me.yaw, Math.atan2(rx, rz)) * Math.min(1, dt * 10);
    }
    me.anim = 2;
    if (S.charge) { S.power = chargePower(); $('pow').style.width = (S.power * 100) + '%'; }
    me.chargeP = S.charge ? S.power * (S.club === 3 ? .35 : 1) : 0;
    $('powLabel').textContent = `${CLUBS[S.club].name}${S.charge ? ' ' + Math.round(S.power * 100) + '%' : ''} · ${S.lieText || ''}`;
    const pr = predict(S.charge ? Math.max(S.power, .05) : 1);
    // 라인: 공에서 떨어질 곳(퍼터는 멈출 거리)까지 똑바로
    const fx = Math.sin(S.aimYaw), fz = Math.cos(S.aimYaw);
    let L = Math.hypot(pr.land[0] - S.ball.x, pr.land[1] - S.ball.z); if (S.club === 3) L = Math.max(2, L);
    const ex = S.ball.x + fx * L, ez = S.ball.z + fz * L;
    setRibbon(S.ball.x + fx * .5, S.ball.z + fz * .5, ex, ez, S.club === 3 ? .12 : .22); ribbon.visible = true;
    aimTipPos = [ex, heightAt(ex, ez) + 1.4, ez];
    // 라이: 오르막/내리막, 옆 경사
    const up = heightAt(S.ball.x + fx * 3, S.ball.z + fz * 3) - heightAt(S.ball.x - fx, S.ball.z - fz), deg = Math.atan(up / 4) * 180 / Math.PI;
    const side = heightAt(S.ball.x - fz * 1.5, S.ball.z + fx * 1.5) - heightAt(S.ball.x + fz * 1.5, S.ball.z - fx * 1.5);
    S.lieText = (Math.abs(deg) < .4 ? '평지' : deg > 0 ? `오르막 ${deg.toFixed(1)}°` : `내리막 ${(-deg).toFixed(1)}°`) + (S.club === 3 && Math.abs(side) > .03 ? (side > 0 ? ' · 오른쪽으로 휘어요' : ' · 왼쪽으로 휘어요') : '');
    landRing.visible = S.club !== 3 || S.buff === 'carrot'; landRing.position.set(pr.land[0], heightAt(pr.land[0], pr.land[1]) + .12, pr.land[1]);
    if (S.chanceT && !S.charge) { const cp = predict(S.chanceT.p); pathLine.geometry.setFromPoints(cp.pts); pathLine.computeLineDistances(); pathLine.visible = true; }
    else if (S.buff === 'carrot') { pathLine.geometry.setFromPoints(pr.pts); pathLine.computeLineDistances(); pathLine.visible = true; }
    else pathLine.visible = false;
  }
  if (S.mode === 'ride') updateRide(dt);
  if (RG.built) updateRange(dt, t);
  if (me.swingT > 0) me.anim = 3;
  animateAvatar(me.av, me, dt, t);

  // 공
  if (S.mode === 'flight') {
    const ts = S.ball.state === 'roll' ? 1.8 : 1.15, sub = S.ball.state === 'roll' ? 6 : 4;
    for (let i = 0; i < sub; i++) { const e = stepBall(S.ball, dt * ts / sub, false); if (e) { onBallEvent(e); break; } }
    if (S.mode === 'flight' && (S.ball.state === 'fly' || S.ball.state === 'roll') && Math.random() < .02) updHud();
  }
  if (S.mode === 'flight' && S.ball.state === 'fly') { trailT = (trailT || 0) + dt; if (trailT > .025) { trailT = 0; trailPush(S.ball.x, S.ball.y + .2, S.ball.z); } }
  else if (trail && trail.visible && S.mode !== 'flight' && !(S.mode === 'range' && RG.flying)) { trail.material.opacity = Math.max(0, trail.material.opacity - dt * .5); if (trail.material.opacity <= 0) trail.visible = false; }
  if (S.ball.state === 'rest' || S.ball.state === 'done') S.ball.y = heightAt(S.ball.x, S.ball.z);
  if (S.ball.state === 'sinking') S.ball.y = Math.max(heightAt(S.ball.x, S.ball.z) - .45, S.ball.y - dt * 1.5);
  ballMesh.visible = S.ballVis; ballMesh.position.set(S.ball.x, S.ball.y + .2, S.ball.z);
  const guideOn = S.mode === 'walk' && S.ball.state === 'rest' && S.ballVis;
  if (guideOn) updateGuideDots(); guideDots.visible = guideOn;
  const ballFar = Math.hypot(me.x - S.ball.x, me.z - S.ball.z);
  ballBeacon.visible = guideOn && ballFar > 10; ballBeacon.position.set(S.ball.x, S.ball.y + 8, S.ball.z);

  // 그늘집에 처음 들어오면 메뉴 안내
  const inShade = Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 6;
  if (inShade && !S.shadeSeen && S.mode === 'walk') { S.shadeSeen = true; toast('그늘집이에요. 메뉴판을 볼 수 있어요', 2000); ownerSay(['어서 오세요~ 당근 CC 그늘집입니다!', '오늘 당근주스 갓 짰어요~', '컵라면 물 올려둘까요?'][Math.random() * 3 | 0]); }
  if (!inShade) S.shadeSeen = false;

  // 다른 사람
  for (const o of NET.others.values()) {
    if (!o.av) attachOther(o);
    const k = Math.min(1, dt * 8);
    const moving = Math.hypot(o.tx - o.x, o.tz - o.z) > .05;
    o.x += (o.tx - o.x) * k; o.z += (o.tz - o.z) * k; o.yaw += angDiff(o.yaw, o.tyaw) * k;
    o.anim = o.a === 4 ? 4 : o.a === 3 ? 0 : (moving && o.a !== 2) ? 1 : o.a;
    if (o.a === 4) {
      if (!o.cart) { o.cart = makeCart(true); scene.add(o.cart); }
      const cy = Math.cos(o.yaw), sy = Math.sin(o.yaw), ox = -.38 * cy + -.3 * sy, oz = .38 * sy + -.3 * cy;
      const cx = o.x - ox, cz = o.z - oz, gy = heightAt(cx, cz);
      o.cart.visible = true; o.cart.position.set(cx, gy, cz); o.cart.rotation.set(0, o.yaw, 0);
      o.seat = (o.seat || new T.Vector3()).set(o.x, gy + .55, o.z); o.seatPitch = 0;
    } else if (o.cart) o.cart.visible = false;
    if (o.a === 3 && !o.swingT) o.swingT = .01;
    if (o.a !== 3 && o.swingT > 1) o.swingT = 0;
    animateAvatar(o.av, o, dt, t);
    o.ball.visible = !!o.bv; o.ball.position.set(o.bx, heightAt(o.bx, o.bz) + .2, o.bz);
  }

  updateLobby(dt, t); updateLife(dt, t); updateFireworks(dt); updateEat(dt, t); updateCritters(dt); updateDucks(dt, t); updateZones(dt, t); updateGallery(dt, t);
  if (moveRing.material.opacity > 0) { moveRing.material.opacity = Math.max(0, moveRing.material.opacity - dt * 1.2); moveRing.scale.multiplyScalar(1 + dt * .8); }
  updateCamera(dt); if (skyMesh) skyMesh.position.set(camera.position.x, 0, camera.position.z);
  renderer.render(scene, camera);
  recFrame();

  // 이름표
  const W = stage.clientWidth, H = stage.clientHeight;
  const place = (tag, x, y, z) => {
    tmpV.set(x, y, z); const d = camera.position.distanceTo(tmpV); tmpV.project(camera);
    if (tmpV.z > 1 || (d > 70 && tag !== ballTag)) { tag.style.display = 'none'; return; }
    tag.style.display = ''; tag.style.transform = `translate(${(tmpV.x * .5 + .5) * W}px, ${(-tmpV.y * .5 + .5) * H}px) translate(-50%,-100%)`;
    tag.style.opacity = d > 45 && tag !== ballTag ? String(1 - (d - 45) / 25) : '1';
  };
  place(me.tag, me.x, (me.anim === 4 && me.seat ? me.seat.y + 2.4 : heightAt(me.x, me.z) + 3) + (me.jump > 0 ? .9 : 0), me.z);
  for (const o of NET.others.values()) if (o.tag) place(o.tag, o.x, o.anim === 4 && o.seat ? o.seat.y + 2.4 : heightAt(o.x, o.z) + 3, o.z);
  if (ownerTag) { if (Math.hypot(me.x - SHADE.x, me.z - SHADE.z) < 30) place(ownerTag, SHADE.x + 2.3, SHADE_LV + 3.1, SHADE.z - 1.7); else ownerTag.style.display = 'none'; }
  if (ownerAv) ownerAv.rotation.z = Math.sin(performance.now() / 600) * .04;
  if (ballBeacon.visible) { ballTag.querySelector('.nm').textContent = `${S.strokes === 0 ? '티잉 구역 · ' : ''}내 공 · ${Math.round(ballFar * M_PER_U)}m`; place(ballTag, S.ball.x, S.ball.y + 2.6, S.ball.z); } else ballTag.style.display = 'none';
  if (me.cart && me.cart.visible) { const v = new T.Vector3(.38, 3.1, -.3); me.cart.localToWorld(v); place(caddieTag, v.x, v.y, v.z); } else caddieTag.style.display = 'none';
  if (S.mode === 'aim' && aimTipPos) { const tip = $('aimTip'); tip.hidden = false; place(tip, aimTipPos[0], aimTipPos[1], aimTipPos[2]); } else $('aimTip').hidden = true;

  mmT -= dt; if (mmT <= 0) { mmT = .1; drawMinimap(); }
  sendT -= dt; if (sendT <= 0) { sendT = .12; sendPos(false); }
  actT -= dt; if (actT <= 0) { actT = .15; updActions(); if (S.mode === 'walk' || S.mode === 'aim') updHud(); }
}

// ================= 시작 =================
function enterGame() {
  if (!NET.nick) setNick(savedNick() || localNick());
  $('lobby').hidden = true; $('app').hidden = false;
  if (!T) { stage.insertAdjacentHTML('beforeend', '<div class="nogl"><p>3D 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.</p></div>'); return; }
  if (!build()) return;
  me.tag.querySelector('.nm').textContent = NET.nick;
  audio(); startAmbience(); setMaster(true);
  resetRound(false);
  startClubAt('outside');
  updChannelBadge(); resize();
  if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); }
  if (window.innerWidth < 640) $('help').textContent = '드래그: 시점 · 땅 탭: 걷기 · 두 손가락: 확대';
}

renderCard();
connect();
})();
