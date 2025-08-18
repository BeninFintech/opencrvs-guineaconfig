import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('node-fetch', () => {
  return {
    default: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'mock-public-key'
    })
  }
})

vi.mock('nodemailer', () => {
  const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'mocked-id' })

  return {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock
    })),
    __sendMailMock: sendMailMock
  }
})

let nodemailer: typeof import('nodemailer')

import { createServer } from '../../index'

import { testData } from './testData'
let sendMailMock: ReturnType<typeof vi.fn>

describe('User notification - Email', () => {
  let server: any

  beforeEach(async () => {
    vi.resetModules()
    nodemailer = await import('nodemailer')
    sendMailMock = (nodemailer as any).__sendMailMock as ReturnType<
      typeof vi.fn
    >
    sendMailMock.mockClear()
    server = await createServer()
  })

  testData.forEach(({ event, payload }) =>
    it(event, async () => {
      await server.server.inject({
        method: 'POST',
        url: `/triggers/user/${event}`,
        payload
      })
      expect(sendMailMock).toHaveBeenCalledTimes(1)
      expect(sendMailMock.mock.calls[0][0]).toMatchSnapshot()
    })
  )
})
