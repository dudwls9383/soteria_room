# SOTERIA ROOM

SOTERIA ROOM은 YouTube 재생목록을 중심으로 음악을 고르고, 찾고, 겨루고, 다시 듣기 위한 개인 음악 보관실입니다. 채널의 공개 재생목록을 가져와 월별 픽, 큐레이션, 리캡 시리즈, 카와이 보이스 시리즈로 정리하고, Pick과 랜덤 디깅, 음악 월드컵, 채널 보관실을 한 화면에서 사용할 수 있게 만들었습니다.

- 공개 사이트: https://soteria-room.workspace-304435.chatgpt.site
- YouTube: https://www.youtube.com/@soteria_room
- Blog: https://blog.naver.com/dudwls9383
- Somunia Gallery: https://gall.dcinside.com/mgallery/board/lists/?id=somunia
- Kawaii Voice Gallery: https://gall.dcinside.com/mini/board/lists?id=moesound
- Link profile: https://lit.link/en/soteria

영상과 음원 파일은 저장하지 않습니다. 앱은 YouTube의 공개 정보와 로컬 저장소에 보관한 메타데이터를 사용합니다.

## 주요 기능

### Playlist Pick

홈에서 가장 먼저 보이는 재생목록 추천 영역입니다. 채널에서 가져온 재생목록 중 월의 픽과 큐레이션을 중심으로 보여주며, `202X.XX`처럼 수집 목적이 강한 목록은 별도 보관함으로 분리합니다.

- 월의 픽 우선 노출
- 재생목록 제목, 곡 수, 조회수, 갱신일 기준 정렬
- 오름차순/내림차순 전환
- 커스텀 재생목록 표지 우선 사용
- My Recap 2026~2021 시리즈 분리
- Kawaii Voice Playlist 시리즈 분리

### YouTube Playlist Searcher

가져온 모든 재생목록 안에서 곡을 검색합니다.

- 곡 제목, 채널명, 재생목록명 검색
- 전체, 픽, 큐레이션, 수집, 리캡, 카와이 보이스 시리즈 범위 필터
- YouTube 링크 일괄 복사
- 같은 영상 ID는 하나로 합쳐서 표시

### Playlist Link Extractor

커뮤니티에 재생목록을 공유하기 쉽게 영상 링크를 한 번에 뽑습니다.

- 저장된 재생목록 선택
- 링크만, 제목+링크, 마크다운 형식 전환
- 공유용 텍스트 한 번에 복사

### Digging

수집한 음악과 구독 채널을 더 가볍게 탐색하는 공간입니다.

- Pick: 접속하면 바로 보이는 오늘의 추천 선반
- 이번 달, 분기, 연도, 오래전에 모은 음악 기준 Pick
- 각 선반별 `다른 곡 보기`
- 랜덤 곡 뽑기
- 랜덤 채널 뽑기
- YouTube Subscription Manager JSON으로 채널 보관실 갱신
- 태그별 채널 필터와 앨범형 바둑판 목록

현재 Pick은 수집 시점과 재생목록 문맥을 기준으로 고릅니다. 영상별 조회수, 발매일, 장르 점수까지 반영하는 추천 DB는 다음 단계에서 붙일 수 있도록 분리해 두었습니다.

### Song Bottle Light

Song-Bottle 프로젝트를 참고한 가벼운 곡추천 탭입니다. 로그인 없이 곡 제목, YouTube 링크, 짧은 메모를 남기고 최신 추천을 함께 볼 수 있습니다.

### Music World Cup

가져온 재생목록으로 음악 이상형 월드컵을 진행합니다.

- 재생목록 선택 후 4강~64강 시작
- YouTube 임베드 재생
- 우승곡 기록
- 전체 랭킹 합산
- 체험용 데모 월드컵

월드컵 결과는 이 브라우저에서 시작한 게임을 기준으로 저장합니다.

### Blog & Galleries

네이버 블로그, 소무니아 갤러리, 카와이 보이스 갤러리의 최신 글을 가볍게 연결합니다.

- 최신 글 목록 표시
- 원문 바로가기
- 서버 메모리 5분 캐시

전체 과거 글을 저장하는 크롤러는 아닙니다. 원문 사이트가 차단하거나 화면 구조를 바꾸면 직접 방문 링크와 오류를 표시합니다.

### Translation

상단 언어 버튼으로 한국어, 영어, 일본어 UI를 전환합니다. Google Translate 리다이렉트를 사용하지 않고 앱 내부 문구를 바꾸는 방식이라 지역 제한 페이지로 이동하지 않습니다.

