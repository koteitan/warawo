# warawo

A Nostr relay analysis tool that helps you understand your followers' relay coverage.

**Live Demo**: https://koteitan.github.io/warawo/

## Overview

warawo fetches your followers (contacts) from the Nostr network, examines where each follower publishes their content (write relays), and compares those relays against your read relays. It identifies gaps - which followers' relays you cannot read from - helping you optimize your relay configuration.

Key features:
- Analyze relay coverage for all your followees
- Identify missing relays where important followers publish
- Visual color-coded indicators showing relay status
- Support for NIP-07 browser extensions
- Multi-language support (English/Japanese)

## For Users

### How to Use

1. Open the app at https://koteitan.github.io/warawo/
2. Enter your Nostr public key (hex or npub format) or click "Load from extension" if you have a NIP-07 browser extension installed
3. Wait for your profile and followee list to load
4. Click "Analyze Followees" to start the relay analysis
5. View the results table showing:
   - **Rank**: Followees sorted by coverage (lower coverage = harder to reach)
   - **Coverage**: Number of their write relays that you can read from
   - **Relays**: Green = readable, Red = unreadable

### Understanding the Results

- Followees with **low coverage** (especially 0) are publishing to relays you don't read from
- Consider adding their write relays to your relay list to improve coverage
- The analysis helps you discover which relays you might be missing

## For Developers

### Requirements

- Node.js 22 or later
- npm

### Installation

```bash
git clone https://github.com/koteitan/warawo.git
cd warawo
npm install
```

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The app will be available at http://localhost:5173/warawo/

### Build

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Other Commands

```bash
# Run linter
npm run lint

# Run tests
npm test

# Run tests once (CI mode)
npm run test:run

# Preview production build
npm run preview
```

### Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool
- **rx-nostr** - Reactive Nostr client
- **nostr-tools** - Nostr utilities
- **i18next** - Internationalization
- **Vitest** - Testing framework

### Deployment

The app is automatically deployed to GitHub Pages when pushing to the main branch via the GitHub Actions workflow in `.github/workflows/static.yml`.

## License

MIT License

## References

- [Nostr Protocol](https://github.com/nostr-protocol/nostr)
- [NIP-02: Contact List](https://github.com/nostr-protocol/nips/blob/master/02.md)
- [NIP-07: Browser Extensions](https://github.com/nostr-protocol/nips/blob/master/07.md)
- [NIP-65: Relay List Metadata](https://github.com/nostr-protocol/nips/blob/master/65.md)
- [rx-nostr](https://github.com/penpenpng/rx-nostr)
