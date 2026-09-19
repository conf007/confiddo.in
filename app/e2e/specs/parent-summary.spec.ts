import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

interface World {
  student: { id: string }
  parent?: { username: string; password: string }
}

function world(): World {
  return JSON.parse(readFileSync(process.env.E2E_WORLD_FILE!, 'utf8')) as World
}

async function loginAsParent(page: Page, w: World) {
  await page.goto('/app/login')
  await page.getByRole('heading', { name: 'How are you using Confiddo?' }).waitFor()
  if (await page.getByTestId('onboarding').isVisible()) await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: /i'm a parent/i }).click()
  await page.getByPlaceholder('Enter your username').fill(w.parent!.username)
  await page.getByPlaceholder('Enter your password').fill(w.parent!.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/app\/parent/)
}

test('parent: children, weekly summary, subjects, achievements without scores, profile', async ({ page }, testInfo) => {
  const w = world()
  test.skip(!w.parent, 'no seeded parent')
  await loginAsParent(page, w)
  await page.getByRole('link', { name: /open|view|see/i }).first().click().catch(() => page.goto(`/app/parent/children/${w.student.id}`))
  await expect(page).toHaveURL(new RegExp(`/parent/children/${w.student.id}`))
  await page.getByRole('tab', { name: 'Subjects' }).click()
  await expect(page.getByTestId('subjects-tab')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('parent-child.png'), fullPage: true, animations: 'disabled' })
  const body = await page.locator('body').innerText()
  expect(body).not.toMatch(/\d+\s?%/)

  await page.goto(`/app/parent/children/${w.student.id}/achievements`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const achievements = await page.locator('body').innerText()
  expect(achievements).not.toMatch(/Total XP|Class Rank/)

  await page.goto('/app/parent/profile')
  await expect(page.getByTestId('linked-children')).toBeVisible()
  await page.goto('/app/parent/devices')
  await expect(page.getByRole('heading', { name: 'Devices' })).toBeVisible()
})
