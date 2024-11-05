import * as Handlebars from 'handlebars'

const LINE_HEIGHT = 15
const DEFAULT_FONTSIZE = 11
const DOUBLE_LINE_BREAk_SEPARATION = ' _DLBS_ '
function generateDoubleLineBreak() {
  return '\n' + DOUBLE_LINE_BREAk_SEPARATION + '\n'
}
function wordWrap(
  text: string,
  boundary: number,
  fontSize?: number,
  fontWeight?: string
) {
  const letterSizeFactor =
    (fontSize != null ? (fontSize + 1.13) / DEFAULT_FONTSIZE : 1) +
    (fontWeight && fontWeight == 'bold' ? 0.1 : 0)

  return text
    .split('\n')
    .map(function (line) {
      let pos = 0
      return line
        .trim()
        .split(/\b/)
        .map(function (word) {
          pos += word.length * letterSizeFactor
          if (pos > boundary) {
            pos = 0
            return '\n' + word.trimLeft()
          }
          return word
        })
        .join('')
    })
    .join('\n')
    .split('\n')
}

function insertTspansIntoText(textLines: string[], xi: number, yi: number) {
  let svgString = ''
  let y = yi
  for (const line of textLines) {
    svgString += `<tspan x="${xi}" y="${y}">${line}</tspan>`
    y += LINE_HEIGHT
  }
  return svgString
}

export function wrap(): Handlebars.HelperDelegate {
  return function (
    this: any,
    lineLength: number,
    x: number,
    y: number,
    ...values: [...string[], Handlebars.HelperOptions]
  ) {
    const lines = wordWrap(values.slice(0, -1).join(' '), lineLength)
    return insertTspansIntoText(lines, x, y)
  } as unknown as Handlebars.HelperDelegate
}

export function wrapGroup(): Handlebars.HelperDelegate {
  return function (
    this: any,
    lineLength: number,
    initX: number,
    initY: number,
    options: Handlebars.HelperOptions
  ) {
    this.x = initX
    this.y = initY
    this.lineLength = lineLength
    const content = options.fn(this)
    delete this.x
    delete this.y
    delete this.lineLength
    return content
  } as unknown as Handlebars.HelperDelegate
}

function joinValuesWith(
  values: (string | null | undefined)[],
  separator = ' '
) {
  return values.filter(Boolean).join(separator)
}

export function join(): Handlebars.HelperDelegate {
  return function (
    this: any,
    ...values: [...string[], Handlebars.HelperOptions]
  ) {
    return joinValuesWith(values.slice(0, -1) as string[], '')
  } as unknown as Handlebars.HelperDelegate
}

export function text(): Handlebars.HelperDelegate {
  return function (
    this: Record<string, any>,
    options: Handlebars.HelperOptions
  ) {
    function insertTspansIntoText(this: any, textLines: string[]) {
      let svgString = ''
      for (const line of textLines) {
        const lineTrimed = line.trim()
        if (lineTrimed !== '') {
          svgString += `<tspan x="${this.x}" y="${this.y}">${
            lineTrimed == DOUBLE_LINE_BREAk_SEPARATION.trim() ? '' : lineTrimed
          }</tspan>`
          this.y += LINE_HEIGHT
        }
      }
      return svgString
    }
    const fontWeight = options.hash.fontWeight || 'normal'
    const align = options.hash.align || 'start'
    const fontSize = options.hash.fontSize || DEFAULT_FONTSIZE
    const content = options.fn(this)
    const lines = wordWrap(content, this.lineLength, fontSize, fontWeight)

    const element = `<text 
          fill="black" 
          xml:space="default" 
          font-family="Plus Jakarta Sans" 
          font-size="${fontSize}"
          font-weight="${fontWeight}"
          letter-spacing="0em"
           ${
             align === 'middle'
               ? `
                  x="50%"
                  dx="${this.x}"
                  dominant-baseline="middle"
                  text-anchor="middle"
               `
               : ''
           }
          >
            ${insertTspansIntoText.call(this, lines)}
        </text>`
    return element
  }
}

export function linebreak(): Handlebars.HelperDelegate {
  return function (this: Record<string, any>) {
    if (this.y) {
      this.y += LINE_HEIGHT
    }
  }
}

export function numberOfTimesCertificatePrinted(): Handlebars.HelperDelegate {
  return function (this: Record<string, any>) {
    // if (!this.certifier) {
    //   return 'KOPIA VOALOHANY'
    // } else {
    //   return 'SORATRA AN-TSISINY :'
    // }
    return !this.certifier ? 'KOPIA VOALOHANY' + generateDoubleLineBreak() : ''
  }
}

export function introduction(): Handlebars.HelperDelegate {
  return function (this: any, placeOfBirthCommune: string) {
    return joinValuesWith(
      [
        "Nalaina tamin’ny bokim-piankohonan'ny Kaominina",
        placeOfBirthCommune,
        'Foibe misahana ny fiankohonana, taona',
        customizeDateYearInCertificateContent(this.registrar.date) + ',',
        'izao sora-pahaterahana manaraka izao :'
      ],
      ' '
    )
  }
}

