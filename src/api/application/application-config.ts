// src/api/application/application-config.ts

export type FeeConfig = {
  ON_TIME: number
  LATE: number
  DELAYED?: number
}

export type EventConfig = {
  REGISTRATION_TARGET: number
  LATE_REGISTRATION_TARGET: number
  FEE: FeeConfig
  PRINT_IN_ADVANCE: boolean
}

export type ApplicationConfig = {
  APPLICATION_NAME: string
  COUNTRY_LOGO: string
  SYSTEM_IANA_TIMEZONE: string
  CURRENCY: {
    languagesAndCountry: string[]
    isoCode: string
  }
  PHONE_NUMBER_PATTERN: string
  NID_NUMBER_PATTERN: string
  LOGIN_BACKGROUND: {
    backgroundColor: string
  }
  BIRTH: EventConfig
  DEATH: EventConfig
  MARRIAGE: EventConfig
  FIELD_AGENT_AUDIT_LOCATIONS: string
  DECLARATION_AUDIT_LOCATIONS: string
  FEATURES: {
    DEATH_REGISTRATION: boolean
    MARRIAGE_REGISTRATION: boolean
    EXTERNAL_VALIDATION_WORKQUEUE: boolean
    PRINT_DECLARATION: boolean
    DATE_OF_BIRTH_UNKNOWN: boolean
  }
  USER_NOTIFICATION_DELIVERY_METHOD: 'sms' | 'email'
  INFORMANT_NOTIFICATION_DELIVERY_METHOD: 'sms' | 'email'
  SIGNATURE_REQUIRED_FOR_ROLES: string[]
  SEARCH_DEFAULT_CRITERIA: string
}

export const applicationConfig: ApplicationConfig = {
  APPLICATION_NAME: 'Guinea CRVS',

  BIRTH: {
    REGISTRATION_TARGET: 30,
    LATE_REGISTRATION_TARGET: 365,
    FEE: { ON_TIME: 500, LATE: 300, DELAYED: 10202 },
    PRINT_IN_ADVANCE: true
  },

  COUNTRY_LOGO:
    'https://gifex.com/fr/wp-content/uploads/40860/Armoiries-de-la-Guinee.png',

  SYSTEM_IANA_TIMEZONE: 'Africa/Conakry',

  CURRENCY: {
    languagesAndCountry: ['fr-GN'],
    isoCode: 'GNF'
  },

  DEATH: {
    REGISTRATION_TARGET: 20,
    LATE_REGISTRATION_TARGET: 15,
    FEE: { ON_TIME: 2000, LATE: 4000 },
    PRINT_IN_ADVANCE: true
  },

  PHONE_NUMBER_PATTERN: '^(\\+224|224)?[2567][0-9]{7}$',

  NID_NUMBER_PATTERN: '^[0-9]{9,12}$',

  LOGIN_BACKGROUND: {
    backgroundColor: 'FFFFFF'
  },

  MARRIAGE: {
    REGISTRATION_TARGET: 45,
    LATE_REGISTRATION_TARGET: 20,
    FEE: { ON_TIME: 5000, LATE: 3500 },
    PRINT_IN_ADVANCE: true
  },

  FIELD_AGENT_AUDIT_LOCATIONS: 'PREFECTURE',
  DECLARATION_AUDIT_LOCATIONS: 'SOUS_PREFECTURE',

  FEATURES: {
    DEATH_REGISTRATION: true,
    MARRIAGE_REGISTRATION: true,
    EXTERNAL_VALIDATION_WORKQUEUE: false,
    PRINT_DECLARATION: true,
    DATE_OF_BIRTH_UNKNOWN: true
  },

  USER_NOTIFICATION_DELIVERY_METHOD: 'sms',
  INFORMANT_NOTIFICATION_DELIVERY_METHOD: 'sms',

  SIGNATURE_REQUIRED_FOR_ROLES: ['LOCAL_REGISTRAR', 'NATIONAL_REGISTRAR'],

  SEARCH_DEFAULT_CRITERIA: 'TRACKING_ID'
}

export const COUNTRY_WIDE_CRUDE_DEATH_RATE = 10

export type EventNotificationFlags = {
  'sent-notification'?: boolean
  'sent-notification-for-review'?: boolean
  'sent-for-approval'?: boolean
  registered?: boolean
  'sent-for-updates'?: boolean
}

export type NotificationFlags = {
  BIRTH?: EventNotificationFlags
  DEATH?: EventNotificationFlags
  MARRIAGE?: EventNotificationFlags
}

export const notificationForRecord: NotificationFlags = {
  BIRTH: {
    'sent-notification': true,
    'sent-notification-for-review': true,
    'sent-for-approval': true,
    registered: true,
    'sent-for-updates': true
  },
  DEATH: {
    'sent-notification': true,
    'sent-notification-for-review': true,
    'sent-for-approval': true,
    registered: true,
    'sent-for-updates': true
  },
  MARRIAGE: {
    'sent-notification': true,
    'sent-for-approval': true,
    registered: true
  }
}
