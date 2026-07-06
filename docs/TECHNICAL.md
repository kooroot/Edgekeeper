# EdgeKeeper Technical Notes

## Product Scope

EdgeKeeper is a proof-aware cockpit for trading-agent decisions over World Cup football data. It is designed to show how an agent can ingest verified data, derive signals, evaluate risk, simulate position state, and emit replayable receipts.

It is not a real-money betting tool. There is no wallet connection, no venue adapter, no CLOB order submission, no custody, and no user-funded order path.

## Submission Track Fit

EdgeKeeper targets the Superteam / TxODDS World Cup Hackathon **Trading Tools and Agents** listing:

```txt
https://superteam.fun/earn/listing/trading-tools-and-agents/
```

The project belongs in this track because it builds operator tooling around trading-agent decisions:

- normalized live/replay football data ingestion
- signal detection over odds and score movement
- deterministic risk checks
- simulated position marking from TxLINE odds/probabilities
- auditable decision receipts

It is not a `Prediction Markets and Settlement` project because it has no market creation, outcome resolution, payout, or settlement layer. It is not a `Consumer and Fan Experiences` project because the primary surface is a trading terminal for builders and agent developers, not a fan-facing companion app.

### Official Judging Criteria Coverage

| Criterion | Implementation evidence |
| --- | --- |
| Core Functionality & Data Ingestion | `app/api/fixtures`, `app/api/odds/[fixtureId]`, and `app/api/scores/[fixtureId]` fetch TxLINE snapshots server-side and return normalized summaries. Replay mode uses seeded TxLINE-shaped packets. |
| Autonomous Operation | `lib/replay/replay-engine.ts` runs packet processing end-to-end once the replay is started: signals, risk, simulated execution, and receipts. |
| Logic & Code Architecture | `lib/agent/signals.ts`, `risk.ts`, `execution.ts`, `receipt.ts`, and `state.ts` keep deterministic strategy logic isolated and testable. |
| Innovation & Novelty | Decision receipts combine signal input hashes, risk decisions, actions, and proof references so agent behavior is replayable and auditable. |
| Production Readiness | Vercel production uses server-only TxLINE mainnet credentials with devnet fallback; replay works credential-free; tests, lint, and build pass under Bun. |

### Submission Artifacts

- Live app: `https://edgekeeper-kohl.vercel.app`
- Public repo: `https://github.com/kooroot/Edgekeeper`
- Demo path: `/cockpit` -> `Start Replay` -> inspect signal feed, risk panel, execution ledger, and receipts.
- Technical docs: this document.
- TxLINE feedback: see `README.md`.

## loldosa Auto Bet Comparison

The loldosa Auto Bet codebase supports a materially different class of functionality:

- wallet/session and billing access
- eligibility and terms consent gates
- Polymarket deposit-wallet derivation and enablement
- CLOB order request construction
- `createOrder`, `createMarketOrder`, and `postOrder` calls
- worker queues for snapshot evaluation, order execution, reconciliation, and settlement redemption
- live execution gates such as `AUTO_BET_LIVE_ENABLED=false`

EdgeKeeper overlaps only at the analysis vocabulary layer: signals, risk checks, open/close state, and PnL-like marks. EdgeKeeper does not include the money path. Its actions are internal simulation events.

## Data Flow

### Replay

```txt
data/replay/*.json
  -> lib/replay/sample-data.ts
  -> tolerant normalizers
  -> lib/replay/replay-engine.ts
  -> signal engine
  -> risk engine
  -> simulated execution ledger
  -> deterministic receipt engine
  -> cockpit UI
```

Replay packets are intentionally local and deterministic. The demo includes odds movement, score updates, football stat changes, a suspended market packet, a blocked risk decision, an opened simulated position, a closed simulated position, and receipts.

### Live Snapshot

```txt
browser
  -> app/api/fixtures
  -> app/api/odds/[fixtureId]
  -> app/api/scores/[fixtureId]
  -> lib/txline/client.ts
  -> TxLINE API with server-only credentials
  -> tolerant normalizers
  -> derived cockpit summaries
```

The live UI never receives TxLINE JWTs, API tokens, or raw downloadable feed dumps.

## TxLINE Client

`lib/txline/client.ts` exposes:

- `getFixturesSnapshot()`
- `getOddsSnapshot(fixtureId)`
- `getScoresSnapshot(fixtureId)`
- `getHistoricalScores(fixtureId)`
- `streamOdds()`
- `streamScores()`