export function eventStatement(): Handlebars.HelperDelegate {
  return function (
    this: any,
    placeOfBirthState: string,
    placeOfBirthDistrict: string,
    fatherPrimaryDistrict: string,
    motherPrimaryDistrict: string
  ) {
    return joinValuesWith(
      [
        "--Tamin'ny",
        customizeDateInCertificateContent(this.eventDate) + ',',
        'tamin’ny',
        convertTimeToMdgCustomWords(this.birthChildBirthTime),
        'no teraka tao amin’ny',
        this.placeOfBirthFacility ? this.placeOfBirthFacility + ',' : '',
        //'fokontany',
        this.birthChildFokontanyCustomAddress
          ? 'fokontany ' + this.birthChildFokontanyCustomAddress + ','
          : '',
        'kaominina',
        placeOfBirthDistrict + ',',
        'district',
        placeOfBirthState,
        ':',
        joinValuesWith([this.childFamilyName, this.childFirstName], ' ') + ',',
        //getChildGeneratedOrManualNID.call(this) + ',',
        translateChildGenderToMDGWord(this.childGender) + ',',
        'zanak’i',
        fatherDetails.call(this, fatherPrimaryDistrict),
        motherDetails.call(this, motherPrimaryDistrict)
      ],
      ' '
    )
  }
}

function fatherDetails(
  this: Record<string, string>,
  fatherPrimaryDistrict: string
) {
  if ('fatherReasonNotApplying' in this) {
    return ''
  }
  return joinValuesWith(
    [
      joinValuesWith([this.fatherFamilyName, this.fatherFirstName], ' ') + ',',
      'teraka tamin’ny',
      this.birthFatherCustomizedExactDateOfBirthUnknown
        ? convertNumberToLetterForMalagasySpecificLanguage(
            parseInt(this.birthFatherYearOfBirth)
          )
        : customizeDateInCertificateContent(this.fatherBirthDate),
      'tao amin’ny',
      this.birthFatherBirthPlace + ',',
      'kaominina',
      fatherPrimaryDistrict,
      this.birthFatherFatherIsDeceased ? 'nonina tao' : 'monina ao',
      'amin’ny fokontany ',
      (this.birthFatherFokontanyCustomAddress ||
        this.birthMotherFokontanyCustomAddress) + ',',
      this.fatherOccupation + ',',
      this.birthFatherFatherHasFormallyRecognisedChild
        ? 'izay manambara fa manjanaka azy'
        : '',
      ', sy'
    ],
    ' '
  )
}

function motherDetails(
  this: Record<string, string>,
  motherPrimaryDistrict: string
) {
  if ('motherReasonNotApplying' in this) {
    return ''
  }
  return joinValuesWith(
    [
      joinValuesWith([this.motherFamilyName, this.motherFirstName], ' ') + ',',
      "teraka tamin'ny",
      this.birthMotherCustomizedExactDateOfBirthUnknown
        ? convertNumberToLetterForMalagasySpecificLanguage(
            parseInt(this.birthMotherYearOfBirth)
          )
        : customizeDateInCertificateContent(this.motherBirthDate),
      this.birthMotherBirthPlace + ',',
      'kaominina',
      motherPrimaryDistrict,
      this.birthMotherMotherIsDeceased ? 'nonina tao' : 'monina ao',
      'amin’ny fokontany ',
      this.birthMotherFokontanyCustomAddress + ',',
      this.motherOccupation + '--'
    ],
    ' '
  )
}
const relationMap = {
  mother: 'reniny',
  father: 'rainy',
  brother: 'zokiny lahy',
  sister: 'zokiny vavy',
  uncle: 'dadatoany',
  aunt: 'nenitoany',
  grandfather: 'raibeny',
  grandmother: 'renibeny'
}
export function registrationStatement(): Handlebars.HelperDelegate {
  return function (
    this: Record<string, any>,
    informantPrimaryDistrict: string,
    registrationDistrict: string
  ) {
    console.log(this.informantType)
    return joinValuesWith(
      [
        '---Nosoratana androany',
        customizeDateInCertificateContent(this.registrar.date.split('T')[0]) +
          ',',
        'tamin’ny',
        convertTimeToMdgCustomWords(this.registrar.date.split('T')[1]),
        isInformantMotherOrFather(this.informantType)
          ? 'nataon’ny'
          : joinValuesWith(
              ["nataon'i", this.informantFamilyName, this.informantFirstName],
              ' '
            ),
        relationMap[
          this.informantType?.toLowerCase() as keyof typeof relationMap
        ] || 'mpanolotra' + ',',
        "teraka tamin'ny",
        this.birthInformantCustomizedExactDateOfBirthUnknown
          ? convertNumberToLetterForMalagasySpecificLanguage(
              parseInt(this.birthInformantYearOfBirth)
            )
          : customizeDateInCertificateContent(this.informantBirthDate),
        'tao',
        this.birthInformantBirthPlace
          ? `${this.birthInformantBirthPlace},`
          : '',
        'kaominina',
        informantPrimaryDistrict + ',',
        //"monina ao amin'ny fokontany ",
        //this.birthInformantFokontanyCustomAddress + ',',
        this.informantOccupation + ',',
        'izay miara-manao sonia aminay,',
        this.registrar.name + ',',
        'Mpiandraikitra ny fiankohonana eto amin’ny Kaominina',
        registrationDistrict + ',',
        'rehefa novakiana taminy ity soratra ity.---'
      ],
      ' '
    )
  }
}

