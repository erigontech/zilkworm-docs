---
title: Ethproofs prover
description: This page covers only the Ethproofs integration through the service mode
sidebar_position: 4
---


# Ethproofs prover

[Ethproofs](https://ethproofs.org) is a public registry and leaderboard of real-time Ethereum mainnet block proofs. Provers register a *cluster* (a named proving setup with its hardware and cost profile), then report each proof's lifecycle — queued, proving, proved — through the Ethproofs API, along with the proof itself, its cycle count, and proving time. Zilkworm's service mode has this reporting built in: three flags turn a normal proving service into an Ethproofs-posting one, with no change to how blocks are fetched or proved.

This page covers only the Ethproofs integration through the service mode.

## Prerequisites

- A working proving setup, i.e. everything from [Running the prover](running-the-prover.md): an RPC node with the debug namespace, NVIDIA GPU, and a service-mode run that produces proofs locally.
- An Ethproofs account with a **registered cluster**. We need three things for posting proofs to EthProofs
  - the API endpoint (production is `https://ethproofs.org/api/v0`),
  - an API token,
  - a numeric cluster id.

## Service Options

Three top-level flags for `z6m_prover` control reporting:

| Flag | Type | Meaning |
|------|------|---------|
| `--ethproofs-endpoint` | string | Ethproofs API base URL; paths like `/proofs/queued` are appended to it |
| `--ethproofs-token` | string | API token, sent as `Authorization: Bearer <token>` |
| `--ethproofs-cluster-id` | integer | Cluster id to report under on EthProofs page |

Behavior to be aware of:

- **All three or nothing.** Reporting is enabled only when endpoint, token, and cluster id are all set
- **Service mode only.** Posting happens in the `--service` loop. The one-shot `prove` doesn't post to EthProofs.
- **No environment variables.** The service flags for EthProofs are not captured through environment, such as a `.env` file.

## Running with Ethproofs posting

Ethproofs expects clusters to prove blocks with a deterministic frequency with which the "cluster" was registered. `--prove-every 100` proves every block whose number is divisible by 100, which is the usual cadence.

Bare binary (source build, from the repo root):

```bash
export ETHPROOFS_ENDPOINT=https://ethproofs.org/api/v0
export ETHPROOFS_TOKEN=<api-token>
export ETHPROOFS_CLUSTER_ID=<cluster-id>

SP1_PROVER=cuda prover/target/release/z6m_prover --service \
  --rpc-url "$RPC_URL" \
  --data-dir /mnt/data \
  --prove-every 100 \
  --ethproofs-endpoint "$ETHPROOFS_ENDPOINT" \
  --ethproofs-token "$ETHPROOFS_TOKEN" \
  --ethproofs-cluster-id "$ETHPROOFS_CLUSTER_ID"
```

Docker equivalent:

```bash
docker run --rm --gpus all --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/work" \
  -e SP1_PROVER=cuda \
  somnergy/z6m_prover:latest \
  --service \
  --rpc-url "$RPC_URL" \
  --data-dir /work/data \
  --prove-every 100 \
  --ethproofs-endpoint "$ETHPROOFS_ENDPOINT" \
  --ethproofs-token "$ETHPROOFS_TOKEN" \
  --ethproofs-cluster-id "$ETHPROOFS_CLUSTER_ID"
```

Proofs still land in `<data-dir>/<N>/proof<N>.bin`, one line per proof in `<data-dir>/provingLogs.log`, and Ethproofs posting happens alongside.

## The EthProofs posting lifecycle

For each block matching `--prove-every`, the service makes three API calls, mirroring Ethproofs' proof states:

1. **`POST <endpoint>/proofs/queued`** — sent once the block's witness has been fetched, *before* waiting for the prover to become free. Payload: `block_number` and `cluster_id`. On a busy prover a block can therefore sit in "queued" on your cluster page while the previous proof finishes.
2. **`POST <endpoint>/proofs/proving`** — sent once the prover is acquired and proving is about to start. Same payload as `queued`.
3. **`POST <endpoint>/proofs/proved`** — sent after a successful proof. Payload:

| Field | Content |
|-------|---------|
| `proof` | The serialized proof file (`proof<N>.bin`, bincode-encoded), base64-encoded |
| `block_number` | Block number |
| `proving_cycles` | Cycle count reported by the prover |
| `proving_time` | Wall-clock proving time in milliseconds |
| `verifier_id` | The SP1 verifying key's `bytes32` hash, identifying the guest program version |
| `cluster_id` | Your cluster id |

All three calls send `Content-Type: application/json` and `Authorization: Bearer <token>`, with a 30-second HTTP timeout.

**Posting never blocks proving.** Each call is fired on a detached background task; the proving loop moves on immediately. A failed post is dropped — a network error is logged as an error, while an HTTP error response (e.g. a bad token) is only echoed with its status — and there are **no retries and no re-posting**. The proof itself is unaffected: it is still written to disk and logged in `provingLogs.log`, but that block will be missing (or stuck in queued/proving) on your cluster page. Likewise, if proving fails or hits the 30-minute timeout, no `proved` call follows the earlier `queued`/`proving` ones.

Each request and response is also printed to the service's stdout for debugging.
Once posting works, proofs appear on your cluster's page on ethproofs.org, with proving time and cycles alongside other clusters proving the same blocks.

## Where to go next

- [Running the prover](running-the-prover.md) — service mode in depth, proof types, Docker and source builds.
- [Quickstart: Hypercube prover](quickstart-hypercube.md) — the condensed end-to-end path, including a minimal Ethproofs run.
- [CLI reference](cli-reference.md) — every flag and subcommand.
