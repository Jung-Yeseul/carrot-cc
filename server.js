// 당근 CC — 실시간 서버
// 정적 파일(public/)을 서빙하고, /ws 로 들어온 접속을 채널별로 묶어 위치·이모트를 중계합니다.
// 채팅은 없습니다. 닉네임은 서버가 지어주고, 이모트는 정해진 목록에서만 고를 수 있어요.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const metamoa = require('./metamoa');

// ---- 설정 (환경변수로 바꿀 수 있어요) ----
const PORT = Number(process.env.PORT) || 3000;
const CHANNELS = Number(process.env.CHANNELS) || 50;   // 채널 개수
const CAPACITY = Number(process.env.CAPACITY) || 30;   // 채널당 정원
const MAX_TOTAL = Number(process.env.MAX_TOTAL) || CHANNELS * CAPACITY;
const PUBLIC_DIR = path.join(__dirname, 'public');
const BOOT_VERSION = Date.now().toString(36);

// ---- 명예의 전당 (홀인원 기록) ----
// 기록은 계속 누적돼요. 서버 안의 data/hof.json에도 저장하지만, Render 무료 플랜은 재배포·재시작 때
// 이 파일이 지워져요. 그래서 환경변수 GITHUB_TOKEN(Gists 읽기·쓰기 권한)이 있으면
// 내 GitHub 계정의 비공개 Gist 하나("carrot-cc hall of fame")에 백업하고, 서버가 켜질 때 거기서 다시 불러와요.
const HOF_FILE = path.join(__dirname, 'data', 'hof.json');
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_DESC = 'carrot-cc hall of fame';
let HOF = [];
try { HOF = JSON.parse(fs.readFileSync(HOF_FILE, 'utf8')); if (!Array.isArray(HOF)) HOF = []; } catch { HOF = []; }
let gistId = process.env.HOF_GIST_ID || '', gistTimer = null, gistReady = false;
const gh = (p, opt = {}) => fetch('https://api.github.com' + p, { ...opt, headers: { Authorization: 'Bearer ' + GH_TOKEN, Accept: 'application/vnd.github+json', 'User-Agent': 'carrot-cc', 'Content-Type': 'application/json' } }).then(r => { if (!r.ok) throw new Error('GitHub ' + r.status); return r.json(); });
const hofKey = e => `${e.at}|${e.nick}|${e.h}`;
function mergeHof(list) {
  if (!Array.isArray(list)) return;
  const seen = new Set(HOF.map(hofKey));
  for (const e of list) if (e && typeof e.at === 'number' && !seen.has(hofKey(e))) { HOF.push({ nick: String(e.nick).slice(0, 12), h: e.h | 0, at: e.at, c: e.c ? 1 : 0 }); seen.add(hofKey(e)); }
  HOF.sort((a, b) => a.at - b.at);
}
async function loadGist() {
  if (!GH_TOKEN) return;
  try {
    if (!gistId) {
      for (let page = 1; page <= 5 && !gistId; page++) {
        const list = await gh(`/gists?per_page=100&page=${page}`);
        const g = list.find(x => x.description === GIST_DESC); if (g) gistId = g.id;
        if (list.length < 100) break;
      }
    }
    if (gistId) {
      const g = await gh('/gists/' + gistId), f = g.files && g.files['hof.json'];
      let txt = f && f.content; if (f && f.truncated && f.raw_url) txt = await (await fetch(f.raw_url)).text();
      mergeHof(JSON.parse(txt || '[]'));
    } else {
      const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: GIST_DESC, public: false, files: { 'hof.json': { content: JSON.stringify(HOF) } } }) });
      gistId = g.id;
    }
    gistReady = true; console.log(`명예의 전당 Gist 연결됨 (${HOF.length}개 기록)`);
    saveHof(); broadcastHof();
  } catch (err) { console.log('명예의 전당 Gist 연결 실패:', err.message); setTimeout(loadGist, 60000); }
}
function saveHof() {
  fs.mkdir(path.dirname(HOF_FILE), { recursive: true }, () => fs.writeFile(HOF_FILE, JSON.stringify(HOF), () => {}));
  if (!GH_TOKEN || !gistReady) return;
  clearTimeout(gistTimer);
  gistTimer = setTimeout(() => gh('/gists/' + gistId, { method: 'PATCH', body: JSON.stringify({ files: { 'hof.json': { content: JSON.stringify(HOF) } } }) }).catch(err => console.log('Gist 저장 실패:', err.message)), 2000);
}
function broadcastHof() { const board = JSON.stringify(hofPayload()); for (const q of sockets) send(q.ws, board); }
const kstDay = ts => new Date(ts + 9 * 3600e3).toISOString().slice(0, 10);
function hofPayload() {
  const today = kstDay(Date.now());
  return { t: 'hof', today: HOF.filter(e => kstDay(e.at) === today).length, total: HOF.length, list: HOF.slice(-30).reverse(), top: hofTop() };
}
function hofTop() {
  const m = new Map(); for (const e of HOF) m.set(e.nick, (m.get(e.nick) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nick, n]) => ({ nick, n }));
}

