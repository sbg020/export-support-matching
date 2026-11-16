/*
 * 공개 API OpenAPI 3.1 문서와 Swagger UI 페이지 (REVISION_05 §9).
 * 원래 계획(drf-spectacular)은 Django 서버를 띄울 때 쓴다. 지금 배포는 Vercel 함수라 같은 내용을 직접 적는다.
 */

const conditionRef = {
  type: 'object',
  properties: {
    cond_id: { type: 'string' },
    kind: { type: ['string', 'null'], enum: ['필수', '제외', null] },
    cond_type: { type: ['string', 'null'], description: '조건 유형 A01–C09' },
    importance: { type: ['string', 'null'], enum: ['주요', '체크리스트', null] },
    evidence: { type: ['string', 'null'], description: '공고 원문 근거 문장' },
    page: { type: ['integer', 'null'], description: '근거 쪽 번호' },
  },
}

const noticeSummary = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'P001' },
    parent_id: { type: ['string', 'null'] },
    title: { type: ['string', 'null'] },
    ministry: { type: ['string', 'null'] },
    agency: { type: ['string', 'null'] },
    reception_status: { type: ['string', 'null'], enum: ['open', 'upcoming', 'closed', null] },
    reception_status_as_of: { type: ['string', 'null'], format: 'date' },
    apply_start: { type: ['string', 'null'] },
    apply_end: { type: ['string', 'null'] },
    apply_period_note: { type: ['string', 'null'] },
    regions: { type: ['array', 'null'], items: { type: 'string' } },
    support_categories: {
      type: 'array',
      items: { type: 'object', properties: { code: { type: 'string' }, name: { type: ['string', 'null'] } } },
    },
    support_types: { type: ['array', 'null'], items: { type: 'string' } },
    max_amount_krw: { type: ['integer', 'null'] },
    amount_note: { type: ['string', 'null'] },
    source: { type: ['string', 'null'], description: 'answer-set · folder · bizinfo · kotra · kita' },
    source_label: { type: ['string', 'null'] },
    source_url: { type: ['string', 'null'], description: '원문 URL (없으면 null)' },
    source_file: { type: ['string', 'null'] },
    source_published_at: { type: ['string', 'null'] },
    auto_extracted: { type: 'boolean' },
  },
}

const profileSchema = {
  type: 'object',
  description: '판정에 쓰는 기업 정보. 없는 값은 null(모름)로 둔다. 사업자등록번호·대표자명·연락처는 받지 않는다.',
  properties: {
    size: { type: ['string', 'null'], example: '소기업', description: '소상공인 · 소기업 · 중기업 · 중소기업 · 중견기업 · 대기업' },
    attrs: { type: 'array', items: { type: 'string' }, example: ['법인사업자'] },
    hq: { type: ['string', 'null'], example: '경기 성남시', description: '본사 지역 (시도 약칭 + 시군구)' },
    sites: { type: 'array', items: { type: 'string' } },
    industry: { type: ['array', 'null'], items: { type: 'string' }, example: ['제조업'] },
    product_hs: { type: ['array', 'null'], items: { type: 'string' }, example: ['847130'] },
    export_usd: { type: ['number', 'null'], example: 0 },
    revenue_krw: { type: ['number', 'null'] },
    age: { type: ['number', 'null'], description: '업력(년)' },
    employees: { type: ['number', 'null'] },
    certs: { type: ['array', 'null'], items: { type: 'string' } },
    debt_ratio: { type: ['number', 'null'], description: '부채비율(%)' },
    model: { type: ['string', 'null'], description: '제조 · 유통 등' },
    issues: { type: 'array', items: { type: 'string' }, description: '해당하는 결격 코드 (F_ 로 시작)' },
    answered_flags: { type: 'array', items: { type: 'string' }, description: '답한 결격 코드. 답하지 않은 결격 조건은 모름' },
    intent_export: { type: ['boolean', 'null'] },
    intent_commit: { type: ['boolean', 'null'] },
  },
}

