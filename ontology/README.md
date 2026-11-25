# 온톨로지 문서

WIZCOVERY의 상품, 선수, 마킹지, 등번호, 매장 구역, 서비스, 디자인, 큐레이션 태그, 사이즈별 SKU를 하나의 관계 그래프로 다룹니다. 조건 검색(`smart.js`)과 매장 지도(`store-map.js`)가 이 그래프를 쓰고, 같은 그래프를 JSON-LD 문서로 내보내고 검증할 수 있습니다.

가격, 재고, 마킹지 조합은 시연값입니다. 선수 명단만 공개 자료(published_roster_snapshot)를 따르며, 근거는 개체마다 `evidence` 값으로 남깁니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `schema.jsonld` | 어휘 문서. 접두사, 클래스 10개, 객체 속성 10개, 데이터 속성 15개, SHACL 형태 9개 |
| `graph.jsonld` | 현재 그래프의 JSON-LD 문서. `node tools/export-jsonld.cjs`로 다시 만듭니다 |
| `../ontology.js` | 그래프 생성, `toJsonLd()`, `validateOntology()`. 브라우저에서 바로 실행되므로 어휘 사본을 내장합니다 |
| `../tools/sync-ontology-schema.cjs` | `schema.jsonld`를 `ontology.js`의 `SCHEMA:START`와 `SCHEMA:END` 사이에 다시 씁니다 |
| `../tools/export-jsonld.cjs` | `graph.jsonld`를 다시 씁니다. 검증 요약도 함께 출력합니다 |

접두사는 `schema: https://schema.org/`, `rdfs:`, `owl:`, `xsd:`, `sh:`, `wiz: https://yeninni.github.io/wizcovery/ontology/wiz/`입니다. 그래프의 개체 IRIs는 내부 ID를 그대로 이어 붙입니다. 예를 들어 `product:4`는 `https://yeninni.github.io/wizcovery/ontology/wiz/product/4`이고, `WizKnowledge.fromIri()`로 되돌릴 수 있습니다.

## 클래스

| 클래스 | 상위 클래스 | 설명 |
| --- | --- | --- |
| `wiz:Product` | `schema:Product` | 매장에서 파는 단위 상품 |
| `wiz:MarkingKit` | `wiz:Product` | 공통 유니폼에 얹는 선수별 마킹지. 완성품 마킹키트 상품은 `wiz:Product`로 표현합니다 |
| `wiz:Player` | `schema:Person` | 공개 명단의 KT 위즈 선수 |
| `wiz:JerseyNumber` | `schema:QuantitativeValue` | 등번호 값 개체. 값은 `wiz:numberValue` |
| `wiz:SKU` | `schema:IndividualProduct` | 상품의 사이즈별 재고 단위 |
| `wiz:Zone` | `schema:Place` | 매장 구역 |
| `wiz:Service` | `schema:Service` | 마킹 작업 공간, 픽업 같은 매장 서비스 |
| `wiz:Design` | `schema:CreativeWork` | 홈, 어웨이, 선데이 같은 유니폼 디자인 |
| `wiz:CurationTag` | `schema:DefinedTerm` | 상황별 추천 묶음 태그. 세트 상품이 아닙니다 |
| `wiz:OntologyGraph` | `schema:Dataset` | `toJsonLd()`가 내보내는 문서 자체 |

`wiz:MarkingKit`이 `wiz:Product`의 하위 클래스이므로 `forPlayer`, `locatedIn`의 상품 도메인이 마킹지에도 그대로 적용됩니다. 상품용 형태(이름, 가격, 보관 여부)도 마킹지에 함께 적용됩니다.

## 객체 속성

| 속성 | 도메인 | 레인지 | 설명 |
| --- | --- | --- | --- |
| `wiz:forPlayer` | `wiz:Product` | `wiz:Player` | 상품과 마킹지의 대상 선수 |
| `wiz:compatibleWith` | `wiz:Product` | `wiz:MarkingKit` | 상품과 함께 쓰는 마킹지 |
| `wiz:locatedIn` | `wiz:Product` | `wiz:Zone` | 진열 위치 |
| `wiz:appliedAt` | `wiz:MarkingKit` | `wiz:Service` | 마킹 작업 장소 |
| `wiz:hasDesign` | `wiz:Product` | `wiz:Design` | 유니폼 디자인 |
| `wiz:taggedAs` | `wiz:Product` | `wiz:CurationTag` | 큐레이션 태그 |
| `wiz:supports` | `wiz:Product` | `wiz:Service` | 함께 이용하는 매장 서비스 |
| `wiz:hasVariant` | `wiz:Product` | `wiz:SKU` | 사이즈별 SKU |
| `wiz:hasNumber` | `wiz:Player` | `wiz:JerseyNumber` | 선수 등번호 |
| `wiz:vocabulary` | `wiz:OntologyGraph` | `owl:Ontology` | 그래프가 따르는 어휘 |

## 리포트

`WizKnowledge.validateOntology()`는 다음 구조를 돌려줍니다.

```json
{
  "conforms": true,
  "summary": { "violations": 0, "warnings": 27, "info": 0 },
  "counts": { "nodes": 459, "edges": 933, "classes": {}, "relations": {}, "shapes": 9 },
  "results": [
    { "code": "KIT_WITHOUT_NUMBER", "severity": "warning", "shape": "wiz:shape/MarkingKitShape", "focusNode": "kit:kt-6f5bfb59ba76-home", "path": "wiz:number", "count": 0, "message": "..." }
  ],
  "violations": [],
  "warnings": []
}
```