## 로컬에서 실행하기

Windows에서는 `SOTERIA-ROOM.cmd`를 더블 클릭하면 됩니다. 실행 창을 열어둔 상태에서 브라우저로 아래 주소에 접속하세요.

```text
http://localhost:5173/
```

처음 실행할 때는 필요한 패키지를 설치하므로 시간이 조금 걸릴 수 있습니다. Node.js 22.13 이상이 필요합니다.

직접 실행하려면:

```powershell
node scripts/local-start.mjs
```

종료할 때는 실행 창에서 `Ctrl+C`를 누릅니다.

## 재생목록 갱신 방식

앱은 고정된 @soteria_room 채널의 공개 재생목록을 갱신합니다. 마지막 전체 실행 시작으로부터 24시간이 지난 뒤 첫 방문에서 자동 갱신하며, 화면을 계속 열어두면 매시간 갱신 시기를 확인합니다. 접속자가 없을 때 별도 예약 작업을 실행하는 방식은 아닙니다. 서버의 작업 목록과 잠금으로 중복 실행을 막고, 닫힌 탭의 미완료 작업은 다음 방문에서 이어갑니다.

- 누구나 `가져오기 · 동기화`에서 갱신할 수 있습니다. 24시간 이내에는 기존 결과를 사용하며, 실패 목록은 5분 후 재시도할 수 있습니다.
- 마지막 전체 성공 시각은 모든 목록이 성공한 경우에만 서버에 기록합니다. 개별 추가 시각과 구분합니다.
- 직접 추가·삭제, JSON·CSV 업로드는 관리자 키 확인이 필요합니다. `SOTERIA_ADMIN_KEY`를 서버 환경 변수로 설정하며, 키를 소스에 넣지 않습니다.
- 초기 전송에서 중복 곡을 한 번만 보내고, 재방문 시 브라우저의 읽기 전용 캐시를 먼저 보여줍니다.
- 실패한 목록은 기존 저장 내용을 유지합니다.
- 채널에서 사라진 목록은 자동 삭제하지 않습니다.
- 0곡 또는 1곡 목록도 보관할 수 있습니다.
- 월드컵에는 최소 2곡이 필요합니다.
- `YOUTUBE_API_KEY`는 선택 사항입니다.

월별 분류는 `2026.09`, `9월의 픽(2026)` 같은 제목에서 읽습니다. 여러 달 범위이거나 날짜가 없는 목록은 큐레이션 또는 그 밖의 재생목록으로 남깁니다.

## 데이터 저장

로컬 실행 시 데이터는 `.wrangler/state/` 아래의 D1 호환 SQLite 저장소에 보관됩니다. 이 폴더는 Git에 올리지 않습니다.

보관되는 데이터:

- 가져온 재생목록과 곡 목록
- 재생목록 표지, 조회수, 갱신일 메타데이터
- 월드컵 게임과 결과
- 구독 채널 JSON에서 만든 채널 보관실 데이터
- 곡추천 병에 남긴 최신 추천

브라우저별 설정과 일부 상태는 브라우저 로컬 저장소에 남습니다.

## 프로젝트 구조

| 영역 | 주요 파일 |
| --- | --- |
| 화면 흐름, 메뉴, 재생목록 UI | `app/page.tsx` |
| Liquid Glass 스타일, 반응형 UI | `app/room.css` |
| Pick 추천 선반 | `components/pick-discovery.tsx`, `lib/picks.ts` |
| 공유용 재생목록 링크 추출 | `components/playlist-share-tool.tsx` |
| 랜덤 곡/채널 디깅 | `components/random-discovery.tsx` |
| 가벼운 곡추천 탭 | `components/song-bottle-lite.tsx`, `app/api/recommendations/route.ts` |
| 채널 보관실과 태그 | `components/channel-tag-explorer.tsx`, `lib/channel-tags.ts` |
| YouTube 재생목록 수집 | `lib/youtube.ts`, `lib/channel.ts` |
| 재생목록 표지와 조회수 | `lib/youtube-metadata.ts`, `app/api/playlist-meta/route.ts` |
| 재생목록 분류와 검색 | `lib/archive.ts`, `lib/collections.ts`, `lib/music-index.ts` |
| 음악 월드컵 | `components/world-cup.tsx`, `lib/tournament.ts`, `app/api/games/` |
| 블로그와 갤러리 | `lib/posts.ts`, `app/api/posts/route.ts` |
| 구독 채널 JSON 처리 | `lib/subscriptions.ts`, `app/api/subscriptions/route.ts` |

