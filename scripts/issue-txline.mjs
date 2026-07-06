import * as anchor from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import nacl from "tweetnacl";

const NETWORKS = {
  devnet: {
    network: "devnet",
    rpcUrl: process.env.TXLINE_DEVNET_RPC_URL ?? "https://api.devnet.solana.com",
    apiOrigin: "https://txline-dev.txodds.com",
    programId: new PublicKey("6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J"),
    txlTokenMint: new PublicKey("4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG"),
    defaultServiceLevelId: 1,
    idlPath: resolve(process.cwd(), "lib/txline/idl/txoracle-devnet.json"),
    minSolForSubscribe: 0.05,
  },
  mainnet: {
    network: "mainnet",
    rpcUrl: process.env.TXLINE_MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com",
    apiOrigin: "https://txline.txodds.com",
    programId: new PublicKey("9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA"),
    txlTokenMint: new PublicKey("Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL"),
    defaultServiceLevelId: 12,
    idlPath: resolve(process.cwd(), "lib/txline/idl/txoracle-mainnet.json"),
    minSolForSubscribe: 0.01,
  },
};

const requestedNetwork = process.env.TXLINE_ISSUE_NETWORK ?? "devnet";
if (requestedNetwork !== "devnet" && requestedNetwork !== "mainnet") {
  throw new Error(`Unsupported TXLINE_ISSUE_NETWORK="${requestedNetwork}"`);
}

const networkConfig = NETWORKS[requestedNetwork];
const CONFIG = {
  ...networkConfig,
  serviceLevelId: Number(process.env.TXLINE_SERVICE_LEVEL_ID ?? networkConfig.defaultServiceLevelId),
  durationWeeks: Number(process.env.TXLINE_DURATION_WEEKS ?? 4),
  selectedLeagues: [],
  keypairPath: resolve(process.cwd(), "keys/edgekeeper-txline-devnet.json"),
  envPath: resolve(process.cwd(), ".env.local"),
};

const LAMPORTS_PER_SOL = 1_000_000_000;

function loadJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function loadKeypair() {
  if (!existsSync(CONFIG.keypairPath)) {
    throw new Error(`Missing keypair: ${CONFIG.keypairPath}`);
  }
  return Keypair.fromSecretKey(Uint8Array.from(loadJson(CONFIG.keypairPath)));
}

function upsertEnv(path, updates) {
  const existing = existsSync(path) ? readFileSync(path, "utf8").split(/\r?\n/) : [];
  const seen = new Set();
  const next = existing
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const separator = line.indexOf("=");
      if (separator === -1) return line;
      const key = line.slice(0, separator);
      if (!(key in updates)) return line;
      seen.add(key);
      return `${key}=${updates[key]}`;
    });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }

  writeFileSync(path, `${next.join("\n")}\n`, { mode: 0o600 });
}

async function getGuestJwt() {
  const response = await fetch(`${CONFIG.apiOrigin}/auth/guest/start`, { method: "POST" });
  if (!response.ok) {
    throw new Error(`/auth/guest/start failed: ${response.status} ${await response.text()}`);
  }
  const body = await response.json();
  if (!body?.token) throw new Error("TxLINE guest auth returned no token");
  return body.token;
}

async function subscribe(wallet) {
  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  const idl = { ...loadJson(CONFIG.idlPath), address: CONFIG.programId.toBase58() };
  const program = new anchor.Program(idl, provider);
  if (!program.programId.equals(CONFIG.programId)) {
    throw new Error(
      `Loaded TxLINE program ${program.programId.toBase58()} does not match ${CONFIG.network}`,
    );
  }

  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("token_treasury_v2")],
    program.programId,
  );
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    CONFIG.txlTokenMint,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pricing_matrix")],
    program.programId,
  );
  const userTokenAccount = (
    await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      CONFIG.txlTokenMint,
      wallet.publicKey,
      false,
      "confirmed",
      undefined,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  ).address;

  return program.methods
    .subscribe(CONFIG.serviceLevelId, CONFIG.durationWeeks)
    .accounts({
      user: wallet.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: CONFIG.txlTokenMint,
      userTokenAccount,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

async function activateToken(wallet, txSig, jwt) {
  const messageString = `${txSig}:${CONFIG.selectedLeagues.join(",")}:${jwt}`;
  const signatureBytes = nacl.sign.detached(new TextEncoder().encode(messageString), wallet.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString("base64");

  const response = await fetch(`${CONFIG.apiOrigin}/api/token/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      txSig,
      walletSignature,
      leagues: CONFIG.selectedLeagues,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`/api/token/activate failed: ${response.status} ${text}`);
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed?.token) return parsed.token;
  } catch {
    // The documented response may be a plain text token.
  }

  const token = text.trim();
  if (!token) throw new Error("Activation returned an empty API token");
  return token;
}

async function verifyApi(jwt, apiToken) {
  const startEpochDay = Math.floor(Date.now() / 86_400_000);
  const response = await fetch(
    `${CONFIG.apiOrigin}/api/fixtures/snapshot?startEpochDay=${startEpochDay}&competitionId=72`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        "X-Api-Token": apiToken,
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Fixture verification failed: ${response.status} ${await response.text()}`);
  }
  const fixtures = await response.json();
  return Array.isArray(fixtures) ? fixtures.length : 0;
}

async function main() {
  const wallet = loadKeypair();
  const connection = new Connection(CONFIG.rpcUrl, "confirmed");
  const balanceLamports = await connection.getBalance(wallet.publicKey, "confirmed");
  const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

  console.log(`wallet=${wallet.publicKey.toBase58()}`);
  console.log(`network=${CONFIG.network}`);
  console.log(`balanceSol=${balanceSol.toFixed(6)}`);

  if (balanceSol < CONFIG.minSolForSubscribe) {
    console.log(`status=waiting_for_${CONFIG.network}_sol`);
    console.log(`sendSolTo=${wallet.publicKey.toBase58()}`);
    console.log(`minimumSol=${CONFIG.minSolForSubscribe}`);
    process.exit(2);
  }

  const jwt = await getGuestJwt();
  const txSig = await subscribe(wallet);
  const apiToken = await activateToken(wallet, txSig, jwt);
  const fixtureCount = await verifyApi(jwt, apiToken);

  upsertEnv(CONFIG.envPath, {
    TXLINE_API_ORIGIN: CONFIG.apiOrigin,
    TXLINE_NETWORK: CONFIG.network,
    TXLINE_JWT: jwt,
    TXLINE_API_TOKEN: apiToken,
    NEXT_PUBLIC_DEFAULT_MODE: "replay",
  });

  console.log("status=activated");
  console.log(`subscribeTx=${txSig}`);
  console.log(`fixtureVerificationCount=${fixtureCount}`);
  console.log("envUpdated=.env.local");
  console.log("secretsPrinted=false");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
