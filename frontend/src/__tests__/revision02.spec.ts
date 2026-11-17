import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { filterPrograms, sortPrograms } from '@/lib/programQuery'
import { createEmptyQuery } from '@/repositories'
import { viewEventSink } from '@/repositories/viewEventSink'
import { selectNewPrograms, rankMostViewed, MIN_UNIQUE_VISITORS } from '@/lib/programHighlights'
import { compareToggleMessage, useCompareSelection } from '@/composables/useCompareSelection'
import { COMPARE_ROW_GROUPS, compareCellText, type CompareSlot } from '@/components/programs/compareRows'
import { SELF_CHECK_STORAGE_KEY, readSelfChecks, useSelfChecks } from '@/stores/selfCheckStore'
import { createEmptyProfile } from '@/lib/profile'
import { detectPersonalInfo } from '@/constants/community'
import { summarizeReviews } from '@/lib/reviewStats'
import CompareDock from '@/components/programs/CompareDock.vue'
import ApplicationRecordTable from '@/components/mypage/ApplicationRecordTable.vue'
import CommunityBoardView from '@/views/community/CommunityBoardView.vue'
import CommunityWriteView from '@/views/community/CommunityWriteView.vue'
import type { Program } from '@/types/program'
import type { ApplicationRecord } from '@/types/tracking'
import { blankProgram, draftProgram } from './fixtures'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('저장소의 필터·정렬 (테스트 전용 공고)', () => {
  const programs = [
    draftProgram({ id: 'A', title: '해외 전시회 지원', applyEnd: '2030-07-01', supportCategories: ['C01'], supportPhases: ['market-entry', 'execution'] }),
    draftProgram({ id: 'B', title: '국제운송 물류비', applyEnd: null, supportCategories: ['C13'], supportPhases: ['market-entry', 'execution'] }),
    draftProgram({ id: 'C', title: '세무 자문', applyEnd: '2030-06-01', supportCategories: ['C03'], supportPhases: ['execution', 'localization'] }),
  ]

  it('지원분야는 supportPhases, 세부 분야는 supportCategories로 거른다', () => {
    expect(filterPrograms(programs, { ...createEmptyQuery(), stages: ['localization'] }).map((p) => p.id)).toEqual(['C'])
    expect(filterPrograms(programs, { ...createEmptyQuery(), categories: ['C01', 'C13'] }).map((p) => p.id)).toEqual(['A', 'B'])
    expect(filterPrograms(programs, { ...createEmptyQuery(), keyword: '물류' }).map((p) => p.id)).toEqual(['B'])
  })

  it('지역 필터는 선택한 지역 공고와 전국 공고를 함께 통과시킨다', () => {
    const withRegions = [
      draftProgram({ id: 'R1', regions: ['gyeonggi'] }),
      draftProgram({ id: 'R2', regions: ['nationwide'] }),
      draftProgram({ id: 'R3', regions: ['busan'] }),
      draftProgram({ id: 'R4', regions: null }),
    ]
    expect(filterPrograms(withRegions, { ...createEmptyQuery(), regions: ['gyeonggi'] }).map((p) => p.id)).toEqual(['R1', 'R2'])
  })

  it('마감순은 마감일 없는 공고를 뒤에 두고, 이미 마감된 공고는 맨 뒤로 보낸다', () => {
    expect(sortPrograms(programs, 'deadline').map((p) => p.id)).toEqual(['C', 'A', 'B'])
    const withClosed = [...programs, draftProgram({ id: 'D', applyEnd: '2030-05-01', receptionStatus: 'closed' })]
    expect(sortPrograms(withClosed, 'deadline').map((p) => p.id)).toEqual(['C', 'A', 'B', 'D'])
  })
})