const ADJ = ['아삭한', '주황빛', '느긋한', '조용한', '바람같은', '침착한', '오늘도', '은은한', '흔들리는', '한가로운', '산뜻한', '나른한', '포근한', '단단한'];
const NOUN = ['버디', '이글', '퍼터', '캐디', '티샷', '디봇', '당근', '파세이브', '그린', '페어웨이', '드라이버', '웨지', '티박스'];
const COLORS = ['#f2c14e', '#f78154', '#5fad56', '#4d9de0', '#b07bd8', '#e15a97', '#3bc4b4', '#ffd166'];
const EMOTES = 6; // 클라이언트 EMOTES 목록 길이와 맞춰주세요
const LOOK_HATS = 8, LOOK_TOPS = 5, LOOK_ACCS = 5; // 클라이언트 HATS, TOPS, ACCS 개수와 맞추기
const HOLES = 9;   // 클라이언트 HOLES 개수와 맞추기
const XY = 1300;  // 좌표 범위 (코스 ±120 유닛 × 10, 여유 포함)

// ---- 정적 파일 ----
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.glb': 'model/gltf-binary', '.txt': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(lobbyPayload()));
  }
  if (url.pathname === '/api/hof') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify(hofPayload()));
  }
  if (url.pathname === '/healthz') { res.writeHead(200); return res.end('ok'); }
  if (url.pathname === '/metamoa' || url.pathname.startsWith('/metamoa/')) {
    metamoa.handle(req, res, url, { publicDir: PUBLIC_DIR, count: () => total() }).catch(e => { if (!res.headersSent) res.writeHead(500); res.end('error'); console.log('[metamoa]', e.message); });
    return;
  }

  let file = decodeURIComponent(url.pathname);
  if (file === '/' || file === '') file = '/index.html';
  const full = path.normalize(path.join(PUBLIC_DIR, file));
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('길을 잃으셨네요. 클럽하우스로 돌아가세요.'); }
    const ext = path.extname(full);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      // html·js·css는 매번 새 버전인지 확인해요 (배포하면 새로고침 한 번에 바로 반영)
      'Cache-Control': ['.html', '.js', '.css'].includes(ext) ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    // 배포할 때마다 서버가 새로 켜지므로, 그 시각을 버전으로 붙여 예전 파일이 남아 있어도 새 파일을 받게 해요
    if (ext === '.html') data = data.toString('utf8').replace(/(["'])\/(game\.js|style\.css)\1/g, `$1/$2?v=${BOOT_VERSION}$1`).replace('</head>', metamoa.headTags() + '</head>');
    res.end(data);
  });
});

// ---- 채널 / 플레이어 ----
const channels = Array.from({ length: CHANNELS + 1 }, () => new Map()); // 1번부터 사용
const sockets = new Set();
let nextId = 1;

function nickname() {
  return ADJ[Math.random() * ADJ.length | 0] + ' ' + NOUN[Math.random() * NOUN.length | 0];
}
function counts() { return channels.slice(1).map(m => m.size); }
function total() { return sockets.size; }
function lobbyPayload() { return { t: 'lobby', total: total(), cap: CAPACITY, ch: counts() }; }
function publicPlayer(p) { return { id: p.id, nick: p.nick, color: p.color, h: p.h, x: p.x, z: p.z, r: p.r, a: p.a, bx: p.bx, bz: p.bz, bv: p.bv, st: p.st, sc: p.sc, dn: p.dn, lk: p.lk }; }

