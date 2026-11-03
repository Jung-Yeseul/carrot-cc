// 메타모아(https://metamoa.com) 연동
// - /metamoa?code=관리코드 : 운영자 전용 페이지 (등록 신청, 진행 상황, 업데이트·이벤트·캐릭터)
// - 공간 키가 있으면 10분마다 접속자 수를 보내요
// 키는 코드에 적지 않고 Render 환경변수에만 넣어요:
//   METAMOA_ADMIN        운영자 페이지 관리 코드 (아무 문자열, 직접 정하기)
//   METAMOA_REQUEST_KEY  신청 후 받은 request_key (mm_req_…)
//   METAMOA_SUBMIT_ID    신청 번호
//   METAMOA_VERIFY       소유자 확인 코드 (사이트 <meta>에 자동으로 들어가요)
//   METAMOA_KEY          승인 후 받은 공간 키 (mm_live_…)
//   METAMOA_SPACE_ID     공간 번호 (없으면 신청 번호를 써요)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = 'https://metamoa.com';
const env = k => (process.env[k] || '').trim();
const SITE = { name: '당근 컨트리클럽', url: env('SITE_URL') || 'https://carrot-cc.onrender.com/', region: 'kr', langs: ['ko'], summary: '당근 캐릭터로 걷고 치고 쉬어가는 3D 온라인 골프장', og_image: (env('SITE_URL') || 'https://carrot-cc.onrender.com/').replace(/\/?$/, '/') + 'og.png', api_hookup: true };
const state = { lastLive: null, log: [] };
const note = m => { const line = `${new Date().toISOString().slice(0, 16)} ${m}`; state.log.unshift(line); state.log.length = Math.min(state.log.length, 30); console.log('[metamoa]', m); };
const spaceId = () => env('METAMOA_SPACE_ID') || env('METAMOA_SUBMIT_ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mask = o => JSON.parse(JSON.stringify(o || {}, (k, v) => /key|secret|token/i.test(k) && typeof v === 'string' ? v.slice(0, 7) + '…' : v));

async function call(method, p, { key, body, raw, type } = {}) {
  const headers = { 'User-Agent': 'carrot-cc' };
  if (key) headers.Authorization = 'Bearer ' + key;
  if (raw) headers['Content-Type'] = type; else if (body) headers['Content-Type'] = 'application/json';
  const r = await fetch(API + p, { method, headers, body: raw || (body ? JSON.stringify(body) : undefined) });
  const text = await r.text(); let json = null; try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: r.status, ok: r.ok, json, text: text.slice(0, 600) };
}

// ---- 접속자 수: 10분마다 ----
function startLive(countFn) {
  const tick = async () => {
    const key = env('METAMOA_KEY'), id = spaceId(); if (!key || !id) return;
    try { const r = await call('POST', `/api/live/${encodeURIComponent(id)}`, { key, body: { count: Math.max(0, Math.min(100000, countFn() | 0)) } }); state.lastLive = { at: Date.now(), status: r.status }; if (!r.ok) note(`접속자 수 전송 실패 ${r.status} ${r.text}`); }
    catch (e) { state.lastLive = { at: Date.now(), status: 'error' }; note('접속자 수 전송 오류: ' + e.message); }
  };
  setTimeout(tick, 60 * 1000); setInterval(tick, 10 * 60 * 1000 + 5000);
}

// ---- 사이트 <head>에 소유자 확인 코드 넣기 ----
function headTags() { const v = env('METAMOA_VERIFY'); return v ? `<meta name="metamoa-site-verification" content="${esc(v)}">` : ''; }

