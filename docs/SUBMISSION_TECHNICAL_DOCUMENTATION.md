# EdgeKeeper Technical Documentation

Submission target: Superteam / TxODDS World Cup Hackathon, Trading Tools and Agents track

Public app: https://edgekeeper-kohl.vercel.app

Public repository: https://github.com/kooroot/Edgekeeper

Demo video artifact: `edgekeeper-youtube.mp4`

## 1. Executive Summary

EdgeKeeper is a proof-aware trading-agent cockpit for World Cup football markets. It ingests TxLINE odds and score data through server-side API routes, normalizes that data into a stable internal model, runs deterministic signal and risk logic, updates simulated position state, and emits compact decision receipts for every agent action.

The product is intentionally not a betting app and not a real-money trading bot. It does not connect user wallets, accept stakes, place venue orders, custody funds, or settle outcomes. EdgeKeeper is an operator tool for builders, quants, market makers, and trading-agent developers who need to understand how an autonomous agent reads verified football data and turns it into auditable decisions.

Core loop:

```txt
TxLINE odds/scores
  -> tolerant normalization
  -> signal engine
  -> deterministic risk engine
  -> simulated position ledger
  -> decision receipt
  -> operator cockpit
```

The demo path is designed for judging: open `/cockpit`, load a live TxLINE fixture, wait for the automatic 60-second agent tick or click `Run Agent Tick`, and inspect the resulting signal, risk decision, simulated position state, and receipt hash.

## 2. Track Fit

EdgeKeeper targets the Trading Tools and Agents track because it is a running agent cockpit that ingests TxLINE feeds and executes a defined strategy path. The implementation focuses on autonomous decision logic, production-style risk checks, simulated position accounting, and audit receipts.

### 2.1 Judging Criteria Mapping

| Judging criterion | EdgeKeeper implementation evidence |
| --- | --- |
| Core Functionality and Data Ingestion | Server-side routes fetch TxLINE fixtures, odds, and scores. `POST /api/live-agent/[fixtureId]` executes a strategy tick from live odds and score snapshots. |
| Autonomous Operation | `LiveSnapshotPanel` automatically runs the live agent tick every 60 seconds for the selected fixture. Manual `Run Agent Tick` is provided only for demo timing and operator inspection. |
| Logic and Code Architecture | Signal detection, risk evaluation, execution, receipt generation, TxLINE client code, normalizers, and UI components are separated into testable modules under `lib/`, `app/api/`, and `components/`. |
| Innovation and Novelty | EdgeKeeper treats every agent output as a replayable decision artifact. The cockpit does not only show odds; it explains why a strategy passed, blocked, opened, closed, or did nothing. |
| Production Readiness | Server-only credential handling, mainnet/devnet environment separation, primary/secondary TxLINE fallback, deterministic tests, Vercel deployment, no public raw feed export, and compact audit receipts are implemented. |

### 2.2 What EdgeKeeper Is Not

EdgeKeeper is not:

- a prediction market creation tool
- a settlement or payout system
- a consumer betting interface
- a wallet connection flow
- a real-money trading bot
- a raw TxODDS data redistribution product
- an official FIFA or tournament-branded product

All `OPEN_*`, `CLOSE`, `NOOP`, and `BLOCK` actions are simulation and analysis events only.

## 3. Runtime Architecture

### 3.1 High-Level Layout

```txt
app/
  page.tsx                         landing page
  cockpit/page.tsx                 operator cockpit entry
  receipts/[id]/page.tsx           receipt detail page
  api/
    fixtures/route.ts              normalized fixture scopes
    odds/[fixtureId]/route.ts       normalized odds summary
    scores/[fixtureId]/route.ts     normalized score summary
    live-agent/[fixtureId]/route.ts server-side agent tick
    receipts/[id]/route.ts          receipt lookup

components/
  cockpit/
    LiveSnapshotPanel.tsx           live TxLINE fixture/snapshot/tick UI
    MarketStatePanel.tsx            score, phase, odds, freshness
    SignalFeed.tsx                  decision timeline
    RiskPanel.tsx                   deterministic risk checks
    PaperLedger.tsx                 simulated positions and PnL
    ReceiptDrawer.tsx               receipt inspection
    AgentStatusBar.tsx              mode/status counters

lib/
  txline/
    client.ts                       server-side TxLINE client
    normalize.ts                    tolerant Zod-backed normalizers
    live-summary.ts                 derived UI summaries and fixture scopes
    network.ts                      mainnet/devnet configuration
    sse.ts                          SSE parser/helper surface
  agent/
    live-agent.ts                   live tick orchestration
    signals.ts                      signal engine
    risk.ts                         risk engine
    execution.ts                    simulated execution ledger
    receipt.ts                      deterministic receipts
    state.ts                        in-memory agent state helpers
  utils/
    stable-json.ts                  deterministic serialization
    hash.ts                         SHA-256 hashing
    country-flags.ts                country flag display mapping
```

