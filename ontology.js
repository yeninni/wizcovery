/* 관계 데이터와 추론 규칙. 재고는 catalog.js의 동일 SKU 데이터를 참조한다.
   같은 그래프를 ontology/schema.jsonld 어휘로 JSON-LD 문서로 직렬화하고(toJsonLd),
   그 어휘의 도메인·레인지와 SHACL 형태로 스스로를 검증한다(validateOntology).
   기존 공개 API(nodes, edges, get, related, markingKit, parse, search, alternatives,
   hasPlayerProducts)의 동작과 개체 ID는 그대로 유지한다. */
const WizKnowledge = (() => {
  const IRI='https://yeninni.github.io/wizcovery/ontology/wiz/';
  const SITE='https://yeninni.github.io/wizcovery/';
  const GRAPH_IRI=IRI+'graph';
  // SCHEMA:START
  const SCHEMA={
    "@context": {
      "@version": 1.1,
      "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
      "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
      "owl": "http://www.w3.org/2002/07/owl#",
      "xsd": "http://www.w3.org/2001/XMLSchema#",
      "schema": "https://schema.org/",
      "sh": "http://www.w3.org/ns/shacl#",
      "wiz": "https://yeninni.github.io/wizcovery/ontology/wiz/"
    },
    "@graph": [
      {
        "@id": "wiz:",
        "@type": "owl:Ontology",
        "owl:versionInfo": "1.0.0",
        "rdfs:label": {
          "@value": "WIZCOVERY 상품·매장 온톨로지",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "수원KT위즈파크 팀스토어 시연 데이터의 상품, 선수, 마킹지, 등번호, 위치, 서비스, 디자인, 큐레이션 태그, SKU 관계를 JSON-LD로 표현하기 위한 어휘입니다. 가격과 재고는 시연값이며 실제 판매 정보가 아닙니다. 클래스는 schema.org 클래스를 상위 클래스로 두고, ontology.js가 이 문서의 사본을 내장해 그래프를 직렬화하고 무결성을 검증합니다. 사본은 tools/sync-ontology-schema.cjs로 이 파일과 동기화합니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:OntologyGraph",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:Dataset"
        },
        "rdfs:label": {
          "@value": "온톨로지 그래프",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "toJsonLd()가 내보내는 @graph 문서 자체를 가리키는 클래스입니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:Product",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:Product"
        },
        "rdfs:label": {
          "@value": "상품",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "매장에서 파는 단위 상품입니다. 사이즈별 재고는 wiz:SKU로 나누어 표현합니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:MarkingKit",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "wiz:Product"
        },
        "rdfs:label": {
          "@value": "마킹지",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "공통 유니폼에 얹는 선수별 마킹지 단위입니다. 완성품으로 파는 마킹키트 상품은 wiz:Product로 표현하고, 이 클래스는 유니폼과 조합하는 시연용 마킹지를 가리킵니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:Player",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:Person"
        },
        "rdfs:label": {
          "@value": "선수",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "공개 명단(player-roster.js)에 있는 KT 위즈 선수입니다. 상품 판매 여부와는 별개입니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:JerseyNumber",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:QuantitativeValue"
        },
        "rdfs:label": {
          "@value": "등번호",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "선수의 등번호 값 개체입니다. 값은 wiz:numberValue로 표기하며, 명단에 등번호가 없는 선수는 이 개체가 없습니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:SKU",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:IndividualProduct"
        },
        "rdfs:label": {
          "@value": "사이즈별 SKU",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품 하나의 사이즈별 재고 단위입니다. 상품과 wiz:hasVariant로 연결합니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:Zone",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:Place"
        },
        "rdfs:label": {
          "@value": "매장 구역",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:Service",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:Service"
        },
        "rdfs:label": {
          "@value": "매장 서비스",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "마킹 작업 공간과 픽업처럼 상품과 함께 이용하는 매장 서비스입니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:Design",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:CreativeWork"
        },
        "rdfs:label": {
          "@value": "유니폼 디자인",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "홈, 어웨이, 선데이처럼 상품과 마킹지를 묶는 디자인 값입니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:CurationTag",
        "@type": [
          "owl:Class",
          "rdfs:Class"
        ],
        "rdfs:subClassOf": {
          "@id": "schema:DefinedTerm"
        },
        "rdfs:label": {
          "@value": "큐레이션 태그",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상황별 추천 묶음을 나타내는 태그입니다. 묶음 판매나 세트 상품이 아니라 개별 상품의 후보를 모은 것입니다.",
          "@language": "ko"
        }
      },
      {
        "@id": "wiz:forPlayer",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "선수",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품이나 마킹지가 어느 선수를 위한 것인지 연결합니다. 아카이브된 상품은 현역 선수와 연결하지 않습니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:Player"
        }
      },
      {
        "@id": "wiz:compatibleWith",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "호환 마킹지",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품과 함께 쓸 수 있는 마킹지입니다. 대상은 반드시 wiz:MarkingKit이어야 합니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:MarkingKit"
        }
      },
      {
        "@id": "wiz:locatedIn",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "진열 위치",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품이나 마킹지가 매장 어느 구역에 있는지 연결합니다. 위치를 확인하지 못한 상품에는 이 관계가 없습니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:Zone"
        }
      },
      {
        "@id": "wiz:appliedAt",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "작업 장소",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "마킹 작업이 이루어지는 매장 서비스 공간입니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:MarkingKit"
        },
        "rdfs:range": {
          "@id": "wiz:Service"
        }
      },
      {
        "@id": "wiz:hasDesign",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "디자인",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:Design"
        }
      },
      {
        "@id": "wiz:taggedAs",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "큐레이션 태그",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:CurationTag"
        }
      },
      {
        "@id": "wiz:supports",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "이용 서비스",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품이 이용할 수 있는 매장 서비스입니다. 예를 들어 마킹 작업이 필요 없는 상품만 위즈픽업 대상이 됩니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:Service"
        }
      },
      {
        "@id": "wiz:hasVariant",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "사이즈 SKU",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Product"
        },
        "rdfs:range": {
          "@id": "wiz:SKU"
        }
      },
      {
        "@id": "wiz:hasNumber",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "등번호",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "선수와 등번호 값 개체를 연결합니다. 등번호가 공개되지 않은 선수에게는 이 관계가 없습니다.",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:Player"
        },
        "rdfs:range": {
          "@id": "wiz:JerseyNumber"
        }
      },
      {
        "@id": "wiz:vocabulary",
        "@type": "owl:ObjectProperty",
        "rdfs:label": {
          "@value": "따르는 어휘",
          "@language": "ko"
        },
        "rdfs:domain": {
          "@id": "wiz:OntologyGraph"
        },
        "rdfs:range": {
          "@id": "owl:Ontology"
        }
      },
      {
        "@id": "wiz:price",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "금액(원)",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "상품과 마킹지의 시연 가격입니다. 실제 판매 가격이 아닙니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:integer"
        }
      },
      {
        "@id": "wiz:stock",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "재고",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "마킹지와 SKU의 시연 재고입니다. 판매 중 재고는 시뮬레이션이 따로 계산합니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:integer"
        }
      },
      {
        "@id": "wiz:archived",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "보관 여부",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "이전 시연용으로 보관 처리해 판매와 검색에서 제외한 상품입니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:boolean"
        }
      },
      {
        "@id": "wiz:storefront",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "사진 상품 여부",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:boolean"
        }
      },
      {
        "@id": "wiz:productId",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "상품 번호",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "catalog.js의 상품 번호입니다. 기존 링크와 데이터셋에서 쓰는 값입니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:integer"
        }
      },
      {
        "@id": "wiz:position",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "포지션",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:rosterStatus",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "명단 상태",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "active, development, military 중 하나입니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:kboId",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "KBO 등록 번호",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:sourceUrl",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "출처 URL",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:alias",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "별칭",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "문장 검색에서 함께 찾는 선수 이름입니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:number",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "표기 등번호",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "마킹지에 표기하는 등번호의 사본입니다. 선수 개체의 등번호와 어긋나면 검증에서 위반으로 보고합니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:integer"
        }
      },
      {
        "@id": "wiz:numberValue",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "등번호 값",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:integer"
        }
      },
      {
        "@id": "wiz:design",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "디자인 코드",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:evidence",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "근거",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "개체 값의 근거입니다. published_roster_snapshot은 공개 명단, demo_template과 demo는 시연용 가정입니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:relationEvidence",
        "@type": "owl:DatatypeProperty",
        "rdfs:label": {
          "@value": "관계별 근거",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "관계 이름별 근거를 담은 JSON 리터럴입니다. 관계 자체의 출처를 잃지 않도록 그래프에 함께 남깁니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "rdf:JSON"
        }
      },
      {
        "@id": "wiz:code",
        "@type": "owl:AnnotationProperty",
        "rdfs:label": {
          "@value": "검증 코드",
          "@language": "ko"
        },
        "rdfs:comment": {
          "@value": "SHACL 형태에 붙이는 검증 리포트 코드입니다. validateOntology()가 결과의 code로 사용합니다.",
          "@language": "ko"
        },
        "rdfs:range": {
          "@id": "xsd:string"
        }
      },
      {
        "@id": "wiz:shape/ProductShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "상품 필수 값",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:Product"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "PRODUCT_NAME_REQUIRED",
            "sh:message": "상품에는 이름이 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:price"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:integer"
            },
            "sh:minInclusive": 0,
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "PRODUCT_PRICE_INVALID",
            "sh:message": "상품 가격은 0 이상의 정수여야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:archived"
            },
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:boolean"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "PRODUCT_ARCHIVED_INVALID",
            "sh:message": "보관 여부는 참이나 거짓 값이어야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/MarkingKitShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "마킹지 필수 관계",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:MarkingKit"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:forPlayer"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:class": {
              "@id": "wiz:Player"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "KIT_PLAYER_REQUIRED",
            "sh:message": "마킹지는 선수 한 명과 연결되어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:locatedIn"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:class": {
              "@id": "wiz:Zone"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "KIT_ZONE_REQUIRED",
            "sh:message": "마킹지에는 진열 위치가 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:appliedAt"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:class": {
              "@id": "wiz:Service"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "KIT_SERVICE_REQUIRED",
            "sh:message": "마킹지에는 마킹 작업 장소가 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:stock"
            },
            "sh:minCount": 1,
            "sh:datatype": {
              "@id": "xsd:integer"
            },
            "sh:minInclusive": 0,
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "KIT_STOCK_INVALID",
            "sh:message": "마킹지 재고는 0 이상의 정수여야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:number"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:integer"
            },
            "sh:severity": {
              "@id": "sh:Warning"
            },
            "wiz:code": "KIT_WITHOUT_NUMBER",
            "sh:message": "공개 명단에 등번호가 없어 마킹 전에 등번호 확인이 필요합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/PlayerShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "선수 필수 값",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:Player"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "PLAYER_NAME_REQUIRED",
            "sh:message": "선수에는 이름이 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:position"
            },
            "sh:minCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "PLAYER_POSITION_REQUIRED",
            "sh:message": "선수에는 포지션이 있어야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/JerseyNumberShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "등번호 값",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:JerseyNumber"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:numberValue"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:integer"
            },
            "sh:minInclusive": 0,
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "NUMBER_VALUE_INVALID",
            "sh:message": "등번호 값은 0 이상의 정수 하나여야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/SkuShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "SKU 필수 값",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:SKU"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "SKU_NAME_REQUIRED",
            "sh:message": "SKU에는 사이즈 이름이 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "wiz:stock"
            },
            "sh:minCount": 1,
            "sh:datatype": {
              "@id": "xsd:integer"
            },
            "sh:minInclusive": 0,
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "SKU_STOCK_INVALID",
            "sh:message": "SKU 재고는 0 이상의 정수여야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/CurationTagShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "큐레이션 태그 값",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:CurationTag"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "TAG_NAME_REQUIRED",
            "sh:message": "큐레이션 태그에는 이름이 하나 있어야 합니다."
          },
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:description"
            },
            "sh:minCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "TAG_DESCRIPTION_REQUIRED",
            "sh:message": "큐레이션 태그에는 설명이 있어야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/ZoneShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "구역 이름",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:Zone"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "ZONE_NAME_REQUIRED",
            "sh:message": "매장 구역에는 이름이 하나 있어야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/ServiceShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "서비스 이름",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:Service"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "SERVICE_NAME_REQUIRED",
            "sh:message": "매장 서비스에는 이름이 하나 있어야 합니다."
          }
        ]
      },
      {
        "@id": "wiz:shape/DesignShape",
        "@type": "sh:NodeShape",
        "rdfs:label": {
          "@value": "디자인 이름",
          "@language": "ko"
        },
        "sh:targetClass": {
          "@id": "wiz:Design"
        },
        "sh:property": [
          {
            "@type": "sh:PropertyShape",
            "sh:path": {
              "@id": "schema:name"
            },
            "sh:minCount": 1,
            "sh:maxCount": 1,
            "sh:datatype": {
              "@id": "xsd:string"
            },
            "sh:severity": {
              "@id": "sh:Violation"
            },
            "wiz:code": "DESIGN_NAME_REQUIRED",
            "sh:message": "유니폼 디자인에는 이름이 하나 있어야 합니다."
          }
        ]
      }
    ]
  };
  // SCHEMA:END
  // 어휘 색인. ontology/schema.jsonld의 선언을 그대로 읽어 검증과 직렬화에 쓴다.
  const term=value=>typeof value==='string'?value:value&&value['@id'];
  const terms=value=>[].concat(value??[]).map(term).filter(Boolean);
  const localTerm=id=>String(id).slice(String(id).indexOf(':')+1);
  const classTerms=new Map(),parentsOf=new Map(),objectProperties=new Map(),datatypeRanges=new Map(),shapes=[];
  for(const entry of SCHEMA['@graph']||[]){
    const id=entry['@id'],types=terms(entry['@type']);
    if(types.includes('owl:Class')||types.includes('rdfs:Class')){classTerms.set(id,entry);if(entry['rdfs:subClassOf'])parentsOf.set(id,terms(entry['rdfs:subClassOf']));}
    if(types.includes('owl:ObjectProperty'))objectProperties.set(localTerm(id),{term:id,domain:terms(entry['rdfs:domain']),range:terms(entry['rdfs:range'])});
    if(types.includes('owl:DatatypeProperty')&&entry['rdfs:range'])datatypeRanges.set(localTerm(id),term(entry['rdfs:range']));
    if(types.includes('sh:NodeShape'))shapes.push(entry);
  }
  function classClosure(termId){const closure=new Set(),queue=[termId];while(queue.length){const current=queue.shift();if(!current||closure.has(current))continue;closure.add(current);for(const parent of parentsOf.get(current)||[])queue.push(parent);}return closure;}
  const typeMatches=(type,termId)=>!!type&&classClosure('wiz:'+type).has(termId);
  const nodes = [
    ...WizRoster.players.map(p=>({...p,type:'Player',evidence:'published_roster_snapshot'})),
    ...demoCuration.map(t=>({id:t.id,name:t.name,type:'CurationTag',description:t.description})),
    {id:'zone:uniform',type:'Zone',name:'유니폼 진열대'},
    {id:'zone:collab',type:'Zone',name:'콜라보 제품'},
    {id:'zone:marking-sheet',type:'Zone',name:'마킹지'},
    {id:'zone:checkout',type:'Zone',name:'계산대'},
    {id:'zone:marking-service',type:'Service',name:'매장 밖 마킹 공간'},
    {id:'service:pickup',type:'Service',name:'위즈픽업'}
  ];
  const edges = [];
  // Shared blank-shirt stock, separate named marking kits. These are demo combinations.
  for(const player of WizRoster.players)for(const [design,label,productId] of [['home','홈',4],['away','어웨이',591]]){
    const id=player.id==='player:choi'&&design==='home'?'kit:choi-home':'kit:'+player.id.slice(7)+'-'+design;
    nodes.push({id,type:'MarkingKit',name:player.name+' '+label+' 마킹지',playerId:player.id,number:player.number,design,price:20000,evidence:'demo_template',stock:5});
    edges.push({from:id,rel:'forPlayer',to:player.id},{from:id,rel:'locatedIn',to:'zone:marking-sheet'},{from:id,rel:'appliedAt',to:'zone:marking-service'},{from:'product:'+productId,rel:'compatibleWith',to:id,evidence:'demo_template'});
  }
  products.forEach(p=>{
    const id='product:'+p.id;
    nodes.push({id,type:'Product',name:p.name,source:p,archived:!!p.archived});
    const player=WizRoster.players.find(n=>n.name===p.player);if(player&&!p.archived)edges.push({from:id,rel:'forPlayer',to:player.id});
    const style=p.design||p.kind;if(['home','away','sunday'].includes(style)){if(!nodes.some(n=>n.id==='design:'+style))nodes.push({id:'design:'+style,type:'Design',name:{home:'홈',away:'어웨이',sunday:'선데이'}[style]});edges.push({from:id,rel:'hasDesign',to:'design:'+style});}
    demoCuration.filter(t=>t.products.includes(p.id)).forEach(t=>edges.push({from:id,rel:'taggedAs',to:t.id}));
    if(p.mapZone)edges.push({from:id,rel:'locatedIn',to:'zone:'+p.mapZone});
    if(!p.name.includes('마킹'))edges.push({from:id,rel:'supports',to:'service:pickup',evidence:'demo'});
    for(const [size,stock] of Object.entries(p.sizes)){
      const sku=id+':'+size;nodes.push({id:sku,type:'SKU',name:size,stock});edges.push({from:id,rel:'hasVariant',to:sku});
    }
  });
  WizRoster.players.filter(p=>p.number!==null).forEach(p=>{nodes.push({id:'number:'+p.id,type:'JerseyNumber',name:p.number,evidence:'published_roster_snapshot'});edges.push({from:p.id,rel:'hasNumber',to:'number:'+p.id,evidence:'published_roster_snapshot'});});
  const get=id=>nodes.find(n=>n.id===id);
  const related=(id,rel)=>edges.filter(e=>e.from===id&&e.rel===rel).map(e=>get(e.to));
  const markingKit=(productId,playerId)=>playerId?related('product:'+productId,'compatibleWith').find(kit=>related(kit.id,'forPlayer').some(player=>player.id===playerId))||null:null;
  function parse(raw){
    const q=raw.trim();const size=q.match(/(?:^|\D)(90|95|100|105)(?!\d)/)?.[1]||'';
    const player=WizRoster.findInText(q);
    let remaining=q;if(player)for(const name of [player.name,...player.aliases].sort((a,b)=>b.length-a.length))remaining=remaining.split(name).join('');
    let budget='';const won=q.match(/(\d+(?:\.\d+)?)\s*만\s*원/);const plain=q.match(/(\d[\d,]*)\s*원/);
    if(won)budget=String(Number(won[1])*10000);else if(plain)budget=String(Number(plain[1].replaceAll(',','')));
    const kind=/마킹키트|마킹지/.test(q)?'마킹키트':/타월|타올/.test(q)?'응원용품':/유니폼/.test(q)?'유니폼':/모자|볼캡/.test(q)?'모자':/키링/.test(q)?'액세서리':'';
    const keywords=['수원','콜라보','키링','볼캡'].filter(k=>q.includes(k));
    const tag=/입문자|풀세트/.test(q)?'tag:starter':/원정.*패키지/.test(q)?'tag:away':/여름|쿨링/.test(q)?'tag:summer':'';
    const supported=!q||!!(player||size||budget||kind||keywords.length||/마킹|픽업|홈|어웨이|원정|응원|굿즈|선데이|입문자|풀세트|패키지|여름|쿨링/.test(q));
    const residue=remaining.replace(/입문자용|입문자|풀세트|패키지|원정 응원용|여름 시즌|여름|쿨링|선데이|마킹키트|마킹지|마킹|픽업|유니폼|타월|타올|모자|볼캡|키링|수원|콜라보|어웨이|원정|홈|응원|굿즈|오늘|경기장|구장|사이즈|선수|이하|미만|미리|사고|싶어|싶다|찾아줘|찾고|추천|가능한|가능|하고|할|에서|받을|받고|있는|해줘|주세요|으로|까지|짜리|원|만|\d|[\s,.?!]/g,'').replace(/^[은는이가을를의와과도]+$/,'');
    return {size,budget,kind,player:player?.id||'',tag,marking:kind!=='마킹키트'&&(q.includes('마킹')||!!player&&(!kind||kind==='유니폼')),pickup:q.includes('픽업'),style:tag==='tag:away'?'':q.includes('선데이')?'sunday':/어웨이|원정/.test(q)?'away':q.includes('홈')?'home':'',keywords,exclusive:q.includes('미만'),supported:supported&&!residue,unknown:residue};
  }
  function search(f){
    const results=[];const blocked=[];
    if(f.supported===false)return {results,blocked};
    for(const p of products){
      if(p.archived)continue;
      const id='product:'+p.id,kit=markingKit(p.id,f.player);
      const directPlayer=related(id,'forPlayer').some(n=>n.id===f.player);
      const kitPlayer=kit&&related(kit.id,'forPlayer').some(n=>n.id===f.player);
      if(f.tag&&!related(id,'taggedAs').some(n=>n.id===f.tag))continue;
      if(f.kind&&p.category!==f.kind)continue;
      if(f.style&&(p.design||p.kind)!==f.style)continue;
      if(f.keywords?.some(k=>!p.name.includes(k)))continue;
      if(f.player&&!directPlayer&&!(f.marking&&kitPlayer))continue;
      const premarked=p.category==='유니폼'&&p.name.includes('마킹');
      if(f.marking&&!premarked&&!kit)continue;
      if(f.pickup&&(!related(id,'supports').some(n=>n.id==='service:pickup')||(f.marking&&kit)))continue;
      const extra=f.marking&&!premarked&&kit?kit:null;
      const total=p.price+(extra?.price||0);
      if(f.budget!==''&&f.budget!=null&&(f.exclusive?total>=Number(f.budget):total>Number(f.budget)))continue;
      const sizes=f.size?[f.size]:Object.keys(p.sizes);
      for(const size of sizes){
        if(!Object.hasOwn(p.sizes,size))continue;
        if(p.sizes[size]===0||(extra&&extra.stock===0)){blocked.push({p,size,reason:p.sizes[size]===0?'선택 사이즈 품절':'마킹지 품절'});continue;}
        const relations=[{from:p.name,rel:'사이즈별 재고',to:size+' '+p.sizes[size]+'개'}];
        const reasons=['공통 상품 데이터에서 '+size+' 사이즈 재고 '+p.sizes[size]+'개 확인'];
        if(f.player){relations.push({from:extra?extra.name:p.name,rel:'관련 선수',to:get(f.player).name});reasons.push(extra?get(f.player).name+' 마킹지와 연결 가능한 조합':get(f.player).name+' 선수 상품');}
        if(extra){relations.push({from:p.name,rel:'호환 마킹지',to:extra.name},{from:extra.name,rel:'작업 장소',to:'매장 밖 마킹 공간'});reasons.push('유니폼 + 마킹지 합계 '+total.toLocaleString('ko-KR')+'원 작업비 별도 확인','선수별 마킹지는 시연용으로 구성한 상품입니다.');if(extra.number===null)reasons.push('공개 명단에 등번호가 없어 제작 전 확인이 필요합니다.');else reasons.push(get(extra.playerId).name+' 선수 등번호 '+extra.number+'번');}
        else if(f.marking&&premarked)reasons.push('마킹이 포함된 상품 추가 마킹 작업 불필요');
        if(f.tag){relations.push({from:p.name,rel:'상황별 구성 후보',to:get(f.tag).name});reasons.push(get(f.tag).name+' 태그로 연결된 개별 상품 완성 패키지 아님');}
        if(f.budget)reasons.push('상품 합계가 예산 '+Number(f.budget).toLocaleString('ko-KR')+'원 '+(f.exclusive?'미만':'이하'));
        if(f.pickup){relations.push({from:p.name,rel:'수령 방법',to:'위즈픽업'});reasons.push('추가 마킹 작업이 없는 픽업 대상 시간대 선택 필요');}
        const zone=related(id,'locatedIn')[0];if(zone)relations.push({from:p.name,rel:'위치',to:zone.name});
        results.push({p,size,extra,total,player:f.player?get(f.player):null,reasons,relations,pickup:!premarked&&!extra});
      }
    }
    results.sort((a,b)=>a.total-b.total||a.p.id-b.p.id||Number(a.size)-Number(b.size));return {results,blocked};
  }
  function alternatives(f,blocked){
    if(!blocked.length||!f.size)return [];
    const same=search({...f,size:''}).results.filter(r=>blocked.some(b=>b.p.id===r.p.id)&&r.size!==f.size);
    return same.slice(0,4).map(r=>({...r,difference:f.size+' → '+r.size+' 사이즈 변경. 착용감이 다르므로 사이즈 확인 필요'}));
  }
  function hasPlayerProducts(playerId){return products.some(p=>!p.archived&&(related('product:'+p.id,'forPlayer').some(player=>player.id===playerId)||related('product:'+p.id,'compatibleWith').some(kit=>related(kit.id,'forPlayer').some(player=>player.id===playerId))));}

  // --- JSON-LD 직렬화 -------------------------------------------------------
  // 개체 ID는 'product:4' 같은 내부 ID를 그대로 쓰고, 문서 안에서는 wiz 네임스페이스 IRI로 편다.
  const toIri=id=>IRI+String(id).split(':').join('/');
  const fromIri=iri=>String(iri).startsWith(IRI)?String(iri).slice(IRI.length).split('/').join(':'):null;
  // 개체 종류별 리터럴 값. 관계는 edges에서 읽으므로 여기에 없다.
  const LITERALS={
    Player:node=>({name:node.name,position:node.position,rosterStatus:node.status,kboId:node.kbo_id,sourceUrl:node.source_url,alias:node.aliases,evidence:node.evidence}),
    Product:node=>({name:node.name,category:node.source?.category,image:node.source?.image?SITE+node.source.image:undefined,productId:node.source?.id,storefront:node.source?node.source.storefront!==false:undefined,archived:!!node.archived,price:node.source?node.source.price:node.price,evidence:node.evidence}),
    MarkingKit:node=>({name:node.name,price:node.price,stock:node.stock,number:node.number,design:node.design,evidence:node.evidence}),
    SKU:node=>({name:node.name,stock:node.stock}),
    JerseyNumber:node=>({numberValue:node.name}),
    Zone:node=>({name:node.name}),
    Service:node=>({name:node.name}),
    Design:node=>({name:node.name}),
    CurationTag:node=>({name:node.name,description:node.description})
  };
  // 어휘가 선언한 xsd 형에 맞춰 값을 정리한다. 숫자로 읽을 수 없는 값은 그대로 두고 검증이 잡는다.
  function coerce(range,value){
    if(range==='xsd:integer'){const number=Number(value);return Number.isFinite(number)&&String(number)===String(value).trim()?number:value;}
    return value;
  }
  function attributesOf(node){
    const fields=(LITERALS[node.type]||(()=>({})))(node),out={};
    for(const [key,value] of Object.entries(fields)){
      if(value===undefined||value===null||value==='')continue;
      if(Array.isArray(value)){if(value.length)out[key]=value.map(item=>coerce(datatypeRanges.get(key),item));continue;}
      out[key]=coerce(datatypeRanges.get(key),value);
    }
    return out;
  }
  // 문서의 @context는 어휘에서 만든다. 관계는 IRI 참조(@id), 값은 선언된 형으로 해석된다.
  const graphContext=(()=>{
    const context={'@version':1.1,rdf:'http://www.w3.org/1999/02/22-rdf-syntax-ns#',schema:'https://schema.org/',xsd:'http://www.w3.org/2001/XMLSchema#',wiz:IRI};
    for(const [name,spec] of objectProperties)context[name]={'@id':spec.term,'@type':'@id'};
    for(const [name,range] of datatypeRanges)context[name]={'@id':'wiz:'+name,'@type':range==='rdf:JSON'?'@json':range};
    Object.assign(context,{name:'schema:name',description:'schema:description',category:'schema:category',image:'schema:image'});
    return context;
  })();
  function outgoingIndex(){const index=new Map();for(const edge of edges){const list=index.get(edge.from);if(list)list.push(edge);else index.set(edge.from,[edge]);}return index;}
  function toJsonLd(){
    const outgoing=outgoingIndex();
    const graph=[{'@id':GRAPH_IRI,'@type':'wiz:OntologyGraph','name':'WIZCOVERY 상품·매장 관계 그래프','wiz:vocabulary':{'@id':'wiz:'}}];
    for(const node of nodes){
      const entry={'@id':toIri(node.id),'@type':'wiz:'+node.type,...attributesOf(node)};
      for(const edge of outgoing.get(node.id)||[]){
        const key=objectProperties.has(edge.rel)?edge.rel:'wiz:'+edge.rel;
        const reference={'@id':toIri(edge.to)};
        if(entry[key]===undefined)entry[key]=reference;
        else if(Array.isArray(entry[key]))entry[key].push(reference);
        else entry[key]=[entry[key],reference];
        if(edge.evidence)(entry.relationEvidence||(entry.relationEvidence={}))[edge.rel]=edge.evidence;
      }
      graph.push(entry);
    }
    return {'@context':graphContext,'@graph':graph};
  }

  // --- 무결성 검증 ---------------------------------------------------------
  // 어휘의 도메인·레인지, 참조 무결성, SHACL 형태(minCount, class, datatype, minInclusive)를
  // 한 번에 확인하고, 형태로 표현할 수 없는 교차 개체 모순을 별도 규칙으로 더한다.
  function datatypeMatches(datatype,value){
    if(datatype==='xsd:string')return typeof value==='string';
    if(datatype==='xsd:integer')return typeof value==='number'&&Number.isInteger(value);
    if(datatype==='xsd:boolean')return typeof value==='boolean';
    if(datatype==='rdf:JSON')return !!value&&typeof value==='object';
    return true;
  }
  function valuesOf(node,path,index){
    const name=localTerm(path);
    if(objectProperties.has(name)&&String(path).startsWith('wiz:'))return (edges.filter(edge=>edge.from===node.id&&edge.rel===name)).map(edge=>({kind:'node',id:edge.to,node:index.get(edge.to)}));
    const value=attributesOf(node)[name];
    if(value===undefined)return [];
    return [].concat(value).map(item=>({kind:'literal',value:item}));
  }
  const messageOf=entry=>{const value=entry['sh:message'];return typeof value==='string'?value:value&&value['@value'];};
  function validateOntology(){
    const results=[],index=new Map();
    const push=(result)=>results.push(result);
    const counts={nodes:nodes.length,edges:edges.length,classes:{},relations:{},shapes:shapes.length};
    for(const node of nodes){
      counts.classes[node.type]=(counts.classes[node.type]||0)+1;
      if(index.has(node.id))push({code:'DUPLICATE_NODE',severity:'violation',focusNode:node.id,path:'@id',message:'개체 ID가 중복되었습니다. 같은 ID를 가진 개체는 하나만 남겨야 합니다.'});
      else index.set(node.id,node);
      if(!classTerms.has('wiz:'+node.type))push({code:'UNDECLARED_CLASS',severity:'violation',focusNode:node.id,path:'@type',value:node.type,message:'어휘에 선언되지 않은 클래스입니다: wiz:'+node.type});
    }
    const seenEdges=new Set();
    for(const edge of edges){
      counts.relations[edge.rel]=(counts.relations[edge.rel]||0)+1;
      const spec=objectProperties.get(edge.rel),from=index.get(edge.from),to=index.get(edge.to);
      if(!spec)push({code:'UNKNOWN_RELATION',severity:'violation',focusNode:edge.from,path:edge.rel,value:edge.to,message:'어휘에 선언되지 않은 관계입니다: '+edge.rel});
      const signature=edge.from+'\u0000'+edge.rel+'\u0000'+edge.to;
      if(seenEdges.has(signature))push({code:'DUPLICATE_EDGE',severity:'warning',focusNode:edge.from,path:edge.rel,value:edge.to,message:'같은 관계가 두 번 선언되었습니다: '+edge.from+' → '+edge.to});
      else seenEdges.add(signature);
      if(!from||!to){push({code:'BROKEN_REFERENCE',severity:'violation',focusNode:from?edge.from:edge.to,path:edge.rel,value:from?edge.to:edge.from,message:(from?'연결 개체 ':'출발 개체 ')+(from?edge.to:edge.from)+'가 그래프에 없습니다.'});continue;}
      if(!spec)continue;
      if(spec.domain.length&&!spec.domain.some(allowed=>typeMatches(from.type,allowed)))push({code:'DOMAIN_VIOLATION',severity:'violation',focusNode:edge.from,path:edge.rel,value:edge.to,message:'wiz:'+edge.rel+'의 출발 개체는 '+spec.domain.map(name=>'wiz:'+localTerm(name)).join(' 또는 ')+'여야 하는데 '+from.id+'는 wiz:'+from.type+'입니다.'});
      if(spec.range.length&&!spec.range.some(allowed=>typeMatches(to.type,allowed)))push({code:'RANGE_VIOLATION',severity:'violation',focusNode:edge.from,path:edge.rel,value:edge.to,message:'wiz:'+edge.rel+'의 대상은 '+spec.range.map(name=>'wiz:'+localTerm(name)).join(' 또는 ')+'여야 하는데 '+to.id+'('+to.name+')는 wiz:'+to.type+'입니다.'});
      if(edge.rel==='forPlayer'&&from.type==='Product'&&from.archived)push({code:'ARCHIVED_PLAYER_LINK',severity:'violation',focusNode:edge.from,path:edge.rel,value:edge.to,message:'보관 처리한 상품을 현역 선수 개체에 연결했습니다. 아카이브 상품은 판매와 검색에서 빠져야 합니다: '+from.id+' → '+to.id+' ('+to.name+')'});
    }
    // 아카이브 상품이 현역 선수의 마킹지와 호환 관계로 되살아나는 경우.
    for(const edge of edges){
      if(edge.rel!=='compatibleWith')continue;
      const product=index.get(edge.from),kit=index.get(edge.to);
      if(!product||!kit||!product.archived)continue;
      const players=edges.filter(item=>item.rel==='forPlayer'&&item.from===kit.id).map(item=>index.get(item.to)).filter(player=>player&&player.status==='active');
      for(const player of players)push({code:'ARCHIVED_PLAYER_LINK',severity:'violation',focusNode:product.id,path:'compatibleWith',value:kit.id,message:'보관 처리한 상품이 현역 선수의 마킹지와 호환 관계로 이어져 있습니다: '+product.id+' → '+kit.id+' ('+player.name+' '+kit.name+')'});
    }
    // 마킹지에 적힌 등번호가 선수 등번호와 다른 경우.
    for(const node of nodes){
      if(node.type!=='MarkingKit'||node.number===null||node.number===undefined)continue;
      const player=index.get(node.playerId);
      if(player&&String(node.number)!==String(player.number))push({code:'KIT_NUMBER_MISMATCH',severity:'violation',focusNode:node.id,path:'wiz:number',value:node.number,message:'마킹지에 적힌 등번호와 선수 등번호가 다릅니다: 마킹지 '+node.number+', 선수 '+player.number+' ('+player.name+')'});
    }
    const variantParents=new Set(edges.filter(edge=>edge.rel==='hasVariant').map(edge=>edge.to));
    for(const node of nodes)if(node.type==='SKU'&&!variantParents.has(node.id))push({code:'ORPHAN_SKU',severity:'warning',focusNode:node.id,path:'hasVariant',message:'어느 상품에도 연결되지 않은 SKU입니다: '+node.name});
    // 카탈로그의 선수 이름이 공개 명단에 없어 관계를 만들지 못한 상품.
    for(const node of nodes){
      const name=node.source&&node.source.player;
      if(!name||WizRoster.players.some(player=>player.name===name))continue;
      push({code:'UNRESOLVED_PLAYER_NAME',severity:'warning',focusNode:node.id,path:'wiz:forPlayer',value:name,message:'공개 명단에 없는 선수 이름을 참조합니다: '+name+'. 선수 관계를 만들지 못했습니다.'+(node.archived?' 보관 처리된 상품입니다.':'')});
    }
    for(const shape of shapes){
      const targets=terms(shape['sh:targetClass']),focus=String(shape['@id']).slice(String(shape['@id']).indexOf(':')+1);
      for(const node of nodes){
        if(!targets.some(target=>typeMatches(node.type,target)))continue;
        for(const property of [].concat(shape['sh:property']||[])){
          const path=term(property['sh:path']),values=valuesOf(node,path,index);
          const severity=term(property['sh:severity'])==='sh:Warning'?'warning':term(property['sh:severity'])==='sh:Info'?'info':'violation';
          const code=property['wiz:code']||'SHAPE_VIOLATION';
          const report=(detail)=>push({code,severity,shape:'wiz:'+focus,focusNode:node.id,path,value:detail.value,count:values.length,message:messageOf(property)+detail.suffix});
          const min=property['sh:minCount'],max=property['sh:maxCount'];
          if(min!==undefined&&values.length<Number(min))report({value:values.length,suffix:' ('+path+' '+values.length+'개)'});
          if(max!==undefined&&values.length>Number(max))report({value:values.length,suffix:' ('+path+' '+values.length+'개)'});
          const required=term(property['sh:class']),datatype=term(property['sh:datatype']),minInclusive=property['sh:minInclusive'];
          for(const entry of values){
            if(required&&entry.kind==='node'&&entry.node&&!typeMatches(entry.node.type,required))report({value:entry.id,suffix:' ('+entry.id+'는 wiz:'+entry.node.type+'입니다)'});
            if(datatype&&entry.kind==='literal'&&!datatypeMatches(datatype,entry.value))report({value:entry.value,suffix:' ('+path+' '+entry.value+' 값의 형이 '+datatype+'와 다릅니다)'});
            if(minInclusive!==undefined&&entry.kind==='literal'&&typeof entry.value==='number'&&entry.value<Number(minInclusive))report({value:entry.value,suffix:' ('+path+' '+entry.value+'가 '+minInclusive+'보다 작습니다)'});
          }
        }
      }
    }
    const severityRank={violation:0,warning:1,info:2};
    results.sort((left,right)=>severityRank[left.severity]-severityRank[right.severity]);
    const summary={violations:0,warnings:0,info:0};
    for(const result of results)summary[result.severity==='violation'?'violations':result.severity==='warning'?'warnings':'info']++;
    return {conforms:summary.violations===0,summary,results,violations:results.filter(result=>result.severity==='violation'),warnings:results.filter(result=>result.severity==='warning'),counts};
  }

  return {nodes,edges,get,related,markingKit,parse,search,alternatives,hasPlayerProducts,toJsonLd,validateOntology,vocabulary:SCHEMA,context:graphContext,namespace:IRI,toIri,fromIri};
})();
