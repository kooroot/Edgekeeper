# EdgeKeeper

EdgeKeeper is a proof-aware trading-agent cockpit for World Cup football markets. It ingests live TxLINE odds and score snapshots, detects agent-facing signals, runs deterministic risk checks, marks simulated positions against TxLINE odds/probabilities, and emits compact decision receipts for audit.

This is not a betting app and not a real-money trading bot. Judges do not need a wallet, paid account, token purchase, or real funds; the deployed demo uses EdgeKeeper-owned server-side TxLINE credentials.

- Public demo: https://edgekeeper-kohl.vercel.app
- Submission track: Trading Tools and Agents
- Judge path: open `/cockpit`, inspect the live TxLINE fixture, wait for the automatic agent tick or click `Run Agent Tick`, then review the signal, risk decision, simulated position state, and receipt.
- Source target: https://github.com/kooroot/Edgekeeper

## Product Boundary

EdgeKeeper's core product loop is:

```txt
TxLINE odds/scores -> agent decision -> risk engine -> simulated position -> receipt
```

That boundary is intentional. The application is an operator cockpit for reviewing automated trading-agent behavior from signal input through receipt output.

## Submission Track

EdgeKeeper is submitted to the Superteam / TxODDS World Cup Hackathon **Trading Tools and Agents** track.

Canonical listing:

```txt
https://superteam.fun/earn/listing/trading-tools-and-agents/
```

The product is built for builders, quants, market makers, and trading-agent developers who need observability around agent decisions:

- TxLINE football data is fetched only through server-side routes.
- Agent decisions are rendered as proposed OPEN, CLOSE, NOOP, or BLOCK actions.
- Signals are derived from normalized odds and scores, not raw feed dumps.
- Risk checks deterministically pass or block proposed actions.
- Execution is simulation-only and valued from TxLINE decimal odds / implied probabilities.
- Receipts include signal, risk, action, hashes, and proof references without redistributing raw TxODDS data.

### Why This Track

EdgeKeeper fits `Trading Tools and Agents` because the product surface is built around automated decision logic, deterministic guardrails, simulated position state, and audit receipts. It does not create markets, resolve outcomes, custody funds, take user stakes, or provide payout/settlement flows.

### Judge Evidence Map

The Trading Tools and Agents listing asks for a running agent or automated tool that ingests TxLINE feeds and executes a defined strategy. EdgeKeeper maps to the judging criteria as follows:

| Official criterion | EdgeKeeper evidence |
| --- | --- |
| Core functionality and data ingestion | Server routes fetch live TxLINE fixture, odds, and score snapshots; `/api/live-agent/[fixtureId]` executes a live strategy tick from those snapshots. |
| Autonomous operation | The cockpit runs a server-side agent tick automatically every 60 seconds for the selected fixture, with a manual `Run Agent Tick` button for demo-video timing. |
| Logic and code architecture | Signal, risk, execution, live-agent, receipt, hashing, and normalizer modules are separated under `lib/` with Vitest coverage. |
| Innovation and novelty | The product focuses on proof-aware agent observability: every pass, block, open, and close emits a replayable receipt. |
| Production readiness | Bun/Next build passes, live mainnet TxLINE credentials run server-side on Vercel, secrets stay off the browser, and public routes return derived summaries rather than raw feed dumps. |

Submission requirements covered:

- Demo video: record `/cockpit` loading a live TxLINE fixture and running the automatic or manual live agent tick.
- Public repo: https://github.com/kooroot/Edgekeeper
- Application access: https://edgekeeper-kohl.vercel.app
- Technical docs: [`docs/TECHNICAL.md`](docs/TECHNICAL.md)
- Submission technical documentation: [`docs/SUBMISSION_TECHNICAL_DOCUMENTATION.md`](docs/SUBMISSION_TECHNICAL_DOCUMENTATION.md)
- TxLINE API feedback: see the `TxLINE API Feedback For Submission` section below.