function send(ws, msg) { if (ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); }
function toChannel(ch, msg, exceptId) {
  const s = JSON.stringify(msg);
  for (const p of channels[ch].values()) if (p.id !== exceptId) send(p.ws, s);
}
function pickChannel() {
  // 이미 사람이 좀 있는 채널부터 채워서, 같이 치는 느낌이 나도록
  let best = 0, bestN = -1;
  for (let i = 1; i <= CHANNELS; i++) {
    const n = channels[i].size;
    if (n < CAPACITY && n > bestN) { best = i; bestN = n; }
  }
  return best;
}
function leaveChannel(p) {
  if (!p.ch) return;
  channels[p.ch].delete(p.id);
  toChannel(p.ch, { t: 'leave', id: p.id });
  p.ch = 0;
}
// 닉네임 검사: 2~10자, 한글·영문·숫자·공백·밑줄만. 욕설이나 운영자 사칭은 막아요
const BANNED = ['씨발', '시발', 'ㅅㅂ', '병신', 'ㅂㅅ', '개새', '좆', '지랄', '꺼져', '섹스', '자지', '보지', '니미', '애미', '애비', '느금', 'fuck', 'shit', 'sex', 'bitch', '관리자', '운영자', '운영진', 'admin', '캐디봇'];
function cleanNick(raw) {
  if (typeof raw !== 'string') return { err: '이름을 입력해 주세요.' };
  const n = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (n.length < 2 || n.length > 10) return { err: '이름은 2~10자로 정해 주세요.' };
  if (!/^[가-힣a-zA-Z0-9 _]+$/.test(n)) return { err: '한글, 영문, 숫자만 쓸 수 있어요.' };
  const flat = n.replace(/[\s_]/g, '').toLowerCase();
  if (BANNED.some(w => flat.includes(w))) return { err: '쓸 수 없는 단어가 들어 있어요.' };
  return { nick: n };
}
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi) ? v : null;

// ---- 웹소켓 ----
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 512 });