// ---- 운영자 페이지 ----
function page(res, title, body, code = 200) {
  res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer' });
  res.end(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{font:15px/1.6 system-ui,-apple-system,"Apple SD Gothic Neo",sans-serif;background:#f4efe3;color:#1d2a1f;margin:0;padding:20px}main{max-width:640px;margin:0 auto}h1{font-size:22px;margin:.2em 0}h2{font-size:17px;margin:1.6em 0 .4em}.card{background:#fffdf7;border:1px solid #e3d9c2;border-radius:14px;padding:14px 16px;margin:10px 0}.ok{color:#2e7a3f;font-weight:700}.wait{color:#b8661c;font-weight:700}.bad{color:#c0392b;font-weight:700}button,.btn{background:#e9711f;color:#fff;border:0;border-radius:12px;padding:10px 16px;font-size:15px;font-weight:700;cursor:pointer}button.sub{background:#fff;color:#1d2a1f;border:1px solid #d6cbb2}input[type=text],input[type=date],input[type=time],textarea{width:100%;box-sizing:border-box;padding:9px;border:1px solid #d6cbb2;border-radius:10px;font:inherit}label{display:block;margin:8px 0}code,.key{font-family:ui-monospace,monospace;background:#f1ead8;padding:2px 6px;border-radius:6px;word-break:break-all}.key{display:block;padding:10px;font-size:14px;user-select:all}small{color:#6b6b5e}ol li{margin:4px 0}pre{white-space:pre-wrap;font-size:12px;background:#f1ead8;padding:8px;border-radius:8px}</style></head><body><main>${body}</main></body></html>`);
}
function readBody(req, limit = 32 * 1024) { return new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > limit) { no(new Error('too big')); req.destroy(); } }); req.on('end', () => ok(b)); req.on('error', no); }); }
const form = s => Object.fromEntries(new URLSearchParams(s));
const authed = code => { const a = env('METAMOA_ADMIN'); return a && code && a.length === code.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(code)); };

