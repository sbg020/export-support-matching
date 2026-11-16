/*
 * REVISION_04 §4.4 맞춤 추천 목록 — 테스트 전용 공고와 판정 결과를 넣어 탭·정렬·카드를 확인한다.
 * 공고 연결 상태와 판정 결과는 이 파일 안에서만 흉내 낸다 (앱 번들에 들어가지 않음).
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import type { ProgramEvaluation } from '@/lib/engine/evaluateAll'
import type { EligibilityStatus } from '@/types/results'
import type { Program } from '@/types/program'
import { routes } from '@/router'
import RecommendationList from '@/components/programs/RecommendationList.vue'
import { draftProgram } from './fixtures'
import { useProfileStore } from '@/stores/profileStore'
import { createTestAccountProfile } from '@/data/testAccountProfile'

const fake = vi.hoisted(() => ({
  programs: [] as Program[],
  evaluations: new Map<string, ProgramEvaluation>(),
}))

vi.mock('@/repositories', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/repositories')>()
  return { ...original, programRepository: { ...original.programRepository, source: { kind: 'api', baseUrl: 'test-only' } } }
})

vi.mock('@/composables/useProgramEvaluations', async () => {
  const { computed } = await import('vue')
  return {
    useProgramEvaluations: () => ({
      ready: computed(() => true),
      asOf: null,
      programs: computed(() => fake.programs),
      diagnosis: computed(() => null),
      evaluations: computed(() => fake.evaluations),
      get: (id: string) => fake.evaluations.get(id),
    }),
  }
})

/** 테스트 전용 3탭 결과 (REVISION_05: 카드와 탭은 evaluation.tab을 쓴다) */
function testTab(status: EligibilityStatus): NonNullable<ProgramEvaluation['tab']> {
  const tab = status === 'eligible' ? 'eligible' : status === 'ineligible' ? 'ineligible' : 'needs-check'
  const strict = tab === 'eligible' ? '신청 가능' : tab === 'ineligible' ? '신청 불가' : '확인 필요'
  return { tab, strict, fails: [], majorUnknown: [], checklist: [], userDecided: [], outcomes: [], notices: [] }
}

/** 테스트 전용 판정 결과 */
function evaluation(status: EligibilityStatus | null, score: number | null): ProgramEvaluation {
  return {
    eligibility: status
      ? ({ status, selfCheckedCount: 0, basisDate: null, conditions: [], groups: [] } as unknown as ProgramEvaluation['eligibility'])
      : null,
    tab: status ? testTab(status) : null,
    fit: score === null ? null : ({ score, reasons: [], basisDate: null } as unknown as ProgramEvaluation['fit']),
    fitFactors: [],
    opportunity: null,
  }
}

function setData(entries: [Program, ProgramEvaluation][]) {
  // REVISION_05 §5.1: 기업 프로필이 비어 있으면 탭 대신 입력 안내를 보여 주므로 테스트 프로필을 넣어 둔다
  useProfileStore().replaceProfile(createTestAccountProfile())
  fake.programs = entries.map(([program]) => program)
  fake.evaluations = new Map(entries.map(([program, value]) => [program.id, value]))
}

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes })
}

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountAt(path: string) {
  const router = makeRouter()
  await router.push(path)
  await router.isReady()
  wrapper = mount(RecommendationList, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { router, wrapper }
}

const titles = (w: VueWrapper) => w.findAll('.rec-card__title').map((t) => t.text())
const tabCounts = (w: VueWrapper) => w.findAll('[role="tab"]').map((t) => t.get('.tab-nav__count').text())

const STANDARD: [Program, ProgramEvaluation][] = [
  [draftProgram({ id: 'E2', title: '가능 B', applyEnd: '2030-08-01' }), evaluation('eligible', 70)],
  [draftProgram({ id: 'E1', title: '가능 A', applyEnd: '2030-09-01' }), evaluation('eligible', 82.4)],
  [draftProgram({ id: 'E3', title: '가능 C', applyEnd: '2030-07-01' }), evaluation('eligible', 70)],
  [draftProgram({ id: 'E4', title: '가능 D', applyEnd: null }), evaluation('eligible', null)],
  [draftProgram({ id: 'N1', title: '확인 A' }), evaluation('needs-check', 60)],
  [draftProgram({ id: 'I1', title: '불가 A' }), evaluation('ineligible', null)],
  [draftProgram({ id: 'U1', title: '판정 없음' }), evaluation(null, null)],
]

describe('맞춤 추천 상태 탭 (§4.4.2)', () => {
  it('탭 건수는 그 상태의 공고 수이고, 판정 없는 공고는 어느 탭에도 넣지 않고 따로 알린다', async () => {
    setData(STANDARD)
    const { wrapper } = await mountAt('/programs/recommended')
    expect(tabCounts(wrapper)).toEqual(['4', '1', '1'])
    expect(wrapper.text()).toContain('자격 조건이 등록되지 않아 판정하지 않은 공고 1건이 있습니다.')
    expect(wrapper.get('.recommend__unjudged a').attributes('href')).toBe('/programs')
    expect(wrapper.text()).not.toContain('판정 없음')
    expect(wrapper.text()).toContain('적합도가 높은 순으로, 같으면 마감이 가까운 순으로 보여 드립니다.')
  })

  it('탭 안: 적합도 높은 순 → 마감 빠른 순 → ID 순 (적합도 없음은 뒤)', async () => {
    setData(STANDARD)
    const { wrapper } = await mountAt('/programs/recommended')
    expect(titles(wrapper)).toEqual(['가능 A', '가능 C', '가능 B', '가능 D'])
  })

  it('기본 탭은 1건 이상인 첫 탭, 모두 0건이면 신청 가능', async () => {
    setData([
      [draftProgram({ id: 'N1', title: '확인 A' }), evaluation('needs-check', 60)],
      [draftProgram({ id: 'I1', title: '불가 A' }), evaluation('ineligible', null)],
    ])
    let mounted = await mountAt('/programs/recommended')
    expect(mounted.wrapper.get('[aria-selected="true"]').text()).toContain('확인 필요')
    mounted.wrapper.unmount()

    setData([[draftProgram({ id: 'U1' }), evaluation(null, null)]])
    mounted = await mountAt('/programs/recommended')
    expect(mounted.wrapper.get('[aria-selected="true"]').text()).toContain('신청 가능')
    expect(tabCounts(mounted.wrapper)).toEqual(['0', '0', '0'])
    expect(mounted.wrapper.text()).toContain('이 상태에 해당하는 공고가 없습니다.')
  })

  it('?tab=과 맞물리고, 예전 필터 쿼리가 붙어 와도 오류 없이 열린다', async () => {
    setData(STANDARD)
    const { router, wrapper } = await mountAt('/programs/recommended?tab=ineligible&q=old&sort=deadline&region=seoul')
    expect(wrapper.get('[aria-selected="true"]').text()).toContain('신청 불가')
    expect(titles(wrapper)).toEqual(['불가 A'])
    const needsCheck = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('확인 필요'))!
    await needsCheck.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.tab).toBe('needs-check')
    expect(titles(wrapper)).toEqual(['확인 A'])
  })
})

