// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import HomeCarousel from '@/components/documents/HomeCarousel.vue'
import { facesAt, TURN_MS } from '@/components/documents/homeCarousel'
import { createSampleCV } from '@/core/sample'
import { PALETTE } from '@/core/stylePresets'

describe('facesAt, which template each face holds (spec 077)', () => {
  it('shows two templates per turn, in order, and starts again after the last', () => {
    expect(facesAt(0, 8)).toEqual({ front: 0, back: 1 })
    expect(facesAt(TURN_MS, 8)).toEqual({ front: 2, back: 3 })
    expect(facesAt(4 * TURN_MS, 8)).toEqual({ front: 0, back: 1 })
    expect(facesAt(TURN_MS, 3)).toEqual({ front: 2, back: 0 })
  })

  it('changes a face only while it faces away', () => {
    // The front shows before 45 % of a turn and after 95 %; the back in between.
    for (let turn = 0; turn < 6; turn++) {
      const at = (progress: number) => facesAt((turn + progress) * TURN_MS, 8)
      const back = at(0.45).back
      for (let p = 0.45; p < 0.95; p += 0.01) expect(at(p).back).toBe(back)
      const front = at(0.95).front
      for (let p = 0.95; p < 1; p += 0.01) expect(at(p).front).toBe(front)
      for (let p = 0; p < 0.45; p += 0.01) expect(facesAt((turn + 1 + p) * TURN_MS, 8).front).toBe(front)
    }
  })
})

describe('HomeCarousel (spec 077)', () => {
  const IDS = ['classic', 'aurora', 'cobalt', 'editorial']
  let animation: { currentTime: number; playState: string; play: () => void; pause: () => void; cancel: () => void }
  let animate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    animation = {
      currentTime: 0,
      playState: 'running',
      play: vi.fn(() => (animation.playState = 'running')),
      pause: vi.fn(() => (animation.playState = 'paused')),
      cancel: vi.fn(),
    }
    animate = vi.fn(() => animation)
    Element.prototype.animate = animate as unknown as Element['animate']
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  afterEach(() => {
    delete (Element.prototype as Partial<Element>).animate
    vi.unstubAllGlobals()
  })

  /** Mounted, and redrawn once: whether it can turn is known in onMounted. */
  const mountIt = async () => {
    const wrapper = mount(HomeCarousel, { props: { sample: createSampleCV('es'), templateIds: IDS }, attachTo: document.body })
    await nextTick()
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mountIt>>
  const faceTemplates = (wrapper: Wrapper) => wrapper.findAll('.face').map((f) => f.attributes('data-template'))
  const pause = (wrapper: Wrapper) => wrapper.find('button.pause')

  it('renders the first two templates, each with only its name, as a picture', async () => {
    const wrapper = await mountIt()
    expect(faceTemplates(wrapper)).toEqual(['classic', 'aurora'])
    expect(wrapper.findAll('.face-name').map((n) => n.text())).toEqual(['Classic', 'Aurora'])
    expect(wrapper.find('.frame').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.frame').attributes()).toHaveProperty('inert')
    wrapper.unmount()
  })

  it('shows what can be adjusted in each template: its accent among the suggested colours, its font where it can change', async () => {
    const wrapper = await mountIt()
    const [classic, aurora] = wrapper.findAll('.face')
    const swatches = (face: typeof classic) => face!.findAll('.swatch').map((s) => s.attributes('style'))
    // Classic paints in its own accent, marked first among the style step's suggestions.
    expect(classic!.find('.accent-card .card-title').text()).toBe('Color de acento')
    expect(classic!.find('.swatch.on').attributes('style')).toContain('rgb(31, 58, 99)')
    expect(swatches(classic)).toHaveLength(1 + PALETTE.length)
    // Classic's font cannot be changed, so it offers none; Aurora's can, and its own is marked.
    expect(classic!.find('.font-card').exists()).toBe(false)
    expect(aurora!.find('.font-card .card-title').text()).toBe('Tipografía')
    expect(aurora!.find('.font-card li.on').text()).toBe('Inter')
    expect(aurora!.findAll('.font-card li').map((li) => li.attributes('style'))).toEqual(expect.arrayContaining([expect.stringContaining('Inter')]))
    wrapper.unmount()
  })

  it('turns, and the faces follow the animation', async () => {
    const wrapper = await mountIt()
    expect(animate).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ duration: TURN_MS, iterations: Infinity }))
    expect(animation.playState).toBe('running')
    animation.currentTime = TURN_MS * 0.75
    await pause(wrapper).trigger('click')
    expect(faceTemplates(wrapper)).toEqual(['cobalt', 'aurora'])
    wrapper.unmount()
    expect(animation.cancel).toHaveBeenCalled()
  })

  it('pauses and plays again with its button, which says what it will do', async () => {
    const wrapper = await mountIt()
    expect(pause(wrapper).attributes('aria-label')).toBe('Pausar la animación')
    await pause(wrapper).trigger('click')
    expect(animation.pause).toHaveBeenCalled()
    expect(pause(wrapper).attributes('aria-label')).toBe('Reanudar la animación')
    await pause(wrapper).trigger('click')
    expect(animation.playState).toBe('running')
    expect(pause(wrapper).attributes('aria-label')).toBe('Pausar la animación')
    wrapper.unmount()
  })

  it('stops while the tab is hidden, and goes on when it is back unless paused', async () => {
    const wrapper = await mountIt()
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(animation.playState).toBe('paused')
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(animation.playState).toBe('running')
    await pause(wrapper).trigger('click')
    visibility.mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    visibility.mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(animation.playState).toBe('paused')
    visibility.mockRestore()
    wrapper.unmount()
  })

  it('stands still with reduced motion: no animation, no button', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: query.includes('reduce'), addEventListener() {}, removeEventListener() {} })))
    const wrapper = await mountIt()
    expect(animate).not.toHaveBeenCalled()
    expect(pause(wrapper).exists()).toBe(false)
    expect(faceTemplates(wrapper)[0]).toBe('classic')
    wrapper.unmount()
  })
})
