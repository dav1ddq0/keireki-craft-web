// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/services/export/image', () => ({
  buildCvImage: vi.fn(async (_data: unknown, _id: string, type: string) => new Blob(['png'], { type })),
}))

import { buildCvImage } from '@/services/export/image'
import CopyImageButton from '@/components/preview/CopyImageButton.vue'
import PreviewPane from '@/components/preview/PreviewPane.vue'

/** The async Clipboard API as Chromium and Safari have it: a ClipboardItem holds a type → blob or promise. */
class FakeClipboardItem {
  static supports = (type: string): boolean => type === 'image/png'
  constructor(readonly items: Record<string, Blob | Promise<Blob>>) {}
}
const write = vi.fn(async (items: FakeClipboardItem[]) => {
  await items[0]!.items['image/png']
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('ClipboardItem', FakeClipboardItem)
  Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true })
  write.mockClear()
  vi.mocked(buildCvImage).mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
})

describe('Copy image (spec 062)', () => {
  it('puts the CV on the clipboard as a PNG, and says when it is done', async () => {
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('output').text()).toBe('Copiando…')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('Copiado'))
    expect(write).toHaveBeenCalledTimes(1)
    const item = write.mock.calls[0]![0][0]!
    expect(Object.keys(item.items)).toEqual(['image/png'])
    // Handed over as a promise: the click is still the user's gesture while the image is built.
    expect(item.items['image/png']).toBeInstanceOf(Promise)
    expect((await item.items['image/png']).type).toBe('image/png')
    expect(vi.mocked(buildCvImage).mock.calls[0]![2]).toBe('image/png')
  })

  it('says so when the browser refuses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    write.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('No se pudo copiar'))
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('goes back to rest after a while', async () => {
    vi.useFakeTimers()
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('Copiado'))
    await vi.advanceTimersByTimeAsync(2100)
    expect(wrapper.find('output').text()).toBe('')
    vi.useRealTimers()
  })

  it('is not shown where images cannot be copied', () => {
    vi.unstubAllGlobals()
    expect(mount(CopyImageButton).find('button').exists()).toBe(false)
  })

  it('is not shown where the clipboard takes images but not PNG', () => {
    vi.stubGlobal('ClipboardItem', class extends FakeClipboardItem {
      static override supports = () => false
    })
    expect(mount(CopyImageButton).find('button').exists()).toBe(false)
  })

  it('builds a lighter picture on a touch screen, where a phone is slow and Safari gives up', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(pointer: coarse)' }))
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('Copiado'))
    expect(vi.mocked(buildCvImage).mock.calls[0]![3]).toBe(144)
  })

  it('keeps the export resolution with a mouse', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('Copiado'))
    expect(vi.mocked(buildCvImage).mock.calls[0]![3]).toBeUndefined()
  })

  it('offers Share with the picture already built when the copy fails and the phone can share it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    write.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const share = vi.fn(async () => {})
    Object.assign(navigator, { share, canShare: (data: { files?: File[] }) => !!data.files?.length })
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.share-btn').exists()).toBe(true))
    expect(wrapper.find('output').text()).toBe('No se pudo copiar')
    await wrapper.find('.share-btn').trigger('click')
    expect(share).toHaveBeenCalledTimes(1)
    const file = (share.mock.calls[0] as unknown as [{ files: File[] }])[0].files[0]!
    expect(file.type).toBe('image/png')
    expect(file.name.endsWith('.png')).toBe(true)
    // The picture is not built again: the tap must open the sheet at once.
    expect(buildCvImage).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(wrapper.find('.share-btn').exists()).toBe(false))
    Object.assign(navigator, { share: undefined, canShare: undefined })
  })

  it('offers no Share where files cannot be shared', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    write.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const wrapper = mount(CopyImageButton)
    await wrapper.find('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('output').text()).toBe('No se pudo copiar'))
    expect(wrapper.find('.share-btn').exists()).toBe(false)
  })

  it('sits in the preview toolbar', () => {
    const wrapper = mount(PreviewPane, { global: { stubs: { CvRenderer: true } } })
    expect(wrapper.find('header button[aria-label="Copiar imagen"]').exists()).toBe(true)
  })
})
