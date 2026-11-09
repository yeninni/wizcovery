# WIZCOVERY 합성 데이터 백엔드

요일·한국 시간·가상 경기 일정에 따라 변하는 **합성 데이터** API입니다. 실제 경기 일정, RFID/POS, 결제, 예약과 연결하지 않습니다. 현재 사이트는 `browser-simulator.js`에서 합성 데이터를 직접 생성하므로 Python 서버가 없어도 동작합니다. 이 Python 백엔드는 선택적으로 사용할 수 있는 별도 API 구현입니다. 현재 팬용 화면과 실험실은 Python API를 호출하지 않습니다. 브라우저 모델은 동일한 수요 규칙을 사용하지만 난수 함수가 달라 같은 시드의 수량이 Python 모델과 같지는 않습니다.

## 실행

Python 3.11 이상과 IANA 시간대 정보(Asia/Seoul)가 있는 환경에서 실행합니다. 추가 Python 패키지는 필요 없습니다.

```bash
cd /workspace/wizcovery
python3 backend/server.py --port 8000
```

서버의 `/simulator` 경로가 대시보드입니다. 다른 개발 환경에서도 이 저장소 루트에서 같은 명령으로 실행합니다. 실험실 화면은 브라우저 모델을 사용하고 5초마다 다시 계산합니다. 이 서버에서 제공하는 Python API는 curl 등의 별도 클라이언트로 검증할 수 있습니다. 한국 시간으로 10시 이전 또는 22시 이후에는 영업 종료가 정상입니다.

대시보드에서 할 수 있는 일:
- 한국 날짜·시각을 지정해 과거/미래 시나리오 재현
- 월요일 / 금요일 경기 전 / 토요일 혼잡 / 영업 종료 프리셋
- 1초에 가상 시간 5분씩 재생, 정지 및 현재 시각 복귀
- 기본 / 혼잡 / 인기 95 품절 / 16시 재입고 시나리오
- 재고·혼잡·대기·마킹 접수·픽업 슬롯과 JSON 확인

## 생성 규칙

`settings.json`에서 수정합니다. 모든 경기 시간은 서비스 시연을 위한 가상 일정이며 실제 KBO 일정이 아닙니다.

- 시간대: Asia/Seoul
- 영업: 매일 10:00~22:00
- 월요일: 가상 비경기일
- 화~금: 18:30 가상 경기, 토~일: 14:00 가상 경기
- 경기 약 65분 전 혼잡 증가, 경기 중 감소, 경기 후 재증가
- 토요일·일요일·금요일의 수요 가중치를 평일보다 높게 설정
- 혼잡도 → 매장 인원·구역별 인원·결제 대기·마킹 대기 계산
- 마킹 접수: 경기 60분 전 마감. 비경기일은 영업 종료 60분 전 마감
- 마킹 작업 15~20분 + 합성 대기시간을 총 소요시간으로 표시
- 픽업: 최소 30분 준비, 30분 단위 슬롯. 경기일은 경기 30분 전까지 수령
- 영업 종료 시 판매 가능 수량은 0이며 보유 재고(on_hand)는 유지

매일 개점 재고를 만들고, 해당 시각까지 누적된 수요에서 판매량을 계산합니다. 같은 날짜·시각·seed·scenario는 같은 결과를 반환합니다. API를 많이 호출한다고 판매량이 늘지 않습니다. 날짜가 바뀌면 새 개점 재고가 생성됩니다. 영업 기간의 재고는 기본 시나리오에서 단조 감소하며 재입고 시나리오에서만 추가됩니다.

`busy`, `soldout`, `restock`은 독립된 시나리오입니다. 전환은 이전 시나리오에 이벤트를 누적하는 것이 아니라 같은 날짜를 다른 가정으로 재계산합니다. 실제 센서·트랜잭션과 연결한 상태 저장 서버가 아닙니다.

## API

모든 경로는 읽기 전용 GET입니다. 응답의 `meta.synthetic`는 항상 `true`이며 `source`, `simulation_time`, `timezone`, `seed`, `scenario`를 함께 반환합니다. 지정 시각은 5초 단위로 내립니다. 개별 API는 `{meta, data}`, 전체 스냅샷은 `{meta, schedule, store, inventory, zones, marking, pickup}` 형식입니다.

