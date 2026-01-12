# warawo Implementation Plan

## Phase 1: Project Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies
  - [x] rx-nostr (Nostr client library)
  - [x] react-i18next, i18next (internationalization)
  - [x] vitest, @testing-library/react (testing)
- [x] Configure Vite for GitHub Pages deployment (base path)
- [x] Setup i18n with ja/en locales
  - [x] Use browser language detection (i18next-browser-languagedetector)
  - [x] If browser language is Japanese → show Japanese
  - [x] Otherwise → fallback to English

## Phase 2: Core Types & Constants
- [x] Define TypeScript types
  - [x] NostrEvent
  - [x] RelayInfo (url, status)
  - [x] UserProfile (pubkey, name, display_name, picture)
  - [x] FolloweeAnalysis (profile, relays, coverage)
- [x] Define constants
  - [x] Bootstrap relays list
  - [x] Timeout values
  - [x] Batch size for authors

## Phase 3: Nostr Service Layer
- [x] Create rx-nostr client wrapper
- [x] Implement NIP-07 integration (browser extension)
- [x] Implement kind:10002 (relay list) fetcher
- [x] Implement kind:3 (contact list) fetcher
- [x] Implement kind:0 (profile metadata) fetcher
- [x] Implement batch subscription for followees' kind:10002

## Phase 4: State Management
- [x] User state (pubkey, profile, relays)
- [x] Followee list state
- [x] Relay status state (for status bar)
- [x] Analysis results state

## Phase 5: UI Components
- [x] App layout structure
- [x] Header component
  - [x] App title: `(｡>_<)o--warawo: Nostr Relay Analysis`
  - [x] Pubkey input textbox
  - [x] User icon, name, display_name
- [x] RelayStatusBar component
  - [x] Color-coded status indicators
  - [x] Sorting by status
- [x] AnalysisTable component
  - [x] User row (top)
  - [x] Followee rows (sorted by coverage)
- [x] RelayList component
  - [x] Folded relay names (sqrt layout)
  - [x] Readable/unreadable color coding
- [x] FolloweeRow component
  - [x] Rank, icon, name, display_name, coverage, relay list

## Phase 6: Business Logic
- [x] Coverage calculation
  - [x] Compare followee's write relays with user's read relays
  - [x] Mark relays as readable/unreadable
- [x] Sorting logic
  - [x] Followee rows by coverage (ascending)
  - [x] Relay list (readable left, unreadable right)

## Phase 7: Integration & Testing
- [x] Wire up all components
- [x] Implement loading states
- [x] Write unit tests for core functions
- [ ] Write component tests
- [ ] Manual testing with real Nostr data

## Phase 8: Polish
- [ ] Error handling and user feedback
- [ ] Responsive design
- [ ] i18n translations completion
- [ ] README documentation

---

## File Structure (Actual)
```
src/
├── components/
│   ├── AnalysisTable.tsx
│   ├── FolloweeRow.tsx
│   ├── Header.tsx
│   ├── RelayList.tsx
│   └── RelayStatusBar.tsx
├── services/
│   ├── nostr.ts          # rx-nostr wrapper
│   ├── nostr.test.ts     # tests
│   └── nip07.ts          # browser extension
├── hooks/
│   └── useNostr.ts
├── types/
│   └── index.ts
├── constants/
│   └── index.ts
├── i18n/
│   ├── index.ts
│   ├── ja.json
│   └── en.json
├── utils/
│   ├── relay.ts          # relay URL formatting
│   ├── relay.test.ts     # tests
│   ├── coverage.ts       # coverage calculation
│   └── coverage.test.ts  # tests
├── test/
│   └── setup.ts
├── App.tsx
├── App.css
├── index.css
└── main.tsx
```

## Relay Status Colors
| Status | Color | Description |
|--------|-------|-------------|
| wait | gray | Waiting to access |
| connecting | yellow | Connecting to relay |
| loading | green | Loading data |
| eose | blue | Got EOSE (End of Stored Events) |
| timeout | dark green | Timeout occurred |
| error | dark yellow | Connection error |
