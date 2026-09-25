---
title: Build your first app with the JS SDK
codex_slug: /sdks/tutorials/first-app-with-sdk-js
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/index.ts
surfaces: [SDK-JS-CitrateClient, SDK-JS-aa]
audited_against_sha: 2f8da46
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A short, end-to-end first project with `@citratelabs/sdk`. You will install the SDK, connect to Citrate Network on
testnet, derive a Citrate Keyring account address, read state off the chain, and assemble one sponsored write
as a UserOperation. It takes about fifteen minutes, and every symbol used is verified against `citrate-sdk-js` at
SHA `2f8da46`.

## What it is

A small Node or TypeScript script that talks to Citrate testnet, chain id `40204`. The reads need no key and
no account. The write uses a Citrate Keyring account, a smart-contract account built on Kernel v3, and routes
through the paymaster so the account does not need a funded balance to send its first operation. Where a step
needs a value that lives in the network's deployment config rather than the SDK, the page says so plainly
instead of inventing one.

## How to use it

You will need Node 16 or newer (the SDK's declared `engines.node`) and npm.

### Step 1, set up the project

```bash
mkdir citrate-first-app && cd citrate-first-app
npm init -y
npm pkg set type=module
npm install @citratelabs/sdk
npm install -D typescript tsx @types/node
```

Keep secrets out of source. The read steps need no key. If you later add a key for direct chain writes, put
it in an environment variable such as `CITRATE_PRIVATE_KEY`, never inline.

### Step 2, connect to testnet

Create `index.ts`:

```typescript
import { CitrateClient, CHAIN_IDS, DEFAULT_RPC_URLS } from '@citratelabs/sdk';

const client = new CitrateClient({
  // DEFAULT_RPC_URLS[40204] resolves to ['https://rpc.citrate.ai'].
  rpcUrl: DEFAULT_RPC_URLS[CHAIN_IDS.TESTNET],
});

console.log('RPC endpoints:', client.getRpcUrls());
```

The constructor validates each RPC URL as it builds, so a typo fails immediately with a `ValidationError`
(`src/client/CitrateClient.ts`).

### Step 3, read chain state

```typescript
const chainId = await client.getChainId();   // -> 40204
console.log('chainId:', chainId);

const addr = '0x0000000000000000000000000000000000000000'; // any address you want to inspect
console.log('balance (wei):', (await client.getBalance(addr)).toString());
console.log('nonce:', await client.getNonce(addr));
```

If `getChainId` returns anything other than `40204`, you are pointed at a different network. These map to
`getChainId`, `getBalance`, and `getNonce` in `src/client/CitrateClient.ts`. To confirm the node directly,
see [the JSON-RPC reference](/chain/rpc).

### Step 4, derive your Citrate Keyring account address

A Citrate Keyring account has the same address on every device, because the address is derived
deterministically from the user's id. You can compute it offline, before the account is ever deployed.

```typescript
import { aa } from '@citratelabs/sdk';

// The 32-byte AA userId is keccak256(utf8(lowercase uuid)).
const userId = aa.uuidToUserId('3f2504e0-4f89-41d3-9a0c-0305e82c3301');

// factory and walletImpl are the deployed AA-stack addresses for chain 40204.
// They live in the network's deployment config (served by auth.citrate.ai),
// not in the SDK. Fetch them from your AA config; the shape is aa.CitrateAaConfig.
const account = aa.predictWalletAddress(factory, walletImpl, userId);
console.log('account address:', account);
```

`uuidToUserId` and `predictWalletAddress` are pure functions in `src/aa/address.ts`. The address is the
CREATE2 address the factory will deploy the Kernel proxy to. Reading state for this address works the same as
any other: `await client.getBalance(account)`.

### Step 5, assemble one sponsored write

A write through a Citrate Keyring account is a UserOperation: encode the call, build the packed op, hash it,
sign it, and submit it to the bundler. The paymaster sponsors the gas, so the account needs no balance for its
first op. The pieces below are all real `aa` exports; the deployment addresses (`factory`, `walletImpl`,
`paymaster`, `entryPoint`, `webauthnValidator`) come from your `aa.CitrateAaConfig`, and the gas figures come
from a bundler estimate.

```typescript
import { aa } from '@citratelabs/sdk';

// 1. Encode the call this account should make (target, value, calldata).
const callData = aa.encodeExecuteSingle({
  to: '0xTargetContract',
  value: 0n,
  data: '0x', // your function calldata
});

// 2. Mark the op for paymaster sponsorship. FirstOp is the one-per-account
//    deploy category; Standard counts against the per-user daily cap.
const paymasterAndData = aa.packCitratePaymasterAndData({
  paymaster,
  paymasterVerificationGasLimit: 80_000n,
  paymasterPostOpGasLimit: 40_000n,
  category: aa.PaymasterCategory.FirstOp,
});

// 3. Build the packed UserOperation. The nonce comes from
//    EntryPoint.getNonce(account, key); gas limits come from a bundler estimate.
const op = aa.buildPackedUserOp({
  sender: account,
  nonce,                 // see aa.composeNonce / EntryPoint.getNonce
  initCode,              // aa.packInitCode(factory, aa.encodeDeployFor(...)) on first op, else '0x'
  callData,
  callGasLimit: 200_000n,
  verificationGasLimit: 300_000n,
  preVerificationGas: 60_000n,
  maxFeePerGas,
  maxPriorityFeePerGas,
  paymasterAndData,
});

// 4. Hash and sign. Pick the signer the account is enrolled with.
const userOpHash = aa.getUserOpHash(op, entryPoint, BigInt(chainId));
op.signature = await aa.signUserOpWithPasskey(userOpHash);   // passkey path
// or: op.signature = await aa.signUserOpWithEoa(signer, userOpHash);

// 5. Submit through the bundler and wait for the receipt.
const bundler = new aa.BundlerClient(); // defaults to https://bundler.citrate.ai/rpc
const hash = await bundler.sendUserOperation(op, entryPoint);
const receipt = await bundler.waitForUserOperationReceipt(hash);
console.log('mined:', receipt.success, receipt.receipt.transactionHash);
```

Two steps depend on values outside the SDK and are described, not hard-coded. The `nonce` comes from
`EntryPoint.getNonce(account, key)` composed with `aa.composeNonce`; build the key with
`aa.validatorNonceKey` for an installed validator or `aa.rootValidatorNonce` for the root. The first op also
needs an `initCode` from `aa.packInitCode(factory, aa.encodeDeployFor(...))`, where `encodeDeployFor` carries
a permit signed by `auth.citrate.ai`. Passkey enrollment and signing are covered under
[passkeys](/aa/passkeys); sponsorship categories and caps under [the paymaster](/aa/paymaster).

### Step 6, run it

```bash
npx tsx index.ts
```

Expect the RPC list, `chainId: 40204`, a balance and nonce for the address you inspected, and your derived
account address. The write step runs once you supply the deployment config and a signer.

## Reference

The symbols this tutorial uses, with their source files in `citrate-sdk-js`.

| Symbol | Source |
|---|---|
| `CitrateClient`, `getRpcUrls`, `getChainId`, `getBalance`, `getNonce` | `src/client/CitrateClient.ts` |
| `CHAIN_IDS`, `DEFAULT_RPC_URLS` | `src/utils/constants.ts` |
| `aa.uuidToUserId`, `aa.predictWalletAddress` | `src/aa/address.ts` |
| `aa.encodeExecuteSingle` | `src/aa/kernel.ts` |
| `aa.buildPackedUserOp`, `aa.getUserOpHash`, `aa.packCitratePaymasterAndData`, `aa.packInitCode`, `aa.encodeDeployFor` | `src/aa/userop.ts` |
| `aa.signUserOpWithPasskey` | `src/aa/webauthn.ts` |
| `aa.signUserOpWithEoa` | `src/aa/eoa.ts` |
| `aa.BundlerClient`, `aa.PaymasterCategory` | `src/aa/bundler.ts`, `src/aa/types.ts` |

## Design rationale

The reads come first because they need nothing: no key, no account, no funds. That lets a reader confirm they
are on Citrate Network before they touch anything that costs. The write is shown as a UserOperation rather
than a raw signed transaction because that is how a Citrate Keyring account moves, and because the paymaster
can cover the first op so a new account is usable immediately. The deployment addresses are deliberately left
as values you fetch, because they are per-network config and pinning a wrong literal in a tutorial is worse
than naming the source.

## Failure modes

- A `chainId` other than `40204` means the client is pointed at a different network. Check `rpcUrl`.
- `predictWalletAddress` throws if the factory or implementation is the zero address, or if the userId is not
  a 32-byte hex string, so a bad config fails before any chain call.
- A bundler rejection arrives as a `BundlerRpcError` carrying the `AAxx` code, for example `AA21` for an
  unfunded prefund or `AA31` for a paymaster deposit too low. Read the code; it names the real cause.
- `signUserOpWithPasskey` throws outside a browser with WebAuthn available. In Node, use the EOA path with
  `signUserOpWithEoa` and an ethers `Signer`.

## Access and canon

Public. The read steps need no key or credentials and write no state. The write step sources its key from a
passkey or an environment-held signer, never inline, and the hostnames named (`rpc.citrate.ai`,
`bundler.citrate.ai`, `auth.citrate.ai`) are public production defaults shipped in the SDK.

## Source and verification

- Source repo: `citrate-sdk-js`, package `@citratelabs/sdk@0.2.0` (`@citratelabs/citrate-js` retained as a deprecated alias).
- Audited against SHA: `2f8da46`.
- Symbols verified in `src/client/CitrateClient.ts`, `src/utils/constants.ts`, and `src/aa/{address, kernel,
  userop, webauthn, eoa, bundler, types}.ts`.
- Status: Implemented (pre-audit). The client reads run against testnet 40204; the `aa` write path is
  Implemented but in development (EW-S1 WP-7) and depends on live bundler and auth infrastructure.