Official references:

- https://superteam.fun/earn/hackathon/world-cup/
- https://superteam.fun/earn/listing/trading-tools-and-agents/
- https://txline-docs.txodds.com/documentation/quickstart
- https://txline-docs.txodds.com/documentation/worldcup
- https://txline-docs.txodds.com/documentation/examples/fetching-snapshots
- https://txline-docs.txodds.com/documentation/examples/streaming-data
- https://txline-docs.txodds.com/documentation/odds/overview
- https://txline-docs.txodds.com/documentation/scores/soccer-feed
- https://txline-docs.txodds.com/documentation/legal/hackathon-terms

## Execution Boundary

EdgeKeeper is an agent cockpit and risk-analysis tool. It does not create markets, custody funds, take stakes, connect user wallets, place bets, or execute real orders.

Its `OPEN_*` and `CLOSE` actions are internal simulation events only, marked against TxLINE-derived probabilities and decimal odds. There is no wallet/session flow, venue adapter, CLOB order construction, order posting, deposit/withdrawal path, or settlement redemption path.

## Live Operation

The cockpit loads live fixture, odds, and score summaries through EdgeKeeper API routes backed by server-only TxLINE credentials. The browser never receives `TXLINE_JWT`, `TXLINE_API_TOKEN`, or wallet key material.

Production is configured as:

- primary: TxLINE mainnet
- secondary fallback: TxLINE devnet

Preview and local development can use devnet primary. If credentials are missing, public live routes return a clear credentials error instead of substituting synthetic fixture data.

The fixture selector separates live monitoring from scheduled future fixtures:

- `Live Window`: fixtures that have recently started or are close enough to kickoff for live monitoring.
- `Analysis`: World Cup fixture universe from recent historical matches through scheduled matches.
- `Completed`: previously played fixtures for historical market-state review.
- `Scheduled`: future fixtures only.

### TxLINE Endpoints Used

EdgeKeeper's live path uses these TxLINE endpoints through `lib/txline/client.ts`:

| TxLINE endpoint | EdgeKeeper route / use |
| --- | --- |
| `GET /api/fixtures/snapshot` | `GET /api/fixtures?scope=live|analysis|completed|scheduled`, fixture list for World Cup football markets |
| `GET /api/odds/snapshot/{fixtureId}` | `GET /api/odds/[fixtureId]`, normalized 1X2 / match-winner odds points |
| `GET /api/scores/snapshot/{fixtureId}` | `GET /api/scores/[fixtureId]`, normalized football score and stat state |
| `GET /api/odds/snapshot/{fixtureId}` + `GET /api/scores/snapshot/{fixtureId}` | `POST /api/live-agent/[fixtureId]`, server-side live strategy tick with signal, risk, simulated action, and receipt |
| `GET /api/scores/historical/{fixtureId}` | client method available for historical score replay/backfill |
| `GET /api/odds/stream` | client method available for SSE odds streaming |
| `GET /api/scores/stream` | client method available for SSE score streaming |

## Architecture

```txt
app/
  page.tsx
  cockpit/page.tsx
  receipts/[id]/page.tsx
  api/
    fixtures/route.ts
    odds/[fixtureId]/route.ts
    scores/[fixtureId]/route.ts
    live-agent/[fixtureId]/route.ts
    receipts/[id]/route.ts
components/
  landing/
  cockpit/
  common/
lib/
  txline/    server-side client, tolerant normalizers, SSE helpers
  replay/    internal deterministic test harness, disabled as a public data fallback
  agent/     signal, risk, simulated execution, receipt, state modules
  utils/     stable JSON, hashing, time helpers
data/replay/  internal test vectors only
docs/
tests/
```