`conforms`는 위반이 하나도 없을 때만 참입니다. 경고는 통과를 막지 않습니다. 결과는 심각도 순으로 정렬되고, 각 결과에는 기계가 읽을 `code`와 사람이 읽을 `message`가 함께 있습니다.

## 검증 규칙

SHACL 형태는 `schema.jsonld`에 있고, 검증기는 그 선언을 읽어 그대로 적용합니다. 대상 클래스는 하위 클래스까지 포함합니다.

| 코드 | 대상 | 검사 | 심각도 |
| --- | --- | --- | --- |
| `PRODUCT_NAME_REQUIRED` | `wiz:Product` | `schema:name` 한 개 | 위반 |
| `PRODUCT_PRICE_INVALID` | `wiz:Product` | `wiz:price` 정수 한 개, 0 이상 | 위반 |
| `PRODUCT_ARCHIVED_INVALID` | `wiz:Product` | `wiz:archived` 참·거짓, 최대 한 개 | 위반 |
| `KIT_PLAYER_REQUIRED` | `wiz:MarkingKit` | `wiz:forPlayer` 한 개, `wiz:Player` | 위반 |
| `KIT_ZONE_REQUIRED` | `wiz:MarkingKit` | `wiz:locatedIn` 한 개, `wiz:Zone` | 위반 |
| `KIT_SERVICE_REQUIRED` | `wiz:MarkingKit` | `wiz:appliedAt` 한 개, `wiz:Service` | 위반 |
| `KIT_STOCK_INVALID` | `wiz:MarkingKit` | `wiz:stock` 정수, 0 이상 | 위반 |
| `KIT_WITHOUT_NUMBER` | `wiz:MarkingKit` | `wiz:number` 한 개 | 경고 |
| `PLAYER_NAME_REQUIRED` | `wiz:Player` | `schema:name` 한 개 | 위반 |
| `PLAYER_POSITION_REQUIRED` | `wiz:Player` | `wiz:position` 한 개 | 위반 |
| `NUMBER_VALUE_INVALID` | `wiz:JerseyNumber` | `wiz:numberValue` 정수 한 개, 0 이상 | 위반 |
| `SKU_NAME_REQUIRED` | `wiz:SKU` | `schema:name` 한 개 | 위반 |
| `SKU_STOCK_INVALID` | `wiz:SKU` | `wiz:stock` 정수, 0 이상 | 위반 |
| `TAG_NAME_REQUIRED` | `wiz:CurationTag` | `schema:name` 한 개 | 위반 |
| `TAG_DESCRIPTION_REQUIRED` | `wiz:CurationTag` | `schema:description` 한 개 | 위반 |
| `ZONE_NAME_REQUIRED` | `wiz:Zone` | `schema:name` 한 개 | 위반 |
| `SERVICE_NAME_REQUIRED` | `wiz:Service` | `schema:name` 한 개 | 위반 |
| `DESIGN_NAME_REQUIRED` | `wiz:Design` | `schema:name` 한 개 | 위반 |

형태로 적기 어려운 모순은 코드 규칙으로 검사합니다.

| 코드 | 검사 | 심각도 |
| --- | --- | --- |
| `DUPLICATE_NODE` | 같은 개체 ID가 두 번 나옴 | 위반 |
| `UNDECLARED_CLASS` | 어휘에 없는 클래스를 가진 개체 | 위반 |
| `UNKNOWN_RELATION` | 어휘에 없는 관계 이름 | 위반 |
| `DUPLICATE_EDGE` | 출발, 관계, 대상이 같은 문장이 두 번 나옴 | 경고 |
| `BROKEN_REFERENCE` | 출발이나 대상 개체가 그래프에 없음 | 위반 |
| `DOMAIN_VIOLATION` | 관계의 출발 개체가 선언된 도메인이 아님 | 위반 |
| `RANGE_VIOLATION` | 관계의 대상이 선언된 레인지가 아님. 예: `compatibleWith`의 대상이 `wiz:MarkingKit`이 아닌 경우 | 위반 |
| `ARCHIVED_PLAYER_LINK` | 보관 처리한 상품이 선수와 직접 이어지거나, 현역 선수의 마킹지와 호환 관계로 이어짐 | 위반 |
| `KIT_NUMBER_MISMATCH` | 마킹지에 적힌 등번호와 선수 등번호가 다름 | 위반 |
| `ORPHAN_SKU` | 어느 상품에도 연결되지 않은 SKU | 경고 |
| `UNRESOLVED_PLAYER_NAME` | 상품의 선수 이름이 공개 명단에 없어 관계를 만들지 못함 | 경고 |

현재 그래프의 경고 27건은 공개 명단에 등번호가 없는 군보류 선수 13명의 홈, 어웨이 마킹지 26건과, 명단에 없는 선수 이름(강백호)을 참조하는 보관 상품 1건입니다.

## 고칠 때

```bash
node tools/sync-ontology-schema.cjs   # schema.jsonld를 ontology.js에 반영
node tools/export-jsonld.cjs          # graph.jsonld를 다시 만들고 검증 요약 출력
node --test tests/ontology.test.cjs   # 어휘 사본, 직렬화, 검증 규칙 확인
```

`ontology.js`의 어휘 사본과 `schema.jsonld`가 다르거나 `graph.jsonld`가 현재 그래프와 다르면 단위 테스트가 실패하며, 다시 만들 명령을 함께 알려줍니다.
