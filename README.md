# WIZCOVERY

GitHub Pages에서 바로 실행하는 굿즈 탐색·매장 지도·위즈픽업·스마트 탐색 프로토타입입니다.

- 사이트: https://yeninni.github.io/wizcovery/
- 시간·데이터 실험실: https://yeninni.github.io/wizcovery/simulator.html

## 서버 없이 돌아가는 합성 데이터

Python·Node·외부 호스팅 없이, `browser-simulator.js`가 한국 시간과 요일에 따라 값을 계산합니다. 정적 파일을 게시하면 됩니다. 실제 매장·재고·경기 일정·주문과 연결하지 않습니다.

- 월요일 가상 비경기일, 화~금 18:30·토~일 14:00 가상 경기
- 경기 전/후 수요, 주말 가중치로 재고·인원·대기시간 계산
- 5초마다 재계산하며 조회 횟수 때문에 재고가 추가로 줄어들지 않음
- 인기 95 품절, 혼잡, 16시 재입고 시나리오
- 경기 1시간 전 외부 마킹 접수 마감, 대기+작업시간 표시
- 가상 시각에 맞춰 픽업 슬롯과 30분 준비시간 적용
- 영업 종료에는 상품을 판매 불가로 표시하고 보유 재고는 별도 유지
- 굿즈 탐색·지도·스마트 탐색·픽업이 같은 브라우저의 설정과 생성값 사용

개발용 `simulator.html`에서는 임의 시각·시드와 시간 재생을 사용할 수 있습니다. 설정 화면과 모니터 링크는 고객용 페이지에 노출하지 않습니다. 설정은 가능하면 localStorage에 저장하고, 저장이 차단되면 해당 페이지 메모리에만 유지합니다. 새 시드·날짜·시나리오는 새 가정으로 전체 상태를 재계산합니다.

**다른 사용자 간 주문/재고 공유, 실제 결제·예약·알림 전송은 없습니다.** 동일한 시각·시드·시나리오에는 같은 결과가 나오지만 각 브라우저의 선택은 독립적입니다. 가상 주문은 새로고침하면 사라집니다.

## 개발

저장소 루트에서 일반 정적 파일 서버로 열 수 있습니다. 서버 프로그램은 개발 편의용이며 배포 환경에는 필요하지 않습니다.

```bash
python3 -m http.server 8000
```

`index.html`, `store-map.html`, `pickup.html`, `smart.html`, `simulator.html`을 확인합니다. 기존 체크아웃에서 작업하면 되며 별도 Git worktree는 필요하지 않습니다.

- `catalog.js`: 상품·선수·태그 예시
- `browser-simulator.js`: 브라우저 내 합성 데이터 엔진과 설정
- `live-demo.js`: 공통 시각/상황 컨트롤, 5초 갱신
- `simulator-dashboard.js`: 서버 없는 데이터 실험실
- `ontology.js`: 관계 기반 상품 검색
- `experience.js`: 사이즈 가이드·가상 알림·마킹 안내

## 검증

```bash
node --test tests/*.test.cjs
```

별도 Python API를 사용하고 싶다면 [백엔드 문서](backend/README.md)를 참고하세요. 현재 사이트는 이 API를 호출하지 않습니다.

## 화면 구성과 길 안내

화면 구조는 HTML, 공통 스타일은 `ui.css`, 각 화면의 동작은 `goods.js` / `store-map.js` / `pickup.js` / `smart.js`로 분리되어 있습니다. `product-art.js`는 상품 사진과 표시용 상품명을 공유합니다. 홈페이지에는 `assets/products/`의 업로드 사진 18종을 표시하며, 원본 연결 정보는 해당 폴더의 README에 정리했습니다. UI 폰트는 `assets/fonts/Pretendard-Black.otf`이며 `typography.css`에서 버튼·입력·SVG 텍스트까지 적용합니다.

캐릭터의 ‘왕복 1회’ 안내는 목적지에서 입구로 복귀한 뒤 종료합니다. 다시 걷는 동작은 ‘다시 안내’ 또는 재시작 버튼을 눌러야 시작됩니다. Playwright와 Chromium이 있는 개발 환경에서는 다음 회귀 검증을 실행할 수 있습니다.

```bash
node --test tests/store-guide.browser.cjs
```
