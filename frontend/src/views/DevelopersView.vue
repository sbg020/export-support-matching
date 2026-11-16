<script setup lang="ts">
/**
 * 개발자 안내 — 공개 API (REVISION_05 §9). 메뉴에는 넣지 않고 바닥글 링크로 연다.
 * 엔드포인트 목록, 문서 링크, 키 발급 문의 안내. 키 값은 화면에 보여 주지 않는다.
 */
import { IconApi, IconKey } from '@tabler/icons-vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SectionCard from '@/components/common/SectionCard.vue'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/public/v1/notices',
    description: '게시된 공고 목록. 거를 수 있는 값: category(사업 분류 C01–C15), region(지역), status(open · upcoming · closed), source(출처), page, page_size',
  },
  {
    method: 'GET',
    path: '/api/public/v1/notices/{id}',
    description: '공고 상세. 자격 조건(판정식, 근거 문장, 쪽)과 출처(source, source_url)를 함께 돌려줍니다.',
  },
  {
    method: 'POST',
    path: '/api/public/v1/eligibility/check',
    description: '프로필 JSON을 받아 공고별 3탭 분류(신청 가능 · 확인 필요 · 신청 불가)와 확인할 조건을 돌려줍니다. 받은 프로필은 저장하지 않습니다.',
  },
]

const EXAMPLE = `curl -H "X-API-Key: 발급받은_키" \\
  "https://exportsupportmatching.vercel.app/api/public/v1/notices?category=C01&status=open"`

const CHECK_EXAMPLE = `curl -X POST -H "X-API-Key: 발급받은_키" -H "Content-Type: application/json" \\
  -d '{"profile":{"size":"소기업","hq":"경기 성남시","industry":["제조업"],"export_usd":0}}' \\
  "https://exportsupportmatching.vercel.app/api/public/v1/eligibility/check"`
</script>

<template>
  <div class="page">
    <PageHeader
      title="개발자 안내 (공개 API)"
      description="Export Compass에 게시된 수출지원사업 공고와 신청 자격 판정을 다른 서비스에서 읽을 수 있는 읽기 전용 API입니다."
    />

    <div class="stack">
      <SectionCard title="엔드포인트" :icon="IconApi" heading-id="dev-endpoints-title">
        <div class="table-responsive">
          <table class="table dev-table">
            <caption class="visually-hidden">공개 API 엔드포인트 목록</caption>
            <thead>
              <tr>
                <th scope="col">방식</th>
                <th scope="col">주소</th>
                <th scope="col">설명</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in ENDPOINTS" :key="e.path">
                <td><span class="dev-method">{{ e.method }}</span></td>
                <th scope="row"><code>{{ e.path }}</code></th>
                <td>{{ e.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul class="dev-notes">
          <li>응답에는 사용자 계정, 기업 프로필, 지원 이력이 들어 있지 않습니다.</li>
          <li>공고 데이터는 데이터 기준일 기준이며, 응답의 <code>meta.as_of</code>로 알려 드립니다.</li>
          <li>신청 자격 결과는 참고용입니다. 최종 신청 자격은 공고 원문과 주관기관에서 확인해 주세요.</li>
        </ul>
        <div class="action-row mt-3">
          <a href="/api/public/docs" class="btn btn-primary">API 문서 (Swagger UI)</a>
          <a href="/api/public/openapi.json" class="btn btn-secondary">OpenAPI JSON</a>
        </div>
      </SectionCard>

      <SectionCard title="인증과 호출 제한" :icon="IconKey" heading-id="dev-auth-title">
        <p>
          모든 데이터 요청에는 요청 헤더 <code>X-API-Key</code>에 발급받은 키를 넣어야 합니다. 키가 없거나 맞지 않으면
          <code>401</code>을 돌려줍니다. 키마다 1분에 호출할 수 있는 횟수가 정해져 있고, 넘으면 <code>429</code>를 돌려줍니다.
        </p>
        <pre class="dev-code"><code>{{ EXAMPLE }}</code></pre>
        <pre class="dev-code"><code>{{ CHECK_EXAMPLE }}</code></pre>
      </SectionCard>

      <SectionCard title="키 발급 문의" heading-id="dev-key-title">
        <p class="mb-0">
          API 키는 운영자가 발급합니다. 사용 목적, 기관명, 예상 호출량을 사이트 운영자에게 알려 주시면 검토 뒤 키를
          전달해 드립니다. 키는 다른 사람과 나누지 말고, 브라우저 코드에 넣지 말아 주세요.
        </p>
      </SectionCard>
    </div>
  </div>
</template>

<style scoped>
.dev-table th,
.dev-table td {
  vertical-align: top;
  font-size: var(--fs-sm);
}

.dev-table code {
  white-space: nowrap;
}

.dev-method {
  display: inline-block;
  min-width: 48px;
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  font-weight: var(--fw-bold);
  font-size: var(--fs-xs);
  text-align: center;
}

.dev-notes {
  margin: var(--space-3) 0 0;
  padding-left: 18px;
  font-size: var(--fs-sm);
}

.dev-code {
  margin: var(--space-3) 0 0;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-heading);
  color: #f5f5f5;
  font-size: var(--fs-xs);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
