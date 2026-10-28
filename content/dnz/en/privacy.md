# Privacy policy

Last changed: 13 October 2026 (version 1)

This policy explains what personal data we collect on this site, why, how long we keep it, and what you can do about it. We write it in plain words. If something is unclear, ask us.

## 1. Who is responsible

The controller is Udruga inovatora Dubrovačko-neretvanske županije (Inovatori DNŽ, the Association of Innovators of Dubrovnik-Neretva County), {{legal.seat}}, OIB (Croatian tax number) {{legal.oib}}, entered in the Croatian Register of Associations under number [[GAP: register number]]. The president, {{legal.representative}}, represents it. For privacy questions write to [[GAP: privacy email address]].

We have no data protection officer because the law does not require one for us. [[GAP: confirm with lawyer]]

## 2. What data we use and why

**Browsing.** While you only browse, our host (Netlify) briefly logs technical data, including your IP address, to deliver the site and keep it secure. We count visits to listing pages as a total per listing per day, not who opened it. We do not count bots, prefetches or the listing owner. We also measure visits without cookies (section 8) and log technical errors (Sentry).

**Organization listings.** For organizations we publish what the organization gives us or what is public: name, description, what it offers and seeks, website, social links, location (address or town only), logo, tags, legal form and references. Names of contact persons can appear if the organization publishes them. The contact email and phone are visible only if the listing owner makes them public; otherwise we use them only to forward messages and to talk to you.

**People's listings (innovators).** We publish a person only with their consent. We publish what the person enters: full name, description, what they offer and seek, tags, web links, town (never an exact address) and, if they want, a photo. The full name is part of the page address (URL), and the page can be found by search engines, including Google. Photos are served by Cloudinary, whose servers are in the US (section 5). Consent is given with a separate box that is not ticked in advance, and with it you confirm you are 16 or older. We store the version of the consent text and the time you gave it.

**Accounts.** Accounts are created only by invitation, approval of an application, or claiming an existing listing. For an account we keep your email, name, language, password (only as a hash, never in clear text), sign-in records and, if you sign in with Google, your Google account identifier. The account lets you edit your listing, post opportunities and confirm connections. If you save listings on the map (up to 10), we keep that list with your account; it is part of your data export and is deleted with the account.

**Apply form.** If you apply, we process what you enter (as in the listings above), check your email with a link, and have an editor review it. Rejected applications can be edited and sent again; we delete them after 90 days.

**Contact form.** The message you send to a listing is forwarded by email (Resend) to the listing owner, with your email as the reply address. **We do not store the message itself.** We store only a one-way hash of the sender and the time, for 30 days, to limit abuse (for example at most three messages per sender per hour). The recipient sees the name and email you typed and your message. After that they handle them as a controller for their own purposes.

**Opportunities board.** Posts made by listing owners (title, description, deadline, tags) are public while active. Contact goes only through the form.

**Connections.** When an owner proposes a connection to another listing, only the other owner and the editors see it until it is confirmed. Only confirmed connections are public.

**Translation.** We machine-translate listing and opportunity texts between Croatian and English (Cloudflare Workers AI). We send only text that is published or meant to be published, without emails or account data. Translated text is labelled as machine translated, with a link to the original.

**Security and abuse.** To protect forms we use Cloudflare Turnstile (checks you are not a robot), a hidden field, a minimum fill time and rate limits, which involve briefly noting your IP address. The change log records who changed what on a listing, for undo and abuse protection.

**Password check.** When you set a password we check it with Have I Been Pwned using k-anonymity: only the first 5 characters of a hash are sent, never your password or the full hash.

**Addresses and map.** We turn an address into a position with Geoapify (EU) or from the public address register of the State Geodetic Administration (DGU), which we keep ourselves; in that case no personal data leaves our system. The map tiles load from OpenFreeMap, so your browser contacts that server (it sees your IP address, as with any image).

**Your location on the map.** If you press the "Entries near me" button, or your browser already allows this site to use your location, your browser gives the map your position so the list can show the nearest entries first and how far away they are. This happens only on your device: we never receive, store or pass on your position. You can withdraw the permission in your browser settings at any time. Without it, our host (Netlify) guesses your approximate town from your IP address when the map opens. We use that guess, rounded to about a kilometre, only to order the list for you, and only when it falls in or near Croatia. We do not store or log it.