export function signatureDescription(): Handlebars.HelperDelegate {
  return function (this: Record<string, any>) {
    return joinValuesWith(
      [
        'Kopia manontolo nadika mitovy amin’ny bokim-piankohonana, androany',
        customizeDateInCertificateContent(
          new Date().toISOString().split('T')[0]
        ) + ", ary nomena an'i ",
        joinValuesWith(
          [this.informantFamilyName, this.informantFirstName],
          ' '
        ) + '--'
      ],
      ' '
    )
  }
}
function isInformantMotherOrFather(informantType: string) {
  return informantType === 'MOTHER' || informantType === 'FATHER'
}

const THE_UNITS_MDG_WORDS: string[] = [
  '',
  'iraika ',
  'roa ',
  'telo ',
  'efatra ',
  'dimy ',
  'enina ',
  'fito ',
  'valo ',
  'sivy '
]

const FROM_10_TO_19_MDG_WORDS: string[] = [
  'folo ',
  "iraika ambin'ny folo ",
  "roa ambin'ny folo ",
  "telo ambin'ny folo ",
  "efatra ambin'ny folo ",
  "dimy ambin'ny folo ",
  "enina ambin'ny folo ",
  "fito ambin'ny folo ",
  "valo ambin'ny folo ",
  "sivy ambin'ny folo "
]

const DOZENS_MDG_WORDS: string[] = [
  '',
  '',
  'roapolo ',
  'telopolo ',
  'efapolo ',
  'dimapolo ',
  'enipolo ',
  'fitopolo ',
  'valopolo ',
  'sivifolo '
]

const THE_HUNDREDS_MDG_WORDS: string[] = [
  '',
  'zato ',
  'roanjato ',
  'telonjato ',
  'efa-jato ',
  'dimanjato ',
  'eninjato ',
  'fitonjato ',
  'valonjato ',
  'sivinjato '
]

const MDG_IRAY_WORD = 'iray'

const THE_MONTH_MDG_WORDS: string[] = [
  '',
  'Janoary',
  'Febroary',
  'Martsa',
  'Aprily',
  'Mey',
  'Jona',
  'Jolay',
  'Aogositra',
  'Septambra',
  'Oktobra',
  'Novambra',
  'Desambra'
]

const convertNumberToLetterForMalagasySpecificLanguage = (num: number) => {
  const digitLength = num.toString()
  if (digitLength.length > 9) return 'mihoatra lavitra'
  const digits = ('000000000' + digitLength)
    .substr(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/)
  const unit = THE_UNITS_MDG_WORDS.concat(FROM_10_TO_19_MDG_WORDS)

  if (!digits) return
  let numberToLetter = ''
  numberToLetter +=
    digits[3] != '0'
      ? (parseInt(digits[3]) != 1
          ? `${
              unit[Number(digits[3])] ||
              DOZENS_MDG_WORDS[parseInt(digits[3][0])]
            }`
          : '') + ' arivo '
      : ''
  if (digits[3] != '0' && digits[4] != '0')
    numberToLetter = ` sy ${numberToLetter}`
  if (digits[3] != '0' && digits[4] == '0') numberToLetter = '' + numberToLetter
  numberToLetter =
    digits[4] != ''
      ? THE_HUNDREDS_MDG_WORDS[Number(digits[4])] +
        (parseInt(digits[3]) != 0 && parseInt(digits[4]) >= 0
          ? numberToLetter
          : '')
      : ''
  numberToLetter =
    digits[5] != '00'
      ? (unit[Number(digits[5])] ||
          (unit[parseInt(digits[5][1])] != ''
            ? `${unit[parseInt(digits[5][1])]} amby  ${
                DOZENS_MDG_WORDS[parseInt(digits[5][0])]
              }`
            : ' ' + DOZENS_MDG_WORDS[parseInt(digits[5][0])])) +
        (numberToLetter != ''
          ? numberToLetter != 'zato '
            ? ' sy '
            : ' amby '
          : '') +
        numberToLetter
      : numberToLetter != ''
      ? numberToLetter
      : ' aotra'
  return numberToLetter
}

