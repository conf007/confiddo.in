import { readFileSync } from 'node:fs'
import { expect, type Page } from '@playwright/test'

export interface World {
  student: { username: string; password: string; id: string }
  tests: { core: string; phone: string; switch: string; both: string }
}

const PROD_HOST = 'conf007--confiddo-backend'

export function world(): World {
  const file = process.env.E2E_WORLD_FILE
  if (!file) throw new Error('E2E_WORLD_FILE not set (run e2e/run.sh)')
  const api = process.env.E2E_BASE_URL ?? ''
  if (api.includes(PROD_HOST)) throw new Error('refusing to run E2E against production')
  return JSON.parse(readFileSync(file, 'utf8')) as World
}

export function apiBase(): string {
  return `${process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8765'}/v1`
}

export async function loginAsStudent(page: Page, w = world()) {
  await page.goto('/app/login')
  await page.getByRole('heading', { name: 'How are you using Confiddo?' }).waitFor()
  const onboarding = page.getByTestId('onboarding')
  if (await onboarding.isVisible()) {
    await expect(onboarding).toContainText('Built for You, Not for Your Marks')
    await page.getByRole('button', { name: 'Skip' }).click()
    await expect(onboarding).toHaveCount(0)
  }
  await page.getByRole('button', { name: /i'm a student/i }).click()
  await page.getByPlaceholder('Enter your username').fill(w.student.username)
  await page.getByPlaceholder('Enter your password').fill(w.student.password)
  await page.getByRole('button', { name: 'Log In' }).click()
  await expect(page).toHaveURL(/\/app\/student/)
}

export async function studentAuth(page: Page) {
  return page.evaluate(() => ({
    token: window.localStorage.getItem('confiddo.access_token'),
    surfaceId: window.localStorage.getItem('confiddo.surface_id'),
  }))
}

export async function answerCurrentQuestion(page: Page) {
  await page.getByRole('radio').first().click()
  await page.getByRole('button', { name: /check answer/i }).click()
  await page.getByRole('button', { name: /next question|review my answers/i }).click()
}
