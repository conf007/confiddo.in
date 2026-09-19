import { expect, test } from '@playwright/test'
import { loginAsTeacher, world } from '../fixtures'

const BANNED = [/\bscore\b/i, /accuracy/i, /\d+\s?%\s*(correct|right|marks)/i]

test('teacher flow: create → publish → remind → review → validate → history → level change', async ({ page }, testInfo) => {
  const w = world()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await loginAsTeacher(page)
  await expect(page.getByRole('heading', { name: 'My classes' })).toBeVisible()

  await page.goto(`/app/teacher/paper/new?classId=${w.class_id}`)
  await page.getByRole('checkbox', { name: /Rational Numbers/ }).check()
  await page.getByRole('button', { name: 'Generate questions' }).click()
  const continueButton = page.getByRole('button', { name: 'Looks good — continue' })
  const publishButton = page.getByRole('button', { name: 'Publish to students' })
  await expect(continueButton.or(publishButton)).toBeVisible()
  if (await continueButton.isVisible()) {
    await expect(page.getByText('10 questions ready')).toBeVisible()
    await continueButton.click()
  }
  await page.getByRole('button', { name: 'Copy as text' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /^Mathematics Quiz - .*\nMathematics • .* • 10 questions\n\nQ1\. \[1 mark\] (Simple|Medium) bank question \d+\n {2}a\) A\n/,
  )
  await page.getByRole('button', { name: 'Publish to students' }).click()
  await expect(page.getByRole('heading', { name: 'Test published' })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('published.png'), fullPage: true, animations: 'disabled' })

  await page.getByRole('link', { name: 'View test status' }).click()
  await expect(page).toHaveURL(/\/app\/teacher\/tests\/[^/]+$/)
  await expect(page.getByText('Not started (1)')).toBeVisible()
  await page.getByRole('button', { name: 'Remind Test Student' }).click()
  await expect(page.getByText('Reminder sent to Test.')).toBeVisible()
  await page.getByRole('checkbox', { name: 'Select Test Student' }).check()
  await page.getByRole('button', { name: 'Remind selected (1)' }).click()
  await expect(page.getByText('Already reminded today (1 skipped).')).toBeVisible()

  await page.goto(`/app/teacher/classes/${w.class_id}`)
  await expect(page.getByText('All tests for this class')).toBeVisible()
  await page.locator(`a[href$="/review?test=${w.tests.review}"]`).getByRole('button', { name: 'Start review' }).click()
  await expect(page).toHaveURL(new RegExp(`/app/teacher/classes/${w.class_id}/review\\?test=${w.tests.review}$`))
  await expect(page.getByRole('heading', { name: 'Weekly readiness review' })).toBeVisible()
  await page.getByRole('button', { name: /Agree with all remaining \(\d+\)/ }).click()
  await expect(page.getByTestId('bulk-overview')).toContainText('Before you agree with everyone')
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByTestId('bulk-overview')).toHaveCount(0)
  const agreeButtons = page.getByRole('button', { name: 'Agree', exact: true })
  const pendingBefore = await agreeButtons.count()
  await agreeButtons.first().click()
  await expect(page.getByRole('button', { name: 'Undo' }).first()).toBeVisible()
  await expect(agreeButtons).toHaveCount(pendingBefore - 1)
  await page.getByRole('button', { name: 'Undo' }).first().click()
  await expect(agreeButtons).toHaveCount(pendingBefore)
  await agreeButtons.first().click()
  await expect(page.getByRole('button', { name: 'Undo' }).first()).toBeVisible()
  if ((await agreeButtons.count()) > 0) {
    await page.getByRole('button', { name: /Agree with all remaining \(\d+\)/ }).first().click()
    await page.getByTestId('bulk-overview').getByRole('button', { name: /Agree with all remaining/ }).click()
  }
  await expect(page.getByRole('button', { name: 'Confirm review' })).toBeVisible()
  const queue = await page.locator('body').innerText()
  for (const re of BANNED) expect(queue).not.toMatch(re)
  await page.getByRole('button', { name: 'Confirm review' }).click()
  await expect(page.getByRole('heading', { name: 'Review complete' })).toBeVisible()

  await page.goto(`/app/teacher/classes/${w.class_id}/history`)
  await expect(page.getByTestId('review-card')).toHaveCount(1)
  await page.getByTestId('review-card').getByRole('button').click()
  await expect(page.getByText('Agreed').first()).toBeVisible()
  await page.goto('/app/teacher/history')
  await expect(page.getByText('1 past review across 1 class')).toBeVisible()
  await expect(page.getByTestId('review-card')).toHaveCount(1)

  await page.goto(`/app/teacher/classes/${w.class_id}`)
  await expect(page.getByText('Levels editable')).toBeVisible()
  await expect(page.getByRole('table').getByText('Confident', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Change level' }).first().click()
  const panel = page.getByTestId('level-change')
  await expect(panel.getByRole('button', { name: 'Save level' })).toBeDisabled()
  await panel.locator('label', { hasText: /^L3/ }).click()
  await panel.getByRole('button', { name: 'Save level' }).click()
  await expect(panel).toHaveCount(0)
  await expect(page.getByRole('table').getByText('Practicing', { exact: true })).toBeVisible()

  await page.goto('/app/teacher/profile')
  await expect(page.getByText('Meera Iyer')).toBeVisible()
  await expect(page.getByText('E2E School')).toBeVisible()
  await page.goto('/app/teacher/paper/exam')
  await expect(page.getByRole('heading', { name: 'Exam paper builder' })).toBeVisible()
  await expect(page.getByText('No syllabus boards set up yet.')).toBeVisible()
})