function convertTimeToMdgCustomWords(timeString: string) {
  const [hour, minute] = timeString.split(':')
  let newHour = parseInt(hour)
  const mdgHours = THE_UNITS_MDG_WORDS.concat(
    FROM_10_TO_19_MDG_WORDS.slice(0, 3)
  )
  mdgHours[1] = MDG_IRAY_WORD
  const newMinute = parseInt(minute)
  let timePeriod = 'maraina'
  if (newHour <= 12 && newHour >= 10) timePeriod = 'antoandro'
  else if (newHour > 12) {
    if (newHour <= 16 && newHour >= 13) timePeriod = 'tolakandro'
    if (newHour <= 19 && newHour >= 17) timePeriod = 'hariva'
    if (newHour < 24 && newHour >= 20) timePeriod = 'alina'
    newHour = newHour - 12
  } else if (newHour === 0 && newMinute > 0) {
    return `roa ambin'ny folo ora sy ${convertNumberToLetterForMalagasySpecificLanguage(
      newMinute
    )} minitra alina`
  } else if (newHour === 0 && newMinute === 0) {
    return `roa ambin'ny folo ora alina`
  }
  const res = `${mdgHours[newHour]}${
    newMinute > 0
      ? ` ora sy ${convertNumberToLetterForMalagasySpecificLanguage(
          newMinute
        )} `
      : 'ora'
  }${newMinute > 0 ? `minitra ` : ''} ${timePeriod}`

  return res
}

function convertDateToMdgCustomWords(dateString: string) {
  const [year, month, day] = dateString.split('-')
  const dateValue =
    parseInt(day) === 1
      ? "voalohan'ny volana"
      : `${convertNumberToLetterForMalagasySpecificLanguage(parseInt(day))}`

  return `${dateValue} ${
    THE_MONTH_MDG_WORDS[parseInt(month)]
  }, taona ${convertNumberToLetterForMalagasySpecificLanguage(parseInt(year))}`
}

function convertLocaleDateToMdgCustomWords(dateString: string) {
  const dateStringStr = dateString.split(' ')
  const [day, month, year] = dateStringStr[0].split('/')
  return `${day} ${THE_MONTH_MDG_WORDS[parseInt(month)]} ${year}`
}

const customizeDateInCertificateContent = (_date: string) => {
  const dateWithoutOrdinal = removeOrdinalIndicator(_date)
  const date = new Date(dateWithoutOrdinal)
  const formattedDate = date.toISOString().split('T')[0]

  return convertDateToMdgCustomWords(formattedDate)
}

export function translateDate(): Handlebars.HelperDelegate {
  return function (this: any, dateString: string) {
    return customizeDateInCertificateContent(dateString)
  }
}

function customizeDateYearInCertificateContent(dateString: string) {
  const year = Number(dateString.split('-')[0])
  return Number.isNaN(year)
    ? ''
    : convertNumberToLetterForMalagasySpecificLanguage(year)
}

export function translateDateYear(): Handlebars.HelperDelegate {
  return function (this: any, dateString: string) {
    return customizeDateYearInCertificateContent(dateString)
  }
}

export function customizeChildBirthRegistrationNumber(): Handlebars.HelperDelegate {
  return function (
    this: any,
    rawChildBirthRegistrationNumber: string,
    manualChildBirthRegistrationNumber: string = ''
  ) {
    if (
      manualChildBirthRegistrationNumber &&
      !['', undefined, 'undefined', null, 'null'].includes(
        manualChildBirthRegistrationNumber.trim()
      )
    )
      return manualChildBirthRegistrationNumber.toString().padStart(6, '0')

    let currentRegisterNumber = ''

    if (
      rawChildBirthRegistrationNumber &&
      rawChildBirthRegistrationNumber.includes('_')
    ) {
      const rawRegisterNumber = rawChildBirthRegistrationNumber.split('_')
      currentRegisterNumber =
        rawRegisterNumber.length === 3
          ? rawRegisterNumber[2]
          : rawRegisterNumber[1]
    }

    return currentRegisterNumber.toString().padStart(6, '0')
  }
}

function removeOrdinalIndicator(dateString: string) {
  if (!dateString) return new Date() // TODO: Handle it later
  return dateString && dateString?.replace(/\b(\d+)(th|st|nd|rd)\b/g, '$1')
}

export function translateTime(): Handlebars.HelperDelegate {
  return function (this: any, timeString: string) {
    return convertTimeToMdgCustomWords(timeString)
  }
}

export function translateDateToMDGFormat(): Handlebars.HelperDelegate {
  return function (this: any, eventDate: string) {
    const dateWithoutOrdinal = removeOrdinalIndicator(eventDate)
    const date = new Date(dateWithoutOrdinal)
    const formattedDate = date.toLocaleString().split(', ')[0]

    return convertLocaleDateToMdgCustomWords(formattedDate)
  }
}

function translateChildGenderToMDGWord(childGender: string) {
  return childGender &&
    ['male', 'homme', 'lehilahy', 'zazalahy'].includes(
      childGender.toLowerCase()
    )
    ? 'zazalahy'
    : 'zazavavy'
}

export function birthCertificateRelatedPerson(): Handlebars.HelperDelegate {
  return function (this: any, informantFamilyName: string = '') {
    let informantInfo = ''
    if (informantFamilyName?.trim()) {
      informantInfo +=
        this.motherFamilyName === informantFamilyName &&
        this.motherFirstName === this.informantFirstName
          ? 'ny reniny'
          : this.fatherFamilyName === informantFamilyName &&
            this.fatherFirstName === this.informantFirstName
          ? 'ny rainy'
          : `i ${informantFamilyName} ${this.informantFirstName}`
    }
    return informantInfo
  }
}