wss.on('connection', (ws) => {
  if (total() >= MAX_TOTAL) { send(ws, { t: 'full' }); return ws.close(1013, 'full'); }
  const p = { id: nextId++, nick: nickname(), color: COLORS[Math.random() * COLORS.length | 0], ws, ch: 0, h: 0, x: 0, z: 0, r: 0, a: 0, bx: 0, bz: 0, bv: 0, st: 0, sc: 0, dn: 0,
    tokens: 40, lastEmo: 0, strikes: 0, alive: true };
  sockets.add(p);
  send(ws, { ...lobbyPayload(), t: 'hello', id: p.id, nick: p.nick, color: p.color });
  send(ws, hofPayload());

  ws.on('pong', () => { p.alive = true; });
  ws.on('message', (raw) => {
    // 간단한 속도 제한: 초당 약 20개
    if (p.tokens <= 0) { if (++p.strikes > 200) ws.close(1008, 'rate'); return; }
    p.tokens--;
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;

    switch (m.t) {
      case 'join': {
        let ch = int(m.ch, 0, CHANNELS);
        if (ch === null) return;
        if (ch === 0 || channels[ch].size >= CAPACITY) ch = pickChannel();
        if (!ch) return send(ws, { t: 'full' });
        leaveChannel(p);
        p.ch = ch; p.h = 0; p.x = 0; p.z = 0; p.r = 0; p.a = 0; p.bv = 0;
        channels[ch].set(p.id, p);
        send(ws, { t: 'joined', ch, cap: CAPACITY, players: [...channels[ch].values()].filter(o => o.id !== p.id).map(publicPlayer) });
        toChannel(ch, { t: 'enter', p: publicPlayer(p) }, p.id);
        break;
      }
      case 'leave': leaveChannel(p); break;
      case 'hio': {
        // 홀인원 신고: 채널 안에서만, 1분에 한 번
        if (!p.ch) return;
        const h = int(m.h, 0, HOLES - 1), now = Date.now();
        if (h === null || now - (p.lastHio || 0) < 60000) return;
        p.lastHio = now;
        const e = { nick: p.nick, h, at: now, c: m.c ? 1 : 0 };
        HOF.push(e); saveHof();
        const news = JSON.stringify({ t: 'hofnew', e, id: p.id }), board = JSON.stringify(hofPayload());
        for (const q of sockets) { send(q.ws, news); send(q.ws, board); }
        break;
      }
      case 'nick': {
        const now = Date.now(); if (now - (p.lastNick || 0) < 3000) return send(ws, { t: 'nickerr', msg: '잠시 후에 다시 바꿔 주세요.' });
        const r = cleanNick(m.name); if (r.err) return send(ws, { t: 'nickerr', msg: r.err });
        p.lastNick = now; p.nick = r.nick; send(ws, { t: 'nick', nick: p.nick });
        if (p.ch) toChannel(p.ch, { t: 'rename', id: p.id, nick: p.nick }, p.id);
        break;
      }
      case 'pos': {
        if (!p.ch) return;
        // 3D 좌표는 소수 첫째 자리까지 ×10 정수로 받아요
        const h = int(m.h, 0, HOLES - 1), x = int(m.x, -XY, XY), z = int(m.z, -XY, XY), r = int(m.r, 0, 63), a = int(m.a, 0, 4);
        const bx = int(m.bx, -XY, XY), bz = int(m.bz, -XY, XY);
        // st: 이번 홀 타수, sc: 지금까지 합계(파 대비), dn: 끝낸 홀 수
        const st = int(m.st ?? 0, 0, 40), sc = int(m.sc ?? 0, -40, 99), dn = int(m.dn ?? 0, 0, HOLES);
        if ([h, x, z, r, a, bx, bz, st, sc, dn].includes(null)) return;
        Object.assign(p, { h, x, z, r, a, bx, bz, bv: m.bv ? 1 : 0, st, sc, dn });
        toChannel(p.ch, { t: 'pos', id: p.id, h, x, z, r, a, bx, bz, bv: p.bv, st, sc, dn }, p.id);
        break;
      }
      case 'look': {
        // 락커에서 고른 옷: [모자 색, 옷 종류, 소품]
        // 소품(세 번째 칸)은 없어도 돼요 (예전 클라이언트 호환)
        const lk = Array.isArray(m.lk) ? m.lk : [];
        const hat = int(lk[0], 0, LOOK_HATS - 1), top = int(lk[1], 0, LOOK_TOPS - 1), acc = lk.length > 2 ? int(lk[2], 0, LOOK_ACCS - 1) : 0;
        const now = Date.now(); if (hat === null || top === null || acc === null || now - (p.lastLook || 0) < 300) return;
        p.lastLook = now; p.lk = [hat, top, acc];
        if (p.ch) toChannel(p.ch, { t: 'look', id: p.id, lk: p.lk }, p.id);
        break;
      }
      case 'emo': {
        if (!p.ch) return;
        const e = int(m.e, 0, EMOTES - 1);
        const now = Date.now();
        if (e === null || now - p.lastEmo < 800) return;
        p.lastEmo = now;
        toChannel(p.ch, { t: 'emo', id: p.id, e });
        break;
      }
      case 'res': {
        // 홀 결과 알림 (버디 이상만 클라이언트가 보냄)
        if (!p.ch) return;
        const h = int(m.h, 0, HOLES - 1), d = int(m.d, -4, 0), one = m.one ? 1 : 0;
        if (h === null || d === null) return;
        toChannel(p.ch, { t: 'res', id: p.id, nick: p.nick, h, d, one }, p.id);
        break;
      }
    }
  });
  ws.on('close', () => { leaveChannel(p); sockets.delete(p); });
  ws.on('error', () => {});
});

// 속도 제한 토큰 충전
setInterval(() => { for (const p of sockets) p.tokens = Math.min(40, p.tokens + 20); }, 1000);
// 끊긴 연결 정리
setInterval(() => {
  for (const p of sockets) {
    if (!p.alive) { p.ws.terminate(); continue; }
    p.alive = false; try { p.ws.ping(); } catch {}
  }
}, 30000);
// 로비에 있는 사람들에게 채널 현황 전송
setInterval(() => {
  const s = JSON.stringify(lobbyPayload());
  for (const p of sockets) if (!p.ch) send(p.ws, s);
  // 채널 안에 있는 사람들에게는 전체 접속자 수만
  const t = JSON.stringify({ t: 'total', total: total() });
  for (const p of sockets) if (p.ch) send(p.ws, t);
}, 3000);

server.listen(PORT, () => { metamoa.startLive(() => total()); console.log(`당근 CC 개장: http://localhost:${PORT}  (채널 ${CHANNELS}개 × 정원 ${CAPACITY}명)`); loadGist(); });
