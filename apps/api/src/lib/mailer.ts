import nodemailer from 'nodemailer'
import { env } from '../env.js'

export interface Mail {
  to: string
  subject: string
  html: string
}

export interface Mailer {
  send(mail: Mail): Promise<void>
}

export const MAIL_FROM = 'Stoperica Timing <info@stoperica.live>'

export function escapeHtml(value: string | null | undefined): string {
  return (value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Development mailer: prints emails to the console. */
const consoleMailer: Mailer = {
  async send(mail) {
    console.info(
      `\n----- EMAIL -----\nFrom: ${MAIL_FROM}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.html}\n-----------------\n`,
    )
  },
}

const transport = env.emailPassword
  ? nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: 'stoperica.timing@gmail.com', pass: env.emailPassword },
    })
  : null

const smtpMailer: Mailer | null = transport
  ? {
      async send(mail) {
        await transport.sendMail({ from: MAIL_FROM, to: mail.to, subject: mail.subject, html: mail.html })
      },
    }
  : null

if (!smtpMailer && env.isProduction) {
  console.warn('EMAIL_PASSWORD is not set; outgoing mail is written to the log instead of Gmail')
}

export const mailer: Mailer = smtpMailer ?? consoleMailer

/** Rails delivers with ActiveJob, so a Gmail failure must not fail the request that triggered it. */
export function deliver(mail: Mail): void {
  if (!mail.to.trim()) return
  void mailer.send(mail).catch((error: unknown) => {
    console.error(`Email to ${mail.to} failed (${mail.subject})`, error)
  })
}