describe('맞춤 추천 카드 (§4.4.3)', () => {
  it('오른쪽 위 적합도: 반올림한 n점과 시험용 기준, 없으면 -와 사유 2가지. 추천 이유 줄은 없다', async () => {
    setData([
      [draftProgram({ id: 'E1', title: '가능 A', supportCategories: ['C05', 'C06', 'C13'] }), evaluation('eligible', 82.4)],
      [draftProgram({ id: 'E2', title: '가능 B' }), evaluation('eligible', null)],
      [draftProgram({ id: 'I1', title: '불가 A' }), evaluation('ineligible', null)],
    ])
    const { router, wrapper } = await mountAt('/programs/recommended')
    const cards = wrapper.findAll('.rec-card')
    expect(cards[0]!.get('.rec-card__fit-score').text()).toBe('82점')
    expect(cards[0]!.get('.rec-card__fit-note').text()).toBe('시험용 기준')
    expect(cards[0]!.get('.rec-card__fit .visually-hidden').text()).toBe('적합도 82점, 100점 만점, 시험용 기준')
    expect(cards[0]!.text()).toContain('해외규격인증 · 홍보/광고 외 1개')
    expect(cards[1]!.get('.rec-card__fit-score').text()).toBe('-')
    expect(cards[1]!.get('.rec-card__fit-note').text()).toBe('반영할 수 있는 항목이 부족합니다')
    for (const card of cards) {
      expect(card.text()).not.toContain('추천 이유')
      expect(card.text()).not.toContain('초안 기준')
    }
    // 지원금·자부담·신청 마감은 값이 없으면 '-'
    const facts = cards[1]!.findAll('.rec-card__fact dd').map((dd) => dd.text())
    expect(facts.every((text) => text.startsWith('-'))).toBe(true)
    expect(cards[0]!.findAll('a').map((a) => a.attributes('href'))).toContain('/programs/E1?from=recommended')

    await router.replace({ query: { tab: 'ineligible' } })
    await flushPromises()
    const ineligible = wrapper.get('.rec-card')
    // REVISION_05 §5.2: 적합도는 신청 가능 탭 카드에만 (신청 불가 카드에는 적합도 칸이 없다)
    expect(ineligible.find('.rec-card__fit').exists()).toBe(false)
  })

  it('버튼: 자세히·관심사업 저장·비교에 추가 (REVISION_05 §5.2 `자세히`)', async () => {
    setData([[draftProgram({ id: 'E1', title: '가능 A' }), evaluation('eligible', 50)]])
    const { wrapper } = await mountAt('/programs/recommended')
    const labels = wrapper.findAll('.rec-card__actions a, .rec-card__actions button').map((el) => el.text())
    expect(labels).toEqual(['자세히', '관심사업 저장', '비교에 추가'])
  })
})
