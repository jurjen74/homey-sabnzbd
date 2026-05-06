# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Homey smart home app (SDK v3) that integrates SABnzbd usenet download manager. The app ID is `net.ladenius.sabnzbd`.

## Commands

```bash
npm run lint      # ESLint using athom/homey-app config
```

No build step — Homey apps run directly as Node.js. Deploy/test via the Homey CLI (`homey app run` or `homey app install`).

## Architecture

```
lib/SabnzbdApi.js                    — HTTP client for the SABnzbd JSON API
drivers/sabnzbd/
  driver.compose.json                — capabilities, settings, pairing, flow cards
  driver.js                          — flow card registration (conditions/actions/triggers) + onPair
  device.js                          — polling loop, capability updates, event detection
  pair/start.html                    — pairing UI (host / port / API key form)
.homeycompose/capabilities/          — custom capability definitions
locales/en.json                      — user-facing strings
```

### Key conventions

- **Do not edit `app.json` directly** — it is generated from `.homeycompose/`. Edit `driver.compose.json` and `.homeycompose/app.json` instead.
- **Flow cards** are declared under `.homeycompose/flow/{triggers,conditions,actions}/` (one file per card) and wired up with `registerRunListener` in `driver.js → onInit`. Each card must include a `device` arg with `filter: "driver_id=sabnzbd"`. Cards with non-device args need both `title` (uses `{{argName}}`) and `titleFormatted` (uses `[[argName]]`).
- **Polling** is managed entirely in `device.js`. The interval is a per-device setting (`poll_interval`, default 10 s). Stop/restart polling in `onSettings` and `onDeleted`.
- **SABnzbd API** (`lib/SabnzbdApi.js`) uses Node's built-in `http` module (no extra deps). All methods return Promises. Speed is converted KB/s → MB/s at the call site in `device.js`.
- **History deduplication**: `_seenHistoryIds` is `null` on first poll (skip triggering for pre-existing history), then a `Set` of `nzo_id` strings on subsequent polls.
- **Status mapping**: `paused` (boolean from queue) → `'paused'`; `queue.status === 'Downloading'` or `'Fetching'` → `'downloading'`; otherwise `'idle'`.
- `env.json` (gitignored) holds secrets for local development.