describe('새로 올라온 공고 · 많이 본 공고', () => {
  it('30일 창·접수중/예정·최대 10줄, 게시일 미확인 건수 (테스트 전용 공고)', () => {
    const programs = [
      ...Array.from({ length: 12 }, (_, i) =>
        draftProgram({ id: `N${i + 1}`, sourcePublishedAt: `2030-06-${String(10 + i).padStart(2, '0')}`, receptionStatus: 'open' }),
      ),
      draftProgram({ id: 'S1', parentId: 'S', sourcePublishedAt: '2030-06-25', receptionStatus: 'upcoming' }),
      draftProgram({ id: 'S2', parentId: 'S', sourcePublishedAt: '2030-06-24', receptionStatus: 'upcoming' }),
      draftProgram({ id: 'NODATE', sourcePublishedAt: null, receptionStatus: 'open' }),
    ]
    const result = selectNewPrograms(programs, '2030-06-30')
    expect(result.excludedNoDate).toBe(1)
    expect(result.items).toHaveLength(10)
    for (const line of result.items) {
      expect(['open', 'upcoming']).toContain(line.program.receptionStatus)
      expect(line.program.sourcePublishedAt! >= '2030-05-31').toBe(true)
    }
    // S1·S2는 같은 원공고라 1줄로 묶인다
    expect(result.items.filter((l) => l.program.parentId === 'S')).toHaveLength(1)
  })

  it('같은 그룹은 최근 게시 공고를 대표로 묶고, 기간 밖 공고로 채우지 않는다', () => {
    const programs = [
      draftProgram({ id: 'G1', groupKey: 'G', sourcePublishedAt: '2030-06-10', receptionStatus: 'open' }),
      draftProgram({ id: 'G2', groupKey: 'G', sourcePublishedAt: '2030-06-20', receptionStatus: 'open', title: '추가모집 공고' }),
      draftProgram({ id: 'OLD', sourcePublishedAt: '2030-04-01', receptionStatus: 'open' }),
      draftProgram({ id: 'CLOSED', sourcePublishedAt: '2030-06-25', receptionStatus: 'closed' }),
    ]
    const result = selectNewPrograms(programs, '2030-06-30')
    expect(result.items.map((l) => [l.program.id, l.groupSize, l.isAdditional])).toEqual([['G2', 2, true]])
  })

  it('많이 본 공고: 같은 방문자 하루 1회, 7일 창, 최소 기준, 마감 제외', () => {
    const now = new Date('2030-06-30T12:00:00Z')
    const open = (id: string) => draftProgram({ id, receptionStatus: 'open' })
    const programs = [open('A'), open('B'), open('C'), draftProgram({ id: 'X', receptionStatus: 'closed' })]
    const visits = (programId: string, visitors: number, day = '2030-06-29') =>
      Array.from({ length: visitors }, (_, i) => ({ programId, visitorKey: `v${i}`, occurredAt: `${day}T09:00:00Z` }))
    const enough = [
      ...visits('A', 12),
      ...visits('A', 12), // 같은 날 같은 방문자 → 중복
      ...visits('B', 11),
      ...visits('C', MIN_UNIQUE_VISITORS),
      ...visits('X', 30),
      ...visits('B', 20, '2030-06-01'), // 7일 창 밖
    ]
    expect(rankMostViewed(enough, programs, now)?.map((l) => [l.program.id, l.uniqueVisitors])).toEqual([
      ['A', 12],
      ['B', 11],
      ['C', 10],
    ])
    expect(rankMostViewed(visits('A', 50), programs, now)).toBeNull()
  })

  it('조회 이벤트를 브라우저 저장소에 쌓지 않는다', () => {
    localStorage.clear()
    sessionStorage.clear()
    viewEventSink.record('P001')
    expect(viewEventSink.connected).toBe(false)
    expect(localStorage.length + sessionStorage.length).toBe(0)
  })
})

