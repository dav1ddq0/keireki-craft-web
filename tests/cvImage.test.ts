// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/export', () => ({
  exportHtml: vi.fn(async () => {}),
  exportJson: vi.fn(async () => {}),
  printCv: vi.fn(async () => {}),
  downloadBlob: vi.fn(),
  sideColumnOverflows: vi.fn(async () => false),
  printTitle: () => 'Ana – CV',
}))

vi.mock('@/services/export/image', async (original) => ({
  ...(await original<typeof import('@/services/export/image')>()),
  buildCvImage: vi.fn(async () => new Blob(['jpg'], { type: 'image/jpeg' })),
}))

import * as exporters from '@/services/export'
import { buildCvImage, layoutPages, MAX_IMAGE_PIXELS, PAGE_GAP } from '@/services/export/image'
import ExportDialog from '@/components/form/ExportDialog.vue'
import ExportSheet from '@/components/form/ExportSheet.vue'
import StepExport from '@/components/form/StepExport.vue'
import { useCvStore } from '@/stores/cv'

const A4 = { width: 595.28, height: 841.89 }

describe('layoutPages (spec 062)', () => {
  it('draws an A4 page at about 192 dpi', () => {
    const layout = layoutPages([A4])
    expect(layout.width).toBe(1587)
    expect(layout.height).toBe(2245)
    expect(layout.tops).toEqual([0])
  })

  it('stacks the pages with a gap between them, none after the last', () => {
    const layout = layoutPages([A4, A4, A4])
    const s = layout.scale
    expect(layout.tops).toEqual([0, Math.round((A4.height + PAGE_GAP) * s), Math.round(2 * (A4.height + PAGE_GAP) * s)])
    expect(layout.height).toBe(Math.floor((3 * A4.height + 2 * PAGE_GAP) * s))
  })

  it('scales a long CV down to the pixels Safari on iOS allows, and leaves a short one alone', () => {
    const long = layoutPages(Array.from({ length: 10 }, () => A4))
    expect(long.width * long.height).toBeLessThanOrEqual(MAX_IMAGE_PIXELS)
    expect(long.width * long.height).toBeGreaterThan(MAX_IMAGE_PIXELS * 0.99)
    expect(long.scale).toBeLessThan(192 / 72)
    expect(layoutPages([A4, A4]).scale).toBe(192 / 72)
  })

  it('needs a page', () => {
    expect(() => layoutPages([])).toThrow()
  })
})

// jsdom ships <dialog> without showModal/close; a minimal stand-in keeps `open` and fires `close`.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(exporters.downloadBlob).mockClear()
  vi.mocked(buildCvImage).mockClear()
})

describe('JPG export (spec 062)', () => {
  async function openDialog() {
    useCvStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await wrapper.find('input[value="jpg"]').setValue(true)
    return wrapper
  }

  it('downloads "<name> – CV.jpg" from the desktop dialog and closes', async () => {
    const wrapper = await openDialog()
    expect(wrapper.find('button.btn--primary').text()).toBe('Descargar JPG')
    await wrapper.find('button.btn--primary').trigger('click')
    await vi.waitFor(() => expect(exporters.downloadBlob).toHaveBeenCalledTimes(1))
    expect(vi.mocked(exporters.downloadBlob).mock.calls[0]![1]).toBe('Ana – CV.jpg')
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('stays open and says so when the image cannot be built, without offering to print', async () => {
    vi.mocked(buildCvImage).mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = await openDialog()
    await wrapper.find('button.btn--primary').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(wrapper.find('[role="alert"]').text()).toContain('No se pudo crear la imagen')
    expect(wrapper.find('[role="alert"] button').exists()).toBe(false)
    expect(wrapper.emitted('close')).toBeFalsy()
    expect(exporters.downloadBlob).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('is a row of the phone sheet', async () => {
    useCvStore()
    const wrapper = mount(ExportSheet, { props: { open: true }, global: { stubs: { BottomSheet: { template: '<div><slot /></div>' } } } })
    const row = wrapper.findAll('button.row').find((b) => b.text().includes('Imagen (JPG)'))!
    expect(row).toBeTruthy()
    await row.trigger('click')
    await vi.waitFor(() => expect(buildCvImage).toHaveBeenCalledTimes(1))
    expect(vi.mocked(exporters.downloadBlob).mock.calls[0]![1]).toBe('Ana – CV.jpg')
  })

  it('has a card in the export step', async () => {
    useCvStore()
    const wrapper = mount(StepExport, { global: { stubs: { ReviewCard: true, PaginatedPreview: true } } })
    const button = wrapper.findAll('button').find((b) => b.text() === 'Descargar JPG')!
    expect(button).toBeTruthy()
    await button.trigger('click')
    await vi.waitFor(() => expect(exporters.downloadBlob).toHaveBeenCalledTimes(1))
    expect(vi.mocked(exporters.downloadBlob).mock.calls[0]![1]).toBe('Ana – CV.jpg')
  })
})
