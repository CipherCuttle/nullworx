# Email flows — prepared, never sent

**Status: DRAFT / NOT SENT.** V0.1 does not send a single email. These files are
copy and configuration references for the owner to load into Brevo after
review. Any real send requires a separate, explicit owner decision.

## Intended flow

1. A visitor submits the Drops form with free-newsletter consent and,
   independently, an optional premium-marketing preference.
2. `lib/newsletter/brevo-provider.ts` calls Brevo's
   `POST /v3/contacts/doubleOptinConfirmation` with the Drops list, the DOI
   template, a fixed redirect URL and consent attributes.
3. Brevo sends the DOI confirmation. The address is not an active Drops
   subscriber until the visitor clicks the confirmation link.
4. Brevo redirects the confirmed visitor to `/drops/confirmed`.
5. A welcome email may be configured as a provider automation after DOI
   confirmation. It is not sent by this repository.
6. Every campaign includes the provider-managed unsubscribe/preferences link.
   The premium-marketing preference is separate and must never be inferred from
   free-newsletter consent.

## Brevo setup checklist

- Create the Drops list and note its numeric ID (`BREVO_DROPS_LIST_ID`).
- Create the DOI template (`BREVO_DOI_TEMPLATE_ID`) from
  [`doi-confirmation.html`](doi-confirmation.html), replacing the owner name and
  postal/contact details required in your jurisdiction.
- Set the DOI redirect URL to `https://nulllworx.site/drops/confirmed` in the
  template/configuration, and configure `NEWSLETTER_CONFIRM_REDIRECT_URL` to the
  same URL.
- Create the custom contact attributes listed in `docs/NEWSLETTER.md`.
- Configure the Brevo DPA/subprocessors and sender-domain authentication
  (SPF, DKIM, DMARC) before any real subscriber traffic.
- Create a welcome automation only after the DOI template and consent records
  are tested.
- Do not add the premium-marketing list until the owner has designed and
  reviewed a separate premium consent flow.

## Files

| File | Purpose | Sent? |
| --- | --- | --- |
| `doi-confirmation.html` | Brevo double opt-in template | No |
| `welcome.md` | Post-confirmation welcome copy | No |
| `new-drop.md` | Campaign draft skeleton | No |
| `preferences.md` | Unsubscribe and preference guidance | No |

## Test mode

`NEWSLETTER_PROVIDER=mock` uses an in-memory provider. It generates a local
confirmation link so the flow can be exercised without an email provider. It
never sends email and is blocked in production unless
`NEWSLETTER_ALLOW_MOCK=1` is set explicitly. Do not set that flag on a public
deployment that collects real addresses.
