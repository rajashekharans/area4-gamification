# i-Differentiate Area 4

A club-performance leaderboard for **Area 4, District 90** Toastmasters — a single
web page (`index.html`) that replaces the Area 4 gamification Excel workbook.
Scores are calculated with exactly the same formulas as the workbook, members open
it read-only on their phones, and everything is stored in your browser. There is no
server, no login, and nothing to install.

The full design (scoring formulas, screens, data model) lives at
`docs/superpowers/specs/2026-06-11-area4-gamification-design.md`.

## The weekly ritual

Once a week, on your phone or computer:

1. **Refresh TMI** — open the **TMI** tab and tap **Refresh from TMI**. If your
   browser blocks the direct download (this is common and expected), follow the
   on-screen steps to export the CSV yourself and drop the file in — see
   [Getting the TMI CSV manually](#getting-the-tmi-csv-manually) below. Review the
   preview and tap **Apply**.
2. **Update minutes data** — open the **Manual Entry** tab, pick each club, and
   fill in awards and club health (meetings, attendance, guests, conversions).
   Tip: paste the club's meeting minutes into the **Minutes helper** box and tap
   **Extract from minutes** to pre-fill the form.
3. **Save the weekly snapshot** — back on the **Leaderboard** tab, tap
   **Save weekly snapshot** and confirm. This is what powers the movement arrows
   and the Trends chart.
4. **Share the link** — send the page's address in the WhatsApp group. Members
   see the live leaderboard; nothing they do can change your data (it lives in
   your browser, not theirs).

## Hosting on GitHub Pages (one-time setup)

GitHub Pages gives you a free, shareable web address:

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Create a new repository (e.g. `area4-leaderboard`) and set it to **Public**.
3. Upload `index.html` (on the repository page: **Add file → Upload files**).
4. Open **Settings → Pages**, and under **Branch** choose `main` and **Save**.
5. After a minute, your app is live at
   `https://<your-username>.github.io/area4-leaderboard/` — that's the link you
   share on WhatsApp.
6. When the app is updated, upload the new `index.html` over the old one; the
   link stays the same.

No hosting at all also works: double-click `index.html` and it opens straight
from your computer. Everything works that way except the **Refresh from TMI**
button (use the CSV upload instead).

**Important:** your data lives in the browser you use to edit it. Always do the
weekly update from the same browser on the same device, and take backups (below).

## Backup and restore

On the **Settings** tab, under **Backup**:

- **Export JSON** downloads a complete backup named
  `idiff-area4-backup-YYYY-MM-DD.json` (dated for easy filing). Do this weekly,
  and always before importing or resetting anything.
- **Import** — drop a backup file onto the import box (or tap it to choose the
  file). You'll see a preview first — how many clubs and snapshots it contains
  and when TMI was last synced — and nothing changes until you tap **Import**.
- If the file isn't a valid backup (wrong file, edited by hand, different
  version), the app tells you exactly what's wrong and leaves your current data
  untouched.
- **Reset to seed data** (in the Danger zone) puts the app back to its original
  starting values. It always asks for confirmation first.

## Weights and club settings

Everything the workbook let you tune is on the **Settings** tab:

- **Scoring weights** — all 21 scoring values, grouped the same way as the
  workbook (DCP, Membership, Admin & Deadlines, Awards, Club Health). Change a
  number and the leaderboard re-scores instantly. Values are whole numbers from
  0 to 100.
- **Clubs** — edit club names and club numbers. **Prospect Phoenix** has no club
  number yet (it shows a yellow reminder chip) — type it in as soon as you know
  it so TMI imports match the club by number instead of by name.
- **Program year** — switch this each July (e.g. to 2026-2027) so the TMI
  refresh pulls the right year's report.

## Getting the TMI CSV manually

Browsers usually block web pages from downloading the TMI report directly
(a security rule called CORS — nothing is wrong with your setup). When the
**Refresh from TMI** button fails, the app shows an upload box. To get the file:

1. Go to [dashboards.toastmasters.org](https://dashboards.toastmasters.org).
2. Select **District 90**, then the **Club Performance** report.
3. Choose **Export CSV** (the export link is near the report table).
4. Drop the downloaded file onto the upload box in the app (or tap the box and
   choose the file).

The app matches clubs by club number first and club name second, shows you
exactly what will change, and only applies it when you confirm.

## For the curious: tests

`tests.html` is a companion test page that checks the app's scoring against the
workbook formulas (it is not shipped or linked from the app). To run it, serve
the folder over http — for example `python3 -m http.server` in this folder, then
open `http://localhost:8000/tests.html` — and look for the green summary line.
