// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomSheet from '@/components/ui/BottomSheet.vue'

// jsdom ships <dialog> without showModal/close; a minimal stand-in keeps `open`.
beforeAll(() => {
  const proto = HTMLDialogElement.prototype
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  proto.close = function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

describe('BottomSheet focus on open (spec 053)', () => {
  it('gives the focus to the sheet itself, not to the close button Safari would ring', () => {
    const wrapper = mount(BottomSheet, { props: { open: true, title: 'Exportar' }, attachTo: document.body })
    expect(wrapper.find('dialog').attributes('autofocus')).toBeDefined()
    wrapper.unmount()
  })

  it('shows no ring on the sheet and leaves room below the close button for its own', () => {
    const source = readFileSync('src/components/ui/BottomSheet.vue', 'utf8')
    expect(source).toMatch(/\.sheet:focus-visible\s*\{\s*outline:\s*none;/)
    // The ring reaches 4 px past the 48 px button (2 px + 2 px offset).
    const bottom = Number(source.match(/\.head \{[^}]*padding: \d+px \d+px (\d+)px/)?.[1])
    expect(bottom).toBeGreaterThanOrEqual(4)
  })
})