| 경로 | 내용 |
|---|---|
| `/api/v1/health` | 서버 상태·시나리오 |
| `/api/v1/snapshot` | 한 시각의 전체 데이터 |
| `/api/v1/inventory` | 상품·사이즈별 재고 |
| `/api/v1/store` | 영업·인원·혼잡·결제 대기 |
| `/api/v1/zones` | 구역별 인원·혼잡 |
| `/api/v1/marking` | 매장 외부 마킹 접수·대기·작업시간 |
| `/api/v1/pickup` | 수령 슬롯·잔여 정원 |

공통 쿼리:
- `at`: ISO 8601 시각. 생략하면 현재 시각. 오프셋 없는 시각은 한국 시간으로 해석
- `seed`: 0~2147483647 정수, 기본 42
- `scenario`: `normal`, `busy`, `soldout`, `restock`

```bash
curl --get 'http://127.0.0.1:8000/api/v1/snapshot' \
  --data-urlencode 'at=2026-11-14T12:50:00+09:00' \
  --data-urlencode 'scenario=busy' \
  --data-urlencode 'seed=42'
```

```javascript
// Backend와 같은 origin에 있는 화면에서 사용합니다.
const params = new URLSearchParams({at: '2026-11-14T12:50:00+09:00', scenario: 'busy'});
const response = await fetch(`/api/v1/snapshot?${params}`, {cache: 'no-store'});
if (!response.ok) throw new Error('합성 데이터 조회 실패');
const snapshot = await response.json();
console.log(snapshot.meta.synthetic, snapshot.store, snapshot.inventory);
```

잘못된 시간·시드·시나리오·중복 또는 미지원 쿼리는 400, 없는 API는 404입니다. 캐시는 사용하지 않습니다. 스냅샷 하나로 모든 UI 값을 갱신하면 조회 시각이 어긋나지 않습니다. 현재 실험실은 외부 API 요청 없이 브라우저에서 계산합니다.

## 상품 변경

팬용 화면의 `catalog.js`를 기준으로 백엔드 카탈로그를 내보냅니다.

```bash
node tools/export-catalog.cjs
```

생성된 `backend/catalog.json`을 함께 커밋합니다. 서버가 카탈로그·설정 파일을 시작할 때 읽으므로 변경 후 서버를 재시작합니다. Python 실행 시에는 Node.js가 필요하지 않습니다.

## 테스트

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

한국 시간 변환, 고정 시각 재현, 요일·경기 전 수요, 재고 단조 감소, 영업 종료, 마킹 마감 경계, 픽업 준비시간, 품절·재입고, HTTP 응답, CORS 및 비공개 파일 접근 차단을 검사합니다.

## 외부 배포와 GitHub Pages

GitHub Pages는 정적 파일만 게시하므로 Python API를 실행하지 않습니다. `main` 푸시는 코드 보관과 정적 화면 배포를 의미하며 백엔드 공개 배포 완료를 의미하지 않습니다.

Python 서버를 실행할 별도 호스팅에서 시작 명령은 `python3 backend/server.py --host 0.0.0.0 --port "$PORT"`로 지정할 수 있습니다(PORT는 호스팅 제공 값). 이 서버는 데모/개발용 HTTP 서버이며 실제 주문 서비스용 서버가 아닙니다.

가장 간단한 구성은 이 서버에서 `/simulator`와 API를 같은 origin으로 제공하는 것입니다. 현재 GitHub Pages는 브라우저 내 합성 모델로 동작하므로 외부 API 호스팅이 필요 없습니다. 향후 Python API로 전환하려면 HTTPS API 호스팅, 프런트엔드 API 연결 코드 및 정확한 CORS origin이 추가로 필요합니다. 선택적으로 다음과 같이 해당 origin에만 GET 응답을 허용할 수 있습니다.

```bash
python3 backend/server.py --port 8000 --allow-origin https://yeninni.github.io
```

`--allow-origin`에 저장소 경로(`/wizcovery`)를 붙이지 않습니다. API는 쓰기·예약·결제·개인정보 기능을 제공하지 않으며, 임의 URL을 프록시하지 않습니다.
