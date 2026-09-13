import { expect, test } from '@playwright/test'
import { apiBase, loginAsStudent, studentAuth, world } from '../fixtures'

test('with both surfaces open, the non-holder can neither load a question nor submit', async ({ browser }) => {
  const w = world()
  const a = await browser.newContext()
  const b = await browser.newContext()
  const pageA = await a.newPage()
  const pageB = await b.newPage()

  await loginAsStudent(pageA)
  await pageA.goto(`/app/student/tests/${w.tests.both}/start`)
  await pageA.getByRole('button', { name: /start test|resume where i left off/i }).click()
  await expect(pageA).toHaveURL(/\/sessions\/[^/]+\/q\/\d+$/)
  const sid = pageA.url().match(/\/sessions\/([^/]+)\/q\//)![1]
  await expect(pageA.getByText(/Q\d+ text/)).toBeVisible()

  await loginAsStudent(pageB)
  await pageB.goto(`/app/student/sessions/${sid}/q/1`)
  await expect(pageB.getByTestId('session-locked')).toBeVisible()
  await expect(pageB.getByText(/Q\d+ text/)).toHaveCount(0)

  const authB = await studentAuth(pageB)
  const headers = {
    Authorization: `Bearer ${authB.token}`,
    'X-Surface-Id': authB.surfaceId!,
    'X-Surface-Kind': 'web',
    'Content-Type': 'application/json',
  }
  const bundle = await pageB.request.get(`${apiBase()}/student/sessions/${sid}/bundle`, { headers })
  expect(bundle.status()).toBe(423)
  expect((await bundle.json()).detail.error.code).toBe('SESSION_LOCKED_OTHER_SURFACE')

  const question = await pageB.request.get(`${apiBase()}/student/sessions/${sid}/questions/1`, { headers })
  expect(question.status()).toBe(423)

  const authA = await studentAuth(pageA)
  const bundleA = await pageA.request.get(`${apiBase()}/student/sessions/${sid}/bundle`, {
    headers: { ...headers, Authorization: `Bearer ${authA.token}`, 'X-Surface-Id': authA.surfaceId! },
  })
  expect(bundleA.status()).toBe(200)
  const q1 = (await bundleA.json()).data.questions[0]
  const submitB = await pageB.request.post(`${apiBase()}/student/sessions/${sid}/questions/${q1.id}/submit`, {
    headers,
    data: { selected_option_id: q1.options[0].id },
  })
  expect(submitB.status()).toBe(423)

  await pageA.getByRole('radio').first().click()
  await pageA.getByRole('button', { name: /check answer/i }).click()
  await expect(pageA.getByRole('button', { name: /next question/i })).toBeVisible()

  await a.close()
  await b.close()
})
