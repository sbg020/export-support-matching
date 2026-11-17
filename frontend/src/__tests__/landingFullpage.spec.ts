/*
 * 메인 랜딩 풀페이지 스크롤: 멈춤 위치 계산과 다음 위치 고르기 (순수 함수)
 */
import { describe, expect, it } from 'vitest'
import { MIN_ZOOM, computeStops, fitZoom, nextStop } from '@/composables/useFullPageScroll'

const VIEWPORT = 900
const HEADER = 72

describe('멈춤 위치', () => {
  it('섹션 시작을 헤더 아래에 맞추고, 히어로(맨 위)는 0, 마지막은 문서 끝', () => {
    const sections = [
      { top: 0, height: 900 },
      { top: 900, height: 828 },
      { top: 1728, height: 828 },
    ]
    const max = 2556 + 200 - VIEWPORT // 바닥글 200px
    expect(computeStops(sections, VIEWPORT, HEADER, max)).toEqual([0, 828, 1656, 1856])
  })

  it('화면보다 긴 섹션은 화면 높이(헤더 제외)만큼씩, 끝에서도 멈춘다', () => {
    const stops = computeStops([{ top: 1000, height: 2400 }], VIEWPORT, HEADER, 5000)
    // 시작 928 → 1756 → 2584 → 끝(1000 + 2400 - 900 = 2500)보다 앞까지, 끝 2500, 문서 끝 5000
    expect(stops).toEqual([928, 1756, 2500, 5000])
  })
})

describe('다음 위치', () => {
  const stops = [0, 828, 1656, 1856]
  it('아래로는 지금보다 큰 첫 위치, 위로는 지금보다 작은 마지막 위치', () => {
    expect(nextStop(stops, 0, 1)).toBe(828)
    expect(nextStop(stops, 828, 1)).toBe(1656)
    expect(nextStop(stops, 1000, -1)).toBe(828)
    expect(nextStop(stops, 828, -1)).toBe(0)
  })

  it('끝에서는 더 가지 않는다', () => {
    expect(nextStop(stops, 1856, 1)).toBeNull()
    expect(nextStop(stops, 0, -1)).toBeNull()
  })
})

describe('한 화면에 맞추기', () => {
  it('넘치지 않으면 1, 넘치면 비율대로 줄이되 0.7보다 작게 하지 않는다', () => {
    expect(fitZoom(700, 800)).toBe(1)
    expect(fitZoom(1000, 800)).toBe(0.8)
    expect(fitZoom(2000, 800)).toBe(MIN_ZOOM)
  })
})
