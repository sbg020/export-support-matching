/*
 * REVISION_05: 수출 로드맵 삭제 · '나의 사업 관리' 이름 · 메인 랜딩페이지 · 서비스 소개 메뉴 · 로그인/회원가입 링크
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { routes } from '@/router'
import { NAV_SECTIONS } from '@/constants/navigation'
import { AGENCY_ROWS, EXAMPLE_LABEL } from '@/constants/landing'
import { FIT_V1_VERSION, FIT_V1_WEIGHTS } from '@/constants/fitV1'
import { useAuth } from '@/stores/authStore'
import HomeView from '@/views/HomeView.vue'
import AppHeader from '@/components/layout/AppHeader.vue'

function makeRouter(): Router {
  return createRouter({ history: createMemoryHistory(), routes })
}

async function at(router: Router, path: string) {
  await router.push(path)
  await router.isReady()
  return router.currentRoute.value
}

beforeEach(() => {
  window.matchMedia = vi.fn<(query: string) => unknown>(() => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ authenticated: false }), { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('수출 로드맵 삭제와 메뉴', () => {
  it('수출 로드맵 경로·메뉴가 없고, 예전 주소는 맞춤 추천으로 간다', async () => {
    const router = makeRouter()
    expect(router.hasRoute('roadmap')).toBe(false)
    expect(NAV_SECTIONS.flatMap((s) => s.items).some((item) => item.routeName === 'roadmap')).toBe(false)
    expect(NAV_SECTIONS.some((s) => s.label.includes('로드맵'))).toBe(false)
    expect((await at(router, '/roadmap')).name).toBe('programs-recommended')
  })

  it("주 메뉴: 서비스 소개 · 기업 맞춤 지원사업 · 전체 지원사업 · 지원사업 관리 · 커뮤니티", () => {
    expect(NAV_SECTIONS.map((s) => s.label)).toEqual([
      '서비스 소개',
      '기업 맞춤 지원사업',
      '전체 지원사업',
      '지원사업 관리',
      '커뮤니티',
    ])
  })

  it("지원사업 관리의 첫 탭 이름은 '나의 사업 관리'이고 화면 제목도 같다 (경로는 그대로)", () => {
    const manage = NAV_SECTIONS.find((s) => s.key === 'manage')!
    expect(manage.items.map((i) => i.label)).toEqual(['나의 사업 관리', '서류함'])
    const resolved = makeRouter().resolve('/manage/programs')
    expect(resolved.name).toBe('manage-programs')
    expect(resolved.meta.title).toBe('나의 사업 관리')
  })

  it('비로그인 헤더: 로그인 링크와 회원가입 탭 링크', async () => {
    await useAuth().logout()
    const router = makeRouter()
    await at(router, '/programs')
    const header = mount(AppHeader, { props: { menuOpen: false }, global: { plugins: [router] } })
    await flushPromises()
    expect(header.get('a.profile-menu__login').attributes('href')).toBe('/login')
    expect(header.get('a.profile-menu__signup').attributes('href')).toBe('/login?mode=signup')
    header.unmount()
  })
})

describe('메인 랜딩페이지', () => {
  let wrapper: VueWrapper
  let router: Router

  beforeEach(async () => {
    router = makeRouter()
    await at(router, '/')
    wrapper = mount(HomeView, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
  })
  afterEach(() => wrapper.unmount())

  it('섹션 순서와 지정 문구 (Hero → Problem → Solution → How It Works → Preview → 기관 → Final CTA)', () => {
    // 줄바꿈(<br>)은 글자 사이 공백이 없으므로 공백을 빼고 비교한다
    const strip = (value: string) => value.replace(/\s+/g, '')
    const headings = wrapper.findAll('h1, h2').map((h) => strip(h.text()))
    expect(headings).toEqual(
      [
      '수출지원사업, 우리 기업에 맞게.',
      '우리 기업에 맞는 수출지원사업, 왜 찾기 어려울까요?',
      '찾는 시간을 줄이고, 맞는 지원사업에 집중하세요.',
      '기업정보 입력부터 맞춤형 수출 인사이트까지.',
      '우리 기업에 맞는 사업을 한눈에 확인하세요.',
      '흩어진 수출지원 공고, 이제 한곳에서 확인하세요.',
      '우리 기업의 다음 수출 기회, 지금 발견하세요.',
      ].map(strip),
    )
    const text = wrapper.text()
    for (const phrase of ['흩어진 공고', '복잡한 신청 자격', '불분명한 지원 전략']) expect(text).toContain(phrase)
    for (const phrase of ['기업정보 기반 맞춤 매칭', '신청 자격 사전 검토', '지원사업 적합도 분석', '단계별 수출 인사이트']) {
      expect(text).toContain(phrase)
    }
    expect(wrapper.find('#home-hero').exists()).toBe(true)
  })

  it('CTA는 실제 기능 화면으로 연결되고, 모든 링크가 등록된 경로다', () => {
    const hero = wrapper.get('#home-hero')
    const heroLinks = hero.findAll('a').map((a) => [a.text().trim(), a.attributes('href')])
    expect(heroLinks).toContainEqual(['맞춤 지원사업 찾기', '/programs/recommended'])
    expect(heroLinks).toContainEqual(['전체 지원사업 보기', '/programs'])
    const final = wrapper.get('section[aria-labelledby="final-title"] a')
    expect(final.attributes('href')).toBe('/programs/recommended')
    for (const link of wrapper.findAll('a')) {
      const href = link.attributes('href') ?? ''
      expect({ href, name: router.resolve(href).name }).not.toEqual({ href, name: 'not-found' })
    }
  })

  it('예시 UI는 예시 화면으로 표시하고, 실제처럼 보이는 공고명·금지 문구가 없다', () => {
    const text = wrapper.text()
    // 히어로 예시 UI에는 보이는 '예시 화면' 문구가 없고(화면낭독기용 이름만), 추천 미리보기에만 표시한다
    expect(wrapper.findAll('.lp-example-tag').map((t) => t.text())).toEqual([EXAMPLE_LABEL])
    expect(wrapper.get('.hero__visual').attributes('aria-label')).toContain(EXAMPLE_LABEL)
    expect(text).toContain('실제 공고·점수가 아닙니다')
    for (const word of ['테스트 데이터', 'PoC 데이터 기준', '초안 기준', '샘플']) expect(text).not.toContain(word)
  })

  it('적합도 카드는 코드의 실제 가중치를 보여 준다', () => {
    const values = wrapper.findAll('.ui-fit__value').map((v) => v.text())
    // REVISION_05 §6.4 적합도 v1: 관심 분야 25 / 업종 20 / 수출단계 25 / 재무 25 / 가점 5
    expect(values).toEqual(Object.values(FIT_V1_WEIGHTS).map((w) => w.toFixed(2)))
    expect(values).toEqual(['0.25', '0.20', '0.25', '0.25', '0.05'])
    expect(wrapper.text()).toContain(FIT_V1_VERSION)
  })

  it('이용 과정 탭: 방향키로 단계를 옮기고 패널과 버튼 연결 화면이 바뀐다', async () => {
    const tabs = () => wrapper.findAll('[role="tab"]')
    expect(tabs()).toHaveLength(3)
    expect(tabs()[0]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#how-panel a').attributes('href')).toBe('/profile')
    await wrapper.get('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
    expect(tabs()[1]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#how-panel a').attributes('href')).toBe('/programs/recommended')
    await tabs()[2]!.trigger('click')
    expect(wrapper.get('#how-panel').text()).toContain('나의 수출 인사이트')
    expect(wrapper.get('#how-panel a').attributes('href')).toBe('/programs')
  })

  it('기관 띠: 기업마당·KOTRA·KITA가 있고, 복사본은 화면낭독기에서 숨기며 멈춤 버튼이 동작한다', async () => {
    const names = AGENCY_ROWS.flat().map((a) => a.name)
    for (const name of ['기업마당', 'KOTRA', 'KITA']) expect(names).toContain(name)
    expect(wrapper.findAll('.agencies__list--copy').every((ul) => ul.attributes('aria-hidden') === 'true')).toBe(true)
    const toggle = wrapper.get('.agencies__toggle')
    expect(toggle.attributes('aria-pressed')).toBe('false')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.agencies__rows').classes()).toContain('is-paused')
  })

  it('공고가 연결되지 않았으면 미리보기는 예시 카드만 보여 주고 관심 저장·비교 버튼이 없다', () => {
    const preview = wrapper.get('#preview')
    expect(preview.findAll('.rec-card')).toHaveLength(0)
    expect(preview.findAll('.ex-card')).toHaveLength(2)
    expect(preview.text()).not.toContain('관심사업 저장')
    expect(preview.text()).not.toContain('비교에 추가')
  })
})
