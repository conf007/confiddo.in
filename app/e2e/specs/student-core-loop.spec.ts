import { expect, test } from '@playwright/test'
import { answerCurrentQuestion, loginAsStudent, world } from '../fixtures'

const BANNED = [/\bscore\b/i, /\d+\s?%/, /accuracy/i, /you got \d+/i]

test('student core loop: characters, history, a full test, no score anywhere', async ({ page }, testInfo) => {
  const w = world()
  const testId = testInfo.project.name === 'budget-phone' ? w.tests.phone : w.tests.core
  await loginAsStudent(page)

  await page.goto('/app/student/characters')
  await expect(page.getByRole('heading', { name: 'Your crew' })).toBeVisible()
  await expect(page.getByText('6/18 unlocked')).toBeVisible()
  await expect(page.getByText('Onyx')).toBeVisible()
  await expect(page.getByText('Apex')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('characters.png'), fullPage: true, animations: 'disabled' })

  const equipped = await page.getByTestId('header-character').getAttribute('data-character')
  const pick = equipped === 'kira' ? 'Raze' : 'Kira'
  await page.getByRole('button', { name: new RegExp(`^${pick}`) }).click()
  await page.getByRole('button', { name: `Choose ${pick}` }).click()
  await expect(page.getByText('Equipped')).toBeVisible()
  await expect(page.getByTestId('header-character')).toHaveAttribute('data-character', pick.toLowerCase())

  await page.goto('/app/student/history')
  await expect(page.getByRole('heading', { name: 'My past tests' })).toBeVisible()

  await page.goto('/app/student/progress')
  await expect(page.getByText('Level Journey')).toBeVisible()
  await expect(page.getByText('← YOU')).toBeVisible()
  await expect(page.getByText("This Week's Goals")).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('progress.png'), fullPage: true, animations: 'disabled' })

  await page.goto('/app/student')
  await expect(page.getByTestId('level-card')).toContainText(/\d+ XP to (Rising Star ⚡|Super Nova 💫|Blazing Pro 🔥|Galaxy Master 🌌)/)

  await page.goto('/app/student/class-progress')
  await expect(page.getByText('Class Galaxy Map')).toBeVisible()
  await expect(page.getByTestId('galaxy-map')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('class.png'), fullPage: true, animations: 'disabled' })

  await page.goto('/app/about')
  await expect(page.getByRole('heading', { name: 'CONFIDDO' })).toBeVisible()
  await page.goto('/app/student/notifications')
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()

  await page.goto(`/app/student/tests/${testId}/start`)
  await page.getByRole('button', { name: 'Start test' }).click()
  await expect(page).toHaveURL(/\/q\/1$/)
  await page.getByRole('button', { name: 'XP quick guide' }).click()
  await expect(page.getByTestId('xp-quick-guide')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('xp-quick-guide')).toHaveCount(0)
  for (let i = 0; i < 3; i++) await answerCurrentQuestion(page)
  await expect(page).toHaveURL(/\/review$/)
  await page.getByRole('button', { name: /finish test/i }).click()
  await expect(page).toHaveURL(/\/done$/)
  const done = await page.locator('body').innerText()
  for (const re of BANNED) expect(done).not.toMatch(re)

  await page.goto('/app/student/history')
  const review = page.locator(`a[href$="/student/tests/${testId}/results"]`)
  await expect(review.locator('..').getByText('Completed')).toBeVisible()
  await review.click()
  await expect(page).toHaveURL(/\/results$/)
  const results = await page.locator('body').innerText()
  for (const re of BANNED) expect(results).not.toMatch(re)
})
