# Design — AI Minutes Extraction

**Parent app:** i-Differentiate Area 4
**Approved direction:** Move hosting to Vercel and add server-assisted minutes extraction through Vercel AI Gateway
**Primary user:** Area Director updating club data from phone or desktop

## Problem

The current Manual tab accepts pasted minutes text and extracts a few simple club-health fields with regexes. The next workflow needs richer extraction from meeting minutes files:

- visitor names and counts
- unique visitors per club
- visitors who later became members
- members visiting other clubs
- Area, Division, and District awards
- Area, Division, and District event participation

Regex-only parsing is not reliable enough for names, awards, and event participation. PDF and Word documents also need server-side parsing support. The app must protect user control: extracted data is previewed and nothing is applied until confirmed.

## Goals

- Host the app on Vercel so `index.html` and `/api/extract-minutes` share one origin.
- Use Vercel AI Gateway instead of a direct OpenAI API key.
- Keep AI credentials server-side only.
- Accept pasted text plus uploaded `.txt`, `.docx`, and `.pdf` minutes files.
- Extract structured engagement data from minutes.
- Track visitor uniqueness per club, not globally.
- Preserve the current review-before-apply flow: extraction proposes changes, the user confirms.
- Keep the app usable when AI extraction fails by preserving manual entry controls.

## Non-Goals

- No public browser-side AI key.
- No automatic state write from an uploaded file.
- No global visitor deduplication across clubs.
- No account system or database in this phase.
- No automatic upload/storage of minutes files after extraction; files are processed for extraction and discarded.

## Architecture

### Hosting

Move production hosting from GitHub Pages to Vercel.

The root app remains `index.html`. A Vercel Function handles extraction:

- `POST /api/extract-minutes`
- Request: `multipart/form-data`
- Fields:
  - `clubId`
  - `clubName`
  - `meetingDate` optional, `YYYY-MM-DD`
  - `text` optional pasted text
  - `file` optional `.txt`, `.docx`, or `.pdf`
- Response: structured JSON extraction result

The browser never calls AI Gateway directly.

### AI Gateway

Use Vercel AI SDK through AI Gateway from the Vercel Function.

Preferred auth:

- Deployed Vercel: OIDC via `VERCEL_OIDC_TOKEN`
- Local development: `vercel env pull .env.local` to provision `VERCEL_OIDC_TOKEN`
- Optional static fallback: `AI_GATEWAY_API_KEY`, server-side only

The implementation must not require `OPENAI_API_KEY`.

Use a Gateway model slug in `provider/model` form. Default to `openai/gpt-5.4` unless implementation-time docs verification identifies a better current Gateway model. Tag calls:

- `feature:minutes-extraction`
- `app:area4-gamification`

Before implementation, verify current AI SDK and Gateway structured-output syntax against docs; do not rely on stale examples.

## File Extraction

The function extracts plain text before sending content to the model:

- `.txt`: UTF-8 text
- `.docx`: server-side text extraction from document XML
- `.pdf`: server-side text extraction where the PDF contains selectable text

If text extraction fails or produces too little text, return a clear error:

```json
{
  "ok": false,
  "error": "Could not extract text from that file. Try exporting the minutes as text or DOCX."
}
```

For scanned/image PDFs, the first version returns a clear unsupported-file error. OCR is out of scope for the first implementation.

## Data Model

Add an `engagement` slice keyed by club id:

```js
state.engagement = {
  [clubId]: {
    visitors: [
      {
        name: "Jane Smith",
        normalizedName: "janesmith",
        firstSeenDate: "2026-06-11",
        lastSeenDate: "2026-06-11",
        visits: 1,
        becameMember: false
      }
    ],
    memberVisits: [
      {
        memberName: "Raj Naidu",
        visitedClubName: "Quakers Hill Toastmasters",
        date: "2026-06-11"
      }
    ],
    events: [
      {
        level: "area",
        type: "participation",
        name: "Area Council Meeting",
        date: "2026-06-11"
      }
    ]
  }
}
```

Visitor uniqueness is per club only. `Jane Smith` visiting Marsden Park and Quakers Hill creates separate visitor records under each club. Within one club, names are matched by normalized name.

Existing backups without `engagement` load via the existing deep-merge/default-state path.

## Extraction Contract

`POST /api/extract-minutes` returns:

```json
{
  "ok": true,
  "source": {
    "clubId": "marsden-park",
    "clubName": "Marsden Park Toastmasters",
    "meetingDate": "2026-06-11",
    "inputType": "pdf"
  },
  "extracted": {
    "attendancePct": 67,
    "meetings": 1,
    "guests": {
      "count": 3,
      "names": ["Jane Smith", "Alex Lee", "Priya Kumar"]
    },
    "visitorsBecameMembers": ["Jane Smith"],
    "memberVisits": [
      {
        "memberName": "Raj Naidu",
        "visitedClubName": "Blacktown City Toastmasters"
      }
    ],
    "awards": [
      {
        "level": "area",
        "name": "Area Evaluation Contest",
        "recipientName": "Priya Kumar"
      }
    ],
    "eventParticipation": [
      {
        "level": "division",
        "name": "Division Training",
        "participantName": "Alex Lee"
      }
    ]
  },
  "confidence": {
    "overall": "medium",
    "needsReview": [
      "Guest name 'Alex' may be incomplete."
    ]
  }
}
```

Rules:

- The extractor returns names exactly as written where possible.
- Unknown or ambiguous dates fall back to the submitted `meetingDate`, or today's local date in the browser if no date is supplied.
- The extractor distinguishes club visitors from members visiting other clubs.
- Area, Division, and District awards are separate from generic club awards.
- Every extraction result is treated as untrusted until reviewed by the user.

## Browser Flow

Manual tab changes:

1. Keep existing manual Awards and Club Health controls.
2. Replace the paste-only minutes helper with an extraction panel:
   - textarea for pasted minutes text
   - file picker/drop zone for `.txt`, `.docx`, `.pdf`
   - optional meeting date
   - Extract button
3. Submit to `/api/extract-minutes`.
4. Show a preview Sheet with:
   - visitor names and unique/repeat status for the selected club
   - visitors marked as became-member candidates
   - members visiting other clubs
   - Area/Division/District awards
   - Area/Division/District participation
   - confidence and needs-review notes
5. Confirm applies data; Cancel discards.

The preview must allow the Area Director to correct extracted visitor names before applying. The first implementation includes editable visitor-name inputs and became-member checkboxes inside the preview before Apply.

## Apply Behavior

On confirm:

- `state.health[clubId].guests` updates to the extracted guest/visitor count.
- `state.health[clubId].meetings` and `attendancePct` update when present.
- `state.engagement[clubId].visitors` is upserted by normalized visitor name:
  - new name → create visitor record
  - existing name → increment `visits`, update `lastSeenDate`
  - became-member candidate → set `becameMember: true`
- `state.engagement[clubId].memberVisits` appends confirmed member visits to other clubs.
- `state.engagement[clubId].events` appends confirmed awards and participation.

No snapshot is automatically saved from minutes extraction alone. The weekly TMI import remains the automatic snapshot point; the user can manually save today's snapshot if minutes extraction happens after TMI import.

## Scoring

First implementation exposes engagement data without changing scoring weights unless separately approved.

Reason: the current scoring model already has workbook-derived awards and club-health weights. New engagement metrics need separate scoring design to avoid double-counting.

Future scoring options:

- points per unique visitor
- bonus for repeat visitor
- bonus for visitor becoming member
- points per member visit to another club
- points for Area/Division/District participation
- points for Area/Division/District awards

## Error Handling

- Unsupported file type → clear error, no state change.
- File too large → clear error, no state change. Initial limit: 10 MB.
- AI Gateway failure/rate limit → clear error, keep manual entry usable.
- Ambiguous extraction → return `needsReview`; preview remains confirmable after user edits.
- Malformed response from model → function returns `ok: false`; no state change.

## Privacy

- Uploaded minutes are sent to the Vercel Function and then to AI Gateway/model provider for extraction.
- The app must not store raw uploaded files.
- The app must not persist raw minutes text unless a separate explicit feature adds that.
- README must explain that AI extraction sends minutes content to the configured AI provider through Vercel AI Gateway.

## Testing

Automated tests:

- Existing `tests.html` stays green.
- Add pure browser tests for engagement upsert:
  - new visitor creates record
  - repeat visitor increments visits and updates lastSeenDate
  - same visitor name in different clubs remains separate
  - became-member flag is applied
- Add API fixture tests for extraction response validation with a mocked AI response.
- Add file parser fixture tests for `.txt` and `.docx`; add a text-PDF fixture when PDF parser support is implemented.

Manual verification:

- Upload/paste a sample minutes document.
- Confirm preview shows visitor names, member visits to other clubs, awards, and event participation.
- Correct at least one visitor name before applying.
- Confirm state updates only after Apply.
- Confirm Cancel leaves state untouched.