**Must you give the data?** You do not have to give anything, but we cannot publish a listing without a name, a description, one contact and a location (country and town). We cannot publish a person without consent. We cannot open an account without an email.

We make no automated decisions and do no profiling with legal or similar effects on you. Tag matching ("similar to you") is a simple match of tags you chose, and you can switch it off in your account.

## 3. Legal bases

- **People (innovators):** your consent (Article 6(1)(a) of the General Data Protection Regulation, GDPR). You can withdraw it at any time in your account (/account) or by email. The page is then taken down at once. Withdrawal does not affect earlier processing. Note: copies Google has already stored can stay in search results until Google refreshes them. If that happens, we file a removal request with Google on your behalf.
- **Organizations:** our legitimate interest (Article 6(1)(f)) in running a public directory of organizations and helping them connect. We weigh that against your rights: we publish business-type data and, where possible, public data, and you can always object and ask for removal with one click or by email. [[GAP: lawyer confirms the balancing test]]
- **Accounts and sign-in:** performing a contract, meaning the service you asked for (Article 6(1)(b)).
- **Contact form, security logs, visit counts, error logging, abuse protection:** legitimate interest (Article 6(1)(f)) in keeping the site working, safe and improving it.
- **Legal obligations** (for example answering an authority): Article 6(1)(c).

## 4. Who receives data (processors)

We do not sell data. We use these processors, with a data processing agreement signed or accepted:

- **Netlify** (hosting, US, certified under the EU-US Data Privacy Framework): delivers the site and runs server functions.
- **Neon** (database, Frankfurt, EU): all listing, account and log data.
- **Resend** (email sending, US, certified under the EU-US Data Privacy Framework): invitations, confirmations, notices and message forwarding.
- **Cloudflare** (Workers AI for translation, Turnstile for form protection): processing under Cloudflare's data processing terms. [[GAP: confirm processing region and Workers AI data-use terms]]
- **Cloudinary** (image delivery, US): organization logos and covers and people's photos. The US transfer relies on the EU-US Data Privacy Framework and standard contractual clauses.
- **Geoapify** (address to position, EU): receives only the address you typed.
- **OpenFreeMap** (map tiles): your browser loads tiles directly from them.
- **PostHog, EU cloud, Frankfurt** (cookieless visit measurement).
- **Sentry, EU** (technical error logging; personal data sending is off, and emails and tokens are removed before sending).
- **Google** (sign-in with Google, only for existing accounts): Google gives us your verified email and name; Google's own policy covers their side.
- **Have I Been Pwned** (password check): see section 2.
- **Editors and administrators** appointed by the association have access for moderation.
- **Authorities and supervisors** only where the law requires it.

## 5. Transfers outside the EU/EEA

