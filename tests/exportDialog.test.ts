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
  fileName: (_data: unknown, chosen?: string) => chosen || 'Ana – CV',
}))

vi.mock('@/services/export/pdfDirect', () => ({
  buildDirectPdf: vi.fn(async () => new Blob(['%PDF'], { type: 'application/pdf' })),
}))

import * as exporters from '@/services/export'
import { buildDirectPdf } from '@/services/export/pdfDirect'
import ExportDialog from '@/components/form/ExportDialog.vue'
import { useUiStore } from '@/stores/ui'
import { useCvStore } from '@/stores/cv'

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

beforeEach(() => setActivePinia(createPinia()))

describe('ExportDialog', () => {
  it('lists the core steps still missing content and jumps to one', async () => {
    const ui = useUiStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    const fixes = wrapper.findAll('button.fix').map((b) => b.text())
    expect(fixes).toContain('Datos personales: falta contenido')
    expect(fixes).toContain('Competencias: falta contenido')
    expect(fixes.some((f) => f.startsWith('Idiomas'))).toBe(false)

    await wrapper.findAll('button.fix')[0]!.trigger('click')
    expect(ui.step).toBe('personal')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('names the action after the format and runs that export', async () => {
    useCvStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    expect(wrapper.find('button.btn--primary').text()).toBe('Descargar PDF')

    await wrapper.find('input[value="json"]').setValue(true)
    expect(wrapper.find('button.btn--primary').text()).toBe('Descargar JSON')
    await wrapper.find('button.btn--primary').trigger('click')
    await vi.waitFor(() => expect(exporters.exportJson).toHaveBeenCalledTimes(1))
    expect(exporters.printCv).not.toHaveBeenCalled()
  })
})

describe('ExportDialog direct PDF (spec 031)', () => {
  beforeEach(() => {
    vi.mocked(exporters.downloadBlob).mockClear()
    vi.mocked(exporters.printCv).mockClear()
    vi.mocked(buildDirectPdf).mockClear()
  })

  it('downloads "<name> – CV.pdf" by default and closes once it is saved', async () => {
    useCvStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    expect(wrapper.find('input[value="pdfFile"]').element).toHaveProperty('checked', true)
    await wrapper.find('button.btn--primary').trigger('click')
    await vi.waitFor(() => expect(exporters.downloadBlob).toHaveBeenCalledTimes(1))
    expect(vi.mocked(exporters.downloadBlob).mock.calls[0]![1]).toBe('Ana – CV.pdf')
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(exporters.printCv).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('stays open when the PDF cannot be built, and offers printing instead', async () => {
    vi.mocked(buildDirectPdf).mockRejectedValueOnce(new Error('boom'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    useCvStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await wrapper.find('button.btn--primary').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(wrapper.emitted('close')).toBeFalsy()
    expect(exporters.downloadBlob).not.toHaveBeenCalled()
    await wrapper.find('[role="alert"] button').trigger('click')
    await vi.waitFor(() => expect(exporters.printCv).toHaveBeenCalledTimes(1))
    wrapper.unmount()
  })
})

describe('ExportDialog side column check (spec 033)', () => {
  it('warns when the side column does not fit on page one', async () => {
    vi.useFakeTimers()
    vi.mocked(exporters.sideColumnOverflows).mockResolvedValue(true)
    useCvStore()
    const wrapper = mount(ExportDialog, { props: { open: false }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await vi.advanceTimersByTimeAsync(600)
    expect(wrapper.find('.side-warning').text()).toContain('La columna lateral no cabe en una página')
    vi.mocked(exporters.sideColumnOverflows).mockResolvedValue(false)
    vi.useRealTimers()
    wrapper.unmount()
  })
})

describe('useCvExport file name (spec 073)', () => {
  it('names the HTML and JSON files like the PDF, or with the name typed for this download', async () => {
    const { useCvExport } = await import('@/composables/useCvExport')
    useCvStore()
    const { run } = useCvExport()
    vi.mocked(exporters.exportHtml).mockClear()
    vi.mocked(exporters.exportJson).mockClear()
    await run('html')
    expect(vi.mocked(exporters.exportHtml).mock.calls[0]![2]).toBe('Ana – CV')
    await run('json', 'CV Frontend 2026')
    expect(vi.mocked(exporters.exportJson).mock.calls[0]![1]).toBe('CV Frontend 2026')
  })
})
