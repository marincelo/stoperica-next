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

/** Development mailer: prints emails to the console. Replace with an SMTP/provider implementation. */
const consoleMailer: Mailer = {
  async send(mail) {
    console.info(
      `\n----- EMAIL -----\nFrom: ${MAIL_FROM}\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.html}\n-----------------\n`,
    )
  },
}

export const mailer: Mailer = consoleMailer