Most data stays in the EU (Neon in Frankfurt, PostHog and Sentry in the EU, Geoapify in the EU). Some providers (Netlify, Resend, Cloudinary, Cloudflare) may process data in the US. For them we rely on the EU-US Data Privacy Framework (the European Commission's 2023 adequacy decision) and, as a fallback, on the standard contractual clauses in their processing agreements. You can ask us for a copy of the safeguards.

## 6. How long we keep data

- Listing and account: until you delete them or the account is no longer needed. If you ask for erasure, we archive the listing at once (it is no longer public) and delete it for good after **14 days**, unless you cancel within that time.
- Change log: personal fields are removed from entries after **90 days**, and at once when you delete your account.
- Sender hashes of contact messages: **30 days**. The messages themselves are not kept.
- Invitations: **90 days**. A claim link is valid for 30 days.
- Rejected applications: **90 days**.
- Imported organization listings that nobody has claimed: archived automatically **12 months** after import. Editors can restore them.
- Visit counters: only a total per day, no personal data.
- Server and error logs at the providers: under their own schedules, usually a few weeks. [[GAP: check Netlify and Sentry retention]]
- Database backups: [[GAP: Neon backup retention]]; deleted data leaves backups when that period ends.

## 7. Your rights

You have the right to access, correct, erase, restrict, port and object, and to withdraw consent. You can do most yourself:

- **Export your data (JSON) and delete your account and listing:** sign in and open **/account/data**.
- **Correction:** edit your listing in your account.
- **Objection or removal of an organization that has not claimed its account:** use the "remove" link in the email you get, or write to [[GAP: privacy email address]].
- **Anything else:** write to [[GAP: privacy email address]]. We answer within one month.

Requests are free. If we doubt who you are, we may ask you to confirm your identity.

**Complaint to the supervisory authority.** If you think we process your data unlawfully, you may complain to the Croatian Personal Data Protection Agency (AZOP), Ulica Metela Ožegovića 16, 10000 Zagreb, azop@azop.hr, www.azop.hr. If you live in another EU country, you may contact the authority there. We would appreciate the chance to put things right first.

## 8. Cookies and analytics

**Short version.** We set one cookie, and only to keep you signed in. We count visits without storing anything on your device. We do not show a cookie banner, because there is nothing to ask you about.

**Login cookie.** If you have an owner or admin account, signing in sets a cookie that keeps you signed in. It is strictly necessary for the service you asked for, and it is only set when you sign in. Visitors who only browse get no cookie from us. This cookie is exempt from consent. The cookies are named {{cookiePrefix}}.session_token (up to 7 days) and {{cookiePrefix}}.session_data (1 minute).

**Counting visits (PostHog).** We use PostHog to count how many people visit and which parts are used, for example how many applications are sent. We run it in its cookieless mode. It writes nothing to your device: no cookie, no local storage, no session storage. To count a visitor, the PostHog server makes a one-way code from your IP address, your browser type and a secret key that changes every day. We cannot turn that code back into you, and it cannot link your visits from one day to the next. We do not record sessions, we do not follow you across other sites, and we do not build profiles. Data is processed by PostHog in the EU (Frankfurt).

**Error reports (Sentry).** When the site breaks, Sentry gets a report so we can fix it. We set it up to send no names, no email addresses and no tokens. A report holds technical details such as the page address, the browser type and the error. If you were signed in, it holds an internal account number only. It is stored in the EU.

**Saved form drafts.** If you fill in the apply form, the site keeps a draft in your browser so you do not lose it. This is stored only on your device and only because you are filling in the form. We never receive it until you send the form.

**Why there is no cookie banner.** Croatian law (Zakon o elektroničkim komunikacijama, Art. 100) and the EU ePrivacy rules require your consent before a site stores or reads information on your device, unless this is strictly necessary for a service you asked for. Our login cookie is strictly necessary. Our counting does not store or read anything on your device. So no consent is needed and we do not show a banner. Our own tools still process some data on the server, such as your IP address for a moment, and the privacy rules on personal data (GDPR) still apply to that. This is why we explain it here. [[GAP: lawyer to confirm this paragraph]]

**Other things you may meet.** Maps, images and sign-in with Google load from other services. Your browser sends them your IP address when they load. See the sections on those services in this privacy page. [[GAP: developer confirms with DevTools that Turnstile, Cloudinary, the map tiles and Google sign-in set no cookies for visitors who do not use them]]

**Questions.** Write to {{legal.email}}.

## 9. Age

The site and accounts are for people aged **16 or older**. People under 16 cannot be listed or open an account. If we learn that we collected data of someone younger, we delete it.

## 10. How we protect data

The connection is encrypted (HTTPS), passwords are stored as hashes, editor access is limited, edits are logged, and in a data breach we notify AZOP within 72 hours where required, and you without delay if the risk is high.

## 11. Notice for organizations we did not ask first (Article 14)

This applies to organizations whose listing we created or imported before they contacted us.

- **What we hold:** the organization's name, description, website, location, contact email and sometimes a contact person's name.
- **Where it came from:** public sources: the organization's own website, public registers and an earlier list [[GAP: list the real import sources for each site]]. Before this registry, Inovatori DNŽ kept an earlier list; we carried data over from it on [[GAP: confirm source and basis of the import]].
- **Why and on what basis:** to include the organization in the public directory; legitimate interest (section 3).
- **Who gets it:** the data is publicly visible on the site; other recipients are in section 4.
- **What we do with contacts:** we send at most one email and one reminder, to business addresses only, purely about the existing listing. The email says what we hold, how to claim the listing and how to remove it in one click. If you remove the listing or say you want no more mail, we put the address on a suppression list so we do not contact it again.
- **Timing:** you get this notice at first contact, and at the latest within one month of us receiving the data. If nobody claims the listing, it is archived after 12 months.
- **Your rights:** all in section 7, including objection, removal and a complaint to AZOP.

## 12. Changes to this policy

We may change this policy when the site or the rules change. The date and version are at the top. We will tell account holders about important changes by email. Older versions are available on request.
