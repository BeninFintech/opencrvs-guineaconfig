/* eslint-disable prettier/prettier */
/*
 * Adaptation OpenCRVS pour la Guinée
 * Licence : MPL 2.0
 */
import {
  readCSVToJSON,
  extractStatisticsMap,
  getStatistics,
  LocationStatistic
} from '@countryconfig/utils'
import { Request, ResponseToolkit } from '@hapi/hapi'

type HumdataLocation = {
  admin0Pcode: string
  admin0Name_en: string
  admin0Name_alias?: string

  admin1Pcode?: string
  admin1Name_en?: string
  admin1Name_alias?: string

  admin2Pcode?: string
  admin2Name_en?: string
  admin2Name_alias?: string

  admin3Pcode?: string
  admin3Name_en?: string
  admin3Name_alias?: string
}

type Facility = {
  id: string
  name: string
  partOf: string
  locationType: 'HEALTH_FACILITY' | 'CRVS_OFFICE'
}

type Location = {
  id: string
  name: string
  alias: string
  partOf: string
  locationType: 'ADMIN_STRUCTURE' | 'HEALTH_FACILITY' | 'CRVS_OFFICE'
  jurisdictionType?: (typeof JURISDICTION_TYPE)[number]
  statistics?: LocationStatistic['years']
}

type ApplicationSetting = {
  General: string
  Configuration: string
}

const JURISDICTION_TYPE = [
  'COUNTRY',
  'REGION',
  'PREFECTURE',
  'SOUS_PREFECTURE'
] as const

// Helper pour forcer un retour tableau
function ensureArray<T>(data: T | T[]): T[] {
  return Array.isArray(data) ? data : [data]
}

export async function locationsHandler(_: Request, h: ResponseToolkit) {
  const [
    humdataLocations,
    healthFacilities,
    crvsFacilities,
    statistics
    // applicationSettings
  ] = await Promise.all([
    readCSVToJSON<HumdataLocation>(
      './src/data-seeding/locations/source/locations.csv'
    ).then(ensureArray),
    readCSVToJSON<Facility>(
      './src/data-seeding/locations/source/health_facilities.csv'
    ).then(ensureArray),
    readCSVToJSON<Facility>(
      './src/data-seeding/locations/source/crvs-facilities.csv'
    ).then(ensureArray),
    getStatistics(),
    // readCSVToJSON<ApplicationSetting>(
    //   './src/data-seeding/locations/source/application_setting.csv'
    // ).then(ensureArray)
  ])

  const locations = new Map<string, Location>()
  const statisticsMap = extractStatisticsMap(statistics)

  humdataLocations.forEach((loc) => {
    ;([0, 1, 2, 3] as const).forEach((level) => {
      const id = loc[`admin${level}Pcode` as keyof HumdataLocation] as string
      if (id) {
        const name = loc[`admin${level}Name_en` as keyof HumdataLocation] as string
        const alias =
          (loc[`admin${level}Name_alias` as keyof HumdataLocation] as string) ??
          name
        const parent =
          level === 0
            ? 'Location/0'
            : `Location/${loc[`admin${(level - 1) as 0 | 1 | 2}Pcode`]}`

        locations.set(id, {
          id,
          name,
          alias,
          partOf: parent,
          locationType: 'ADMIN_STRUCTURE',
          jurisdictionType: JURISDICTION_TYPE[level],
          statistics: statisticsMap.get(id)?.years
        })
      }
    })
  })

  ;[...healthFacilities, ...crvsFacilities].forEach((facility) => {
    locations.set(facility.id, {
      ...facility,
      alias: facility.name
    })
  })
  

  return h.response({
    locations: Array.from(locations.values()),
    applicationSettings
  })
}
