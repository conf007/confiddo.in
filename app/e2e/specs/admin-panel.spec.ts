import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Admin panel (Flutter Web, served under /admin/) against the scratch backend booted by
 * confiddo/backend/e2e/boot_admin.sh (:8766, seeded admin in e2e/.admin.json).
 *   E2E_ADMIN_FILE=../confiddo/backend/e2e/.admin.json E2E_WEB_URL=http://127.0.0.1:4174 \
 *     npx playwright test e2e/specs/admin-panel.spec.ts --project=desktop
 * Flutter renders to canvas; every locator below goes through the semantics tree that
 * main.dart enables with SemanticsBinding.ensureSemantics().
 */
test.use({ baseURL: 'http://127.0.0.1:4174' })

const API = `${process.env.E2E_ADMIN_API ?? 'http://127.0.0.1:8766'}/v1`
const PROD_HOST = 'conf007--confiddo-backend'
const SIDEBAR_WIDTH = 260

interface Admin { username: string; password: string; id: string }

function admin(): Admin {
  const file = process.env.E2E_ADMIN_FILE
  if (!file) throw new Error('E2E_ADMIN_FILE not set (run confiddo/backend/e2e/boot_admin.sh)')
  if (API.includes(PROD_HOST)) throw new Error('refusing to run E2E against production')
  return (JSON.parse(readFileSync(file, 'utf8')) as { admin: Admin }).admin
}

async function apiToken(request: APIRequestContext, a: Admin): Promise<string> {
  const r = await request.post(`${API}/auth/admin/login`, { data: { username: a.username, password: a.password } })
  expect(r.ok(), await r.text()).toBeTruthy()
  return ((await r.json()) as { data: { access_token: string } }).data.access_token
}

async function loginAsAdmin(page: Page, a: Admin) {
  await page.goto('/admin/')
  await fillField(page, 'Username', a.username)
  await fillField(page, 'Password', a.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page.getByText('Welcome back, E2E Admin!')).toBeVisible()
}

/** Sidebar entry (InkWell rows are exposed as buttons named by their label). */
async function clickNav(page: Page, label: string) {
  const button = page.getByRole('button', { name: label, exact: true })
  const box = await button.boundingBox()
  expect(box, `sidebar entry "${label}"`).not.toBeNull()
  expect(box!.x).toBeLessThan(SIDEBAR_WIDTH)
  await button.click()
}

/**
 * Flutter takes over the semantics <input> on first focus and re-syncs its DOM value from the
 * (still empty) controller, which can clobber a fill() that lands in the same frame. Focus first,
 * fill, verify, retry — the DOM value mirrors the controller once Flutter owns the element.
 */
async function fillField(page: Page, label: string, value: string) {
  const field = page.getByLabel(label)
  for (let attempt = 1; ; attempt++) {
    await field.focus()
    await expect(field).toBeFocused()
    await field.fill(value)
    try {
      await expect(field).toHaveValue(value, { timeout: 1_500 })
      return
    } catch (e) {
      if (attempt >= 4) throw e
    }
  }
}

function storedTokens(page: Page) {
  return page.evaluate(() => ({
    access: window.localStorage.getItem('confiddo_admin.access_token'),
    refresh: window.localStorage.getItem('confiddo_admin.refresh_token'),
    expiresAt: window.localStorage.getItem('confiddo_admin.expires_at'),
  }))
}

const CSV = [
  'difficulty,question_text,option_a,option_b,option_c,option_d,correct_option',
  'Simple,What is 2 + 2?,3,4,5,6,B',
  'Medium,What is 12 x 12?,124,144,154,164,B',
  'Hard,What is the square root of 289?,15,16,17,18,C',
].join('\n')