describe('공고 비교 개선', () => {
  beforeEach(() => useCompareSelection().clear())

  it('비교 선택은 토글이며 알림에 n/4를 보여 준다', () => {
    const selection = useCompareSelection()
    expect(selection.toggle('a')).toBe('added')
    expect(compareToggleMessage('added', selection.count.value)).toBe('비교에 추가했습니다 (1/4)')
    expect(selection.toggle('a')).toBe('removed')
    ;['a', 'b', 'c', 'd'].forEach((id) => selection.add(id))
    expect(selection.toggle('e')).toBe('full')
    expect(compareToggleMessage('full', 4)).toBe('최대 4개까지 비교할 수 있습니다.')
  })

  it('하단 비교 바: 1개면 이유와 함께 비활성, 2개면 공고 비교 화면으로 이동', async () => {
    const router = makeRouter()
    await router.push('/programs/recommended')
    await router.isReady()
    const selection = useCompareSelection()
    selection.add('a')
    const wrapper = mount(CompareDock, { global: { plugins: [router] } })
    await flushPromises()
    const button = wrapper.get('button')
    expect(button.text()).toContain('비교 1/4 · 비교하기')
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(wrapper.text()).toContain('1개 더 고르면 비교할 수 있습니다.')
    await button.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('programs-recommended')

    selection.add('b')
    await flushPromises()
    await wrapper.get('button').trigger('click')
    // 공고 비교 화면은 지연 로딩이라 이동이 끝날 때까지 기다린다
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('programs-compare'), { timeout: 10_000 })
    expect(router.currentRoute.value.query.compare).toBe('a,b')
    wrapper.unmount()
  })

  it('새 행 6개와 지원방식 행 이름', () => {
    const keys = COMPARE_ROW_GROUPS.flatMap((g) => g.rows.map((r) => r.key))
    for (const key of ['checksLeft', 'bonuses', 'deadline', 'amounts', 'settlement', 'reviews'] as const) {
      expect(keys).toContain(key)
    }
    expect(COMPARE_ROW_GROUPS.flatMap((g) => g.rows).find((r) => r.key === 'support')?.label).toBe('지원방식')
  })

  it('비교 칸: 차액이 0이면 최대 자기부담 없음, 정산 방식이 없으면 -, 마감은 기준일 기준', () => {
    const ctx = { asOf: '2030-06-30', profile: createEmptyProfile() }
    const slot = (program: Program): CompareSlot => ({ index: 0, program, eligibility: null, fit: null, opportunity: null })
    const same = blankProgram({ maxAmountKrw: 5_000_000, totalBudgetMaxKrw: 5_000_000, selfPayment: { ratioPercent: 30, note: '자부담 30%', source: null } })
    expect(compareCellText('selfPayment', slot(same), ctx)).toBe('비율 30% · 원문: 자부담 30%')
    expect(compareCellText('settlement', slot(same), ctx)).toBeNull()
    expect(compareCellText('amounts', slot(same), ctx)).toBe('지원금 5,000,000원 · 총사업비 5,000,000원')
    expect(compareCellText('deadline', slot(blankProgram({ applyEnd: '2030-07-05' })), ctx)).toBe('D-5 (기준일 2030-06-30)')
    expect(compareCellText('deadline', slot(blankProgram({ applyEnd: '2030-06-01' })), ctx)).toBe('마감')
    expect(compareCellText('reviews', slot(same), ctx)).toBeNull()
    expect(compareCellText('bonuses', slot(same), ctx)).toBeNull()
    expect(compareCellText('checksLeft', slot(same), ctx)).toBeNull()
  })

  it('지원사업 관리 기록에서 찾을 수 없는 공고는 비교에 넣을 수 없다', async () => {
    const router = makeRouter()
    await router.push('/manage/programs')
    const record: ApplicationRecord = {
      programId: 'GONE',
      status: 'interested',
      history: [{ status: 'interested', changedAt: '2030-06-30T00:00:00.000Z' }],
      memo: null,
      appliedOn: null,
      resultOn: null,
      checklist: [],
      businessPlanDocumentId: null,
    }
    const wrapper = mount(ApplicationRecordTable, {
      props: { records: [record], caption: '테스트' },
      global: { plugins: [router] },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('찾을 수 없는 공고 (GONE)')
    expect(wrapper.get('input[type="checkbox"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('공고 정보를 찾을 수 없어 비교할 수 없습니다.')
    wrapper.unmount()
  })
})

describe('직접 확인 저장', () => {
  beforeEach(() => {
    localStorage.clear()
    useSelfChecks().clearAll()
  })

  it('형식이 틀린 항목은 버린다', () => {
    const raw = JSON.stringify({
      version: 1,
      common: { closure: 'no', credit: 'maybe' },
      programs: { P1: { R1: { answer: 'met', answeredAt: '2030-01-01T00:00:00Z' }, R2: { answer: 'x' } } },
    })
    expect(readSelfChecks(raw)).toEqual({
      common: { closure: 'no' },
      programs: { P1: { R1: { answer: 'met', answeredAt: '2030-01-01T00:00:00Z' } } },
    })
    expect(readSelfChecks(JSON.stringify({ version: 2 }))).toEqual({ common: {}, programs: {} })
  })

  it('esm.selfChecks.v1에만 저장하고 모두 지우기로 지운다', () => {
    const checks = useSelfChecks()
    checks.setCommon('tax-arrears', 'no')
    checks.setProgramAnswer('P1', 'R1', 'met')
    expect(Object.keys(localStorage)).toEqual([SELF_CHECK_STORAGE_KEY])
    expect(readSelfChecks(localStorage.getItem(SELF_CHECK_STORAGE_KEY)).common).toEqual({ 'tax-arrears': 'no' })
    checks.clearAll()
    expect(localStorage.getItem(SELF_CHECK_STORAGE_KEY)).toBeNull()
    expect(checks.hasAny.value).toBe(false)
  })
})

describe('커뮤니티', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('게시판에 가짜 글이 없고, 비로그인 글쓰기는 로그인으로 갔다가 같은 게시판으로 돌아온다', async () => {
    const router = makeRouter()
    await router.push('/community/reviews')
    await router.isReady()
    const wrapper = mount(CommunityBoardView, { props: { board: 'reviews' }, global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.text()).toContain('아직 등록된 글이 없습니다.')
    expect(wrapper.find('table').exists()).toBe(false)
    const write = wrapper.findAll('button').find((b) => b.text().includes('글쓰기'))
    await write?.trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'), { timeout: 10_000 })
    expect(router.currentRoute.value.query.redirect).toBe('/community/reviews')
    wrapper.unmount()
  })

  it('글쓰기 양식의 등록은 이유와 함께 비활성이고, 입력값을 저장하지 않는다', async () => {
    const router = makeRouter()
    await router.push('/community/info')
    const wrapper = mount(CommunityWriteView, { props: { board: 'info' }, global: { plugins: [router] } })
    await flushPromises()
    await wrapper.get('input[maxlength="40"]').setValue('테스트 제목 연락처 010-1234-5678')
    await wrapper.get('textarea').setValue('테스트 본문')
    expect(wrapper.text()).toContain('전화번호 형식이 보입니다')
    const submit = wrapper.get('button[type="submit"]')
    expect(submit.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('게시글을 저장할 서버와 회원 정보가 아직 연결되지 않아 글쓰기는 준비 중입니다.')
    expect(localStorage.length + sessionStorage.length).toBe(0)
    wrapper.unmount()
  })

  it('개인정보 형식 감지와 후기 요약(5건 미만은 null)', () => {
    expect(detectPersonalInfo('사업자 123-45-67890 메일 a@example.com')).toEqual(['사업자등록번호', '이메일'])
    expect(detectPersonalInfo('평범한 글')).toEqual([])
    expect(summarizeReviews([])).toBeNull()
  })
})
