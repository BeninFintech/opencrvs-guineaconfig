import { expect, Locator, test, type Page } from '@playwright/test'
import {
  auditRecord,
  formatDateTo_dMMMMyyyy,
  getToken,
  goBackToReview,
  loginToV2,
  uploadImageToSection
} from '../../helpers'
import { faker } from '@faker-js/faker'
import {
  createDeclaration as createDeclarationV2,
  Declaration as DeclarationV2
} from '../v2-test-data/birth-declaration-with-mother-father'
import { format, subYears } from 'date-fns'
import {
  CREDENTIALS,
  SAFE_INPUT_CHANGE_TIMEOUT_MS,
  SAFE_OUTBOX_TIMEOUT_MS
} from '../../constants'
import { IdType } from '@countryconfig/form/v2/person'
import { random } from 'lodash'
import { formatV2ChildName } from '../v2-birth/helpers'
import { ensureAssigned } from '../../v2-utils'

test.describe.serial(' Correct record - 4', () => {
  let declaration: DeclarationV2
  let trackingId = ''
  let eventId: string
  let page: Page

  const updatedFatherDetails = {
    firstNames: faker.person.firstName('male'),
    familyName: faker.person.lastName('male'),
    birthDate: format(subYears(new Date(), 30), 'yyyy-MM-dd'),
    age: random(20, 45),
    email: faker.internet.email(),
    nationality: 'Ethiopia',
    id: '9241628813',
    idType: IdType.PASSPORT,
    passport: '1911901024',
    address: {
      country: 'Farajaland',
      province: 'Sulaka',
      district: 'Irundu',
      town: faker.location.city(),
      residentialArea: faker.location.county(),
      street: faker.location.street(),
      number: faker.location.buildingNumber(),
      zipCode: faker.location.zipCode()
    },
    maritalStatus: 'Widowed',
    educationLevel: 'Primary'
  }

  const updatedChildDetails = {
    placeOfBirth: 'Health Institution',
    birthFacility: 'Mwenekombe Health Post'
  }

  const correctionFee = faker.number.int({ min: 1, max: 1000 }).toString()

  const visible = async (
    _page: Page | Locator = page,
    col1: string,
    col2?: string,
    col3?: string
  ) => {
    await expect(_page.getByText(col1, { exact: true })).toBeVisible()
    col2 && (await expect(_page.getByText(col2, { exact: true })).toBeVisible())
    col3 && (await expect(_page.getByText(col3, { exact: true })).toBeVisible())
  }

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
  })

  test.afterAll(async () => {
    await page.close()
  })

  test('4.0 Shortcut declaration', async () => {
    let token = await getToken(
      CREDENTIALS.NATIONAL_REGISTRAR.USERNAME,
      CREDENTIALS.NATIONAL_REGISTRAR.PASSWORD
    )
    const res = await createDeclarationV2(
      token,
      {
        'child.name': {
          firstname: faker.person.firstName('male'),
          surname: faker.person.lastName()
        },
        'child.gender': 'male',
        'child.dob': format(subYears(new Date(), 1), 'yyyy-MM-dd'),
        'child.reason': 'Late',
        'child.placeOfBirth': 'PRIVATE_HOME',
        'child.address.privateHome': {
          country: 'FAR',
          addressType: 'DOMESTIC',
          province: 'Central',
          district: 'Ibombo'
        },
        'child.attendantAtBirth': 'PHYSICIAN',
        'child.birthType': 'SINGLE',
        'child.weightAtBirth': 3,
        'informant.relation': 'MOTHER',
        'informant.phoneNo': '0911725897',
        'mother.name': {
          firstname: faker.person.firstName('female'),
          surname: faker.person.lastName('female')
        },
        'mother.dob': format(subYears(new Date(), 29), 'yyyy-MM-dd'),
        'mother.nationality': 'FAR',
        'mother.idType': 'NATIONAL_ID',
        'mother.nid': faker.string.numeric(10),
        'mother.maritalStatus': 'SINGLE',
        'mother.educationalAttainment': 'NO_SCHOOLING',
        'mother.occupation': 'Housewife',
        'mother.previousBirths': 0,
        'mother.address': {
          country: 'FAR',
          addressType: 'DOMESTIC',
          province: 'Central',
          district: 'Ibombo'
        },
        'father.name': {
          firstname: faker.person.firstName('male'),
          surname: faker.person.lastName('male')
        },
        'father.detailsNotAvailable': false,
        'father.dob': format(subYears(new Date(), 31), 'yyyy-MM-dd'),
        'father.idType': 'NATIONAL_ID',
        'father.nid': faker.string.numeric(10),
        'father.nationality': 'FAR',
        'father.maritalStatus': 'SINGLE',
        'father.educationalAttainment': 'NO_SCHOOLING',
        'father.occupation': 'Unemployed',
        'father.addressSameAs': 'YES'
      },
      'REGISTER',
      'PRIVATE_HOME'
    )
    expect(res).toEqual(
      expect.objectContaining({
        trackingId: expect.any(String)
      })
    )
    trackingId = res.trackingId!
    eventId = res.eventId
    token = await getToken('k.mweene', 'test')
    declaration = res.declaration
  })

  test('4.1 Ready to correct record > record audit', async () => {
    await loginToV2(page, CREDENTIALS.LOCAL_REGISTRAR)

    await auditRecord({
      page,
      name: formatV2ChildName(declaration),
      trackingId
    })
    await ensureAssigned(page)

    await page.getByRole('button', { name: 'Action', exact: true }).click()

    /*
     * Expected result: should show correct record button in action menu
     */
    await expect(
      page.getByText('Correct record', { exact: true })
    ).toBeVisible()

    await page.getByText('Correct record', { exact: true }).click()
  })

  test('4.2 Correction requester: legal guardian', async () => {
    await page.locator('#requester____type').click()
    await page.getByText('Legal Guardian', { exact: true }).click()
    await page.locator('#reason____option').click()
    await page
      .getByText('Informant provided incorrect information (Material error)', {
        exact: true
      })
      .click()
    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('4.3 Verify identity', async () => {
    /*
     * Expected result: should Confirm
     * nothing
     */

    await page.getByRole('button', { name: 'Verified' }).click()
  })
  test('4.4 Upload supporting documents', async () => {
    /*
     * Expected result: should
     * - navigate to supporting document
     * - continue button is disabled
     */
    expect(page.url().includes('correction')).toBeTruthy()

    expect(page.url().includes('onboarding/documents')).toBeTruthy()

    await expect(page.getByRole('button', { name: 'Continue' })).toBeEnabled()

    const imageUploadSectionTitles = ['Affidavit', 'Court Document', 'Other']

    for (const sectionTitle of imageUploadSectionTitles) {
      await uploadImageToSection({
        page,
        sectionLocator: page.locator('#corrector_form'),
        sectionTitle,
        buttonLocator: page.getByRole('button', { name: 'Upload' })
      })
    }

    /*
     * Expected result: should enable the continue button
     */

    await page.getByRole('button', { name: 'Continue' }).click()
  })

  test('4.5 Correction fee', async () => {
    await page.locator('#fees____amount').fill(correctionFee)

    await page.getByRole('button', { name: 'Continue' }).click()
    /*
     * Expected result: should navigate to review page
     */
    expect(page.url().includes('correction')).toBeTruthy()
    expect(page.url().includes('review')).toBeTruthy()
  })

  test.describe('4.4 Make correction', async () => {
    test.describe('4.4.1 Make correction on father details page', async () => {
      test('4.4.1.1 Change name', async () => {
        await page.getByTestId('change-button-father.name').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's family name
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____name')).toBeTruthy()

        await page.locator('#firstname').fill(updatedFatherDetails.firstNames)
        await page.locator('#surname').fill(updatedFatherDetails.familyName)

        await goBackToReview(page)

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous name with strikethrough
         * - show updated name
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page.getByTestId('row-value-father.name').getByRole('deletion')
        ).toHaveText(
          `${declaration['father.name']?.firstname} ${declaration['father.name']?.surname}`
        )

        await expect(
          await page
            .getByTestId('row-value-father.name')
            .getByText(
              `${updatedFatherDetails.firstNames} ${updatedFatherDetails.familyName}`
            )
        ).toBeVisible()
      })

      test('4.4.1.2 Change date of birth', async () => {
        await page.getByTestId('change-button-father.dob').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's date of birth
         */
        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____dob')).toBeTruthy()

        const birthDay = updatedFatherDetails.birthDate.split('-')

        await page.getByTestId('father____dob-dd').fill(birthDay[2])
        await page.getByTestId('father____dob-mm').fill(birthDay[1])
        await page.getByTestId('father____dob-yyyy').fill(birthDay[0])

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous gender with strikethrough
         * - show updated gender
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        console.log(declaration)
        console.log(updatedFatherDetails.birthDate)
        await expect(
          await page.getByTestId('row-value-father.dob').getByRole('deletion')
        ).toHaveText(formatDateTo_dMMMMyyyy(declaration['father.dob']!))

        await expect(
          await page
            .getByTestId('row-value-father.dob')
            .getByText(formatDateTo_dMMMMyyyy(updatedFatherDetails.birthDate))
        ).toBeVisible()
      })

      test('4.4.1.3 Change nationality', async () => {
        await page.getByTestId('change-button-father.nationality').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's nationality
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____nationality')).toBeTruthy()

        await page.locator('#father____nationality').click()
        await page.getByText(updatedFatherDetails.nationality).click()

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous nationality with strikethrough
         * - show updated nationality
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.nationality')
            .getByRole('deletion')
        ).toHaveText('Farajaland')

        await expect(
          await page
            .getByTestId('row-value-father.nationality')
            .getByText(updatedFatherDetails.nationality)
        ).toBeVisible()
      })

      test('4.4.1.4 Change id type', async () => {
        await page.getByTestId('change-button-father.idType').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's id type
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____idType')).toBeTruthy()

        await page.locator('#father____idType').click()
        await page.getByText(updatedFatherDetails.idType).click()

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous id type with strikethrough
         * - show updated id type
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.idType')
            .getByRole('deletion')
        ).toHaveText('National ID')

        await expect(
          await page
            .getByTestId('row-value-father.idType')
            .getByText(updatedFatherDetails.idType)
        ).toBeVisible()
      })

      test('4.4.1.5 Change id', async () => {
        await page.getByTestId('change-button-father.passport').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's id
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____passport')).toBeTruthy()

        await page
          .locator('#father____passport')
          .fill(updatedFatherDetails.passport)

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous id with strikethrough
         * - show updated id
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.passport')
            .getByText(updatedFatherDetails.passport)
        ).toBeVisible()
      })

      test('4.4.1.6 Change usual place of residence', async () => {
        await page.getByTestId('change-button-father.addressSameAs').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's Usual place of resiedence
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____addressSameAs')).toBeTruthy()

        await page
          .locator('#father____addressSameAs-form-input')
          .getByLabel('No')
          .click()

        await page
          .locator('#father____address-form-input')
          .locator('#province')
          .click()
        await page
          .locator('#father____address-form-input')
          .getByText(updatedFatherDetails.address.province)
          .click()

        await page
          .locator('#father____address-form-input')
          .locator('#district')
          .click()
        await page
          .locator('#father____address-form-input')
          .getByText(updatedFatherDetails.address.district)
          .click()

        await page
          .locator('#father____address-form-input')
          .locator('#town')
          .fill(updatedFatherDetails.address.town)

        await page
          .locator('#father____address-form-input')
          .locator('#residentialArea')
          .fill(updatedFatherDetails.address.residentialArea)

        await page
          .locator('#father____address-form-input')
          .locator('#street')
          .fill(updatedFatherDetails.address.street)

        await page
          .locator('#father____address-form-input')
          .locator('#number')
          .fill(updatedFatherDetails.address.number)

        await page
          .locator('#father____address-form-input')
          .locator('#zipCode')
          .fill(updatedFatherDetails.address.zipCode)

        await goBackToReview(page)

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous Usual place of resiedence with strikethrough
         * - show updated Usual place of resiedence
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.country)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.province)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.district)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.town)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.residentialArea)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.street)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.number)
        ).toBeVisible()

        await expect(
          await page
            .getByTestId('row-value-father.address')
            .getByText(updatedFatherDetails.address.zipCode)
        ).toBeVisible()
      })

      test('4.4.1.7 Change marital status', async () => {
        await page.getByTestId('change-button-father.maritalStatus').click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's marital status
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(page.url().includes('#father____maritalStatus')).toBeTruthy()

        await page.locator('#father____maritalStatus').click()
        await page.getByText(updatedFatherDetails.maritalStatus).click()

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous marital status with strikethrough
         * - show updated marital status
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.maritalStatus')
            .getByRole('deletion')
        ).toHaveText('Single')

        await expect(
          await page
            .getByTestId('row-value-father.maritalStatus')
            .getByText(updatedFatherDetails.maritalStatus)
        ).toBeVisible()
      })

      test('4.4.1.8 Change level of education', async () => {
        await page
          .getByTestId('change-button-father.educationalAttainment')
          .click()

        /*
         * Expected result: should
         * - redirect to father's details page
         * - focus on father's level of education
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('father')).toBeTruthy()
        expect(
          await page.url().includes('#father____educationalAttainment')
        ).toBeTruthy()

        await page.locator('#father____educationalAttainment').click()
        await page.getByText(updatedFatherDetails.educationLevel).click()

        await page.getByRole('button', { name: 'Back to review' }).click()

        /*
         * Expected result: should
         * - redirect to review page
         * - show previous level of education with strikethrough
         * - show updated level of education
         */

        expect(page.url().includes('correction')).toBeTruthy()
        expect(page.url().includes('review')).toBeTruthy()

        await expect(
          await page
            .getByTestId('row-value-father.educationalAttainment')
            .getByRole('deletion')
        ).toHaveText('No schooling')

        await expect(
          await page
            .getByTestId('row-value-father.educationalAttainment')
            .getByText(updatedFatherDetails.educationLevel)
        ).toBeVisible()
      })
    })

    test('4.4.2 Change place of birth', async () => {
      await page.getByTestId('change-button-child.placeOfBirth').click()

      /*
       * Expected result: should
       * - redirect to child's details page
       * - focus on child's placeOfBirth
       */

      expect(page.url().includes('correction')).toBeTruthy()
      expect(page.url().includes('child')).toBeTruthy()
      expect(page.url().includes('#child____placeOfBirth')).toBeTruthy()

      await page.locator('#child____placeOfBirth').click()
      await page
        .getByText(updatedChildDetails.placeOfBirth, { exact: true })
        .click()

      await page
        .locator('#child____birthLocation')
        .fill(updatedChildDetails.birthFacility.slice(0, 4))
      await page.getByText(updatedChildDetails.birthFacility).click()

      await page.getByRole('button', { name: 'Back to review' }).click()

      /*
       * Expected result: should
       * - redirect to review page
       * - show previous placeOfBirth with strikethrough
       * - show updated placeOfBirth
       */

      expect(page.url().includes('correction')).toBeTruthy()
      expect(page.url().includes('review')).toBeTruthy()

      await expect(
        await page
          .getByTestId('row-value-child.placeOfBirth')
          .getByRole('deletion')
      ).toHaveText('Residential address')

      await expect(
        await page
          .getByTestId('row-value-child.placeOfBirth')
          .getByText(updatedChildDetails.placeOfBirth)
      ).toBeVisible()

      await expect(
        await page
          .getByTestId('row-value-child.birthLocation')
          .getByText(updatedChildDetails.birthFacility)
      ).toBeVisible()
      await page.getByRole('button', { name: 'Continue' }).click()
    })
  })

  test('3.7 Correction summary', async () => {
    /*
     * Expected result: should
     * - navigate to correction summary
     * - Send for approval button is disabled
     */

    expect(page.url().includes('correction')).toBeTruthy()
    expect(page.url().includes('summary')).toBeTruthy()

    await expect(
      page.getByRole('button', { name: 'Correct record' })
    ).toBeEnabled()

    /*
     * Expected result: should show
     * - Original vs correction
     * - Requested by
     * - ID check
     * - Reason for request
     * - Comments
     */
    await visible(page, 'Requester', 'Legal Guardian')
    await visible(
      page,
      'Reason for correction',
      'Informant provided incorrect information (Material error)'
    )
    await visible(page, 'Fee total', `$${correctionFee}`)

    await visible(page, 'Correction(s)')
    await visible(page, "Child's details")

    await visible(
      page.locator('#listTable-corrections-table-child'),
      'Place of delivery',
      'Residential address',
      'Health Institution'
    )

    await visible(
      page.locator('#listTable-corrections-table-child'),
      'Location of birth'
    )
    await expect(
      await page
        .locator('#listTable-corrections-table-child')
        .getByText(updatedChildDetails.birthFacility)
    ).toBeVisible()

    await visible(
      page.locator('#listTable-corrections-table-father'),
      "Father's details"
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      "Father's name",
      `${declaration['father.name']?.firstname} ${declaration['father.name']?.surname}`,
      `${updatedFatherDetails.firstNames} ${updatedFatherDetails.familyName}`
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Date of birth',
      formatDateTo_dMMMMyyyy(declaration['father.dob']!),
      formatDateTo_dMMMMyyyy(updatedFatherDetails.birthDate)
    )

    await visible(
      page.locator('#listTable-corrections-table-father').locator('#row_2'),
      'Nationality',
      'Farajaland',
      updatedFatherDetails.nationality
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Type of ID',
      'National ID',
      'Passport'
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'ID Number',
      updatedFatherDetails.passport
    )

    await visible(
      page.locator('#listTable-corrections-table-father').locator('#row_5'),
      'Usual place of residence'
    )

    await Promise.all(
      [
        updatedFatherDetails.address.province,
        updatedFatherDetails.address.district,
        updatedFatherDetails.address.town,
        updatedFatherDetails.address.residentialArea,
        updatedFatherDetails.address.street,
        updatedFatherDetails.address.number,
        updatedFatherDetails.address.zipCode
      ].map((x) =>
        expect(
          page
            .locator('#listTable-corrections-table-father')
            .locator('#row_5')
            .getByText(x)
        ).toBeVisible()
      )
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Marital Status',
      'Single',
      'Widowed'
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Level of education',
      'No schooling',
      'Primary'
    )

    // await expect(page.getByText(formatV2ChildName(declaration))).toBeVisible()

    // await expect(page.getByText('Verified')).toBeVisible()

    // await expect(
    //   page.getByText(
    //     'Informant did not provide this information (Material omission)'
    //   )
    // ).toBeVisible()

    // await expect(page.getByText(registrationNumber!)).toBeVisible()

    // await page.getByLabel('No').check()

    /*
     * Expected result: should enable the Correct record button
     */
    await page.getByRole('button', { name: 'Correct record' }).click()
    await page.getByRole('button', { name: 'Confirm' }).click()

    /*
     * Expected result: should
     * - be navigated to sent for approval tab
     * - include the declaration in this tab
     */
    expect(page.url().includes(`events/overview/${eventId}`)).toBeTruthy()
    await page.getByRole('button', { name: 'Outbox' }).click()

    /*
     * This is to ensure the following condition is asserted
     * after the outbox has the declaration
     */
    await page.waitForTimeout(SAFE_INPUT_CHANGE_TIMEOUT_MS)

    await expect(await page.locator('#no-record')).toContainText(
      'No records require processing',
      {
        timeout: SAFE_OUTBOX_TIMEOUT_MS
      }
    )
  })

  test('4.8 Validate history in record audit', async () => {
    await auditRecord({
      page,
      name: formatV2ChildName(declaration),
      trackingId
    })
    await ensureAssigned(page)

    /*
     * Expected result: should show in task history
     * - Record corrected
     */

    await expect(
      page
        .locator('#listTable-task-history')
        .getByRole('button', { name: 'Record corrected' })
    ).toBeVisible()
  })
  test('4.9 Validate record corrected modal', async () => {
    const correctionRequestedRow = page.locator(
      '#listTable-task-history #row_7'
    )
    await correctionRequestedRow.getByText('Record corrected').click()

    const date = await correctionRequestedRow.locator('span').nth(1).innerText()

    const requester = await correctionRequestedRow
      .locator('span')
      .nth(2)
      .innerText()

    /*
     * Expected result: Should show
     * - Record corrected header
     * - Requester & time
     * - Requested by
     * - Id check
     * - Reason
     * - Comment
     * - Original vs Correction
     */
    await expect(
      page.getByRole('heading', { name: 'Record corrected' })
    ).toBeVisible()

    await expect(page.getByText(requester + ' — ' + date)).toBeVisible()

    await expect(page.getByText('Requester' + 'Legal guardian')).toBeVisible()
    await expect(
      page.getByText(
        'Reason for correction' +
          'Informant provided incorrect information (Material error)'
      )
    ).toBeVisible()

    await expect(page.getByText('Supporting documents')).toBeVisible()
    await expect(page.getByText('Affidavit')).toBeVisible()
    await expect(page.getByText('Court Document')).toBeVisible()
    await expect(page.getByText('Other', { exact: true })).toBeVisible()

    /*
     * Expected result: should show
     * - Original vs correction
     * - Requested by
     * - ID check
     * - Reason for request
     * - Comments
     */
    await visible(page, 'Requester', 'Legal Guardian')
    await visible(
      page,
      'Reason for correction',
      'Informant provided incorrect information (Material error)'
    )
    await visible(page, 'Fee total', `$${correctionFee}`)

    await visible(page, 'Correction(s)')
    await visible(page, "Child's details")

    await visible(
      page.locator('#listTable-corrections-table-child'),
      'Place of delivery',
      'Residential address',
      'Health Institution'
    )

    await visible(
      page.locator('#listTable-corrections-table-child'),
      'Location of birth'
    )
    await expect(
      await page
        .locator('#listTable-corrections-table-child')
        .getByText(updatedChildDetails.birthFacility)
    ).toBeVisible()

    await visible(
      page.locator('#listTable-corrections-table-father'),
      "Father's details"
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      "Father's name",
      `${declaration['father.name']?.firstname} ${declaration['father.name']?.surname}`,
      `${updatedFatherDetails.firstNames} ${updatedFatherDetails.familyName}`
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Date of birth',
      formatDateTo_dMMMMyyyy(declaration['father.dob']!),
      formatDateTo_dMMMMyyyy(updatedFatherDetails.birthDate)
    )

    await visible(
      page.locator('#listTable-corrections-table-father').locator('#row_2'),
      'Nationality',
      'Farajaland',
      updatedFatherDetails.nationality
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Type of ID',
      'National ID',
      'Passport'
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'ID Number',
      updatedFatherDetails.passport
    )

    await visible(
      page.locator('#listTable-corrections-table-father').locator('#row_5'),
      'Usual place of residence'
    )

    await Promise.all(
      [
        updatedFatherDetails.address.province,
        updatedFatherDetails.address.district,
        updatedFatherDetails.address.town,
        updatedFatherDetails.address.residentialArea,
        updatedFatherDetails.address.street,
        updatedFatherDetails.address.number,
        updatedFatherDetails.address.zipCode
      ].map((x) =>
        expect(
          page
            .locator('#listTable-corrections-table-father')
            .locator('#row_5')
            .getByText(x)
        ).toBeVisible()
      )
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Marital Status',
      'Single',
      'Widowed'
    )

    await visible(
      page.locator('#listTable-corrections-table-father'),
      'Level of education',
      'No schooling',
      'Primary'
    )

    await page
      .getByRole('heading', { name: 'Record corrected' })
      .locator('xpath=following-sibling::*[1]')
      .click()
  })
})
