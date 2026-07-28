---
title: CLI reference
description: CLI Reference
sidebar_position: 5
---


# CLI reference

Complete reference for the `z6m_prover` binary — every flag, subcommand, default, and known quirk. The binary ships in the `somnergy/z6m_prover` docker image, or builds from source with `make z6m_prover` (landing at `prover/target/release/z6m_prover`); see [Running the prover](running-the-prover.md) for setup and workflows. This page is the dry list.

There are three invocation forms:

```bash
z6m_prover --service [flags]         # continuous fetch/execute/prove loop
z6m_prover --test-service [flags]    # offline execution of downloaded blocks or EEST fixtures
z6m_prover <subcommand> [flags]      # one-shot: fetch | execute | prove | setup | verify
```

Running with no mode and no subcommand exits with an error. A `.env` file in the working directory is loaded automatically at startup, so environment variables such as `SP1_PROVER` can live there (see [Environment variables](#environment-variables)).

## Top-level flags

These flags precede any subcommand. Most only have an effect in `--service` or `--test-service` mode; the mode column says which.

### Mode selection

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--service` | bool | off | Run the continuous prover service. Requires `--rpc-url`. Processes blocks from `--start-block` (default: chain head + 1) onward, fetching block + witness and proving/executing per the interval flags. |
| `--test-service` | bool | off | Offline test mode; conflicts with `--service` and cannot be combined with a subcommand. With `--test-dir`, executes EEST fixtures from that directory; otherwise requires `--start-block` and `--end-block` and executes already-downloaded bundles from `--data-dir`. No RPC access, no proving, CPU execution only. |

### Block range and intervals (service modes)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--start-block` | integer | chain head + 1 | First block to process. Required by `--test-service` unless `--test-dir` is given. |
| `--end-block` | integer | follow chain head | Last block to process, **inclusive**; the service exits after it (after draining in-flight work). Without it the service polls the RPC head and runs until stopped. |
| `--prove-every` | integer | unset | Prove blocks whose number is divisible by N. 0 or unset means never. Service mode only. |
| `--execute-every` | integer | unset | Execute (without proving) blocks whose number is divisible by N. 0 or unset means never; skipped for blocks that also match `--prove-every`. In `--test-service` without `--test-dir` it defaults to 1 (every block) and 0 is rejected. |
| `--download-only` | bool | off | Service mode: fetch block + witness bundles only, skipping proving and executing. Takes precedence over `--prove-every` and `--execute-every`. |
| `--save-all-responses` | bool | off | Also save the raw RPC JSON (`block<N>.json`, `blockRlp<N>.json`, `executionWitness<N>.json`) next to each block's flat bundle. In service mode this additionally fetches blocks that match no prove/execute interval (which are otherwise skipped entirely, not even fetched). |

### Inputs and outputs

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--rpc-url` | string | — | Ethereum JSON-RPC endpoint; must expose `debug_getRawBlock` and `debug_executionWitness`. Required by `--service`; also serves as the fallback for the `fetch` subcommand's own `--rpc-url`. |
| `--data-dir` | path | `temp` | Root data directory (e.g. `/mnt/data`, not `/mnt/data/blocks`). Block artifacts go to `<data-dir>/blocks/<N>/`; execution and proving logs are appended at the root. |
| `--proof-type` | string | `compressed` | Proof mode for **service-mode** proving: `core`, `compressed`, `groth16` or `plonk`. Unknown values silently fall back to `compressed`. The `prove` subcommand accepts but ignores it (see below). |
| `--test-dir` | path | — | Directory of EEST fixtures for `--test-service`, scanned recursively for `.mfbd`/`.json` files. |
| `--max-file-size` | integer | `20971520` | Skip EEST test files larger than this many bytes (20 MiB); 0 means no limit. Used only by `--test-service --test-dir`. |
| `--execution-log-file` | path | `executionLogs.log` in `--data-dir` or `--test-dir` | Execution log path. Only honored by `--test-service`; the live service and the `execute` subcommand always append to `<data-dir>/executionLogs.log`. |

### Ethproofs reporting (service mode)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--ethproofs-endpoint` | string | — | Ethproofs API base URL. |
| `--ethproofs-token` | string | — | Ethproofs API token. |
| `--ethproofs-cluster-id` | integer | — | Cluster id to report under. |

All three must be set together — a partial set is **silently ignored** (no warning, reporting stays off). Posting happens only in the `--service` loop; the `prove` subcommand builds the same configuration but never posts. See [Ethproofs prover](ethproofs-prover.md) for the posting lifecycle.

### Inert flags

Accepted, parsed, and currently doing nothing:

| Flag | Type | Default | Status |
|------|------|---------|--------|
| `--post-every` | integer | unset | Reserved posting interval; computed in the service loop but never acted on. |
| `--pk-path` | path | `pk.bin` | Proving key path; unused — the proving key is generated in-process at startup. |

## Subcommands

### fetch

Fetch a block and its witness over RPC and write the flat bundle to `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`.

```bash
z6m_prover fetch --rpc-url <url> [--block-number <N>] [--data-dir <dir>] [--save-all-responses] [--geth]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--rpc-url` | string | top-level `--rpc-url` | RPC endpoint URL. Required (here or top-level). |
| `--block-number` | integer | latest | Block to fetch; unset or 0 means the latest chain head. |
| `--data-dir` | path | top-level `--data-dir` | Output root directory. |
| `--save-all-responses` | bool | off | Also save the raw RPC JSON next to the bundle (ORed with the top-level flag). |
| `--geth` | bool | off | Use geth's `debug_executionWitness` format instead of reth/alloy. |

On success prints `Fetched block <N> into <dir>`. Notes:

- `fetch` reuses a cached bundle if one already exists on disk; service mode force-rebuilds on every block.
- `--geth` exists **only here**. Service mode always fetches in reth/alloy format — there is no way to run the service against a geth node's witness format.

### execute

Execute the guest program for one block in the zkVM without proving. Always runs on the CPU executor, regardless of `SP1_PROVER`.

```bash
z6m_prover execute --block-number <N> [--data-dir <dir>] [--file-name <path>] [--is-test]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--block-number` | integer | 0 | Block to execute; input read from `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd` (or `ethTests<N>.json` with `--is-test`). Required (> 0) unless `--file-name` is set. |
| `--file-name` | path | — | Explicit input file path, overriding block-number resolution. |
| `--is-test` | bool | off | Treat the input as an ethereum/tests JSON fixture instead of an `.mfbd` bundle. |
| `--data-dir` | path | top-level `--data-dir` | Root data directory. |

Success prints `Executed block <N> (gas_used=..., cycles=..., prover_gas=..., syscall_count=...)` and appends a line to `<data-dir>/executionLogs.log`. Failure (`gas_used=0`) prints `FAILED block ...` and exits with status 1.

### prove

Generate a proof for one block.

```bash
z6m_prover prove --block-number <N> [--data-dir <dir>] [--file-name <path>] [--is-test]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--block-number` | integer | 0 | Block to prove; same input resolution as `execute`. Required (> 0) unless `--file-name` is set. |
| `--file-name` | path | — | Explicit input file path. |
| `--is-test` | bool | off | Treat the input as an ethereum/tests JSON fixture. |
| `--data-dir` | path | top-level `--data-dir` | Root data directory. |
| `--pk-path` | path | `pk.bin` | **Inert.** The key is generated in-process. |
| `--proof-path` | path | — | **Inert.** See below. |
| `--proof-type` | string | `compressed` | **Inert here.** Honored only by service-mode proving. |

Known quirks of the current implementation — verify against your build if these matter to you:

- The proof is generated in **compressed** mode via the **CUDA** prover, unconditionally. `--proof-type` and `SP1_PROVER` are both ignored by this subcommand. A key-setup failure (e.g. no CUDA proving server) prints an error but still exits 0, and a proving failure is discarded silently — the exit status does not reflect whether proving succeeded.
- The proof stays **in memory and is never written to disk**. `--proof-path` is accepted but unused, and the closing summary line reports placeholder values (`gas_used=0`, empty proof path). Use service mode for persisted proofs.
- Ethproofs flags are accepted and validated on this path, but no posting ever happens outside `--service`.

### setup

```bash
z6m_prover setup [--pk-path pk.bin] [--vk-path vk.bin]
```

Currently a **no-op**: the handler body is commented out and nothing is written. Keys are generated in-process whenever proving starts.

### verify

```bash
z6m_prover verify [--proof-path proof.bin] [--vk-path vk.bin]
```

Currently a **no-op**: the handler body is commented out and no verification runs.

## Environment variables

`dotenv` runs at startup, so all of these can be placed in a `.env` file in the working directory (see `.env.example` in the repo root).

| Variable | Effect |
|----------|--------|
| `SP1_PROVER` | Selects the proving backend for **service-mode** proving. Only the value `cuda` is special-cased (builds the local GPU prover via `sp1-gpu-server`); **any** other value — `mock`, `cpu`, `network`, or unset — yields the in-process CPU prover. The `mock` and `network` modes listed in `.env.example` are not currently wired up (the SDK's `from_env` client is disabled in code). Ignored by `execute` (always CPU) and by the one-shot `prove` (always CUDA). |
| `NETWORK_PRIVATE_KEY` | Listed in `.env.example` for the Succinct Prover Network; inert while `network` mode is not wired up. |
| `RUST_LOG` | Standard tracing filter for log verbosity; defaults to `warn` when unset. |

The Ethproofs settings are flags only — there are no `ETHPROOFS_*` environment variables read by the binary.

## Where to go next

- [Quickstart: Hypercube prover](quickstart-hypercube.md) — the fast path to a first proof.
- [Running the prover](running-the-prover.md) — service mode in depth, Docker and source builds, `SP1_PROVER` modes.
- [Ethproofs prover](ethproofs-prover.md) — cluster registration and the posting lifecycle.