### 3.2 Request Flow

```txt
Browser cockpit
  -> GET /api/fixtures?scope=live|analysis|completed|scheduled
  -> GET /api/odds/[fixtureId]
  -> GET /api/scores/[fixtureId][?history=1]
  -> POST /api/live-agent/[fixtureId][?history=1]
        -> TxLineClient
        -> TxLINE API
        -> normalize odds/scores
        -> runLiveAgentTick
        -> detect signals
        -> evaluate risk
        -> apply simulated execution
        -> create decision receipt
  <- derived summaries, decisions, positions, receipts
```

The browser never receives TxLINE JWTs, TxLINE API tokens, wallet key material, or full raw TxODDS response dumps.

## 4. TxLINE Integration

### 4.1 Server-Side Client

`lib/txline/client.ts` defines `TxLineClient`, which exposes:

- `getFixturesSnapshot()`
- `getOddsSnapshot(fixtureId)`
- `getScoresSnapshot(fixtureId)`
- `getHistoricalScores(fixtureId)`
- `streamOdds()`
- `streamScores()`

The deployed application currently uses snapshot routes for the cockpit and live agent tick. SSE helper methods exist for extension, but the production demo path is snapshot-based because it is deterministic, easier to inspect in a demo video, and suitable for matches that may not be active during review.

### 4.2 TxLINE Endpoint Mapping

| EdgeKeeper method or route | TxLINE endpoint |
| --- | --- |
| `getFixturesSnapshot()` | `GET /api/fixtures/snapshot` |
| `getOddsSnapshot(fixtureId)` | `GET /api/odds/snapshot/{fixtureId}` |
| `getScoresSnapshot(fixtureId)` | `GET /api/scores/snapshot/{fixtureId}` |
| `getHistoricalScores(fixtureId)` | `GET /api/scores/historical/{fixtureId}` when available |
| `streamOdds()` | `GET /api/odds/stream` with `Accept: text/event-stream` |
| `streamScores()` | `GET /api/scores/stream` with `Accept: text/event-stream` |

Required headers:

```txt
Authorization: Bearer ${TXLINE_JWT}
X-Api-Token: ${TXLINE_API_TOKEN}
```

### 4.3 Network Strategy

Production is configured with:

- primary network: TxLINE mainnet
- secondary fallback: TxLINE devnet

Preview and local development can use devnet primary credentials. If no credentials are available, the live API routes return explicit credential errors instead of substituting fake live data.

Environment variables:

```txt
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_NETWORK=mainnet
TXLINE_JWT=
TXLINE_API_TOKEN=

TXLINE_SECONDARY_API_ORIGIN=https://txline-dev.txodds.com
TXLINE_SECONDARY_NETWORK=devnet
TXLINE_SECONDARY_JWT=
TXLINE_SECONDARY_API_TOKEN=

NEXT_PUBLIC_DEFAULT_MODE=live
```

### 4.4 Fixture Scopes

`GET /api/fixtures` supports these scopes:

| Scope | Purpose |
| --- | --- |
| `live` | Fixtures in the live monitoring window, including recently started matches and fixtures close to kickoff. |
| `analysis` | Wider fixture universe for reviewing recent historical matches and scheduled matches together. |
| `completed` | Previously played fixtures, filtered by final status or start-time distance. |
| `scheduled` | Future fixtures only. |

The UI labels these scopes as `Live Window`, `Analysis`, `Completed`, and `Scheduled` to avoid presenting currently active fixtures as merely upcoming.

## 5. Normalization Layer

TxLINE responses may use PascalCase, camelCase, or nested structures depending on endpoint and feed shape. EdgeKeeper avoids brittle assumptions by normalizing all inputs through `lib/txline/normalize.ts`.

Key implementation details:

