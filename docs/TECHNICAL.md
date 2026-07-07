# EdgeKeeper Technical Notes

## Product Scope

EdgeKeeper is a proof-aware cockpit for trading-agent decisions over World Cup football data. It is designed to show how an agent can ingest verified data, derive signals, evaluate risk, simulate position state, and emit replayable receipts.

It is not a real-money betting tool. There is no wallet connection, no venue adapter, no CLOB order submission, no custody, and no user-funded order path.

The user-facing product loop is deliberately narrow:

```txt
TxLINE market state -> agent decision -> risk engine -> simulated position -> receipt
```

This loop keeps the scope limited to operator-facing strategy state, deterministic guardrail outcomes, simulated position marks, and audit receipts.

## Submission Track Fit

EdgeKeeper targets the Superteam / TxODDS World Cup Hackathon **Trading Tools and Agents** listing:

```txt
https://superteam.fun/earn/listing/trading-tools-and-agents/
```

The project belongs in this track because it builds operator tooling around trading-agent decisions:

- normalized live football data ingestion
- signal detection over odds and score movement
- explicit agent decision state
- deterministic risk checks
- simulated position marking from TxLINE odds/probabilities
- auditable decision receipts

It is not a `Prediction Markets and Settlement` project because it has no market creation, outcome resolution, payout, or settlement layer. The primary surface is a trading terminal for builders and agent developers.

### Official Judging Criteria Coverage

| Criterion | Implementation evidence |
| --- | --- |
| Core Functionality & Data Ingestion | `app/api/fixtures?scope=analysis|completed|upcoming`, `app/api/odds/[fixtureId]`, and `app/api/scores/[fixtureId]` fetch TxLINE snapshots server-side and return normalized summaries. `app/api/live-agent/[fixtureId]` consumes odds/scores snapshots and executes a defined strategy tick. |
| Autonomous Operation | `components/cockpit/LiveSnapshotPanel.tsx` runs the live agent tick automatically every 60 seconds for the selected fixture, with a manual tick button for demo timing. |
| Logic & Code Architecture | `lib/agent/signals.ts`, `risk.ts`, `execution.ts`, `receipt.ts`, `state.ts`, and `live-agent.ts` keep deterministic strategy logic isolated and testable. |
| Innovation & Novelty | Decision receipts combine signal input hashes, risk decisions, actions, and proof references so agent behavior is replayable and auditable. |
| Production Readiness | Vercel production uses server-only TxLINE mainnet credentials with devnet fallback; public routes do not substitute synthetic fixture data; tests, lint, and build pass under Bun. |

### Submission Artifacts

- Live app: `https://edgekeeper-kohl.vercel.app`
- Public repo: `https://github.com/kooroot/Edgekeeper`
- Demo path: `/cockpit` -> choose `Analysis Set`, `Completed`, or `Upcoming` -> select a fixture -> inspect market state -> run or wait for the agent tick -> inspect signal, risk decision, simulated action state, and receipt hash.
- Technical docs: this document.
- TxLINE feedback: see `README.md`.

## Execution Boundary

EdgeKeeper does not include a money path. Its actions are internal simulation events over normalized TxLINE-derived state.

Excluded surfaces:

- wallet/session flow
- billing or deposits
- venue adapters
- CLOB order construction
- order posting
- execution queues
- reconciliation against a real venue
- settlement redemption

## Data Flow

### Live Snapshot And Agent Tick

```txt
browser
  -> app/api/fixtures?scope=analysis|completed|upcoming
  -> app/api/odds/[fixtureId]
  -> app/api/scores/[fixtureId][?history=1]
  -> app/api/live-agent/[fixtureId][?history=1]
  -> lib/txline/client.ts
  -> TxLINE API with server-only credentials
  -> tolerant normalizers
  -> signal/risk/simulated execution/receipt
  -> derived cockpit summaries
```

The live UI never receives TxLINE JWTs, API tokens, or raw downloadable feed dumps. If credentials are unavailable, the public routes return an explicit credentials error rather than a synthetic fixture fallback.

Fixture scopes:

- `analysis`: starts the TxLINE fixture snapshot 45 days back so previous matches and upcoming matches can be used as one analysis universe.
- `completed`: filters that universe to fixtures older than the live monitoring window or explicitly final.
- `upcoming`: keeps the near-future monitoring set.

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
| `getFixturesSnapshot()` | `GET /api/fixtures/snapshot` | `GET /api/fixtures?scope=analysis|completed|upcoming` |
| `getOddsSnapshot(fixtureId)` | `GET /api/odds/snapshot/{fixtureId}` | `GET /api/odds/[fixtureId]` |
| `getScoresSnapshot(fixtureId)` | `GET /api/scores/snapshot/{fixtureId}` | `GET /api/scores/[fixtureId]` |
| `getHistoricalScores(fixtureId)` | `GET /api/scores/historical/{fixtureId}` | available server-side for backfill |
| `getOddsSnapshot()` + `getScoresSnapshot()` | snapshot composition | `POST /api/live-agent/[fixtureId]` live strategy tick |
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
- `LIVE_MARKET_SCAN`: live-mode NOOP scan receipt when no sharper signal fires on a 60-second tick.

Signals contain deterministic ids, confidence, suggested action, and an input hash.

## Live Agent Tick

`POST /api/live-agent/[fixtureId]` is the deployed live-input strategy path. The route:

1. Uses server-only TxLINE credentials.
2. Fetches live odds and scores snapshots for the selected fixture.
3. Normalizes the snapshots through tolerant TxLINE normalizers.
4. Runs signal detection and a deterministic live NOOP scan fallback when no sharper signal fires.
5. Runs the risk engine in `live` mode, including stale-feed and suspended-market blocks.
6. Applies simulated execution state in memory.
7. Emits compact decision receipts with `proofReference.source = "txline"`.

The browser receives derived agent state only: signal, risk decision, simulated position summary, receipt, counts, timestamps, and network metadata. It does not receive TxLINE credentials or full raw feed dumps.

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
POST /api/live-agent/[fixtureId]
GET /api/receipts/[id]
```

The live routes return normalized summaries and metadata such as active network/fallback source. `POST /api/live-agent/[fixtureId]` returns derived agent state and a compact receipt; full raw TxODDS responses are not exposed for download.

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
