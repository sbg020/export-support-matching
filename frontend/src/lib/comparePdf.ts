/*
 * 공고 비교 결과를 PDF로 저장한다 (브라우저에서 만든다, 서버로 보내지 않음).
 * 화면의 비교 영역을 그림으로 옮긴 뒤 A4 가로 쪽에 나눠 담는다. 한글 글꼴을 따로 넣지 않아도 화면과 같게 보인다.
 * 라이브러리는 버튼을 누를 때만 불러온다(첫 화면 번들에 넣지 않음).
 */
import { SITE_TODAY } from '@/lib/siteClock'

export function comparePdfFileName(date: string = SITE_TODAY): string {
  return `공고비교_${date.split('-').join('')}.pdf`
}

/** 비교 영역(element)을 PDF Blob으로 만든다 */
export async function buildComparePdf(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas-pro'), import('jspdf')])
  // 가로로 스크롤되는 표도 전부 담도록, 가장 넓은 내용 폭으로 펼쳐서 그린다
  // 화면낭독기 전용 글(visually-hidden)처럼 아주 작은 요소는 빼고, 실제로 가로 스크롤되는 영역만 본다
  const isScroller = (el: HTMLElement) => el.clientWidth > 40 && !el.classList.contains('visually-hidden') && el.scrollWidth > el.clientWidth + 1
  const scrollers = [...element.querySelectorAll<HTMLElement>('*')].filter(isScroller)
  const wide = Math.max(element.clientWidth, ...scrollers.map((el) => el.scrollWidth + (element.clientWidth - el.clientWidth)))
  const canvas = await html2canvas(element, {
    scale: 1.6,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    width: wide,
    windowWidth: Math.max(wide, document.documentElement.clientWidth),
    ignoreElements: (el) => el.hasAttribute('data-pdf-ignore'),
    onclone: (doc) => {
      const root = element.id ? doc.getElementById(element.id) : null
      if (!root) return
      root.style.width = `${wide}px`
      root.style.maxWidth = 'none'
      for (const el of root.querySelectorAll<HTMLElement>('*')) {
        if (el.classList.contains('visually-hidden') || el.clientWidth <= 40) continue
        const overflowX = doc.defaultView?.getComputedStyle(el).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') el.style.overflow = 'visible'
      }
    },
  })

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2 - 6
  const pxPerMm = canvas.width / usableW
  const sliceH = Math.floor(usableH * pxPerMm)

  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page += 1) {
    const h = Math.min(sliceH, canvas.height - y)
    const part = document.createElement('canvas')
    part.width = canvas.width
    part.height = h
    part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (page > 0) pdf.addPage()
    // JPEG로 담아 파일 크기를 줄인다 (흰 바탕이라 투명도가 필요 없다)
    pdf.addImage(part.toDataURL('image/jpeg', 0.86), 'JPEG', margin, margin, usableW, h / pxPerMm, undefined, 'FAST')
    pdf.setFontSize(8)
    pdf.setTextColor(120)
    pdf.text(`Export Compass · ${SITE_TODAY} · ${page + 1}`, pageW - margin, pageH - 5, { align: 'right' })
  }
  return pdf.output('blob')
}

/** PDF를 만들어 내려받는다 */
export async function downloadComparePdf(element: HTMLElement, fileName = comparePdfFileName()): Promise<void> {
  const blob = await buildComparePdf(element)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