test('A-01/A-28: login form is empty, tokens persist across reload, logout clears them', async ({ page }, testInfo) => {
  const a = admin()
  await page.goto('/admin/')
  await expect(page.getByLabel('Username')).toHaveValue('')
  await expect(page.getByLabel('Password')).toHaveValue('')
  await page.screenshot({ path: testInfo.outputPath('admin-login.png'), animations: 'disabled' })

  await loginAsAdmin(page, a)
  const before = await storedTokens(page)
  expect(before.access).toBeTruthy()
  expect(before.refresh).toBeTruthy()
  expect(new Date(before.expiresAt!).getTime()).toBeGreaterThan(Date.now())

  await page.reload()
  await expect(page.getByText('Welcome back, E2E Admin!')).toBeVisible()
  await expect(page.getByLabel('Username')).toHaveCount(0)

  await page.getByRole('button', { name: 'Logout' }).click()
  await page.getByRole('button', { name: 'Logout' }).last().click()
  await expect(page.getByLabel('Username')).toBeVisible()
  const after = await storedTokens(page)
  expect(after).toEqual({ access: null, refresh: null, expiresAt: null })
})

test('A-28: a 401 from the API drops the session and returns to login', async ({ page }) => {
  const a = admin()
  await loginAsAdmin(page, a)
  await page.evaluate(() => window.localStorage.setItem('confiddo_admin.access_token', 'not-a-jwt'))
  await page.reload()
  await expect(page.getByLabel('Username')).toBeVisible()
  expect((await storedTokens(page)).access).toBeNull()
})

