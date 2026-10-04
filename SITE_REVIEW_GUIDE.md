# SOTERIA ROOM — 외부 LLM 검토용 설명

기준일: 2026-10-04. 현재 구현을 설명하며 실시간 DB 덤프는 아닙니다.

- [사이트](https://soteria-room.workspace-304435.chatgpt.site) · [저장소](https://github.com/dudwls9383/soteria_room)
- [이 설명 raw](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/SITE_REVIEW_GUIDE.md)
- [README raw](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/README.md)
- [디자인 LLM 상세 인수인계 raw](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/DESIGN_LLM_HANDOFF.md)

## 사이트를 못 읽을 때

첫 HTML에는 로딩 문구·빈 통계가 있을 수 있습니다. 브라우저가 JavaScript로 API를 읽어 채웁니다. 크롤러의 빈 결과나 도구 환경의 DNS 오류만으로 사이트 장애를 단정하지 마세요. 문서로 기능을 파악하고 실제 시각 평가는 스크린샷이나 JavaScript 실행 브라우저로 하세요.

## 목적과 메뉴

운영자의 공개 YouTube 재생목록·구독 채널·태그를 음악 탐색 공간으로 연결합니다. 음악은 YouTube 임베드이며 음원 파일을 자체 공급하지 않습니다. 한국어·영어·일본어 UI를 제공하고 곡명·채널명은 원문을 유지합니다. Google Translate로 이동하지 않습니다.

| 그룹 | 화면 |
| --- | --- |
| 핵심 | 재생목록 픽, 월별 큐레이션, 디깅, 마이 리캡, 카와보 시리즈 |
| 도구 | 재생목록 검색기, 재생목록 링크 추출기, 음악 월드컵 |
| 탐색 | 채널 탐색(하꼬 추천 / 채널 보관실), 곡추천 병 |
| 연결 | 블로그 포스트, 소무니아 갤러리, 카와이 보이스 갤러리 |
| 관리 | 가져오기 · 동기화 |

ASMR은 채널 태그입니다. 하꼬 추천과 보관실은 채널 탐색의 가로 하위 탭입니다.

## 구현된 경험

- 목록의 정렬·필터·곡 목록·작은 재생·임시 듣기 목록 담기.
- 기간별 디깅 Pick은 월의 픽만 사용하며, 이번 달 → 분기 → 그해 → 숨은 곡 → 오래전 순입니다. 중복 채널 추천 패널은 제거하고 채널 탐색·보관실에 ‘월의 픽 한정’ 필터를 통합했습니다. 생성형 AI가 아닙니다.
- 오래된 음악은 과거 연도의 같은 달을 다시 만나는 ‘몇 년 전 이맘때’입니다. 월 자료이므로 정확한 날짜의 추억이라고 주장하지 않습니다.
- 도구 메뉴의 월드컵 아래 썸네일 추출기가 있습니다. 영상 URL로 5가지 크기를 확인·저장하고 실제 이미지 크기와 없는 해상도를 구분합니다.
- 연도·분기 선택줄은 분기 위. 연도는 분기와 그해 목록, 분기는 분기 목록만 바꿉니다. 시기는 수집 기준입니다.
- 숨은 곡은 확인된 조회수·길이·영상 업로드 연도로 12곡씩 탐색합니다. 조회수는 큰 숫자 순, ‘2025년까지’는 2025년 포함 이전 영상입니다. 조건 안의 랜덤곡 보기와 페이지가 있고 가로 슬라이더는 없습니다.
- 랜덤 뽑기는 별도 버튼 기능이며 전체·월별 수집 범위도 선택합니다. 자동 재생·자동 담기는 하지 않습니다.
- 랜덤 채널은 결과 아래 전체 구독 목록을 항상 펼칩니다. 하꼬 추천은 구독자 구간·태그·이름·랜덤/전체·60개 페이지·미리듣기를 제공합니다.
- CSV는 구독 기준 목록, JSON은 태그·사진 보완 자료입니다. 서로 대체되는 파일이 아닙니다. 미확인 구독자 수는 0명이 아닙니다.
- 공통 플레이어는 기본·전체·미니, 목록 접기·순서 이동·삭제·셔플·연속 재생. 미니는 네이티브 PiP가 아닙니다. 탭 이동에도 유지하고 ×는 재생·목록을 닫습니다.
- 월드컵은 곡 비교·우승곡·랭킹을 저장합니다. 탭 진입만으로 공통 재생을 끊지 않습니다.
- 곡추천 병은 익명 작성·재생·담기·복사·원문 이동. 최신 40개, 방문자 기준 시간당 8개. 관리자만 확인 후 추천을 영구 삭제합니다.

## 연출과 권한

밝은 Liquid Glass, 자동·사계절 테마, 짧은 입장 모션, 썸네일 기반 앰비언트 강도 조절이 있습니다. 실시간 영상 색 분석이 아니며 데이터 절약을 보장하지 않습니다. 영상 가리는 음악 카드 모드는 제거했습니다. 추천 병에는 작은 유리병·파도 SVG가 있고 모션 줄이기를 따릅니다. 공통 알림은 5초 후 닫힙니다.

전체 1차·2차 동기화, 실패 재시도·중단, 직접 저장·삭제, JSON/CSV 교체·초기화, 구독자/조회수 갱신, 추천 삭제는 서버에서도 관리자 인증을 검사합니다. 1차는 관리자가 잠금을 연 채 접속하면 24시간 기준으로 확인하고 2차는 수동입니다. 무인 예약 작업은 없습니다.

기존 최신 픽·선택 목록 단일 갱신은 공개이며 1분 제한과 목록별 12개 로그가 있습니다. 새 픽은 관리자 1차 동기화로 발견해야 대상이 바뀝니다. 단일 갱신은 새 목록 발견이 아닙니다. 서버 대기열·소유권 잠금·변경 없는 목록 건너뛰기·429 중단을 사용합니다. 초기화는 DB·JSON·CSV별 독립입니다.

## 검토 기준

권한, 일회성 방문자 링크, 월의 픽/대용량 수집 분리, 공통 재생, 미확인 수치, 세 언어·모바일을 유지하세요. 배찌체, 재생목록 즐겨찾기, 거대한 체험 홍보 패널은 사용자가 제외했습니다. AI 추천·자체 음악 서버·회원 커뮤니티가 이미 있다고 설명하지 마세요.

최신 픽 단일 발견, 필터 기억·초기화, 모바일 탐색·재생·담기 동선은 개선 후보이며 모두 구현 완료한 기능은 아닙니다.

## 먼저 읽을 소스

- [메인](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/app/page.tsx)
- [공통 플레이어](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/components/room-experience.tsx)
- [주요 CSS](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/app/room.css) · [추가 CSS](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/app/experience.css)
- [Pick](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/components/pick-discovery.tsx) · [숨은 곡](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/components/hidden-pick.tsx)
- [채널 탐색](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/components/channel-hub.tsx)
- [추천 병](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/components/song-bottle-lite.tsx) · [추천 API](https://raw.githubusercontent.com/dudwls9383/soteria_room/main/app/api/recommendations/route.ts)

기능은 소스로, 시각 품질은 실제 화면으로 확인하며 구현·제안·외부 제한을 구분하세요.

숨은 곡 Pick의 ‘월의 픽 한정’은 기본 선택입니다. 해제하면 저장된 전체 곡으로 확장하고, 나머지 기간별 Pick의 월의 픽 전용 범위는 유지합니다. 채널 탐색의 같은 필터는 하위 탭에 공통 적용됩니다.