function customizeOfficeName(registrationLocation: string = '') {
  const locationMappings: { [key: string]: string } = {
    'tana iv': "Commune Urbaine d'Antananarivo - Boriboritany Fahaefatra",
    'tana i': "Commune Urbaine d'Antananarivo - Boriboritany Voalohany",
    'toamasina suburbaine': 'Kaominina, Suburbaine Toamasina',
    'cec foulpointe': 'Kaominina, Rurale Mahavelona',
    'cec fanandrana': 'Kaominina, Rurale Fanandrana',
    toamasina: 'Kaominina, Toamasina Ambonivohitra',
    'cec talatamaty': 'Kaominina, Talatamaty',
    'cec mahitsy': 'Kaominina, Mahitsy',
    'cec ivato': 'Kaominina, Ivato',
    'cec ambohidratrimo': 'Kaominina, Ambohidratrimo',
    'cec ambohitrimanjaka': 'Kaominina, Ambohitrimanjaka',
    'cec anosiala': 'Kaominina, Anosiala'
  }

  const lowerCaseRegistrationLocation = registrationLocation.toLowerCase()

  for (const key in locationMappings) {
    if (lowerCaseRegistrationLocation.includes(key)) {
      return locationMappings[key]
    }
  }

  return ''
}

export function customizeOfficeNameLocation(): Handlebars.HelperDelegate {
  return function (this: any, registrationLocation: string = '') {
    return customizeOfficeName(registrationLocation)
  }
}

export function customizeOfficeNameLocationHeader(): Handlebars.HelperDelegate {
  return function (this: any, registrationLocation: string = '') {
    return customizeOfficeName(registrationLocation)
      .replace(',', '')
      .replace(' - ', '\n')
  }
}

export function customizeDistrictNameLocation(): Handlebars.HelperDelegate {
  return function (this: any, placeOfBirthDistrict: string = '') {
    return placeOfBirthDistrict
  }
}

export function getPlaceOfBirth(
  placeOfBirthFacility: string = '',
  fokontanyCustomAddress: string = ''
) {
  return !['', ' ', null, 'null', 'undefined', undefined].includes(
    fokontanyCustomAddress
  )
    ? fokontanyCustomAddress
    : placeOfBirthFacility
}

function addMentionTitle(elements: any[], title: string) {
  const truthyElements = elements.filter(Boolean)
  if (truthyElements.length > 0) {
    elements.unshift(title)
  }
  return elements
}

