import { expect, test } from '@playwright/test'
import { answerCurrentQuestion, loginAsStudent, world } from '../fixtures'

test('device switch is an explicit takeover; the displaced surface is locked, not looped', async ({ browser }, testInfo) => {
  const w = world()
  const a = await browser.newContext()
  const b = await browser.newContext()
  const pageA = await a.newPage()
  const pageB = await b.newPage()

  await loginAsStudent(pageA)
  await pageA.goto(`/app/student/tests/${w.tests.switch}/start`)
  await pageA.getByRole('button', { name: /start test|resume where i left off/i }).click()
  await expect(pageA).toHaveURL(/\/q\/\d+$/)
  await answerCurrentQuestion(pageA)
  await expect(pageA).toHaveURL(/\/q\/2$/)

  await loginAsStudent(pageB)
  await pageB.goto(`/app/student/tests/${w.tests.switch}/start`)
  await pageB.getByRole('button', { name: 'Resume where I left off' }).click()
  await expect(pageB.getByTestId('session-locked')).toBeVisible()
  await expect(pageB.getByText('This test is open on another browser.')).toBeVisible()
  await pageB.screenshot({ path: testInfo.outputPath('lock-interstitial.png'), animations: 'disabled' })
  await pageB.getByRole('button', { name: 'Continue here' }).click()
  await expect(pageB).toHaveURL(/\/q\/2$/)
  await expect(pageB.getByText('Q2 text')).toBeVisible()

  const submitsFromA: string[] = []
  pageA.on('request', (r) => {
    if (r.url().includes('/submit')) submitsFromA.push(r.url())
  })
  await pageA.getByRole('radio').first().click()
  await pageA.getByRole('button', { name: /check answer/i }).click()
  await expect(pageA.getByTestId('session-taken-over')).toBeVisible()
  await expect(pageA.getByText('This test was continued on another device.')).toBeVisible()
  await expect(pageA.getByRole('button', { name: 'Continue here' })).toHaveCount(0)
  await pageA.screenshot({ path: testInfo.outputPath('taken-over.png'), animations: 'disabled' })
  await pageA.waitForTimeout(1500)
  expect(submitsFromA).toHaveLength(1)
  await pageA.getByRole('button', { name: 'Back to home' }).click()
  await expect(pageA).toHaveURL(/\/app\/student$/)

  await answerCurrentQuestion(pageB)
  await answerCurrentQuestion(pageB)
  await expect(pageB).toHaveURL(/\/review$/)
  await pageB.getByRole('button', { name: /finish test/i }).click()
  await expect(pageB).toHaveURL(/\/done$/)

  await a.close()
  await b.close()
})