- Zod `.passthrough()` accepts unknown fields without rejecting payloads.
- Field lookup uses case-insensitive and punctuation-insensitive fingerprints.
- Timestamp normalization accepts epoch seconds, epoch milliseconds, or ISO strings.
- Odds selection normalization maps common values into `P1`, `DRAW`, or `P2`.
- Price arrays with `priceNames`, `prices`, and `pct` are expanded into individual normalized odds points.
- Soccer stats arrays or objects are normalized into `Record<string, number>`.

Internal normalized types:

```ts
type NormalizedFixture = {
  fixtureId: string;
  participant1: string;
  participant2: string;
  participant1IsHome?: boolean;
  startTime?: string;
  status?: string;
  competitionId?: number | string;
  competition?: string;
};

type NormalizedOddsPoint = {
  fixtureId: string;
  ts: number;
  seq?: number;
  market: "1X2" | "MATCH_WINNER" | "UNKNOWN";
  selection: "P1" | "DRAW" | "P2" | string;
  decimalOdds?: number;
  impliedProbability?: number;
  suspended?: boolean;
  source?: "txline" | "replay";
};

type NormalizedScoreUpdate = {
  fixtureId: string;
  ts: number;
  seq?: number;
  phaseId?: number;
  minute?: number;
  participant1Score?: number;
  participant2Score?: number;
  stats?: Record<string, number>;
  rawSummary?: string;
  source?: "txline" | "replay";
};
```

Only normalized summaries are rendered or returned to the browser.

## 6. Agent Decision Pipeline

The live agent path is implemented in `lib/agent/live-agent.ts` and exposed through `POST /api/live-agent/[fixtureId]`.

For each tick:

1. Fetch odds and scores through server-only TxLINE credentials.
2. Normalize the snapshots.
3. Build the latest 1X2 / match-winner market state.
4. Compare current state with in-memory prior state for that fixture.
5. Run signal detection.
6. If no sharp signal fires, emit `LIVE_MARKET_SCAN` as a deterministic `NOOP` receipt.
7. Run all deterministic risk checks.
8. Apply simulated execution only if risk passes.
9. Emit a compact decision receipt.
10. Store latest odds, latest score, positions, risk decisions, and receipts in process memory.

In-memory state is deliberately sufficient for the hackathon demo and avoids requiring a database. A production trading desk deployment would replace the process-local state map with durable storage.

## 7. Signal Engine

Signals are defined in `lib/agent/types.ts` and implemented in `lib/agent/signals.ts`.

```ts
type Signal = {
  id: string;
  fixtureId: string;
  ts: number;
  type:
    | "ODDS_VELOCITY"
    | "SCORE_PRICE_DIVERGENCE"
    | "MOMENTUM_SHIFT"
    | "STALE_FEED"
    | "SUSPENSION_GUARD"
    | "LIVE_MARKET_SCAN";
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  description: string;
  confidence: number;
  suggestedAction: "OPEN_P1" | "OPEN_DRAW" | "OPEN_P2" | "CLOSE" | "NOOP" | "BLOCK";
  inputHash: string;
};
```

### 7.1 Odds Velocity

Purpose: detect sharp implied probability movement inside a short time window.

Default parameters:

```txt
window = 120 seconds
absolute probability delta threshold = 0.04
```

For each current odds point, EdgeKeeper finds the latest prior point for the same selection. If the implied probability delta is at least 4 percentage points inside 120 seconds, it emits `ODDS_VELOCITY`.

Action mapping:

- P1 probability increases -> `OPEN_P1`
- DRAW probability increases -> `OPEN_DRAW`
- P2 probability increases -> `OPEN_P2`
- probability reversal -> `CLOSE`

Confidence is deterministic and increases with the absolute probability move.

### 7.2 Score-Price Divergence

Purpose: detect disagreement between score state and market repricing.

The signal compares previous and current score totals. When a goal changes the leader, it checks the leader's probability before and after the score update:

- if price barely moved, the agent may suggest opening the leading side
- if price moved too aggressively, the agent records a `NOOP` warning

This is useful for detecting cases where score information and market price appear temporally misaligned.

### 7.3 Momentum Shift

Purpose: detect pressure changes before they appear in score.

The current implementation uses soccer stat keys:

| Key | Meaning |
| --- | --- |
| `1` | Participant 1 total goals |
| `2` | Participant 2 total goals |
| `3` | Participant 1 yellow cards |
| `4` | Participant 2 yellow cards |
| `5` | Participant 1 red cards |
| `6` | Participant 2 red cards |
| `7` | Participant 1 corners |
| `8` | Participant 2 corners |

Pressure scoring:

```txt
P1 pressure = P1 corner delta - P2 corner delta + P2 red-card delta * 3 + P2 yellow-card delta * 0.5
P2 pressure = P2 corner delta - P1 corner delta + P1 red-card delta * 3 + P1 yellow-card delta * 0.5
```

If either side reaches the pressure threshold, the agent emits `MOMENTUM_SHIFT` with an open action for that side.

### 7.4 Suspension Guard

Purpose: block action when the market is suspended.

If any latest odds point is marked suspended, EdgeKeeper emits `SUSPENSION_GUARD` with suggested action `BLOCK`.

### 7.5 Stale Feed Guard

Purpose: block action when live data is too old.

Default stale threshold:

```txt
90 seconds
```

The guard compares `now` against the oldest required latest odds or score timestamp. In live mode, stale data is a hard block.

### 7.6 Live Market Scan Fallback

Purpose: create an auditable receipt even when no sharp trade signal fires.

In live operation, most 60-second ticks should not force a trade. If no velocity, divergence, momentum, stale-feed, or suspension signal fires, EdgeKeeper emits `LIVE_MARKET_SCAN`:

```txt
severity = LOW
suggestedAction = NOOP
confidence = 0.51
```

This makes autonomous operation visible in quiet market states without pretending that every tick is actionable.

## 8. Risk Engine

The risk engine is implemented in `lib/agent/risk.ts`. It is deterministic and evaluates every signal before simulated execution.

Default limits:

```txt
max exposure = 300 notional units
per trade stake = 100 notional units
max open positions = 3
stale live feed block = 90 seconds
drawdown block = -200 notional units cumulative PnL
final phase ids = 5, 10, 13
```

Risk checks:

| Check | Blocking condition |
| --- | --- |
| Max exposure | Opening a new position would exceed 300 total notional units. |
| Per trade stake | Configured stake exceeds the allowed simulated unit size. |
| Max open positions | Opening a new position would exceed 3 open positions. |
| Stale feed block | Live odds or score state is missing or older than 90 seconds. |
| Suspended market block | Latest odds packet marks the market as suspended. |
| Ended match block | Opening action is attempted in a final phase. |
| Drawdown guard | Cumulative simulated PnL is at or below -200 units. |

Blocked decisions still generate receipts. This is important because in a real operator workflow, "why the agent refused to act" is as important as "why it acted."

## 9. Simulated Execution Ledger

Execution is implemented in `lib/agent/execution.ts`. It does not route orders.

If risk passes and the final action is:

- `OPEN_P1`: create a simulated P1 position
- `OPEN_DRAW`: create a simulated draw position
- `OPEN_P2`: create a simulated P2 position
- `CLOSE`: close matching open simulated positions
- `NOOP`: do nothing but record the decision
- `BLOCK`: do nothing and record the blocked decision

Open position fields:

```ts
type PaperPosition = {
  id: string;
  fixtureId: string;
  side: "P1" | "DRAW" | "P2";
  openedAt: number;
  closedAt?: number;
  entryProbability: number;
  exitProbability?: number;
  entryDecimalOdds?: number;
  exitDecimalOdds?: number;
  probabilityDelta?: number;
  stakeUnits: number;
  pnlUnits?: number;
  status: "OPEN" | "CLOSED" | "BLOCKED";
};
```

PnL is marked from probability movement:

```txt
pnlUnits = stakeUnits * ((exitProbability - entryProbability) / entryProbability)
```

Missing or zero entry probability fails safe to `0` PnL.

## 10. Receipt Engine

Receipts are implemented in `lib/agent/receipt.ts`.

Receipt type:

```ts
type DecisionReceipt = {
  id: string;
  fixtureId: string;
  createdAt: number;
  strategyVersion: string;
  signal: Signal;
  riskDecision: RiskDecision;
  action: string;
  paperPositionId?: string;
  inputHash: string;
  receiptHash: string;
  proofReference?: {
    source: "txline" | "replay";
    fixtureId: string;
    scoreSeq?: number;
    oddsSeq?: number;
    note: string;
  };
};
```

Hash construction:

```txt
receiptHash = sha256(stableJson({
  fixtureId,
  signal,
  riskDecision,
  action,
  paperPositionId,
  inputHash
}))
```

Receipt design goals:

- deterministic hash for replayability
- compact JSON suitable for operator inspection
- no raw TxODDS feed dump
- proof reference that names the data source and relevant sequence numbers when available
- stable strategy version field

## 11. Public API Surface

| Route | Method | Purpose | Raw TxODDS exposure |
| --- | --- | --- | --- |
| `/api/fixtures` | `GET` | Fetch and scope normalized fixture summaries. | No raw export |
| `/api/odds/[fixtureId]` | `GET` | Return latest normalized odds summary for a fixture. | No raw export |
| `/api/scores/[fixtureId]` | `GET` | Return latest normalized score summary for a fixture. | No raw export |
| `/api/live-agent/[fixtureId]` | `POST` | Execute server-side live strategy tick. | No raw export |
| `/api/receipts/[id]` | `GET` | Return compact receipt detail. | No raw export |
| `/api/replay/[fixtureId]` | `GET` | Deterministic replay harness data for local/demo fallback. | Local sample only |

The public API is designed around derived summaries and audit artifacts, not redistribution of TxODDS responses.

## 12. Operator Cockpit UI

The cockpit is designed as a trading terminal and agent observability surface.

Primary panels:

- selected fixture, mode, network, and status
- live fixture scope tabs
- market state with score, phase, odds, probabilities, and freshness
- signal feed timeline
- deterministic risk check panel
- simulated position and PnL summary
- receipt trail and receipt detail drawer

Important UI labels:

- `LIVE MODE`
- `REPLAY MODE`
- `OPERATOR COCKPIT`
- `TXLINE-VALUED SIM`
- `AUTO 60S AGENT TICK`
- `RISK CHECKED`
- `RECEIPT GENERATED`
- `NO RAW FEED EXPORT`

Country names are displayed with flag emoji when the country can be mapped safely; text fallback is preserved.

## 13. Security, Secrets, And Credential Issuance

### 13.1 Secret Handling

TxLINE credentials are server-only:

- `TXLINE_JWT`
- `TXLINE_API_TOKEN`
- `TXLINE_SECONDARY_JWT`
- `TXLINE_SECONDARY_API_TOKEN`

They are read only by Next.js server routes and `lib/txline/client.ts`. They are never placed in `NEXT_PUBLIC_*` variables and never sent to the browser.

Git ignores sensitive local artifacts:

- `.env*` except `.env.example`
- `.vercel`
- `keys/*.json`
- `.next`
- `node_modules`

### 13.2 Issuance Helper

`scripts/issue-txline.mjs` supports local TxLINE credential issuance for the EdgeKeeper-owned keypair.

Commands:

```bash
bun run txline:issue:devnet
bun run txline:issue:mainnet
```

The script:

1. Loads the project-owned keypair from `keys/`.
2. Confirms the wallet has enough SOL for subscription.
3. Requests a guest JWT.
4. Subscribes to the configured TxLINE free tier.
5. Activates the API token.
6. Verifies fixture access.
7. Writes `.env.local` with mode `0600`.

It deliberately does not print JWT or API token values.

### 13.3 Browser Boundary

The browser receives:

- normalized fixture names
- normalized odds summaries
- normalized score summaries
- derived signal/risk/action state
- simulated position state
- receipt hashes and compact receipt JSON

The browser does not receive:

- TxLINE secrets
- wallet private keys
- raw TxODDS response bodies
- venue order payloads
- real-money account data

## 14. Compliance Boundary

EdgeKeeper is simulation-only.

Compliance and safety commitments:

- No real-money betting.
- No wallet connection is required for judges.
- No user funds, deposits, withdrawals, or custody.
- No order placement or betting venue integration.
- No official FIFA branding, logos, marks, or implied affiliation.
- No profitability or guaranteed-alpha claims.
- No public raw TxODDS data redistribution.
- Receipts contain normalized summaries, hashes, and proof references, not full feed dumps.

## 15. Testing And Verification

### 15.1 Automated Test Coverage

Vitest tests cover:

- implied probability calculation
- TxLINE normalization of fixture, odds, and score shapes
- odds velocity signal detection
- risk engine stale-feed blocking
- simulated execution PnL
- deterministic receipt hash generation
- live agent tick behavior
- live summary fixture scoping
- country flag display mapping

