import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

interface World {
  principal?: { username: string; password: string }
}

function world(): World {
  return JSON.parse(readFileSync(process.env.E2E_WORLD_FILE!, 'utf8')) as World
}

async function loginAsPrincipal(page: Page, w: World) {
  await page.goto('/app/login')
  await page.getByRole('heading', { name: 'How are you using Confiddo?' }).waitFor()
  if (await page.getByTestId('onboarding').isVisible()) await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('button', { name: /school leader/i }).click()
  await page.getByPlaceholder('Enter your username').fill(w.principal!.username)
  await page.getByPlaceholder('Enter your password').fill(w.principal!.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/app\/principal/)
}

test('principal: dashboard aggregates, heatmap, directory, students', async ({ page }, testInfo) => {
  const w = world()
  test.skip(!w.principal, 'no seeded principal')
  await loginAsPrincipal(page, w)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('principal-dashboard.png'), fullPage: true, animations: 'disabled' })
  await page.goto('/app/principal/heatmap')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.goto('/app/principal/directory')
  await expect(page.getByText('valid for 15 minutes')).toBeVisible()
  await page.goto('/app/principal/students')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
