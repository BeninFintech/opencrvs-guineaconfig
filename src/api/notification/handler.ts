/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * OpenCRVS is also distributed under the terms of the Civil Registration
 * & Healthcare Disclaimer located at http://opencrvs.org/license.
 *
 * Copyright (C) The OpenCRVS Authors located at https://github.com/opencrvs/opencrvs-core/blob/master/AUTHORS.
 */
import { logger, maskEmail, maskSms } from '@countryconfig/logger'
import * as Hapi from '@hapi/hapi'
import * as Joi from 'joi'
import { COUNTRY_LOGO_URL, SENDER_EMAIL_ADDRESS } from './constant'
import { sendEmail } from './email-service'
import { TriggerToSMSTemplate, sendSMS } from './sms-service'
import { TriggerVariable, getTemplate, renderTemplate } from './email-templates'

import {
  TriggerEvent,
  TriggerPayload,
  FullName
} from '@opencrvs/toolkit/notification'
import { LOGIN_URL } from '@countryconfig/constants'
import { applicationConfig } from '../application/application-config'

type EmailPayloads = {
  subject: string
  html: string
  from: string
  to: string
}

export const emailSchema = Joi.object({
  subject: Joi.string().required(),
  html: Joi.string().required(),
  from: Joi.string().required(),
  to: Joi.string().required()
})

export async function emailHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const payload = request.payload as EmailPayloads

  if (process.env.NODE_ENV !== 'production') {
    logger.info(
      `Ignoring email due to NODE_ENV not being 'production'. Params: ${JSON.stringify(
        { ...payload, from: maskEmail(payload.from), to: maskEmail(payload.to) }
      )}`
    )
    return h.response().code(200)
  }

  await sendEmail(payload)

  return h.response().code(200)
}

export function makeNotificationHandler<T extends TriggerEvent>(event: T) {
  return async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { payload: maybePayload } = request

    const payloadValidation = TriggerPayload[event].safeParse(maybePayload)

    if (!payloadValidation.success) {
      return h
        .response({
          error: 'Invalid payload',
          details: payloadValidation.error
        })
        .code(400)
    }

    await sendNotification(event, payloadValidation.data as TriggerPayload[T])

    return h.response().code(200)
  }
}

function stringifyV1Name(name: FullName) {
  return name.given[0] + ' ' + name.family
}

function generateFailureLog({
  contact,
  name,
  event,
  reason
}: {
  contact: { mobile?: string; email?: string }
  name: string
  event: TriggerEvent
  reason: string
}) {
  contact.mobile &&= maskSms(contact.mobile)
  contact.email &&= maskEmail(contact.email)
  logger.info(
    `Ignoring notification due to ${reason}. Params: ${JSON.stringify({
      event,
      recipient: {
        ...contact,
        name
      }
    })}`
  )
  return
}

export async function sendNotification<T extends TriggerEvent>(
  event: T,
  payload: TriggerPayload[T]
) {
  const variables = convertPayloadToVariable({
    event,
    payload
  } as TriggerEventPayloadPair)

  const { name: nameV1, ...contact } = payload.recipient
  const name = stringifyV1Name(nameV1[0])

  const applicationName = applicationConfig.APPLICATION_NAME
  const userNotificationDeliveryMethod =
    applicationConfig.USER_NOTIFICATION_DELIVERY_METHOD

  if (userNotificationDeliveryMethod === 'email') {
    if (!payload.recipient.email) {
      generateFailureLog({
        contact,
        name,
        event,
        reason:
          "Not having recipient email when USER_NOTIFICATION_DELIVERY_METHOD is 'email'"
      })
      return
    }

    const template = getTemplate(event)

    const emailBody = renderTemplate(template, {
      ...variables,
      applicationName,
      countryLogo: COUNTRY_LOGO_URL
    })

    await sendEmail({
      subject: template.subject,
      html: emailBody,
      from: SENDER_EMAIL_ADDRESS,
      to: payload.recipient.email
    })
  } else if (userNotificationDeliveryMethod === 'sms') {
    if (!contact.mobile) {
      generateFailureLog({
        contact,
        name,
        event,
        reason:
          "Not having recipient mobile when USER_NOTIFICATION_DELIVERY_METHOD is 'sms'"
      })
      return
    }

    await sendSMS(
      TriggerToSMSTemplate[event],
      { ...variables, applicationName, countryLogo: COUNTRY_LOGO_URL },
      contact.mobile,
      'en'
    )
  } else {
    generateFailureLog({
      contact,
      name,
      event,
      reason: `Invalid USER_NOTIFICATION_DELIVERY_METHOD. Options are 'emai' or 'sms'. Found ${userNotificationDeliveryMethod}`
    })
    return
  }
}

export type TriggerEventPayloadPair<T extends TriggerEvent = TriggerEvent> = {
  [K in T]: {
    event: K
    payload: TriggerPayload[K]
  }
}[T]

function convertPayloadToVariable({
  event,
  payload
}: TriggerEventPayloadPair): TriggerVariable[typeof event] {
  const firstname = payload.recipient.name[0].given[0]
  switch (event) {
    case TriggerEvent.USER_CREATED:
      return {
        firstname: payload.recipient.name[0].given[0],
        username: payload.username,
        password: payload.temporaryPassword,
        completeSetupUrl: LOGIN_URL,
        loginURL: LOGIN_URL
      }

    case TriggerEvent.USER_UPDATED:
      return {
        firstname,
        oldUsername: payload.oldUsername,
        newUsername: payload.newUsername
      }

    case TriggerEvent.USERNAME_REMINDER:
      return {
        firstname,
        username: payload.username
      }

    case TriggerEvent.RESET_PASSWORD:
      return {
        firstname,
        authCode: payload.code
      }

    case TriggerEvent.RESET_PASSWORD_BY_ADMIN:
      return {
        firstname,
        password: payload.temporaryPassword
      }

    case TriggerEvent.TWO_FA:
      return {
        firstname,
        authCode: payload.code
      }

    default:
      throw new Error(`Unknown event: ${event}`)
  }
}
