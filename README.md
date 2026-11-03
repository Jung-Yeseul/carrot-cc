# 당근 CC (당근 컨트리클럽)

말없이 공만 치다 가는 온라인 골프장이에요. 설치 없이 브라우저로 들어와 9홀을 돌고, 전반이 끝나면 그늘집에서 쉬었다 가요.

**동선**: 입장 화면(닉네임) → 클럽하우스 정문 앞 정원 → `🚪 클럽하우스 입장` → 로비(프론트 토끼) → 걸어서 락커룸 / 드라이빙 레인지 / 1번 홀로.
라운딩 중에는 왼쪽 위 `당근 CC` 버튼(메뉴)으로 클럽하우스나 정문으로 나갔다가, 코스 출입구에서 이어서 칠 수 있어요. 진행 상황은 브라우저에 저장돼서 새로고침해도 이어져요.
같은 채널에 있는 사람들의 공이 같은 홀에서 굴러가는 게 보이고, 채팅 대신 정해진 인사(이모트)만 주고받아요.

```
carrot-cc/
├─ server.js        실시간 서버 (채널, 접속자 위치·인사 중계, 정적 파일 서빙)
├─ package.json     필요한 라이브러리 목록 (ws 하나)
├─ render.yaml      Render 배포 설정
└─ public/
   ├─ index.html    입장 화면 + 게임 화면
   ├─ style.css     디자인
   ├─ game.js       게임 로직 (코스, 물리, 그늘집, 멀티플레이)
   ├─ og.png        카톡·인스타 공유 썸네일 (1200×630)
   └─ favicon.svg   브라우저 탭 아이콘
```

---

## 1. 내 컴퓨터에서 먼저 돌려보기 (선택)

1. [Node.js](https://nodejs.org) LTS 버전 설치
2. 터미널에서 이 폴더로 이동한 뒤:
   ```
   npm install
   npm start
   ```
3. 브라우저에서 `http://localhost:3000` 접속. 창을 두 개 열면 서로의 공이 보여요.

## 2. 인터넷에 올리기 (GitHub + Render, 무료로 시작)

### ① GitHub에 코드 올리기
1. [github.com](https://github.com) 가입 → 오른쪽 위 **+** → **New repository**
2. 이름 `carrot-cc`, Private 또는 Public 아무거나 → **Create repository**
3. 생성된 페이지에서 **uploading an existing file** 클릭 → 이 폴더 안의 파일을 전부 끌어다 놓기
   (`node_modules` 폴더가 있다면 빼고 올리세요) → **Commit changes**

### ② Render에서 서버 켜기
1. [render.com](https://render.com) 가입 (GitHub 계정으로 로그인하면 편해요)
2. **New +** → **Blueprint** → 방금 만든 `carrot-cc` 저장소 선택 → **Apply**
   - `render.yaml`을 읽어서 설정이 자동으로 채워져요.
   - Blueprint가 안 보이면 **New + → Web Service**로 만들고 Build `npm install`, Start `npm start`를 입력하세요.
3. 몇 분 뒤 `https://carrot-cc-xxxx.onrender.com` 같은 주소가 생겨요. 들어가서 티업해 보세요.

> 무료 플랜은 15분 동안 아무도 없으면 서버가 잠들고, 다음 사람이 들어올 때 깨어나는 데 30초~1분 걸려요.
> 사람들에게 본격적으로 알리기 전에 Render 대시보드에서 **Starter(월 $7)** 로 올리면 항상 켜져 있어요.

### ③ 내 도메인 연결하기
1. 가비아, Cloudflare, 후이즈 등에서 도메인 구매 (예: `carrotcc.kr`)
2. Render 서비스 화면 → **Settings → Custom Domains → Add** → 도메인 입력
3. Render가 알려주는 DNS 값(CNAME 또는 A 레코드)을 도메인 산 곳의 **DNS 관리** 화면에 그대로 입력
4. 보통 10분~몇 시간 안에 연결되고, https 인증서는 Render가 자동으로 붙여줘요.

### ④ 코드 고친 뒤 다시 올리기
GitHub 저장소에서 파일을 수정(연필 아이콘)하거나 새로 업로드해서 커밋하면, Render가 자동으로 새 버전을 배포해요.

---

## 3. 자주 바꿀 만한 곳

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 사이트 이름·설명·공유 문구 | `public/index.html` 위쪽 `<title>`, `og:` 태그, 입장 화면 문구 |
| 채널 개수·정원 | Render 대시보드 **Environment**의 `CHANNELS`, `CAPACITY` |
| 닉네임 단어 | `server.js`의 `ADJ`, `NOUN` |
| 인사(이모트) 문구 | `public/game.js`의 `EMOTES` (개수를 바꾸면 `server.js`의 `EMOTES` 숫자도 같이) |
| 그늘집 메뉴·가격·효과 이름 | `public/game.js`의 `MENU` |
| 홀 추가·수정 | `public/game.js`의 `HOLES` (좌표는 가로 360 × 세로 560 기준). 홀 수를 바꾸면 `server.js`의 `HOLES` 숫자도 같이 |
| 색상 | `public/style.css` 맨 위 `:root` |

## 4. 운영 메모

- **채팅이 없어서** 욕설·스팸 관리 부담이 거의 없어요. 닉네임도 서버가 정해줘요.
- 서버는 접속당 초당 메시지 수를 제한하고, 이상한 값은 무시해요.
- 접속 현황은 `https://내주소/api/status`에서 숫자로 볼 수 있어요.
- 서버 한 대로 동시접속 수천 명까지는 무난해요. 산사처럼 하루 수십만 명이 몰리면 Render 플랜을 올리거나 서버를 나누는 작업이 필요해요.
- 베스트 기록과 락커에서 고른 옷, 드라이빙 레인지 최고 비거리는 각자 브라우저에 저장돼요.

## 5. 명예의 전당이 지워지지 않게 하기 (한 번만 설정)

Render 무료 플랜은 재배포·재시작 때 서버 안의 파일이 지워져요. 그래서 홀인원 기록을 내 GitHub 계정의 **비공개 Gist** 하나에 같이 저장해요.

1. GitHub → 오른쪽 위 프로필 → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. 이름 `carrot-cc-hof`, 만료일은 넉넉히(예: 1년), **Repository access: Public repositories (read-only)** 그대로 두기
3. **Account permissions → Gists → Read and write** 만 켜고 **Generate token** → 나온 값 복사
4. Render 대시보드 → carrot-cc → **Environment → Add Environment Variable**
   - Key: `GITHUB_TOKEN`, Value: 방금 복사한 값 → **Save Changes** (자동으로 다시 배포돼요)
5. 배포 로그에 `명예의 전당 Gist 연결됨` 이 보이면 끝. 이후 기록은 재배포해도 계속 누적돼요.

토큰을 안 넣어도 게임은 똑같이 돌아가고, 서버가 재시작되기 전까지는 기록이 쌓여요.