재사용한 기존 코드와 출처는 `REUSE.md`에 정리했습니다.

## 개발 명령

```powershell
npm run local
npm run build
npm run lint
npm test
```

더 넓게 검증할 때 사용한 명령:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/tournament.test.ts tests/archive.test.ts tests/discovery.test.ts tests/picks.test.ts
node scripts/run-framework.mjs build
```

로컬 서버가 켜져 있고 재생목록 데이터가 저장된 상태라면 통합 검사도 실행할 수 있습니다.

```powershell
node tests/local-integration.mjs
```

## 운영 메모

### 동기화와 자료 초기화 (2026-09-29)

- 동기화 중단은 두 단계의 실행 권한을 회수하고 대기열을 보존합니다. 중단 후 자동 재개하지 않으며 버튼으로 다시 시작할 수 있습니다. 이미 전송한 외부 요청은 끝날 수 있지만 결과를 저장하지 않습니다.
- YouTube HTTP 429를 받으면 남은 목록을 계속 요청하지 않고 중단합니다. 수동 재시도는 가능하지만 제한 해제 시각을 보장하지 않습니다.
- 랜덤 채널의 전체보기는 100개 단위 페이지와 이름 검색을 제공합니다. CSV를 구독목록 기준으로 삼고 저장된 JSON에서 같은 채널 ID의 사진을 보충하며, 전체보기 때문에 YouTube 채널을 추가 조회하지 않습니다.

- 1차: 월의 픽, My Recap, Kawaii Voice Playlist, 기타 큐레이션. 방문 시 하루 한 번 자동으로 갱신합니다.
- 2차: 202X.XX 월별·연간 수집, A bundle of songs. 사용자가 2차 동기화를 눌렀을 때만 수집하며 다음 방문 시 자동 재개하지 않습니다.
- 단계별 대기열·실패·완료 시간을 분리하고 최근 12개 로그를 작게 표시합니다. 실패 재시도에는 대기시간이나 횟수 제한이 없으며 동시 중복 실행만 방지합니다.
- 동기화 화면에서 재생목록 DB·JSON·CSV 초기화를 각각 선택할 수 있습니다. 각 원래 탭의 초기화 버튼도 유지합니다.

- 첫 화면은 표지·곡 수·첫 곡만 먼저 읽고, 전체 곡 정보는 검색 탭이나 개별 목록을 열 때 읽습니다.
- 일반 사용자도 고정된 운영자 채널의 동기화를 실행할 수 있습니다. 하루 한 번 갱신하며 여러 방문자의 중복 수집을 서버에서 막습니다. 방문 시 갱신은 화면을 가리지 않고 진행됩니다.
- 곡 수와 첫 곡이 같고 최근 7일 안에 수집한 목록은 건너뜁니다. 완전한 변경 감지는 아니므로 같은 곡 수의 중간 곡 교체도 반영하도록 7일 이후에는 다시 읽습니다.
- 커스텀 표지는 안정적인 내부 이미지 주소로 제공하고, YouTube의 서명 주소가 만료되면 표지 정보를 다시 읽습니다.
- 동기화 탭의 재생목록 DB, 채널 보관실의 JSON, 채널 뽑기의 CSV 초기화는 각각 독립적입니다. 관리자 인증과 확인 문구 입력이 필요하며 월드컵·곡추천 데이터는 유지됩니다.
- 재생목록 DB 초기화 후에는 자동 수집이 잠시 중지됩니다. 일반 사용자가 동기화 버튼을 누르면 다시 수집할 수 있습니다. JSON 초기화는 기본 묶음 자료가 자동으로 재등장하지 않도록 빈 상태를 저장합니다.

현재 구조는 로컬 실행과 공개 사이트 배포를 모두 염두에 둔 형태입니다. 더 오래 운영하려면 다음 기능을 추가하는 편이 좋습니다.

- 예약 수집 작업
- 관리자 키 교체 및 운영 정책 개선
- 영상별 조회수와 발매일 메타데이터
- 깨진 YouTube 영상 관리
- 추천 DB와 태그 기반 조건 필터
- 채널 보관실 JSON 주기 업데이트 도구

2026-09-27 기준으로 공개 사이트와 GitHub 원격 저장소에 최신 변경 사항을 반영했습니다.