Endpoint mapping:

| Client method | TxLINE endpoint | App-facing route |
| --- | --- | --- |
| `getFixturesSnapshot()` | `GET /api/fixtures/snapshot` | `GET /api/fixtures` |
| `getOddsSnapshot(fixtureId)` | `GET /api/odds/snapshot/{fixtureId}` | `GET /api/odds/[fixtureId]` |
| `getScoresSnapshot(fixtureId)` | `GET /api/scores/snapshot/{fixtureId}` | `GET /api/scores/[fixtureId]` |
| `getHistoricalScores(fixtureId)` | `GET /api/scores/historical/{fixtureId}` | available server-side for backfill |
| `streamOdds()` | `GET /api/odds/stream` | available server-side for SSE integration |
| `streamScores()` | `GET /api/scores/stream` | available server-side for SSE integration |

Requests send:

```txt
Authorization: Bearer ${TXLINE_JWT}
X-Api-Token: ${TXLINE_API_TOKEN}
```

The client supports a primary and secondary credential set. Production uses mainnet primary and devnet secondary fallback; development can use devnet primary.

## Normalization

The normalizers accept TxLINE-shaped payloads with PascalCase or camelCase keys and use tolerant parsing. The app works with normalized data structures:

- `NormalizedFixture`
- `NormalizedOddsPoint`
- `NormalizedScoreUpdate`

The UI is built from normalized fields such as fixture id, teams, phase, score, market, selection, decimal odds, implied probability, suspension status, and update timestamps.

## Signal Engine

`lib/agent/signals.ts` implements:

- `ODDS_VELOCITY`: large implied-probability movement within a short window.
- `SCORE_PRICE_DIVERGENCE`: score state and price movement disagree or move with suspicious timing.
- `MOMENTUM_SHIFT`: score, cards, corners, and phase/stat deltas show a directional change.
- `STALE_FEED`: guard signal when required data ages out.
- `SUSPENSION_GUARD`: guard signal when the latest market is suspended.

Signals contain deterministic ids, confidence, suggested action, and an input hash.

## Risk Engine

`lib/agent/risk.ts` evaluates every signal through deterministic checks:

- max exposure: 300 notional units
- per simulated trade: 100 notional units
- max open positions: 3
- stale live feed block: odds or score age greater than 90 seconds in live mode
- suspended market block
- ended match block for final phase ids `5`, `10`, `13`
- drawdown guard at `-200` notional units cumulative PnL

Blocked decisions produce receipts too, so a reviewer can replay why the agent did nothing.

## Simulated Execution Ledger

`lib/agent/execution.ts` never routes orders. It mutates in-memory simulated positions only.

For open actions:

- stores side `P1`, `DRAW`, or `P2`
- stores entry implied probability
- stores entry decimal odds from the latest TxLINE odds point
- uses 100 notional units

For close actions:

- stores exit implied probability
- stores exit decimal odds
- stores probability delta
- computes simulated PnL:

```txt
pnlUnits = stakeUnits * ((exitProbability - entryProbability) / entryProbability)
```

Missing or zero probabilities fail safe to `0` PnL. The ledger is a TxLINE-valued simulation, not a broker or exchange ledger.

## Receipt Engine

`lib/agent/receipt.ts` creates deterministic receipts:

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

Receipts include:

- strategy version
- signal
- risk decision
- action
- optional simulated position id
- input hash
- receipt hash
- proof reference summary

Receipts intentionally exclude raw TxODDS response bodies.

## API Routes

```txt
GET /api/fixtures
GET /api/odds/[fixtureId]
GET /api/scores/[fixtureId]
GET /api/replay/[fixtureId]
GET /api/receipts/[id]
```

The live routes return normalized summaries and metadata such as active network/fallback source. Replay and receipt routes are deterministic local demo surfaces.

## Security And Secret Handling

Ignored by git:

- `.env*` except `.env.example`
- `.vercel`
- `keys/*.json`
- `.next`
- `node_modules`

TxLINE credentials are server-only. The issuance helper writes `.env.local` and avoids printing JWT/API token values.

## Verification

Primary checks:

```bash
bun run test
bun run lint
bun run build
```

Test coverage includes:

- implied probability calculation
- odds velocity signal detection
- stale feed risk blocking
- simulated PnL math
- TxLINE decimal odds stored on simulated positions
- receipt hash determinism
- TxLINE normalizer tolerance
