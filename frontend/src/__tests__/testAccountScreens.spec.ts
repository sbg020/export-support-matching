/*
 * TEST 계정 임시 기록이 화면에 보이는지: 서류함 표 · 제출 서류 체크리스트의 '서류함에 있음'
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { applyAccountScope } from '@/stores/accountScope'
import { useApplicationStore } from '@/stores/applicationStore'
import DocumentsView from '@/views/mypage/DocumentsView.vue'
import DocumentChecklist from '@/components/programs/DocumentChecklist.vue'
import snapshot from '@/data/published/notices.json'
import type { Program } from '@/types/program'

const TEST_USER = { id: 'TEST', role: 'test' } as const

beforeEach(() => {
  localStorage.clear()
  applyAccountScope({ id: '__reset__', role: 'test' })
  applyAccountScope(null)
  localStorage.clear()
})

async function routerAt(path: string) {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push(path)
  await router.isReady()
  return router
}

describe('TEST 계정 화면', () => {
  it('서류함에 서류 기록 7건이 상태와 함께 보이고, 예시 기록 배지는 없다', async () => {
    applyAccountScope(TEST_USER)
    const wrapper = mount(DocumentsView, { global: { plugins: [await routerAt('/manage/documents')] } })
    await flushPromises()
    const rows = wrapper.findAll('[aria-labelledby="doc-records-title"] tbody tr, #doc-records-title ~ * tbody tr')
    const text = wrapper.text()
    for (const title of ['사업자등록증명원', '표준재무제표증명(2025)', '표준재무제표증명(2024)', '중소기업확인서', 'HACCP 인증서', '사업계획서', '국세·지방세 완납증명서']) {
      expect(text).toContain(title)
    }
    expect(text).toContain('작성 중')
    expect(text).toContain('만료 예정')
    expect(text).not.toContain('예시 기록')
    expect(rows.length === 0 || rows.length >= 7).toBe(true)
    wrapper.unmount()
  })

  it("기기 공용 범위(비로그인)에는 서류 기록이 없다", async () => {
    applyAccountScope(null)
    const wrapper = mount(DocumentsView, { global: { plugins: [await routerAt('/manage/documents')] } })
    await flushPromises()
    expect(wrapper.text()).toContain('등록된 서류가 없습니다')
    wrapper.unmount()
  })

  it("준비 중 공고의 제출 서류 체크리스트에 '서류함에 있음'이 보이고 일부만 체크되어 있다", async () => {
    applyAccountScope(TEST_USER)
    const program = (snapshot.notices as unknown as Program[]).find((p) => p.id === 'P037')!
    const record = useApplicationStore().find('P037')!
    const wrapper = mount(DocumentChecklist, {
      props: { program, record },
      global: { plugins: [await routerAt('/manage/programs')] },
    })
    const vaultTags = wrapper.findAll('.checklist__tag--vault').map((t) => t.text())
    expect(vaultTags).toContain('서류함에 있음')
    expect(vaultTags.some((t) => t.includes('만료 예정'))).toBe(true)
    const boxes = wrapper.findAll('input[type="checkbox"]')
    const checked = boxes.filter((b) => (b.element as HTMLInputElement).checked)
    expect(checked.length).toBe(3)
    expect(checked.length).toBeLessThan(boxes.length)
    wrapper.unmount()
  })
})
