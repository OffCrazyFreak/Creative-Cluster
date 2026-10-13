# Admin guide

For admins only. Your account has the role "admin". Changes you make are logged with your name.

## Review queue

Open "Admin". The queue lists everything waiting for a decision.

- Types: application, sensitive edit, opportunity, tag, report, link dispute.
- Filter by type, age and country. Items older than 7 days are highlighted. Our promise to applicants is a decision within 7 days.

To decide an item:

1. Open it and read it. Check duplicates in the entries list.
2. Choose "Approve" or "Reject".
3. To reject, pick a reason code and add a short note. The applicant gets an email in their language with your reason and note.
4. For many items, tick them and use bulk approve or bulk reject.

Reason codes: incomplete, duplicate, out of scope, unverifiable, spam (no email is sent), other. Each one sends its own short email text, plus your note. Write the note as you would to a neighbour: say what is wrong and what they can fix.

When you approve an application, the owner account is created and a set-password link is sent. You can also move the pin at this step.

## Edit entries and undo changes

1. Open "Entries", find the listing and edit it.
2. To see what changed, open "Changes". Each row shows who, when and which fields.
3. To undo, choose "Revert". You see a before and after view first. Undo restores the listing fields only. Tags and connections stay as they are. Undo is logged as a new change, and the owner gets an email.

If an owner keeps breaking the rules, turn off "trusted" on that entry. Its edits then go through the review queue. Do this rarely.

## Suspend, archive or delete

- Archive: the owner's own "hide my listing". Reversible. The listing disappears from public pages.
- Suspend: your tool for rule breaking. The listing, its opportunities and its connections disappear from every public view. The page shows "gone" (status 410). The owner sees the reason in their account. Reinstate restores everything.
- Delete (erasure): archives at once and purges after 14 days unless cancelled. Use it only when the owner asks, or the law requires.
- Ban a user (Users) is separate. It blocks the account, not the listing.

Always write a clear reason when you suspend. The owner gets it by email.

## Transfer an owner

1. Open the entry and choose "Transfer owner".
2. Enter the new owner's email. If they have no account, send an invite first (see Users).
3. Confirm. The old owner loses access. Both get an email. The change is logged.

Ask for written confirmation from the old owner, or proof of the new role, and keep it. [[GAP: where to store the confirmation]]

## Outside partners

Outside partners are stubs with a name and website. They are never published. If two stubs are the same organization, choose "Merge" and keep one. Connections move to the one you keep. Check the evidence links first.

## Move a pin

Open the entry, then the map in "Location". Drag the pin or use the arrow keys. A pin moved by hand is never overwritten. People are shown at town level only. Never place a person's pin on their home.

## Tags

Open "Tags".

- Approve or reject suggested tags. Until approved, a suggestion is visible only on the suggester's listing.
- Merge duplicates: choose the tag to keep and the one to fold in. All entries and opportunities move to the kept tag. The old name stays as an alias, so search still finds it.
- Rename labels in both languages. Fill both hr and en.

## Users

Open "Users".

- Invite: enter an email and role. The person gets a link to set a password. Their email counts as verified.
- Roles: admin or member. Give admin only to people the association trusts.
- At least 2 admins: the app refuses to remove, demote, ban or delete the second to last active admin. If you see that error, add another admin first.
- Ban: blocks sign-in for an account. Use it for abuse. It does not remove the listing.
- There is no impersonation. You cannot sign in as someone else.

## Reports

Visitors use "Report this listing". Each report appears in the queue. Read the listing, then dismiss the report, ask the owner to fix, or suspend. Nothing is hidden automatically. Reports can be false. Give the owner a chance to respond unless the content is clearly illegal.

## Import and claim invites

Open "Import".

1. Upload a CSV. Check the preview. Rows with a mistake are listed, so you can fix them.
2. Imported listings are unclaimed. Claim invites are prepared, but nothing is sent until the person in charge says so. [[GAP: name of the person who gives the go-ahead]]
3. After the go-ahead, send the invites. Each address gets one email and one reminder. Use business addresses only. The email is only about the existing listing, tells them where we got the data, and has a one-click removal link. Addresses that opted out go on a suppression list. Never re-add them.
4. Unclaimed listings are archived after 12 months. You can restore them.

## Exports

Open "Export" for CSV files of entries. Confirmed connections can be exported as CSV, for admins only. The files contain personal data. Save them to a private place and delete them when finished. Do not share them.

## Deploys

The site is rebuilt when a deploy runs, not when code is merged.

- Automatic: every Saturday.
- Manual: open the GitHub repository, choose "Actions", pick "Deploy", and press "Run workflow". It deploys both sites. [[GAP: repository link]]

Content changes made in the app are live at once and do not need a deploy. A deploy is for code and text changes.

## When Netlify credits run low or a site pauses

Both sites share one free Netlify credit pool of 300 credits a month. One deploy of both sites costs about 30. Normal use is 120 to 150 a month.

1. Check: in Netlify open the team, then "Usage & billing", then "Credit balance". Netlify also emails at 50, 75, 90 and 100 percent. [[GAP: Netlify team name and who gets the emails]]
2. Above 75 percent: skip manual deploys.
3. If the credits run out, all sites on the team pause. Visitors see "Site not available". You also cannot deploy.
4. On the free plan you cannot buy more credits. Wait for the next billing cycle, or upgrade the plan. Credits reset at the start of the cycle.
5. If sites stay paused after the reset, write to Netlify support.
6. Tell the other admins and the clients. The database, email and users are not affected.

## Backups and restore

- A backup of each database is made every week, encrypted, and kept for 90 days. A monthly copy is kept in a private place. [[GAP: where the monthly copy is stored and who holds the decryption key]]
- Restoring is a job for the technical person. The steps are in the runbook in the repository README. In short: pick the backup, decrypt it, restore it into a new database branch, check the data, then switch the site to it.
- For a mistake in the last days, the database host can also roll the database back to an earlier moment. How far back depends on the plan. [[GAP: check the history window of the Neon plan]]
- Test a restore every quarter.