More detail is in [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

## Live Demo

```bash
bun install
bun run dev
```

Then open:

```txt
http://localhost:3000/cockpit
```

The cockpit fetches fixtures from TxLINE through server routes. Use `Live Window`, `Analysis`, `Completed`, or `Scheduled` to choose the fixture universe, select a fixture if needed, then wait for the automatic 60-second agent tick or click `Run Agent Tick`.

Expected demo flow:

1. Live, historical, and scheduled fixture names appear from `GET /api/fixtures?scope=live|analysis|completed|scheduled`.
2. Odds and score summaries load from `GET /api/odds/[fixtureId]` and `GET /api/scores/[fixtureId]`.
3. The live agent tick reads those snapshots server-side.
4. The signal engine emits a decision such as stale-feed guard, suspension guard, odds movement, or live market scan.
5. The risk engine deterministically passes or blocks the proposed action.
6. The simulated execution engine updates internal position state when an action passes.
7. A compact receipt is emitted with a TxLINE proof reference and deterministic hash.

## Environment

Create `.env.local` from `.env.example` when using live mode:

```bash
TXLINE_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_NETWORK=devnet
TXLINE_JWT=
TXLINE_API_TOKEN=
TXLINE_SECONDARY_API_ORIGIN=
TXLINE_SECONDARY_NETWORK=
TXLINE_SECONDARY_JWT=
TXLINE_SECONDARY_API_TOKEN=
NEXT_PUBLIC_DEFAULT_MODE=live
```

Production mainnet with devnet fallback:

```bash
TXLINE_NETWORK=mainnet
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_SECONDARY_NETWORK=devnet
TXLINE_SECONDARY_API_ORIGIN=https://txline-dev.txodds.com
```

## TxLINE Credential Issuance

EdgeKeeper includes a local issuance helper for the project-owned TxLINE wallet. The wallet keypair is stored under `keys/` and ignored by git.

Devnet:

```bash
bun run txline:issue:devnet
```

Mainnet:

```bash
bun run txline:issue:mainnet
```

The script subscribes to the free World Cup / International Friendlies tiers and writes credentials into `.env.local`. It does not print JWT or API token values. Devnet uses service level `1`; mainnet defaults to service level `12` for real-time World Cup / International Friendlies free tier.

## Commands

```bash
bun install
bun run dev
bun run build
bun run test
bun run lint
bun run txline:issue:devnet
bun run txline:issue:mainnet
```

## Safety And Compliance

- Simulation only; no real-money betting.
- No user wallet connection is required.
- No order routing, CLOB posting, exchange integration, custody, deposits, or withdrawals.
- No judge wallet, purchase, token, subscription, or account is required to view the deployed cockpit.
- No official FIFA branding, logos, marks, tournament marks, or implied affiliation.
- No public raw TxODDS data redistribution.
- Receipts include normalized summaries and hashes, not full raw TxODDS response dumps.
- No profitability, guaranteed alpha, or betting advice claims.

## TxLINE API Feedback For Submission

What worked well:

- Fixture, odds, and score snapshots are enough to build a working autonomous agent demo quickly.
- The feed is suitable for deterministic replay because normalized snapshots can be hashed and replayed into receipts.
- Server-side JWT/API-token access fits a secure cockpit architecture because credentials never need to reach the browser.

Friction:

- Response payloads can vary between PascalCase/camelCase and array/object shapes, so tolerant normalizers are necessary.
- Odds selection labels are not always exactly `P1`, `DRAW`, `P2`, so the app needs selection mapping and unknown-market fallbacks.
- Streaming support is useful, but the snapshot endpoints are enough for a judge-friendly autonomous agent tick because review may happen when match activity is stale.

## Judge Demo Script

1. Run `bun install`.
2. Run `bun run dev`.
3. Open `/cockpit`.
4. Select a live TxLINE fixture if more than one is available.
5. Click `Refresh Snapshot` or wait for the automatic load.
6. Click `Run Agent Tick` or wait for the 60-second automatic tick.
7. Confirm the signal, risk decision, simulated action state, and receipt hash are produced from the live fixture.
