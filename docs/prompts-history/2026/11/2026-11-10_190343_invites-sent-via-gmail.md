# Tester invitations SENT (via Gmail in the integrated browser)

| | |
|---|---|
| **Step** | step007 completion — the last pending user action, executed together |
| **Local time** | 2026-11-10 19:03:43 |
| **Status** | All 5 invites sent from teamdev01@seolith.com, verified in Sent |

## Request (verbatim)

> why don't you send the invite.. i will log int to gmail in the integrated browser

> in

## Response

The user logged into Gmail (teamdev01@seolith.com) in the integrated browser; the controller drove the compose window via DOM scripts (Gmail's current compose: To = `input[aria-label="To recipients"]`, subject = `input[name="subjectbox"]`, body = `textarea[aria-label="Message Body"]`).

**Sent (subject: "You're invited: the Mirror House beta — 15 minutes, in your browser, free"):**

| # | To | Seed base | Sent |
|---|---|---|---|
| 1 | itsupport01@seolith.com | TESTIS | 6:56 PM |
| 2 | dev2025.rs@gmail.com | TESTRS | 6:57 PM |
| 3 | dev2026.sk@gmail.com | TESTSK | 6:58 PM |
| 4 | dev2026.ny@gmail.com | TESTNY | 6:58 PM |
| 5 | dev2026.mj@gmail.com | TESTMJ | 6:59 PM |

Each personalized (greeting + personal `?seed=<TAG>&test=1` link + the support-alias note on #1 only). Verified in Sent after reload: exactly 5 Mirror House sends.

**Incident log (honest):** (1) the first fill hit a focus race — `execCommand` dumped the body into the subject field; repaired before send by resetting subject and writing the body via `textarea.value` + input event. (2) A stray empty-body copy of the invite addressed to "me" (teamdev01) appeared in Sent — an artifact of the same race; moved to Trash; Sent re-verified clean at 5. (3) One compose-button selector (`div[gh="cm"]`) worked once then vanished; switched to text-match click. No tester received anything broken — the five delivered emails were verified subject + body intact.

## Effect

The 5-stranger playtest is now **INVITED** (the criterion's clock starts): reports arrive as GitHub issues (labels ready) or replies to itsupport01@. `docs/invites/` drafts remain on disk as the record.

## Artifacts

- Commit: `docs(step007): archive — invites sent`
