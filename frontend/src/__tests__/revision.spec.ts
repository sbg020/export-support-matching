import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { safeRedirect } from '@/lib/redirect'
import { buildProgramEvents } from '@/lib/calendarEvents'
import {
  MAX_COMPARE,
  normalizeCompareIds,
  parseCompareQuery,
  useCompareSelection,
} from '@/composables/useCompareSelection'
import { APPLICATION_STATUSES, statusLabel, tabOfStatus } from '@/constants/applicationStatus'
import { mergeRecords } from '@/stores/applicationStore'
import RecommendationCard from '@/components/programs/RecommendationCard.vue'
import type { ApplicationRecord } from '@/types/tracking'
import { blankProgram } from './fixtures'

function makeRouter() {
  return createRouter({ history: createMemoryHistory(), routes })
}

describe('로그인 후 이동 주소 검사', () => {
  const router = makeRouter()

  it('등록된 내부 경로만 허용한다', () => {
    expect(safeRedirect('/diagnose/input', router)).toBe('/diagnose/input')
    expect(safeRedirect('/mypage/programs?tab=applied', router)).toBe('/mypage/programs?tab=applied')
    expect(safeRedirect(['/roadmap'], router)).toBe('/roadmap')
  })

  it('외부 주소·로그인·없는 경로는 거부한다', () => {
    for (const value of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/redirect?to=https://example.com',
      'javascript:alert(1)',
      '/login',
      '/없는-주소',
      '',
      undefined,
    ]) {
      expect(safeRedirect(value, router)).toBeNull()
    }
  })
})

describe('공고 비교 선택', () => {
  it('순서 유지, 중복 제거, 최대 4개', () => {
    expect(normalizeCompareIds(['b', 'a', 'b', ' ', 'c', 'd', 'e'])).toEqual(['b', 'a', 'c', 'd'])
    expect(parseCompareQuery('x,y,x')).toEqual(['x', 'y'])
    expect(parseCompareQuery(undefined)).toEqual([])
  })

  it('다섯 번째 공고는 추가하지 않는다', () => {
    const selection = useCompareSelection()
    selection.clear()
    for (const id of ['1', '2', '3', '4']) expect(selection.add(id)).toBe('added')
    expect(selection.add('2')).toBe('exists')
    expect(selection.add('5')).toBe('full')
    expect(selection.count.value).toBe(MAX_COMPARE)
    expect(selection.compareLocation()).toEqual({ name: 'programs', query: { compare: '1,2,3,4' }, hash: '#compare' })
    selection.clear()
  })
})

describe('관리 상태', () => {
  it('신청완료와 선정완료는 다른 상태이며 같은 신청완료 탭에 속한다', () => {
    expect(statusLabel('applied')).toBe('신청완료')
    expect(statusLabel('selected')).toBe('선정완료')
    expect(tabOfStatus('interested')).toBe('interested')
    expect(tabOfStatus('preparing')).toBe('preparing')
    for (const status of ['applied', 'under_review', 'selected', 'not_selected', 'in_progress', 'completed'] as const) {
      expect(tabOfStatus(status)).toBe('applied')
    }
    expect(new Set(APPLICATION_STATUSES.map((s) => s.label)).size).toBe(APPLICATION_STATUSES.length)
  })

  it('같은 공고의 기록을 합치면 더 진행된 상태와 모든 이력·메모를 남긴다', () => {
    const base: Omit<ApplicationRecord, 'status' | 'history' | 'memo'> = {
      programId: 'p',
      appliedOn: null,
      resultOn: null,
      checklist: [],
      businessPlanDocumentId: null,
    }
    const merged = mergeRecords([
      { ...base, status: 'interested', history: [{ status: 'interested', changedAt: '2026-01-01T00:00:00Z' }], memo: '메모 1' },
      { ...base, status: 'applied', history: [{ status: 'applied', changedAt: '2026-02-01T00:00:00Z' }], memo: '메모 2' },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.status).toBe('applied')
    expect(merged[0]?.history.map((h) => h.status)).toEqual(['interested', 'applied'])
    expect(merged[0]?.memo).toBe('메모 1\n메모 2')
  })
})

describe('공고 달력 일정', () => {
  it('공고의 실제 날짜 필드로만 만들고, 날짜가 없으면 만들지 않는다', () => {
    expect(buildProgramEvents([blankProgram()])).toEqual([])
    const events = buildProgramEvents([
      blankProgram({
        id: 't1',
        title: '테스트 공고',
        applyStart: '2030-01-02T09:00:00+09:00',
        applyEnd: '2030-01-20',
        announcementDate: '2030-02-01',
        agreementDate: null,
      }),
    ])
    expect(events.map((e) => [e.type, e.date])).toEqual([
      ['apply-start', '2030-01-02'],
      ['apply-end', '2030-01-20'],
      ['announcement', '2030-02-01'],
    ])
  })
})

describe('추천 카드', () => {
  it('기본 정보 4가지를 보여 주고, 근거가 없으면 안내만 표시한다', async () => {
    const router = makeRouter()
    await router.push('/programs/recommended')
    await router.isReady()
    const wrapper = mount(RecommendationCard, {
      props: { program: blankProgram({ id: 't2', title: '테스트 전용 공고' }), inCompare: false },
      global: { plugins: [router] },
    })
    const text = wrapper.text()
    expect(text).toContain('테스트 전용 공고')
    for (const label of ['신청자격', '마감일', '추천 이유']) expect(text).toContain(label)
    expect(wrapper.find('a').attributes('href')).toBe('/programs/t2?from=recommended')

    const toggle = wrapper.get('button[aria-controls]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    await flushPromises()
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.text()).toContain('아직 계산 근거가 없습니다.')
    expect(wrapper.text()).not.toMatch(/\d+점/)
  })
})
