import { countryLogo } from '@countryconfig/api/application/country-logo'

export const applicationConfig = {
  APPLICATION_NAME: 'Guinea CRVS',

  BIRTH: {
    REGISTRATION_TARGET: 30, // Within 30 days
    LATE_REGISTRATION_TARGET: 365, // After 365 days
    FEE: {
      ON_TIME: 500, // 500 GNF
      LATE: 300, // 300 GNF
      DELAYED: 10202 // 10202 GNF
    },
    PRINT_IN_ADVANCE: true
  },

  COUNTRY_LOGO: 'https://gifex.com/fr/wp-content/uploads/40860/Armoiries-de-la-Guinee.png',

  SYSTEM_IANA_TIMEZONE: 'Africa/Conakry', // fuseau officiel pour la Guinée

  CURRENCY: {
    languagesAndCountry: ['fr-GN'],
    isoCode: 'GNF'
  },

  DEATH: {
    REGISTRATION_TARGET: 20, // Within 20 days
    LATE_REGISTRATION_TARGET: 15, // After 15 days
    FEE: {
      ON_TIME: 2000, // 2000 GNF
      LATE: 4000 // 4000 GNF
    },
    PRINT_IN_ADVANCE: true
  },

  PHONE_NUMBER_PATTERN: '^(\\+224|224)?[2567][0-9]{7}$', 

  NID_NUMBER_PATTERN: '^[0-9]{9,12}$', 

  LOGIN_BACKGROUND: {
    backgroundColor: 'FFFFFF' 
  },

  MARRIAGE: {
    REGISTRATION_TARGET: 45, // Within 45 days
    LATE_REGISTRATION_TARGET: 20, // After 20 days
    FEE: {
      ON_TIME: 5000, // 5000 GNF
      LATE: 3500 // 3500 GNF
    },
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

type EventNotificationFlags = {
  'sent-notification'?: boolean
  'sent-notification-for-review'?: boolean
  'sent-for-approval'?: boolean
  registered?: boolean
  'sent-for-updates'?: boolean
}

type NotificationFlags = {
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
