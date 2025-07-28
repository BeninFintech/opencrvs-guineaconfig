import { expect, test, type Page } from '@playwright/test'
import { getToken, loginToV2, logout } from '../../helpers'
import { faker } from '@faker-js/faker'
import { CREDENTIALS } from '../../constants'
import {
  createDeclaration,
  Declaration
} from '../v2-test-data/birth-declaration'
import { ensureAssigned, expectInUrl, selectAction } from '../../v2-utils'
import {
  formatV2ChildName,
  REQUIRED_VALIDATION_ERROR
} from '../v2-birth/helpers'

test.describe.serial('Birth correction flow', () => {
  let declaration: Declaration
  let eventId: string
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const token = await getToken(
      CREDENTIALS.LOCAL_REGISTRAR.USERNAME,
      CREDENTIALS.LOCAL_REGISTRAR.PASSWORD
    )
    const res = await createDeclaration(
      token,
      undefined,
      undefined,
      'HEALTH_FACILITY'
    )
    declaration = res.declaration
    eventId = res.eventId

    page = await browser.newPage()
    await loginToV2(page, CREDENTIALS.REGISTRATION_AGENT)
  })

  test('Navigate to the correction form', async () => {
    await page.getByRole('button', { name: 'Ready to print' }).click()
    await page
      .getByRole('button', { name: formatV2ChildName(declaration) })
      .click()
    await ensureAssigned(page)
    await selectAction(page, 'Correct record')
  })

  test('Try to continue without filling in required fields', async () => {
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.locator('#requester____type_error')).toHaveText(
      REQUIRED_VALIDATION_ERROR
    )
    await expect(page.locator('#reason____option_error')).toHaveText(
      REQUIRED_VALIDATION_ERROR
    )
  })

  test('Fill in the correction details form', async () => {
    await page.locator('#requester____type').click()
    await page.getByText('Informant (Mother)', { exact: true }).click()

    await page.locator('#reason____option').click()
    await page
      .getByText('Myself or an agent made a mistake (Clerical error)', {
        exact: true
      })
      .click()

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Verified' }).click()
  })

  test('Fill in the supporting documents form', async () => {
    const path = require('path')
    const attachmentPath = path.resolve(__dirname, './image.png')
    const inputFile = await page.locator(
      'input[name="documents____supportingDocs"][type="file"]'
    )

    await page.getByTestId('select__documents____supportingDocs').click()
    await page.getByText('Affidavit', { exact: true }).click()

    await inputFile.setInputFiles(attachmentPath)

    await page.getByTestId('select__documents____supportingDocs').click()
    await page.getByText('Court Document', { exact: true }).click()
    await inputFile.setInputFiles(attachmentPath)

    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('Fill in the fees form', async () => {
    await page
      .locator('#fees____amount')
      .fill(faker.number.int({ min: 1, max: 1000 }).toString())

    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('Review page should be displayed and continue button should be disabled', async () => {
    await expectInUrl(page, `/events/request-correction/${eventId}/review`)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  test('Go through the declaration correction form without changing any details', async () => {
    await page
      .getByRole('button', { name: 'Change all', exact: true })
      .first()
      .click()

    await expect(
      page.getByRole('button', { name: 'Back to review' })
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('button', { name: 'Back to review' })
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('button', { name: 'Back to review' })
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(
      page.getByRole('button', { name: 'Back to review' })
    ).toBeEnabled()

    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('When back on review page, continue button should still be disabled', async () => {
    await expectInUrl(page, `/events/request-correction/${eventId}/review`)
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  test('After changing a value, continue button should be enabled', async () => {
    await page.getByTestId('change-button-informant.email').click()

    await page
      .getByTestId('text__informant____email')
      .fill(faker.internet.email())

    await page.getByRole('button', { name: 'Back to review' }).click()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  test('After changing the value back to the original, continue button should be disabled', async () => {
    await page.getByTestId('change-button-informant.email').click()

    await page
      .getByTestId('text__informant____email')
      .fill(declaration['informant.email'])

    await page.getByRole('button', { name: 'Back to review' }).click()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  test('After changing another value to an invalid value, continue button should still be disabled', async () => {
    await page.getByTestId('change-button-child.dob').click()
    // Future date
    await page.getByTestId('child____dob-yyyy').fill('2045')
    await page.getByRole('button', { name: 'Back to review' }).click()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await expect(page.getByText('Must be a valid birth date')).toBeVisible()
  })

  const reasonForDelayedRegistration = faker.lorem.sentence(4)

  test('After changing the value to a valid value, continue button should be enabled', async () => {
    await page.getByTestId('change-button-child.dob').click()
    await page.getByTestId('child____dob-yyyy').fill('2024')
    await page.getByTestId('child____dob-mm').fill('6')
    await page.getByTestId('child____dob-dd').fill('24')
    await page
      .getByTestId('text__child____reason')
      .fill(reasonForDelayedRegistration)
    await page.getByRole('button', { name: 'Back to review' }).click()
    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  test('Continue to the summary page', async () => {
    await page.getByRole('button', { name: 'Continue' }).click()
    await expectInUrl(page, `/events/request-correction/${eventId}/summary`)
    await expect(
      page.getByRole('button', { name: 'Back to review' })
    ).toBeEnabled()
    await expect(
      page.getByRole('button', { name: 'Submit correction request' })
    ).toBeEnabled()
  })

  test('Press Fees change link and change the fee amount', async () => {
    await page.getByTestId('change-fees.amount').click()
    await page
      .locator('#fees____amount')
      .fill(faker.number.int({ min: 1, max: 1000 }).toString())
  })

  test('Return to summary page', async () => {
    await page.getByRole('button', { name: 'Continue' }).click()
    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('Preview a file on summary page', async () => {
    await expect(
      page.getByRole('button', { name: 'Court Document' })
    ).toBeVisible()

    await page.getByRole('button', { name: 'Affidavit' }).click()

    await expect(
      page.getByRole('img', { name: 'Supporting Document' })
    ).toBeVisible()

    await page.locator('#preview_close').click()
  })

  test('Submit correction request', async () => {
    await page
      .getByRole('button', { name: 'Submit correction request' })
      .click()

    await expect(
      page.getByText('Send record correction for approval?')
    ).toBeVisible()
    await expect(
      page.getByText(
        'The Registrar will be notified of this correction request and a record of this request will be recorded'
      )
    ).toBeVisible()

    await page.getByRole('button', { name: 'Confirm', exact: true }).click()
    await expectInUrl(page, `/events/overview/${eventId}`)
  })

  test("Event appears in 'Sent for approval' workqueue", async () => {
    await page.getByRole('button', { name: 'Sent for approval' }).click()

    await expect(
      page.getByRole('button', { name: formatV2ChildName(declaration) })
    ).toBeVisible()
  })

  test.describe('Approve correction request', () => {
    test('Login in as Local Registrar', async () => {
      await logout(page)
      await loginToV2(page, CREDENTIALS.LOCAL_REGISTRAR)
    })

    test("Find the event in the 'Ready for review' workflow", async () => {
      await page.getByRole('button', { name: 'Ready for review' }).click()

      await page
        .getByRole('button', { name: formatV2ChildName(declaration) })
        .click()
    })

    test('Correction request action appears in audit history', async () => {
      await ensureAssigned(page)

      // Go to second page of audit history list
      await page.getByRole('button', { name: 'Next page' }).click()
      await expect(
        page.getByRole('button', { name: 'Correction requested', exact: true })
      ).toBeVisible()
    })

    test('Correction request audit history modal opens when action is clicked', async () => {
      await page
        .getByRole('button', { name: 'Correction requested', exact: true })
        .click()

      await expect(page.getByText('RequesterInformant (Mother)')).toBeVisible()
      await expect(
        page.getByText(
          'Reason for correctionMyself or an agent made a mistake (Clerical error)'
        )
      ).toBeVisible()

      await expect(page.getByText("Child's details")).toBeVisible()
      await expect(
        page.getByText(
          `Reason for delayed registration${reasonForDelayedRegistration}`
        )
      ).toBeVisible()

      await page.locator('#close-btn').click()
    })

    test('Navigate to correction review', async () => {
      await selectAction(page, 'Review correction request')

      // @TODO: write some assertions here after the review page is finished
    })

    test('Approve correction request', async () => {
      await page.getByRole('button', { name: 'Approve', exact: true }).click()
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()

      await expectInUrl(page, `/events/overview/${eventId}`)
    })

    test('Correction approved action appears in audit history', async () => {
      await ensureAssigned(page)

      // Go to second page of audit history list
      await page.getByRole('button', { name: 'Next page' }).click()
      await expect(
        page.getByRole('button', { name: 'Correction approved', exact: true })
      ).toBeVisible()
    })

    test('Enter the direct correction form', async () => {
      await selectAction(page, 'Correct record')

      await expect(page.locator('#requester____type')).toHaveText('Select...')
      await expect(page.locator('#reason____option')).toHaveText('Select...')

      // await expect()
    })
  })
})
