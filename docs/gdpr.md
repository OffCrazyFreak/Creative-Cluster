# GDPR records

Working records for the associations that run the sites. Facts that only the associations know are marked `[[GAP]]`. This is not legal advice; a lawyer should read it before launch.

## Record of processing (Art. 30)

Controller per site: the association that runs it (see the imprint). Creative Cluster uses Inovatori DNŽ as its privacy contact. [[GAP: written joint-controller arrangement between the RPCC partners]]

| Activity                          | Data                                                                                   | Basis                          | Retention                                      | Processors                  |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------- | --------------------------- |
| Public listing of an organization | name, description, contact data, town or address, tags, images                         | legitimate interest            | until the owner deletes it, then 14 days grace | Neon, Netlify, Cloudinary   |
| Public listing of a person (DNŽ)  | full name, description, town (offset pin), optional photo                              | consent (versioned text, 16+)  | until withdrawn or deleted                     | Neon, Netlify, Cloudinary   |
| Accounts and sign-in              | email, name, password hash, sessions                                                   | contract / legitimate interest | until the account is deleted                   | Neon, Google (sign-in only) |
| Saved entries                     | which public listings a member saved, order, date                                      | contract                       | until changed or the account is deleted        | Neon                        |
| Near me on the map                | GPS position (browser only, never sent); town guess from the IP, rounded to about 1 km | legitimate interest            | not stored or logged                           | Netlify (geo lookup)        |
| Contact relay                     | message passed on by email, sender hash                                                | legitimate interest            | hashes 30 days, message not stored             | Resend                      |
| Moderation and change log         | before and after values                                                                | legitimate interest            | personal fields stripped after 90 days         | Neon                        |
| Set-password links                | token, expiry                                                                          | contract                       | 90 days                                        | Neon                        |
| Rejected applications             | application data                                                                       | legitimate interest            | 90 days                                        | Neon                        |
| Visit counts                      | daily totals, no identifiers                                                           | legitimate interest            | indefinite                                     | PostHog (EU, cookieless)    |
| Error logs                        | technical data, emails and tokens scrubbed                                             | legitimate interest            | provider schedule [[GAP]]                      | Sentry (EU)                 |

## DPIA screening note

A full DPIA is probably not required: the registry publishes business listings and, for people, only data they consent to publish; no special categories, no profiling, no large scale tracking. Points that argue for care and were handled in the design: public indexing of person names (separate consent, withdrawal unpublishes at once), exact pins for people (never stored, town level with a deterministic offset), machine translation of user text (Cloudflare, no storage by us beyond the translation row), the visitor's location on the map (GPS stays in the browser; the IP guess is read from Netlify's request context by a server function called after the page loads, so cached HTML never carries it, is kept only inside the site's region, rounded to about 1 km, and never stored or logged; kilometres are never shown to a person's offset pin and a locate never zooms in past zoom 13). [[GAP: association confirms the screening result]]

## Breach procedure (72 hours)

1. Whoever notices tells an admin at once; the admin opens a private issue with time, what was seen and which system.
2. Contain: rotate the affected secret (see `docs/runbook.md`, Rotating secrets), ban accounts, or pause the Netlify site.
3. Assess within 24 hours: what data, how many people, risk to them.
4. If there is a risk to people, notify the supervisory authority (AZOP in Croatia) within 72 hours of becoming aware; if the risk is high, tell the affected people without undue delay.
5. Record the breach, the decision and the fix, even when nobody is notified.

## Processor agreements (DPA checklist)

For each processor download the data processing agreement, store it with the association's records and tick it here. [[GAP: nothing downloaded yet; needs the real accounts]]

- Netlify, Neon, Resend, Cloudflare, Cloudinary, Geoapify, PostHog, Sentry, Google (sign-in).
