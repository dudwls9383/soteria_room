# 기존 프로젝트 재사용

현재 저장소는 `dudwls9383/Ideal-Type-World-Cup`의 `11b99eb4521c8b6a524955dbf0cd7109d69cddbd`에서 출발했습니다.

- `components/world-cup.tsx`: 원래 `app/page.tsx`를 옮겼습니다. 대진 진행, 영상 재생, 결과·랭킹·키보드 선택 흐름을 유지하고 재생목록 전달 속성을 추가했습니다.
- `lib/tournament.ts`, `app/api/games/**`, `app/api/ranking/route.ts`: 기존 대진 검증, 무작위 추출, 소유자 검증 및 중복 집계 방지 코드를 재사용합니다.
- `lib/youtube.ts`: 기존 공개 페이지 수집기와 선택적 공식 API 경로를 재사용합니다. 추천 continuation 혼입과 응답의 빈 contents 우선순위 문제를 수정했습니다. 아카이브의 2,048곡 제한을 제거했고 끝까지 수집하지 못하면 기존 내용을 덮어쓰지 않습니다. 월드컵 최대 2,048강은 유지합니다.
- `reference/playlist-searcher`: 원본 검색기 `a4a264fe119fa27249655bb4aa55827d5aa70fce`를 보존합니다.
- `lib/archive.ts`: 원본 Python의 대소문자 무시 부분 일치, 재생목록 소속, 링크 추출 개념을 웹용으로 이식했습니다. Python의 실행 시 자동 설치·전역 메모리 캐시는 직접 실행하지 않습니다. 수집은 이미 있는 월드컵 수집기를 공유하여 중복 구현하지 않습니다.
- `reference/playlist-searcher`의 과거 URL 50개는 채널 전체 자동 발견으로 대체되었습니다. 예전 코드에 없는 새 재생목록도 자동 발견합니다.

원격 GitHub 및 기존 호스팅에는 변경을 업로드하지 않았습니다. 이 작업은 로컬 실행용입니다.
