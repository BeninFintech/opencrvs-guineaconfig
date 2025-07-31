import { expect, test, type Page } from '@playwright/test'
import {
  formatDateTo_dMMMMyyyy,
  formatName,
  getToken,
  loginToV2
} from '../../helpers'
import { faker } from '@faker-js/faker'
import { CREDENTIALS } from '../../constants'
import {
  createDeclaration,
  Declaration
} from '../v2-test-data/birth-declaration'
import { ensureAssigned, expectInUrl, selectAction, type } from '../../v2-utils'
import {
  navigateToCertificatePrintAction,
  selectCertificationType,
  selectRequesterType
} from '../v2-print-certificate/birth/helpers'
import { formatV2ChildName } from '../v2-birth/helpers'

test.describe.serial('Correct record - 2', () => {
  let declaration: Declaration
  let trackingId: string | undefined
  let eventId: string
  let page: Page

  const fatherDetails = {
    'father.detailsNotAvailable': false,
    'father.name': {
      firstname: faker.person.firstName(),
      surname: faker.person.lastName()
    },
    'father.dob': '1995-09-12',
    'father.nationality': 'FAR',
    'father.idType': 'NATIONAL_ID',
    'father.nid': faker.string.numeric(10),
    'father.addressSameAs': 'YES'
  }

  test.beforeAll(async ({ browser }) => {
    const token = await getToken(
      CREDENTIALS.LOCAL_REGISTRAR.USERNAME,
      CREDENTIALS.LOCAL_REGISTRAR.PASSWORD
    )

    // Create declaration with father details available
    const res = await createDeclaration(
      token,
      fatherDetails,
      undefined,
      'HEALTH_FACILITY'
    )
    declaration = res.declaration
    trackingId = res.trackingId
    eventId = res.eventId
    page = await browser.newPage()
  })

  test('2.1 Certificate preview', async () => {
    await loginToV2(page, CREDENTIALS.REGISTRATION_AGENT)
    await page.getByRole('button', { name: 'Ready to print' }).click()
    await navigateToCertificatePrintAction(page, declaration)
    await selectCertificationType(page, 'Birth Certificate')
    await selectRequesterType(page, 'Print and issue to Informant (Mother)')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Verified', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await page.getByRole('button', { name: 'No, make correction' }).click()
  })

  test('2.2 Select requester and reason', async () => {
    await page.locator('#requester____type').click()
    await page.getByText('Father', { exact: true }).click()

    await page.locator('#reason____option').click()
    await page
      .getByText('Informant provided incorrect information (Material error)', {
        exact: true
      })
      .click()

    await page.getByRole('button', { name: 'Continue', exact: true }).click()
  })

  const fee = faker.number.int({ min: 1, max: 1000 }).toString()

  test('2.3 Fill correction form', async () => {
    await expect(page.getByText('Type of ID')).toBeVisible()
    await expect(page.getByText('National ID')).toBeVisible()

    await expect(page.getByText('ID Number')).toBeVisible()
    await expect(page.getByText(fatherDetails['father.nid'])).toBeVisible()

    await expect(page.getByText("Father's name")).toBeVisible()
    await expect(
      page.getByText(
        `${fatherDetails['father.name'].firstname} ${fatherDetails['father.name'].surname}`
      )
    ).toBeVisible()

    await expect(page.getByText('Date of birth')).toBeVisible()
    await expect(
      page.getByText(formatDateTo_dMMMMyyyy(fatherDetails['father.dob']))
    ).toBeVisible()

    await expect(page.getByText('Nationality')).toBeVisible()
    await expect(page.getByText('Farajaland')).toBeVisible()

    await page.getByRole('button', { name: 'Identity does not match' }).click()

    await expect(page.getByText('Correct without proof of ID?')).toBeVisible()
    await expect(
      page.getByText(
        'Please be aware that if you proceed, you will be responsible for making a change to this record without the necessary proof of identification'
      )
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Confirm' }).click()

    await page.getByRole('button', { name: 'Continue' }).click()
    await page.locator('#fees____amount').fill(fee)

    await page.getByRole('button', { name: 'Continue' }).click()
  })

  const updatedInformantDetails = {
    firstNames: faker.person.firstName(),
    familyName: faker.person.lastName(),
    brn: faker.string.numeric(10),
    age: faker.number.int({ min: 1, max: 100 }).toString(),
    email: faker.internet.email()
  }

  test.describe('2.4 Make correction', async () => {
    test('2.4.1 Change informant details', async () => {
      await page.getByTestId('change-button-informant.relation').click()

      await expectInUrl(
        page,
        `/events/correction/${eventId}/pages/informant?from=review#informant____relation`
      )

      await page.locator('#informant____relation').click()
      await page.getByText('Brother', { exact: true }).click()

      await page.locator('#firstname').fill(updatedInformantDetails.firstNames)
      await page.locator('#surname').fill(updatedInformantDetails.familyName)
      await page.getByLabel('Exact date of birth unknown').check()
      await page.locator('#informant____age').fill(updatedInformantDetails.age)

      await page
        .locator('#informant____email')
        .fill(updatedInformantDetails.email)

      await page.locator('#informant____idType').click()
      await page.getByText('Birth Registration Number', { exact: true }).click()

      await page.locator('#informant____brn').fill(updatedInformantDetails.brn)

      await page.getByRole('button', { name: 'Back to review' }).click()

      await expectInUrl(page, `/events/correction/${eventId}/review`)

      await expect(
        page.getByTestId('row-value-informant.relation').getByRole('deletion')
      ).toHaveText('Mother')

      await expect(
        page.getByTestId('row-value-informant.relation')
      ).toContainText('Brother')
    })

    test('2.4.2 Change place of delivery', async () => {
      await page.getByTestId('change-button-child.placeOfBirth').click()

      await expectInUrl(
        page,
        `/events/correction/${eventId}/pages/child?from=review#child____placeOfBirth`
      )

      await page.locator('#child____placeOfBirth').click()
      await page
        .getByText('Residential address', {
          exact: true
        })
        .click()

      await page
        .locator(
          '#child____address____privateHome-form-input #country-form-input input'
        )
        .fill('Far')

      await page
        .locator(
          '#child____address____privateHome-form-input #country-form-input'
        )
        .getByText('Farajaland', { exact: true })
        .click()

      await page.getByTestId('text__town').fill(faker.location.city())
      await page.getByTestId('text__street').fill(faker.location.street())

      await page.getByRole('button', { name: 'Back to review' }).click()
    })
  })

  test('2.7 Correction summary', async () => {
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('Requester' + 'Father')).toBeVisible()
    await expect(
      page.getByText(
        'Reason for correction' +
          'Informant provided incorrect information (Material error)'
      )
    ).toBeVisible()

    await expect(
      page.getByText(
        'Place of delivery' + 'Health Institution' + 'Residential address'
      )
    ).toBeVisible()

    await expect(
      page.getByText('Relationship to child' + 'Mother' + 'Brother')
    ).toBeVisible()

    await page
      .getByRole('button', { name: 'Submit correction request' })
      .click()
    await page.getByRole('button', { name: 'Confirm' }).click()

    await expectInUrl(page, `/events/overview/${eventId}`)
  })

  test.describe('2.8 Correction Approval', async () => {
    test.beforeAll(async ({ browser }) => {
      await page.close()
      page = await browser.newPage()
      await loginToV2(page, CREDENTIALS.LOCAL_REGISTRAR)
    })

    test('2.8.1 Record audit by local registrar', async () => {
      if (!trackingId) {
        throw new Error('Tracking ID is required')
      }

      await type(page, '#searchText', trackingId)
      await page.locator('#searchIconButton').click()
      await page
        .getByRole('button', { name: formatV2ChildName(declaration) })
        .click()
    })

    test('2.8.2 Correction review', async () => {
      await selectAction(page, 'Review correction request')
      await expect(page.getByText('Requester' + 'Father')).toBeVisible()
      await expect(
        page.getByText(
          'Reason for correction' +
            'Informant provided incorrect information (Material error)'
        )
      ).toBeVisible()

      await expect(page.getByText('Fee total' + '$' + fee)).toBeVisible()

      await expect(
        page
          .locator('#listTable-corrections-table-informant')
          .getByText('Relationship to child' + 'Mother' + 'Brother')
      ).toBeVisible()

      await expect(
        page.locator('#listTable-corrections-table-informant').getByText(
          "Informant's name" +
            formatName({
              firstNames: updatedInformantDetails.firstNames,
              familyName: updatedInformantDetails.familyName
            })
        )
      ).toBeVisible()

      await expect(
        page.getByText('Exact date of birth unknown' + '-' + 'Yes')
      ).toBeVisible()

      await expect(
        page.getByText('Age of informant' + updatedInformantDetails.age)
      ).toBeVisible()

      await expect(
        page.getByRole('row', { name: 'Type of ID Birth Registration' })
      ).toBeVisible()

      await expect(
        page.getByText('ID Number' + updatedInformantDetails.brn)
      ).toBeVisible()

      await expect(
        page.getByRole('row', {
          name: `Email mothers@email.com ${updatedInformantDetails.email}`
        })
      ).toBeVisible()
    })

    test('2.8.3 Reject correction', async () => {
      await page.getByRole('button', { name: 'Reject', exact: true }).click()
      // @TODO: After the reason input to modal is added, we want to fill the reason and confirm the modal
      await page.getByRole('button', { name: 'Confirm', exact: true }).click()

      await expectInUrl(page, `/events/overview/${eventId}`)
    })

    test.describe('2.8.4 Validate history in record audit', async () => {
      test('2.8.4.1 Navigate to record audit', async () => {
        if (!trackingId) {
          throw new Error('Tracking ID is required')
        }

        await type(page, '#searchText', trackingId)
        await page.locator('#searchIconButton').click()
        await page
          .getByRole('button', { name: formatV2ChildName(declaration) })
          .click()

        await ensureAssigned(page)
      })

      test('2.8.4.2 Validate correction requested modal', async () => {
        await page
          .getByRole('button', { name: 'Correction requested', exact: true })
          .click()

        await expect(page.getByText('Requester' + 'Father')).toBeVisible()

        await expect(
          page.getByText(
            'Reason for correction' +
              'Informant provided incorrect information (Material error)'
          )
        ).toBeVisible()

        await expect(page.getByText('Fee total' + '$' + fee)).toBeVisible()

        await expect(
          page.getByText(
            'Place of delivery' + 'Health Institution' + 'Residential address'
          )
        ).toBeVisible()

        await expect(
          page.getByText('Relationship to child' + 'Mother' + 'Brother')
        ).toBeVisible()

        await expect(
          page.getByText(
            "Informant's name" + formatName(updatedInformantDetails)
          )
        ).toBeVisible()

        await page.locator('#close-btn').click()
        await page.getByRole('button', { name: 'Next page' }).click()
      })

      test('2.8.4.3 Validate correction rejected modal', async () => {
        await page
          .getByRole('button', { name: 'Correction rejected', exact: true })
          .click()

        // @TODO: After the reason input to modal is added, we want to assert that reason is shown here

        await page.locator('#close-btn').click()
      })
    })
  })
})