Run:

```bash
bun run test
```

### 15.2 Build And Lint

Run:

```bash
bun run lint
bun run build
```

Primary project commands:

```bash
bun install
bun run dev
bun run build
bun run test
bun run lint
```

### 15.3 Demo Video Verification

The YouTube-ready video artifact is:

```txt
edgekeeper-youtube.mp4
```

Video QA performed:

- created burned-in English subtitles from `edgekeeper.en.srt`
- generated `edgekeeper-captioned.mov`
- generated YouTube-ready `edgekeeper-youtube.mp4` with H.264 video and silent AAC audio
- verified resolution: `3824x1978`
- verified duration: approximately `101.383s`
- verified no SRT cue gaps
- compared all `3196` original-corresponding frames for caption-region signal
- checked the `455` padded ending frames for caption-region signal
- visually inspected opening, middle, late, and final frames for readable captions

Because subtitles are burned into the video pixels, the SRT file should not be uploaded as an additional YouTube caption track unless duplicate subtitles are desired.

## 16. Deployment

Runtime:

- Next.js App Router
- TypeScript strict mode
- React
- Tailwind CSS
- Bun package manager
- Vercel deployment

Production deployment:

```txt
https://edgekeeper-kohl.vercel.app
```

Production environment:

- TxLINE mainnet primary
- TxLINE devnet secondary fallback
- server-only credentials

The deployment is intentionally database-free for the hackathon demo. Live agent state is process-local. This keeps the submission easy to inspect and removes external infrastructure requirements.

## 17. Limitations And Production Extensions

Current constraints:

- Process-local state means receipts and simulated positions are not durable across server restarts.
- Snapshot polling is used for the submitted cockpit path; SSE helpers are present but not the primary UI path.
- There is no venue execution adapter by design.
- There is no authenticated multi-operator workspace.
- There is no database-backed audit log.

Production extensions:

- Store receipts and simulated positions in a durable database.
- Add authenticated operator accounts.
- Add replayable archived TxLINE-derived input summaries without raw feed redistribution.
- Add SSE-driven live tick scheduling where match activity is continuous.
- Add strategy version registry and configurable risk profiles.
- Add receipt export signing or on-chain anchoring for agent outputs.
- Add alerting integrations for blocked decisions, stale feeds, and suspension events.

These extensions do not change the core boundary: EdgeKeeper remains an agent decision and risk-analysis cockpit, not a betting app or real-money execution bot.

## 18. Judge Demo Script

Recommended demo flow:

1. Open `https://edgekeeper-kohl.vercel.app`.
2. Click `Open Agent Cockpit`.
3. Confirm the cockpit shows `LIVE MODE`, `OPERATOR COCKPIT`, and `AUTO 60S AGENT TICK`.
4. In `Live TxLINE Snapshot`, use `Live Window` or `Analysis`.
5. Select a fixture, such as an active or recently played international football match.
6. Click `Refresh Snapshot`.
7. Inspect the market state: score, phase, odds probabilities, and freshness.
8. Click `Run Agent Tick` or wait for the automatic 60-second tick.
9. Inspect the decision card.
10. Inspect the risk checks.
11. Inspect simulated position state or `NOOP` state.
12. Inspect the emitted receipt id and receipt hash.
13. Emphasize that the action is simulation-only and no wallet or real money is involved.

The expected reviewer takeaway is that EdgeKeeper turns TxLINE market data into autonomous, deterministic, risk-checked, auditable agent decisions.

## 19. Reference Links

- Superteam Trading Tools and Agents listing: https://superteam.fun/earn/listing/trading-tools-and-agents/
- TxLINE Quickstart: https://txline-docs.txodds.com/documentation/quickstart
- TxLINE World Cup Free Tier: https://txline-docs.txodds.com/documentation/worldcup
- TxLINE Fetching Snapshots: https://txline-docs.txodds.com/documentation/examples/fetching-snapshots
- TxLINE Streaming Data: https://txline-docs.txodds.com/documentation/examples/streaming-data
- TxLINE Odds Overview: https://txline-docs.txodds.com/documentation/odds/overview
- TxLINE Soccer Feed: https://txline-docs.txodds.com/documentation/scores/soccer-feed
- Public app: https://edgekeeper-kohl.vercel.app
- Public repo: https://github.com/kooroot/Edgekeeper