async function handle(req, res, url, ctx) {
  if (url.pathname !== '/metamoa' && !url.pathname.startsWith('/metamoa/')) return false;
  const code = url.searchParams.get('code') || '';
  if (!env('METAMOA_ADMIN')) { page(res, '메타모아 연동', `<h1>메타모아 연동</h1><div class="card">Render 환경변수에 <code>METAMOA_ADMIN</code>(관리 코드, 직접 정한 아무 문자열)을 넣으면 이 페이지를 쓸 수 있어요.</div>`); return true; }
  if (!authed(code)) { page(res, '메타모아 연동', '<h1>관리 코드가 필요해요</h1><div class="card">주소 끝에 <code>?code=관리코드</code>를 붙여 주세요.</div>', 403); return true; }
  const q = `?code=${encodeURIComponent(code)}`, back = `<p><a href="/metamoa${q}">← 연동 페이지로</a></p>`;
  const reqKey = env('METAMOA_REQUEST_KEY'), subId = env('METAMOA_SUBMIT_ID'), key = env('METAMOA_KEY'), sid = spaceId();

  // ① 등록 신청 (약관 동의는 이 페이지에서 직접 체크)
  if (req.method === 'POST' && url.pathname === '/metamoa/submit') {
    const f = form(await readBody(req));
    if (f.agree !== 'on') { page(res, '신청', `<h1>약관 동의가 필요해요</h1>${back}`); return true; }
    if (reqKey) { page(res, '신청', `<h1>이미 신청했어요</h1><div class="card">METAMOA_REQUEST_KEY가 이미 들어 있어요. 다시 신청하지 않을게요.</div>${back}`); return true; }
    const body = { ...SITE, agree: true };
    if (f.email && f.notify === 'on') { body.email = f.email.trim(); body.notify_email = true; }
    try {
      const r = await call('POST', '/api/submit', { body });
      const j = r.json || {}; const id = j.id ?? j.request_id ?? j.space_id ?? '';
      const rk = j.request_key || (j.request && j.request.key) || '';
      note(`등록 신청 → ${r.status} (신청 번호 ${id || '?'})`);
      if (!r.ok) { page(res, '신청 실패', `<h1 class="bad">신청이 안 됐어요 (${r.status})</h1><div class="card"><pre>${esc(r.text)}</pre></div>${back}`); return true; }
      page(res, '신청 완료', `<h1 class="ok">신청했어요!</h1>
        <div class="card"><b>아래 두 값을 Render 환경변수에 넣어 주세요.</b> 이 화면을 닫으면 다시 볼 수 없어요. 채팅이나 메모에는 붙여 넣지 마세요.
        <ol><li>Render → carrot-cc → Environment → Add Environment Variable</li>
        <li>Key <code>METAMOA_SUBMIT_ID</code> / Value <span class="key">${esc(id)}</span></li>
        <li>Key <code>METAMOA_REQUEST_KEY</code> / Value <span class="key">${esc(rk || '(응답에 request_key가 없어요)')}</span></li>
        <li>Save Changes → 자동으로 다시 배포돼요. 그다음 이 페이지에서 심사 결과를 볼 수 있어요.</li></ol></div>
        <div class="card"><small>메타모아 응답 (키는 가렸어요)</small><pre>${esc(JSON.stringify(mask(j), null, 2))}</pre></div>${back}`);
    } catch (e) { note('등록 신청 오류: ' + e.message); page(res, '오류', `<h1 class="bad">메타모아에 연결하지 못했어요</h1><div class="card">${esc(e.message)}</div>${back}`); }
    return true;
  }
  // 업데이트 글
  if (req.method === 'POST' && url.pathname === '/metamoa/update') {
    const f = form(await readBody(req)); const text = (f.text || '').trim().slice(0, 200);
    const r = key && sid && text ? await call('POST', `/api/update/${encodeURIComponent(sid)}`, { key, body: { text } }) : { status: '-', text: '공간 키·번호·내용을 확인해 주세요' };
    note(`업데이트 글 → ${r.status}`); page(res, '업데이트', `<h1>${r.ok ? '<span class="ok">올렸어요</span>' : `<span class="bad">안 올라갔어요 (${esc(r.status)})</span>`}</h1><div class="card"><pre>${esc(r.text || '')}</pre></div>${back}`); return true;
  }
  // 이벤트
  if (req.method === 'POST' && url.pathname === '/metamoa/event') {
    const f = form(await readBody(req));
    const ev = { title: (f.title || '').trim().slice(0, 30), starts_at: `${f.start}T00:00:00+09:00`, ends_at: `${f.end}T00:00:00+09:00` };
    if (f.desc) ev.desc = f.desc.trim().slice(0, 40);
    if (f.from && f.to) { ev.daily_from = f.from; ev.daily_to = f.to; }
    ev.url = SITE.url;
    const r = key && sid ? await call('POST', `/api/space/${encodeURIComponent(sid)}/events`, { key, body: ev }) : { status: '-', text: '공간 키가 아직 없어요' };
    note(`이벤트 "${ev.title}" → ${r.status}`); page(res, '이벤트', `<h1>${r.ok ? '<span class="ok">이벤트를 올렸어요</span>' : `<span class="bad">안 올라갔어요 (${esc(r.status)})</span>`}</h1><div class="card"><pre>${esc(r.text || '')}</pre></div>${back}`); return true;
  }
  // 야영지 캐릭터 (public/carrot-character.glb)
  if (req.method === 'POST' && url.pathname === '/metamoa/character') {
    const file = path.join(ctx.publicDir, 'carrot-character.glb');
    const r = key && sid && fs.existsSync(file) ? await call('PUT', `/api/space/${encodeURIComponent(sid)}/character`, { key, raw: fs.readFileSync(file), type: 'model/gltf-binary' }) : { status: '-', text: '공간 키가 없거나 캐릭터 파일이 없어요' };
    note(`캐릭터 업로드 → ${r.status}`); page(res, '캐릭터', `<h1>${r.ok ? '<span class="ok">캐릭터를 보냈어요. 자동 검사 뒤 야영지에 서요</span>' : `<span class="bad">안 올라갔어요 (${esc(r.status)})</span>`}</h1><div class="card"><pre>${esc(r.text || '')}</pre></div>${back}`); return true;
  }

  // 메인 현황 페이지
  let status = '';
  if (reqKey && subId) {
    try { const r = await call('GET', `/api/submit/${encodeURIComponent(subId)}`, { key: reqKey }); status = `<div class="card"><b>심사 상태</b> (${r.status})<pre>${esc(JSON.stringify(mask(r.json || r.text), null, 2))}</pre><p>승인되면 <a href="${API}/owner?id=${encodeURIComponent(subId)}" target="_blank" rel="noopener">메타모아 소유자 확인 페이지</a>에서 확인 코드를 받아 <code>METAMOA_VERIFY</code>에 넣어 주세요. 사이트에 자동으로 들어가요.</p></div>`; }
    catch (e) { status = `<div class="card bad">심사 상태를 불러오지 못했어요: ${esc(e.message)}</div>`; }
  }
  const step = (done, text) => `<li>${done ? '<span class="ok">✔</span>' : '<span class="wait">○</span>'} ${text}</li>`;
  page(res, '메타모아 연동', `<h1>🥕 메타모아 연동</h1>
    <div class="card"><ol>
      ${step(!!reqKey, '등록 신청 (아래에서 직접)')}
      ${step(!!env('METAMOA_VERIFY'), '승인 후 소유자 확인 코드 → <code>METAMOA_VERIFY</code>')}
      ${step(!!key, '공간 키 → <code>METAMOA_KEY</code>' + (env('METAMOA_SPACE_ID') ? '' : ' (공간 번호가 신청 번호와 다르면 <code>METAMOA_SPACE_ID</code>도)'))}
      ${step(!!(state.lastLive && state.lastLive.status === 204), '접속자 수 자동 전송' + (state.lastLive ? ` · 마지막 ${new Date(state.lastLive.at + 9 * 3600e3).toISOString().slice(11, 16)} (${state.lastLive.status})` : ''))}
    </ol><small>지금 접속자 ${ctx.count()}명</small></div>
    ${!reqKey ? `<h2>① 등록 신청</h2><form class="card" method="post" action="/metamoa/submit${q}">
      <p>이름 <b>${esc(SITE.name)}</b> · 주소 <b>${esc(SITE.url)}</b> · 지역 kr · 언어 한국어<br>한 줄 소개 “${esc(SITE.summary)}” · API 연결 요청</p>
      <label><input type="checkbox" name="agree"> 메타모아 <a href="${API}/terms" target="_blank" rel="noopener">이용약관</a>과 <a href="${API}/privacy" target="_blank" rel="noopener">개인정보처리방침</a>에 동의해요</label>
      <label><input type="checkbox" name="notify"> 결과를 메일로도 받기</label><label><input type="text" name="email" placeholder="메일 주소 (메일로 받을 때만)"></label>
      <button>신청하기</button></form>` : status}
    ${key ? `<h2>업데이트 글 (하루 한 번)</h2><form class="card" method="post" action="/metamoa/update${q}"><textarea name="text" rows="3" maxlength="200" placeholder="예: 클럽하우스가 문을 열었어요! 락커룸에서 옷 갈아입고 티오프해요"></textarea><p><button>올리기</button></p></form>
    <h2>이벤트 (최대 5개)</h2><form class="card" method="post" action="/metamoa/event${q}">
      <label>제목 (30자) <input type="text" name="title" maxlength="30" placeholder="밤 9시 홀인원 챌린지"></label><label>한 줄 설명 (40자, 선택) <input type="text" name="desc" maxlength="40"></label>
      <label>시작일 <input type="date" name="start" required></label><label>종료일 (31일 이내) <input type="date" name="end" required></label>
      <label>매일 시작 (선택) <input type="time" name="from"></label><label>매일 끝 (선택) <input type="time" name="to"></label><button>이벤트 올리기</button></form>
    <h2>야영지 캐릭터</h2><form class="card" method="post" action="/metamoa/character${q}"><p>당근 캐릭터 3D 파일(GLB)을 보내요. 하루 5번까지.</p><button>캐릭터 올리기</button></form>` : ''}
    <h2>기록</h2><div class="card"><pre>${esc(state.log.join('\n') || '아직 없어요')}</pre></div>`);
  return true;
}

module.exports = { handle, startLive, headTags };