function getRecognitionMentionValues(this: Record<string, string>, i: number) {
  return addMentionTitle(
    [
      this['birthMentionRecognitionActNumber__' + i],
      this['birthMentionRecognitionDate__' + i],
      this['birthMentionRecognitionPlace__' + i],
      [
        this['birthMentionChildFamilyName__' + i],
        this['birthMentionChildFirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionMentionChildNID__' + i]
    ],
    'Fanjanahana'
  )
}

function getJudicialAdoptionMentionValues(
  this: Record<string, string>,
  i: number
) {
  return addMentionTitle(
    [
      this['birthMentionJudicialAdoptionActNumber__' + i],
      this['birthMentionJudicialAdoptionDate__' + i],
      this['birthMentionJudicialAdoptionJudgementDecisionNumber__' + i],
      this['birthMentionJudicialAdoptionJudgementDecisionDate__' + i],
      [
        this['birthMentionJudicialAdoptionParent1FamilyName__' + i],
        this['birthMentionJudicialAdoptionParent1FirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionJudicialAdoptionParent1NID__' + i],
      [
        this['birthMentionJudicialAdoptionParent2FamilyName__' + i],
        this['birthMentionJudicialAdoptionParent2FirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionJudicialAdoptionParent2NID__' + i]
    ],
    'Fanjanahana araka ny lalàna'
  )
}

function getSimpleAdoptionMentionValues(
  this: Record<string, string>,
  i: number
) {
  return addMentionTitle(
    [
      this['birthMentionSimpleAdoptionActNumber__' + i],
      this['birthMentionSimpleAdoptionDate__' + i],
      this['birthMentionSimpleAdoptionJudgementDecisionNumber__' + i],
      this['birthMentionSimpleAdoptionJudgementDecisionDate__' + i],
      [
        this['birthMentionSimpleAdoptionParent1FamilyName__' + i],
        this['birthMentionSimpleAdoptionParent1FirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionSimpleAdoptionParent1NID__' + i],
      [
        this['birthMentionSimpleAdoptionParent2FamilyName__' + i],
        this['birthMentionSimpleAdoptionParent2FirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionSimpleAdoptionParent2NID__' + i]
    ],
    'Fanjanahana tsotra'
  )
}

function getMarriageMentionValues(this: Record<string, string>, i: number) {
  return addMentionTitle(
    [
      this['birthMentionMarriageActNumber__' + i],
      this['birthMentionMarriageDate__' + i],
      this['birthMentionMarriageJudgementDecisionNumber__' + i],
      this['birthMentionMarriageJudgementDecisionDate__' + i],
      this['birthMentionMarriageTribunalOfFirstInstanceAct__' + i],
      [
        this['birthMentionBrideOrGroomFamilyName__' + i],
        this['birthMentionBrideOrGroomFirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionBrideOrGroomNID__' + i]
    ],
    'Fanambadiana'
  )
}

function getDivorceMentionValues(this: Record<string, string>, i: number) {
  return addMentionTitle(
    [
      this['birthMentionDivorceActNumber__' + i],
      this['birthMentionDivorceDate__' + i],
      this['birthMentionDivorcePlace__' + i],
      [
        this['birthMentionWifeOrHusbandFamilyName__' + i],
        this['birthMentionWifeOrHusbandFirstName__' + i]
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
      this['birthMentionWifeOrHusbandNID__' + i]
    ],
    'Fisarahana'
  )
}

function getNameChangeMentionValues(this: Record<string, string>, i: number) {
  return addMentionTitle(
    [
      this['birthMentionNameChangeActNumber__' + i],
      this['birthMentionNameChangeDate__' + i],
      this['birthMentionNameChangeJudgementDecisionNumber__' + i],
      this['birthMentionNameChangeJudgementDecisionDate__' + i],
      this['birthMentionNameChangeTribunalOfFirstInstanceAct__' + i],
      this['birthMentionModification__' + i]
    ],
    'Fanovana anarana'
  )
}

function getDeathMentionValues(this: Record<string, string>, i: number) {
  return addMentionTitle(
    [
      this['birthMentionDeathActNumber__' + i],
      this['birthMentionDeathDate__' + i],
      this['birthMentionDeathPlace__' + i],
      this['birthMentionDeathdateOfDeath__' + i],
      this['birthMentionDeathDeathPlace__' + i]
    ],
    'Fahafatesana'
  )
}

export function mentions(): Handlebars.HelperDelegate {
  return function (this: any) {
    let output = ''
    for (let i = 0; i < 10; i++) {
      if (!this['birthMentionDetailsMentionExist__' + i]) {
        break
      }
      const temp = [
        /**
         * @TODO
         * - handle rejection mention
         * - to optimize if needed: Mention titles handled in each function with addMentionTitle
         *  */
        // this['birthMentionTypeOfMention__' + i],
        ...getRecognitionMentionValues.apply(this, [i]),
        ...getJudicialAdoptionMentionValues.apply(this, [i]),
        ...getSimpleAdoptionMentionValues.apply(this, [i]),
        ...getMarriageMentionValues.apply(this, [i]),
        ...getDivorceMentionValues.apply(this, [i]),
        ...getNameChangeMentionValues.apply(this, [i]),
        ...getDeathMentionValues.apply(this, [i])
      ]
        .filter(Boolean)
        .join('\n- ')
      output += temp
      // Check if have anything to show before adding line break
      output += temp.length ? generateDoubleLineBreak() : ''
    }
    return { text: output, hasMention: Boolean(output) }
  }
}

export function isFirstCertificate(): Handlebars.HelperDelegate {
  return function (this: Record<string, string>) {
    return !this.certifier
  }
}

function getChildGeneratedOrManualNID(this: any) {
  return this.childNIDManual ? this.childNIDManual : this.childNID
}

export function getChildNID(): Handlebars.HelperDelegate {
  return function (this: Record<string, string>) {
    return getChildGeneratedOrManualNID.call(this)
  }
}

const districts = [
  {
    id: 5101,
    name: 'AMBATONDRAZAKA',
    region_id: 51,
    region_name: 'ALAOTRA-MANGORO'
  },
  {
    id: 5102,
    name: 'AMPARAFARAVOLA',
    region_id: 51,
    region_name: 'ALAOTRA-MANGORO'
  },
  {
    id: 5103,
    name: 'ANDILAMENA',
    region_id: 51,
    region_name: 'ALAOTRA-MANGORO'
  },
  {
    id: 5104,
    name: 'ANOSIBE AN ALA',
    region_id: 51,
    region_name: 'ALAOTRA-MANGORO'
  },
  {
    id: 5105,
    name: 'MORAMANGA',
    region_id: 51,
    region_name: 'ALAOTRA-MANGORO'
  },
  {
    id: 3101,
    name: 'AMBATOFINANDRAHANA',
    region_id: 31,
    region_name: "AMORON'I MANIA"
  },
  {
    id: 3102,
    name: 'AMBOSITRA',
    region_id: 31,
    region_name: "AMORON'I MANIA"
  },
  {
    id: 3103,
    name: 'FANDRIANA',
    region_id: 31,
    region_name: "AMORON'I MANIA"
  },
  {
    id: 3104,
    name: 'MANANDRIANA',
    region_id: 31,
    region_name: "AMORON'I MANIA"
  },
  {
    id: 1101,
    name: 'AMBOHIDRATRIMO',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1102,
    name: 'ANDRAMASINA',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1103,
    name: 'ANJOZOROBE',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1104,
    name: 'ANKAZOBE',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1105,
    name: 'ANTANANARIVO ATSIMONDRANO',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1106,
    name: 'ANTANANARIVO AVARADRANO',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1107,
    name: 'MANJAKANDRIANA',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  /** Districts are named as "CU TANA" instead of TANA because the existing
   * locations are named as "CU TANA". The ids are different than adminPCode
   * in this file: src/data-seeding/locations/source/locations.csv
   * So, there is no other way than name to name mapping. If the names do not
   * match exactly, the region name will not be resolved */
  {
    id: 1108,
    name: 'CU TANA I',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },

  {
    id: 1109,
    name: 'CU TANA II',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1110,
    name: 'CU TANA III',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1111,
    name: 'CU TANA IV',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1112,
    name: 'CU TANA V',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 1113,
    name: 'CU TANA VI',
    region_id: 11,
    region_name: 'ANALAMANGA'
  },
  {
    id: 5201,
    name: 'FENERIVE EST',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 5202,
    name: 'MANANARA-NORD',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 5203,
    name: 'MAROANTSETRA',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 5204,
    name: 'SAINTE MARIE',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 5205,
    name: 'SOANIERANA IVONGO',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 5206,
    name: 'VAVATENINA',
    region_id: 52,
    region_name: 'ANALANJIROFO'
  },
  {
    id: 6101,
    name: 'AMBOVOMBE ANDROY',
    region_id: 61,
    region_name: 'ANDROY'
  },
  {
    id: 6102,
    name: 'BEKILY',
    region_id: 61,
    region_name: 'ANDROY'
  },
  {
    id: 6103,
    name: 'BELOHA ANDROY',
    region_id: 61,
    region_name: 'ANDROY'
  },
  {
    id: 6104,
    name: 'TSIHOMBE',
    region_id: 61,
    region_name: 'ANDROY'
  },
  {
    id: 6201,
    name: 'AMBOASARY SUD',
    region_id: 62,
    region_name: 'ANOSY'
  },
  {
    id: 6202,
    name: 'BETROKA',
    region_id: 62,
    region_name: 'ANOSY'
  },
  {
    id: 6203,
    name: 'TAOLANARO',
    region_id: 62,
    region_name: 'ANOSY'
  },
  {
    id: 6301,
    name: 'AMPANIHY OUEST',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6302,
    name: 'ANKAZOABO SUD',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6303,
    name: 'BENENITRA',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6304,
    name: 'BEROROHA',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6305,
    name: 'BETIOKY SUD',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6306,
    name: 'MOROMBE',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6307,
    name: 'SAKARAHA',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6308,
    name: 'TOLIARA I',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 6309,
    name: 'TOLIARA II',
    region_id: 63,
    region_name: 'ATSIMO-ANDREFANA'
  },
  {
    id: 3201,
    name: 'BEFOTAKA ATSIMO',
    region_id: 32,
    region_name: 'ATSIMO-ATSINANANA'
  },
  {
    id: 3202,
    name: 'FARAFANGANA',
    region_id: 32,
    region_name: 'ATSIMO-ATSINANANA'
  },
  {
    id: 3203,
    name: 'MIDONGY SUD',
    region_id: 32,
    region_name: 'ATSIMO-ATSINANANA'
  },
  {
    id: 3204,
    name: 'VANGAINDRANO',
    region_id: 32,
    region_name: 'ATSIMO-ATSINANANA'
  },
  {
    id: 3205,
    name: 'VONDROZO',
    region_id: 32,
    region_name: 'ATSIMO-ATSINANANA'
  },
  {
    id: 5301,
    name: 'ANTANAMBAO MANAMPONTSY',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5302,
    name: 'BRICKAVILLE',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5303,
    name: 'MAHANORO',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5304,
    name: 'MAROLAMBO',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5305,
    name: 'TOAMASINA I',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5306,
    name: 'TOAMASINA II',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 5307,
    name: 'VATOMANDRY',
    region_id: 53,
    region_name: 'ATSINANANA'
  },
  {
    id: 4101,
    name: 'KANDREHO',
    region_id: 41,
    region_name: 'BETSIBOKA'
  },
  {
    id: 4102,
    name: 'MAEVATANANA',
    region_id: 41,
    region_name: 'BETSIBOKA'
  },
  {
    id: 4103,
    name: 'TSARATANANA',
    region_id: 41,
    region_name: 'BETSIBOKA'
  },
  {
    id: 4201,
    name: 'AMBATO BOENI',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 4202,
    name: 'MAHAJANGA I',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 4203,
    name: 'MAHAJANGA II',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 4204,
    name: 'MAROVOAY',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 4205,
    name: 'MITSINJO',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 4206,
    name: 'SOALALA',
    region_id: 42,
    region_name: 'BOENY'
  },
  {
    id: 1201,
    name: 'FENOARIVOBE',
    region_id: 12,
    region_name: 'BONGOLAVA'
  },
  {
    id: 1202,
    name: 'TSIROANOMANDIDY',
    region_id: 12,
    region_name: 'BONGOLAVA'
  },
  {
    id: 2101,
    name: 'AMBANJA',
    region_id: 21,
    region_name: 'DIANA'
  },
  {
    id: 2102,
    name: 'AMBILOBE',
    region_id: 21,
    region_name: 'DIANA'
  },
  {
    id: 2103,
    name: 'ANTSIRANANA I',
    region_id: 21,
    region_name: 'DIANA'
  },
  {
    id: 2104,
    name: 'ANTSIRANANA II',
    region_id: 21,
    region_name: 'DIANA'
  },
  {
    id: 2105,
    name: 'NOSY-BE',
    region_id: 21,
    region_name: 'DIANA'
  },
  {
    id: 3301,
    name: 'IKONGO',
    region_id: 33,
    region_name: 'FITOVINANY'
  },
  {
    id: 3302,
    name: 'MANAKARA',
    region_id: 33,
    region_name: 'FITOVINANY'
  },
  {
    id: 3303,
    name: 'VOHIPENO',
    region_id: 33,
    region_name: 'FITOVINANY'
  },
  {
    id: 3401,
    name: 'AMBALAVAO',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3402,
    name: 'AMBOHIMAHASOA',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3403,
    name: 'FIANARANTSOA',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3404,
    name: 'IKALAMAVONY',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3405,
    name: 'ISANDRA',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3406,
    name: 'LALANGINA',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3407,
    name: 'VOHIBATO',
    region_id: 34,
    region_name: 'HAUTE MATSIATRA'
  },
  {
    id: 3501,
    name: 'IAKORA',
    region_id: 35,
    region_name: 'IHOROMBE'
  },
  {
    id: 3502,
    name: 'IHOSY',
    region_id: 35,
    region_name: 'IHOROMBE'
  },
  {
    id: 3503,
    name: 'IVOHIBE',
    region_id: 35,
    region_name: 'IHOROMBE'
  },
  {
    id: 1301,
    name: 'ARIVONIMAMO',
    region_id: 13,
    region_name: 'ITASY'
  },
  {
    id: 1302,
    name: 'MIARINARIVO',
    region_id: 13,
    region_name: 'ITASY'
  },
  {
    id: 1303,
    name: 'SOAVINANDRIANA',
    region_id: 13,
    region_name: 'ITASY'
  },
  {
    id: 4301,
    name: 'AMBATOMAINTY',
    region_id: 43,
    region_name: 'MELAKY'
  },
  {
    id: 4302,
    name: 'ANTSALOVA',
    region_id: 43,
    region_name: 'MELAKY'
  },
  {
    id: 4303,
    name: 'BESALAMPY',
    region_id: 43,
    region_name: 'MELAKY'
  },
  {
    id: 4304,
    name: 'MAINTIRANO',
    region_id: 43,
    region_name: 'MELAKY'
  },
  {
    id: 4305,
    name: 'MORAFENOBE',
    region_id: 43,
    region_name: 'MELAKY'
  },
  {
    id: 6401,
    name: 'BELO SUR TSIRIBIHINA',
    region_id: 64,
    region_name: 'MENABE'
  },
  {
    id: 6402,
    name: 'MAHABO',
    region_id: 64,
    region_name: 'MENABE'
  },
  {
    id: 6403,
    name: 'MANJA',
    region_id: 64,
    region_name: 'MENABE'
  },
  {
    id: 6404,
    name: 'MIANDRIVAZO',
    region_id: 64,
    region_name: 'MENABE'
  },
  {
    id: 6405,
    name: 'MORONDAVA',
    region_id: 64,
    region_name: 'MENABE'
  },
  {
    id: 2201,
    name: 'ANDAPA',
    region_id: 22,
    region_name: 'SAVA'
  },
  {
    id: 2202,
    name: 'ANTALAHA',
    region_id: 22,
    region_name: 'SAVA'
  },
  {
    id: 2203,
    name: 'SAMBAVA',
    region_id: 22,
    region_name: 'SAVA'
  },
  {
    id: 2204,
    name: 'VOHEMAR',
    region_id: 22,
    region_name: 'SAVA'
  },
  {
    id: 4401,
    name: 'ANALALAVA',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4402,
    name: 'ANTSOHIHY',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4403,
    name: 'BEALANANA',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4404,
    name: 'BEFANDRIANA NORD',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4405,
    name: 'MAMPIKONY',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4406,
    name: 'MANDRITSARA',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 4407,
    name: 'PORT-BERGE',
    region_id: 44,
    region_name: 'SOFIA'
  },
  {
    id: 1401,
    name: 'AMBATOLAMPY',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1402,
    name: 'ANTANIFOTSY',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1403,
    name: 'ANTSIRABE I',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1404,
    name: 'ANTSIRABE II',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1405,
    name: 'BETAFO',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1406,
    name: 'FARATSIHO',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 1407,
    name: 'MANDOTO',
    region_id: 14,
    region_name: 'VAKINANKARATRA'
  },
  {
    id: 3601,
    name: 'IFANADIANA',
    region_id: 36,
    region_name: 'VATOVAVY'
  },
  {
    id: 3602,
    name: 'MANANJARY',
    region_id: 36,
    region_name: 'VATOVAVY'
  },
  {
    id: 3603,
    name: 'NOSY VARIKA',
    region_id: 36,
    region_name: 'VATOVAVY'
  }
]

export function getRegionName(): Handlebars.HelperDelegate {
  return function (this: any, districtName: string) {
    return districts.find((d) => d.name === districtName.toUpperCase())
      ?.region_name
  }
}