test('A-03/A-04: dashboard renders overview stats, readiness distribution and school cards', async ({ page, request }, testInfo) => {
  const a = admin()
  const token = await apiToken(request, a)
  const overview = await request.get(`${API}/admin/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } })
  expect(overview.ok()).toBeTruthy()
  const o = ((await overview.json()) as { data: Record<string, unknown> }).data
  const dist = o.readiness_distribution as Record<string, number>

  await loginAsAdmin(page, a)
  for (const label of ['Schools', 'Teachers', 'Students', 'Parents', 'Active students', 'Completion rate', 'Sessions']) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible()
  }
  await expect(page.getByText(`${o.completed_sessions} / ${o.total_sessions}`, { exact: true })).toBeVisible()
  await expect(page.getByText('Readiness distribution')).toBeVisible()
  // Each readiness bar is a LinearProgressIndicator, which exposes its value as "<pct>%" in the
  // semantics tree — same format as the completion-rate card, so count the expected strings.
  const levels = ['Avoidant', 'Attempting', 'Practicing', 'Confident', 'Competition Ready']
  const total = levels.reduce((s, l) => s + (dist[l] ?? 0), 0)
  const expectedPct: Record<string, number> = {}
  const bump = (s: string) => (expectedPct[s] = (expectedPct[s] ?? 0) + 1)
  bump(`${Math.round((o.completion_rate as number) * 100)}%`)
  for (const label of levels) {
    expect(dist, `backend readiness_distribution has ${label}`).toHaveProperty(label)
    await expect(page.getByText(label, { exact: true })).toBeVisible()
    bump(`${total === 0 ? 0 : Math.round((dist[label] / total) * 100)}%`)
  }
  for (const [pct, n] of Object.entries(expectedPct)) {
    await expect(page.getByText(pct, { exact: true })).toHaveCount(n)
  }
  await page.screenshot({ path: testInfo.outputPath('admin-dashboard.png'), fullPage: true, animations: 'disabled' })
})

test('A-05/A-06: schools list, create a school, it shows in the list and via the API', async ({ page, request }, testInfo) => {
  const a = admin()
  const stamp = Date.now().toString().slice(-6)
  const name = `E2E School ${stamp}`
  await loginAsAdmin(page, a)
  await clickNav(page, 'Schools')
  await expect(page.getByRole('button', { name: 'Add School' }).first()).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-schools-empty.png'), animations: 'disabled' })

  await page.getByRole('button', { name: 'Add School' }).first().click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await fillField(page, 'School Name *', name)
  await fillField(page, 'School Code *', `E2E${stamp}`)
  await fillField(page, 'Board *', 'CBSE')
  await fillField(page, 'City *', 'Pune')
  await fillField(page, 'State *', 'Maharashtra')
  await dialog.getByRole('button', { name: 'Add School' }).click()
  // The SnackBar is announced through an aria-live div as well as its semantics node.
  await expect(page.getByText('School created successfully').first()).toBeVisible()
  await expect(page.getByRole('group', { name: new RegExp(`^${name} E2E${stamp} Pune CBSE`) })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-schools-created.png'), animations: 'disabled' })

  const token = await apiToken(request, a)
  const list = await request.get(`${API}/admin/schools`, { headers: { Authorization: `Bearer ${token}` } })
  expect(list.ok()).toBeTruthy()
  const body = (await list.json()) as { data: unknown }
  const schools = (Array.isArray(body.data) ? body.data : (body.data as { schools: unknown[] }).schools) as { name: string }[]
  expect(schools.map((s) => s.name)).toContain(name)
})

test('A-17/A-20/A-22: question banks list, detail, and CSV export really downloads', async ({ page, request }, testInfo) => {
  const a = admin()
  const token = await apiToken(request, a)
  // One bank per (board, class, subject, chapter); pick a chapter this backend has not seen yet.
  const chapter = 2 + (Date.now() % 90)
  const chapterName = `E2E Chapter ${Date.now().toString().slice(-6)}`
  const filename = `CBSE_8_Mathematics_Ch${chapter}.csv`
  const upload = await request.post(`${API}/admin/question-banks/upload`, {
    headers: { Authorization: `Bearer ${token}` },
    multipart: {
      board: 'CBSE',
      class_number: '8',
      subject: 'Mathematics',
      chapter_number: String(chapter),
      chapter_name: chapterName,
      auto_approve: 'true',
      file: { name: 'bank.csv', mimeType: 'text/csv', buffer: Buffer.from(CSV) },
    },
  })
  expect(upload.ok(), await upload.text()).toBeTruthy()

  await loginAsAdmin(page, a)
  await clickNav(page, 'Question Banks')
  // A list row is one merged semantics group; its text is the group's accessible name.
  const row = page.getByRole('group', { name: new RegExp(`CBSE 8 Mathematics Ch ${chapter}: ${chapterName} 3 `) })
  await expect(row).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-question-banks.png'), animations: 'disabled' })

  const expectDownload = async (trigger: () => Promise<void>, which: string) => {
    const [download] = await Promise.all([page.waitForEvent('download'), trigger()])
    expect(download.suggestedFilename(), which).toBe(filename)
    const saved = testInfo.outputPath(`exported-${which}.csv`)
    await download.saveAs(saved)
    const text = readFileSync(saved, 'utf8')
    expect(text, which).toContain('What is 2 + 2?')
    expect(text, which).toContain('What is the square root of 289?')
  }
  await expectDownload(() => row.getByRole('button', { name: 'Export' }).click(), 'list')

  await row.getByRole('button', { name: 'View' }).click()
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible()
  await expect(page.getByRole('group', { name: /1 - Simple What is 2 \+ 2\? B/ })).toBeVisible()
  await expect(page.getByRole('group', { name: /3 - Hard What is the square root of 289\? C/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-question-bank-detail.png'), animations: 'disabled' })
  await expectDownload(() => page.getByRole('button', { name: 'Export CSV' }).click(), 'detail')
})

test('A-25/A-28: reported questions and settings', async ({ page }, testInfo) => {
  const a = admin()
  await loginAsAdmin(page, a)
  await clickNav(page, 'Reported Questions')
  await expect(page.getByText('No reported questions')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('admin-reported-questions.png'), animations: 'disabled' })

  await clickNav(page, 'Settings')
  // The settings cards render as one semantics group whose text content carries all the copy.
  const settings = page.getByRole('group').filter({ hasText: 'System Configuration' })
  await expect(settings).toBeVisible()
  await expect(settings).toContainText(`Base URL ${API}`)
  await expect(settings).toContainText('Token Storage Browser localStorage on this device')
  await expect(settings).toContainText('Token Refresh None — sign in again when the session expires')
  await expect(settings).toContainText(/Session Expires\s+\w{3} \d{2}, \d{4} \d{2}:\d{2}/)
  await expect(settings).not.toContainText('Secure local storage')
  await expect(settings).not.toContainText('Automatic on expiry')
  await page.screenshot({ path: testInfo.outputPath('admin-settings.png'), animations: 'disabled' })
})
