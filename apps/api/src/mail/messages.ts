import { prisma } from '../db.js'
import { env } from '../env.js'
import { deliver, escapeHtml } from '../lib/mailer.js'

const racesUrl = `${env.publicWebUrl}/`
const logoUrl = `${env.publicWebUrl}/logo.png`

/** Rails `RacerMailer#welcome`. Login is the email plus the phone number. */
export function sendWelcomeEmail(racer: {
  email: string | null
  firstName: string | null
  phoneNumber: string | null
}): void {
  if (!racer.email) return
  const name = escapeHtml(racer.firstName)
  const email = escapeHtml(racer.email)
  const phone = escapeHtml(racer.phoneNumber)
  deliver({
    to: racer.email,
    subject: 'Welcome to Stoperica.live',
    html: `<h1>Poštovani/a ${name},</h1>
<p>upravo ste se registrirali na Stoperica.live stranicu!</p>
<p>Vaši podaci za prijavu su:<br>Korisničko ime: ${email}<br>Zaporka: ${phone}</p>
<p>Za prijavu na utrku molimo odaberite utrku u <a href="${racesUrl}">izborniku utrke</a>.</p>
<p>U prijavama utrke odaberite kategoriju, te potvrdite na "Prijavi se".</p>
<p>Nakon uspješne prijave Vaše ime će se pojaviti na listi prijava.</p>
<hr>
<h1>Dear ${name},</h1>
<p>you just registered on the Stoperica.live timing site!</p>
<p>Your login details are:<br>Username: ${email}<br>Password: ${phone}</p>
<p>To make a race registration you need select the race from the <a href="${racesUrl}">race menu</a>.</p>
<p>Choose a category on race details page and confirm your application on the "Prijavi se" button.</p>
<p>After successful race registration your name will appear on application list</p>
<hr>
<img src="${logoUrl}" alt="Stoperica">`,
  })
}

export async function sendWelcomeEmailForRacer(racerId: number): Promise<void> {
  const racer = await prisma.racer.findUnique({
    where: { id: racerId },
    select: { email: true, firstName: true, phoneNumber: true },
  })
  if (racer) sendWelcomeEmail(racer)
}

/** Rails `RacerMailer#race_details`: the race's own HTML, sent only when `send_email` is set. */
export function sendRegistrationEmail(
  race: { name: string | null; sendEmail: boolean | null; emailBody: string | null },
  to: string | null | undefined,
): void {
  if (!race.sendEmail || !to) return
  deliver({
    to,
    subject: `Prijava na ${race.name ?? ''}`,
    html: race.emailBody ?? '',
  })
}