const errorResponse = {
  description: '오류',
  content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } },
}

export const OPENAPI_DOCUMENT = {
  openapi: '3.1.0',
  info: {
    title: 'Export Compass 공개 API',
    version: '1.0.0',
    description:
      '게시된 수출지원사업 공고와 신청 자격 판정(3탭 분류)을 읽기 전용으로 제공합니다. 모든 데이터 엔드포인트는 X-API-Key 헤더가 필요합니다. 응답에는 사용자 계정·기업 프로필·지원 이력이 들어 있지 않습니다.',
  },
  servers: [{ url: '/' }],
  components: {
    securitySchemes: { ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
    schemas: { NoticeSummary: noticeSummary, Condition: conditionRef, Profile: profileSchema },
  },
  security: [{ ApiKey: [] }],
  paths: {
    '/api/public/v1/notices': {
      get: {
        summary: '게시 공고 목록',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: '사업 분류 코드 C01–C15' },
          { name: 'region', in: 'query', schema: { type: 'string' }, description: '지역 코드 (전국 공고도 함께 나옵니다)' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'upcoming', 'closed'] } },
          { name: 'source', in: 'query', schema: { type: 'string', enum: ['answer-set', 'folder', 'bizinfo', 'kotra', 'kita'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'page_size', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          200: {
            description: '공고 목록',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meta: { type: 'object' },
                    items: { type: 'array', items: { $ref: '#/components/schemas/NoticeSummary' } },
                  },
                },
              },
            },
          },
          401: errorResponse,
          429: errorResponse,
        },
      },
    },
    '/api/public/v1/notices/{id}': {
      get: {
        summary: '공고 상세 (자격 조건 판정식·근거 문장·쪽, 출처 URL 포함)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: '공고 상세' }, 401: errorResponse, 404: errorResponse, 429: errorResponse },
      },
    },
    '/api/public/v1/eligibility/check': {
      post: {
        summary: '프로필로 공고별 3탭 분류 (받은 프로필은 저장하지 않음)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['profile'],
                properties: {
                  profile: { $ref: '#/components/schemas/Profile' },
                  notice_ids: { type: 'array', items: { type: 'string' }, description: '없으면 게시 공고 전체' },
                  answers: {
                    type: 'object',
                    description: '{ 공고 ID: { cond_id: "met" | "unmet" } } — 기업이 직접 확인한 조건',
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: '공고별 결과. tab: eligible(신청 가능) · needs-check(확인 필요) · ineligible(신청 불가)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    meta: { type: 'object' },
                    results: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          notice_id: { type: 'string' },
                          title: { type: ['string', 'null'] },
                          tab: { type: 'string', enum: ['eligible', 'needs-check', 'ineligible'] },
                          tab_label: { type: 'string' },
                          strict_verdict: { type: 'string' },
                          unmet: { type: 'array', items: { $ref: '#/components/schemas/Condition' } },
                          major_unknown: { type: 'array', items: { $ref: '#/components/schemas/Condition' } },
                          checklist: { type: 'array', items: { $ref: '#/components/schemas/Condition' } },
                          no_conditions: { type: 'boolean', description: '자격 조건을 찾지 못한 공고 (확인 필요, 원문 확인)' },
                          source_url: { type: ['string', 'null'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          429: errorResponse,
        },
      },
    },
  },
} as const

const SWAGGER_VERSION = '5.17.14'

export function swaggerHtml(specUrl: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Export Compass 공개 API 문서</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css" />
<style>body{margin:0;background:#fff}.topbar{display:none}.back{display:block;padding:12px 16px;font:14px sans-serif}</style>
</head>
<body>
<a class="back" href="/developers">← 개발자 안내로 돌아가기</a>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js" crossorigin></script>
<script>
window.ui = SwaggerUIBundle({ url: ${JSON.stringify(specUrl)}, dom_id: '#swagger-ui' });
</script>
</body>
</html>`
}
