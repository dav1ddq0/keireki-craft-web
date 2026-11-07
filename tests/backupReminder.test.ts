// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { backupDue, snoozeUntil, type BackupState } from '@/core/backupReminder'

const exportBackup = vi.fn(async () => {})
vi.mock('@/services/export', async (original) => ({ ...(await original<object>()), exportBackup: (...args: unknown[]) => exportBackup(...(args as [])) }))

const { useCvStore } = await import('@/stores/cv')
const { useUiStore } = await import('@/stores/ui')
const BackupReminder = (await import('@/components/documents/BackupReminder.vue')).default

const NOW = new Date('2026-11-20T12:00:00Z')
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString()
const state = (patch: Partial<BackupState> = {}): BackupState => ({ lastBackupAt: null, snoozedUntil: null, watchSince: daysAgo(30), ...patch })
const docs = (...updated: number[]) => updated.map((n) => ({ updatedAt: daysAgo(n) }))

describe('when to remind of a backup (spec 078)', () => {
  it('never with no CVs', () => {
    expect(backupDue([], state(), NOW).due).toBe(false)
  })

  it('with no backup ever: once seven days have passed since counting began', () => {
    expect(backupDue(docs(1), state({ watchSince: daysAgo(3) }), NOW)).toEqual({ due: false, days: null })
    expect(backupDue(docs(1), state({ watchSince: daysAgo(7) }), NOW)).toEqual({ due: true, days: null })
  })

  it('after a backup: when it is seven days old and a CV changed after it', () => {
    expect(backupDue(docs(2), state({ lastBackupAt: daysAgo(9) }), NOW)).toEqual({ due: true, days: 9 })
    expect(backupDue(docs(10), state({ lastBackupAt: daysAgo(9) }), NOW)).toEqual({ due: false, days: 9 })
    expect(backupDue(docs(1), state({ lastBackupAt: daysAgo(3) }), NOW)).toEqual({ due: false, days: 3 })
  })

  it('not while "Not now" lasts, and again once it is over', () => {
    expect(backupDue(docs(1), state({ lastBackupAt: daysAgo(9), snoozedUntil: daysAgo(-2) }), NOW).due).toBe(false)
    expect(backupDue(docs(1), state({ lastBackupAt: daysAgo(9), snoozedUntil: daysAgo(1) }), NOW).due).toBe(true)
    expect(snoozeUntil(NOW)).toBe(daysAgo(-7))
  })
})

describe('BackupReminder (spec 078)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    exportBackup.mockReset().mockResolvedValue(undefined)
  })

  function setup(backup: Partial<BackupState>, updatedDaysAgo = 1) {
    const cv = useCvStore()
    const ui = useUiStore()
    vi.spyOn(cv, 'loadAll').mockResolvedValue([])
    cv.documents = [{ id: 'a', title: 'Uno', fullName: '', updatedAt: new Date(Date.now() - updatedDaysAgo * 864e5).toISOString(), templateId: 'classic', accentColor: '#000' }]
    const real = (n: number) => new Date(Date.now() - n * 864e5).toISOString()
    ui.backup = { lastBackupAt: null, snoozedUntil: null, watchSince: real(30), ...backup }
    const wrapper = mount(BackupReminder)
    const button = (name: string) => wrapper.findAll('button').find((b) => b.text() === name)
    return { ui, wrapper, button, real }
  }

  it('says how old the last backup is, or that there is none', async () => {
    const { wrapper, ui, real } = setup({ lastBackupAt: new Date(Date.now() - 9 * 864e5).toISOString() })
    expect(wrapper.find('.backup-reminder').text()).toContain('Tu última copia de seguridad es de hace 9 días')
    ui.backup = { ...ui.backup, lastBackupAt: null, watchSince: real(10) }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.backup-reminder').text()).toContain('Aún no tienes ninguna copia de seguridad')
  })

  it('"Not now" hides it for seven days', async () => {
    const { wrapper, ui, button } = setup({})
    await button('Ahora no')!.trigger('click')
    expect(wrapper.find('.backup-reminder').exists()).toBe(false)
    expect(Date.parse(ui.backup.snoozedUntil!) - Date.now()).toBeGreaterThan(6.9 * 864e5)
  })

  it('a backup made from it hides it', async () => {
    const { wrapper, ui, button } = setup({})
    await button('Hacer copia de seguridad')!.trigger('click')
    await flushPromises()
    expect(exportBackup).toHaveBeenCalled()
    expect(ui.backup.lastBackupAt).not.toBeNull()
    expect(wrapper.find('.backup-reminder').exists()).toBe(false)
  })

  it('is not there when nothing is due', () => {
    const { wrapper } = setup({ lastBackupAt: new Date(Date.now() - 2 * 864e5).toISOString() })
    expect(wrapper.find('.backup-reminder').exists()).toBe(false)
  })
})
