/*
 * Adaptation OpenCRVS pour la Guinée
 * Licence : MPL 2.0
 */
import { Request, ResponseToolkit } from '@hapi/hapi'
import { applicationConfig } from './application-config'
import { readCSVToJSON } from '@countryconfig/utils'

export interface Employee {
  primaryOfficeId: string
  givenNames: string
  familyName: string
  role: string
  mobile: string
  username: string
  email: string
  password: string
}

interface HealthFacility {
  id: string
  name: string
  partOf: string
  locationType: string
}

interface Location {
  id: string
  name: string
  jurisdictionType: string
  statisticalId: string
  partOf?: string 
}

interface Statistic {
  locationId: string
  femalePopulation: number
  malePopulation: number
  totalPopulation: number
  crude_birth_rate: number
}

// Helper pour garantir un tableau
function ensureArray<T>(data: T | T[]): T[] {
  return Array.isArray(data) ? data : [data]
}

// Handler pour les CRVS facilities
export async function crvsHandler(_: Request, h: ResponseToolkit) {
  const filePath = './src/data-seeding/locations/source/crvs-facilities.csv'
  const facilities = ensureArray(await readCSVToJSON<HealthFacility>(filePath))
  return h.response(facilities)
}

// Handler pour les health facilities 
export async function healthFacilitiesHandler(_: Request, h: ResponseToolkit) {
  const filePath = './src/data-seeding/locations/source/health_facilities.csv'
  const facilities = ensureArray(await readCSVToJSON<HealthFacility>(filePath))
  return h.response(facilities)
}

// Handler pour les locations
export async function locationsHandler(_: Request, h: ResponseToolkit) {
  const filePath = './src/data-seeding/locations/source/locations.csv'
  const locations = ensureArray(await readCSVToJSON<Location>(filePath))
  return h.response(locations) 
}

// Handler pour les statistics
export async function statisticsHandler(_: Request, h: ResponseToolkit) {
  const filePath = './src/data-seeding/locations/source/statistics.csv'
  const statistics = ensureArray(await readCSVToJSON<Statistic>(filePath))
  return h.response(statistics)
}

// Handler pour la configuration de l'application
export async function applicationConfigHandler(_: Request, h: ResponseToolkit) {
  return h.response(applicationConfig)
}
