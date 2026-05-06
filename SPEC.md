# AI Support Chat — Full Spec

> Reference for Notion AI: use to identify missing items in your existing spec.

---

## Widget Structure

- Component: `MrEvoconChat` (organism)
- Layout: vertical flex — header → scrollable message area → footer (input + privacy)
- Desktop: 440×720px, floating bottom-right, 12px border-radius, `max-height: calc(100vh - 100px)`
- Mobile (<600px): fullscreen `inset: 0`, no border-radius
- Background: `--v-theme-input-background` (#F5F5F5)
- Shadow: card elevation (`--ev-shadow-card`)

---

## Widget Open/Close

- Sidebar "Help" item toggles the widget open/closed
- Header close button (X) closes the widget
- On open: sidebar auto-collapses, Help item gets active/highlighted style
- On mobile: sidebar open-button hides when chat is open
- Chat state (messages, scroll position) persists across close/open — no reset, no remount
- Session ID generated once on init, never regenerated on close/reopen

---

## Header

- `v-toolbar flat density=compact`, white background, min-height 56px
- Left: support icon (`mdiContactSupport`, 24×24, green `--v-theme-primary`)
- Title: "AI Support" — 16px / 22px / 600 (label-large weight), black
- Subtitle: "Powered by Evocon" — 12px / 16px / 400 (body-small), `--v-theme-secondary-dark` (#707070)
- Right: close button (`mdiClose`, 36×36 hit area, circular, hover shows `--v-theme-quaternary-dark` background)

---

## Consent (Privacy Acceptance)

- On mount, check `localStorage` key `ev-consent-acknowledged-at`
- If present → skip consent, enable input immediately
- If absent → input disabled (dashed bottom border, container at `--v-disabled-opacity: 0.38`), placeholder "Please accept to start", privacy bar visible
- Privacy bar: text "This chat uses AI. See our [Privacy Notice](link)." with "I ACCEPT" button
- Privacy Notice link: opens external PDF in new tab
- "I ACCEPT" button: green (`--v-theme-primary`), uppercase, 12px/600 weight, 28px height, rounded 4px
- "I ACCEPT" hover: white overlay at 12% opacity (Vuetify `v-btn__overlay` pattern via `::after`)
- Click "I ACCEPT" → store ISO timestamp in localStorage (when `persistConsent: true`), hide privacy bar, enable input, focus input

---

## Greeting

- Renders on boot (unconditionally, regardless of consent state)
- Text: "Hello! I'm your AI support assistant.\nAsk me about Evocon functionality and I'll try to help. For full Evocon documentation, see below:"
- Below text: one reference chip linking to "Evocon Help & Support" (external URL)
- Greeting chip uses `mdiHelpCircle` icon
- Rendered as a bot bubble (same styling)

---

## Input Field

- Vuetify filled input pattern: `--v-theme-input-background` (#F5F5F5) background, top corners rounded 4px, flat bottom
- Bottom border: 1px solid `--v-theme-secondary-dark` (#707070) by default
- Focus state: border-bottom becomes 2px solid `--v-theme-primary` (#2ECC71), padding adjusts by 1px to prevent layout shift
- Text: 16px / 24px / 400 (body-large), `--v-theme-primary-dark` (#212121)
- Placeholder: "Ask about Evocon app", at 38% opacity of `--v-theme-primary-dark` (via `color-mix`)
- Disabled placeholder: "Please accept to start", same opacity
- No native `maxlength` attribute — character limit enforced in JS only

---

## Send Button

- Icon-only button (`mdiSend`), 36×36 hit area, circular, inside the input field row
- Color: `--v-theme-primary-dark` (#212121)

Reactive states based on `input.value`:

| State | Opacity | Hover | Click |
|---|---|---|---|
| Empty (`.trim().length === 0`) | 0.38 | none | no-op |
| Has text, ≤1000 chars | 1.0 | grey circle (`--v-theme-quaternary-dark`) | sends message |
| Has text, >1000 chars | 0.38 | none | blocked |
| API in-flight (`isSending`) | 0.38 | none | blocked (`disabled`) |

- After send: input clears, refocuses, send returns to empty state
- `isSending` flag blocks duplicate sends on rapid click/Enter

---

## Character Limit

- Limit: 1000 characters
- Count based on `input.value.length` (raw, not trimmed)
- No `maxlength` — user can type past 1000 so they see the error
- When over limit: hint text below input swaps from default to "Message too long, max 1000 characters." in `--v-theme-error` (#F44336)
- When back under limit: hint text returns to default, error styling removed
- Default hint text: "Evocon AI may make mistakes. Check important info."

---

## Hint Text

- Position: below input field, left-aligned, 16px horizontal padding
- Style: 12px / 16px / 400 (body-small), `--v-theme-secondary-dark` (#707070)
- Default: "Evocon AI may make mistakes. Check important info."
- Error state: text changes, color changes to `--v-theme-error` (#F44336)

---

## Message Flow

```
user types → send (click or Enter without Shift)
  → render user bubble → clear input → isSending=true
  → render typing indicator (bouncing dots in bot bubble shape)
  → await API response
  → on success: remove typing → render bot bubble + source chips + feedback pill
  → on error:   remove typing → render error bubble (no chips, no feedback)
  → isSending=false, re-enable send
```

- Auto-scroll to bottom on every new element (user bubble, typing indicator, bot bubble, feedback)
- Enter sends, Shift+Enter does nothing special (single-line input, not textarea)

---

## Chat Bubbles

### User Bubble
- Background: 12% opacity of `--v-theme-primary` (via `color-mix`)
- Text color: `--v-theme-primary-dark` (#212121)
- Border: 1px solid `--v-theme-primary` (#2ECC71)
- Border-radius: 8px 4px 8px 8px (top-left rounded, top-right pointed)
- Shadow: card-level elevation
- Max-width: 373px
- Typography: 14px / 20px / 400 (body-medium)

### Bot Bubble
- Background: white (`--v-theme-white`)
- Text color: `--v-theme-primary-dark` (#212121)
- Border-radius: 4px 12px 12px 12px (top-left pointed, rest rounded)
- Shadow: `0px 1px 3px rgba(0,0,0,0.2), 0px 2px 2px rgba(0,0,0,0.12), 0px 0px 2px rgba(0,0,0,0.14)`
- Max-width: 373px
- Typography: 14px / 20px / 400 (body-medium)
- Content: rendered markdown (via `marked.js` → `DOMPurify` sanitization → `v-html`)
- Links in markdown: open in new tab (`target="_blank"`)

### Error Bubble
- Same as bot bubble but text color `#D32F2F`
- No source chips, no feedback pill
- Does not increment `turnIndex`

---

## Typing Indicator

- Rendered as bot bubble containing three bouncing dots
- Dots: 6×6px circles, `--v-theme-secondary-dark` color
- Animation: vertical bounce with staggered delay (0ms, 150ms, 300ms), 1.2s cycle
- Removed from DOM when API responds

---

## Source Chips

- Appear below bot answer text, inside the bot bubble
- Only rendered if `sources[]` is non-empty
- Layout: flex-wrap row, 10px gap, 8px top margin
- Chip style: pill shape (24px radius), `--v-theme-quaternary-dark` background, 12px / 16px / 400 (body-small)
- Icon: 18×18, `--v-theme-secondary-dark` color
- Icon logic: `mdiHelpCircle` for greeting chip, `mdiOpenInNew` for source links
- Label from URL: last path segment, strip trailing hash IDs, replace `-`/`_` with spaces
- Hover: background darkens to `--v-theme-quaternary-dark-2`
- Open in new tab (`target="_blank"`)

---

## Feedback

Per-answer — each bot response has its own independent feedback pill. Not global.

### Layout
- Separate card below bot bubble, 4px gap
- Same border-radius as bot bubble (4px 12px 12px 12px)
- Same shadow as bot bubble
- White background
- Prompt text: "Please rate if this reply has helped you or not." — 14px / 20px (body-medium)
- Two pill buttons: "Helpful" (thumbs up) and "Not helpful" (thumbs down)

### Feedback Button Styling
- Default: `--v-theme-quaternary-dark` background, 1px border same color, 16px radius pill
- Icon: 14×14, `--v-theme-secondary-dark`
- Text: 12px / 16px (body-small)
- Hover: background/border darken to `--v-theme-quaternary-dark-2`

### State Machine

```
Default → Helpful clicked
  → "Helpful" gets active-up style (stays grey, both buttons disabled)
  → API fires immediately with signal: "helpful"
  → 300ms delay → Thank You state → 2s → fade out

Default → Not helpful clicked
  → "Not helpful" gets active-down style (orange border, yellow background)
  → Comment input expands below with placeholder "Describe issue"
  → Comment input auto-focuses
  → Does NOT fire API yet

  → Not helpful clicked again → collapse comment, remove active style (toggle off)
  → Comment submitted (Enter or checkmark click)
    → API fires with signal: "not_helpful" + comment text
    → Thank You state → 2s → fade out
```

- Comment can be submitted empty (sends empty string for comment)
- Checkmark icon gets active styling (`--v-theme-primary` color) only when input has non-whitespace text
- Comment input: underline style (bottom border only), focus turns border green
- Thank You: shows `mdiCheckCircle` icon + "Thank you for feedback!" text, border changes to `--v-theme-quaternary-dark-2`
- After 2s: pill fades to opacity 0 and max-height 0, stays in DOM (not removed)
- Feedback API failure: `console.warn` only, no UI error, no retry

---

## API

### `POST /chat`

Request:
```json
{ "question": "string", "session_id": "string" }
```

Response:
```json
{ "answer": "string (markdown)", "sources": ["url1", "url2"] }
```

- 4xx/5xx → error bubble
- Network failure → error bubble

### `POST /feedback`

Request:
```json
{
  "session_id": "string",
  "turn_index": 0,
  "signal": "helpful" | "not_helpful",
  "comment": "string"
}
```

- Fire-and-forget. No response handling. Failure → `console.warn`, silent.

### Session
- `session_id` format: `"web-" + crypto.randomUUID().slice(0,8)` — fallback to `Math.random().toString(36).slice(2,10)`
- Generated once per widget mount, persists across close/open
- `turn_index`: 0-based, increments only on successful bot answers (not on errors)

---

## Responsive / Mobile

- Breakpoint: 600px (`xs`), checked via `window.innerWidth` at event time
- Desktop (≥600px): 440×720px floating widget, bottom-right, 12px border-radius, sidebar hover-to-open
- Mobile (<600px): fullscreen `inset: 0`, no border-radius, sidebar as overlay (z-index 2000), tap-only (no hover states)
- On mobile: sidebar open-button hides when chat is open
- Scrollbar: 6px wide, `--v-theme-quaternary-dark-2` thumb, transparent track (WebKit custom scrollbar)

---

## Feature Toggles

| Toggle | Default | Effect |
|---|---|---|
| `ENABLE_FEEDBACK` | `true` | `false`: no feedback pills rendered, everything else unchanged |
| `MOCK_RESPONSE` | `true` | `true` (dev): 800ms simulated delay, canned answer + sources. Set `false` for production. |
| `persistConsent` | (option) | `true`: reads/writes localStorage for consent persistence |

---

## Error Strings (Exact Copy)

- `"Sorry, something went wrong. Please try again."` — API 4xx/5xx
- `"Couldn't reach the assistant. Check your connection and try again."` — network failure
- `"Message too long, max 1000 characters."` — input hint when over limit

---

## Typography

Uses three main styles from `settings.scss`:

| Token | Alias | Size / Line-height / Weight | Usage |
|---|---|---|---|
| body-large | Body 1 | 16px / 24px / 400 | Input field text |
| body-medium | Body 2 | 14px / 20px / 400 | Chat bubbles, feedback prompt, feedback comment input |
| body-small | Caption | 12px / 16px / 400 | Header subtitle, chips, hint text, privacy text, feedback buttons |

Additional:
- Header title: 16px / 22px / 600 (label-large weight)
- "I ACCEPT" button: 12px / 14px / 600, uppercase
- Font family: "Open Sans", sans-serif

---

## Color Tokens (Vuetify Theme)

| Token | Hex | Usage |
|---|---|---|
| `--v-theme-primary` | #2ECC71 | Accent color, input focus border, links, user bubble border, accept button |
| `--v-theme-primary-dark` | #212121 | Primary text color, send icon |
| `--v-theme-secondary-dark` | #707070 | Secondary text, input border, icons, placeholder (at 38% opacity) |
| `--v-theme-quaternary-dark` | #EEEEEE | Chip backgrounds, hover fills, feedback button backgrounds |
| `--v-theme-quaternary-dark-2` | #CCCCCC | Darker hover states, scrollbar thumb, thank-you border |
| `--v-theme-input-background` | #F5F5F5 | Input field fill, widget background, code blocks |
| `--v-theme-error` | #F44336 | Character limit error text |
| `--v-theme-secondary` | #F28A0D | "Not helpful" active border |
| `--v-theme-snackbar-yellow` | #FDF1E2 | "Not helpful" active background |
| `--v-theme-white` | #FFFFFF | Bot bubble background, footer background, header background |

---

## Component Mapping (Prototype → Vue)

| Prototype Element | Vue Component |
|---|---|
| `.ev-widget` (whole widget) | `MrEvoconChat` (organism) |
| `.ev-header` | `v-toolbar flat density=compact` |
| `.ev-header-icon` | `v-icon :icon="mdiContactSupport" color=primary` |
| `.ev-header-close` | `EvoconVButton icon=mdiClose type=secondary` |
| `.ev-ref-chip` | `EvoconVChip type=outlined :icon :label` |
| `.ev-feedback-btn` (helpful) | `EvoconVChip type=neutral icon=mdiThumbUp` |
| `.ev-feedback-btn` (not helpful) | `EvoconVChip type=neutral icon=mdiThumbDown` |
| `.ev-feedback-comment-input` | `EvoconVInput filled density=compact` |
| `.ev-feedback-comment-submit` | `EvoconVButton icon=mdiCheck type=secondary` |
| `.ev-privacy-accept` | `EvoconVButton text="I ACCEPT" type=primary` |
| `.ev-input-field` | `EvoconVInput filled density=compact` |
| `.ev-send` | `EvoconVButton icon=mdiSend type=secondary` |
| `.ev-input-hint` | `v-messages` (helper text below input) |
| `.ev-bubble-bot` | New: `chat-bubble` (no existing component) |
| `.ev-bubble-user` | New: `chat-bubble variant=user` |
| `.ev-feedback` | New: `chat-bubble` (feedback pill variant) |
