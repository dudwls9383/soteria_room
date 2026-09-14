# PICKTRACK

유튜브 재생목록으로 음악 이상형 월드컵을 만들고 전체 인기 랭킹을 확인하는 한국어 웹앱입니다.

## 기능

- 공개·일부 공개 유튜브 재생목록 불러오기. 중복 영상과 확인 가능한 삭제·비공개 항목 제외.
- 2강부터 2,048강까지 무작위 대진. 곡 수보다 큰 대진은 선택 불가.
- 데스크톱 두 영상 나란히 비교, 모바일 세로 배치. 한 영상씩 재생, 숫자 1·2 키로 선택.
- 개인 결과, 공동 순위, 선택 기록. 완료된 실제 게임만 전체 인기 랭킹에 반영.
- 서버에 저장된 대진으로 결과 검증. 동일 게임 재전송은 중복 집계하지 않음.
- 전체 랭킹은 우승 횟수 또는 맞대결 승률로 정렬. 영상 ID 단위 집계.
- 별도 저장 없이 동작하는 8곡 체험 모드. 체험 데이터는 전체 랭킹에서 제외.

## 실행

Node.js 22.13 이상과 npm을 사용합니다.

```sh
npm run install:ci
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_shiny_blob.sql
npm run dev
```

마이그레이션은 각 환경에 한 번만 적용합니다. 이후 스키마 변경은 새 마이그레이션으로 추가합니다. Sites 배포는 운영 저장소에 마이그레이션을 적용하며, 로컬 테스트 데이터는 업로드하지 않습니다.

## YouTube 연결

기본 설정에서는 서버가 공개 재생목록 페이지의 메타데이터를 읽습니다. 기존 `playlistVideoRenderer`와 현재 `lockupViewModel`, 이어지는 목록 페이지를 처리합니다. 유튜브 페이지 구조 변경이나 서버 요청 제한으로 불러오기가 실패할 수 있습니다.

공식 API로 전환하려면 YouTube Data API v3가 활성화된 키를 서버 환경변수 `YOUTUBE_API_KEY`에 설정합니다. `.env.example`을 참고하고 실제 키는 소스에 저장하지 않습니다. 키가 있으면 공식 `playlists.list` 및 `playlistItems.list`를 사용합니다. 공식 API 경로는 키가 제공되지 않아 실서버 호출 검증은 하지 않았습니다.

유튜브 로그인 전용 목록, 나중에 볼 동영상, 자동 믹스는 지원하지 않습니다. 재생목록 최대 2,048개의 고유 영상을 가져오며, 대진은 그 목록 안에서 무작위 추출합니다. 일부 영상은 국가·연령·게시자 설정에 따라 외부 재생이 제한될 수 있어 원본 유튜브 링크를 함께 제공합니다. 영상·음원 자체를 다운로드하거나 저장하지 않습니다.

## 저장 및 집계

- Cloudflare D1: 재생목록 캐시(15분), 시작 대진, 완료 결과와 선택 기록.
- 브라우저에는 무작위 익명 식별용 HttpOnly 쿠키를 저장합니다. 개인 결과 화면은 현재 진행 세션에서 표시하며, 전체 집계는 서버에 남습니다.
- 승률은 선택받은 횟수 / 실제 맞대결 횟수입니다. 우승 보너스 승수는 더하지 않습니다.
- 같은 단계에서 탈락한 개인 결과는 3위·5위 등 공동 순위입니다.
- 익명 브라우저당 시간당 30회 게임 시작 제한. 새 브라우저/쿠키로 재참여할 수 있으므로 1인 1표나 부정투표 방지를 보장하는 시스템은 아닙니다.
- 현재 공개 범위는 소유자 전용 테스트입니다. 공개 전에는 조회 한도, 익명 참여 정책, 저장 데이터 관리 범위를 정하는 것이 좋습니다.

## 확인

```sh
node --experimental-strip-types --test tests/tournament.test.ts
node tests/integration.mjs
npx tsc --noEmit
```

통합 검사는 실행 중인 localhost:5173의 로컬 저장소만 사용하며 2개의 테스트 월드컵 결과를 만듭니다. 실제 공개 재생목록 조회, 대진 검증, 브라우저 소유권, 다중 이용자 합산, 중복 전송을 검증합니다.

참고: [YouTube 재생목록 API](https://developers.google.com/youtube/v3/docs/playlistItems/list), [동영상 임베드](https://developers.google.com/youtube/player_parameters).
