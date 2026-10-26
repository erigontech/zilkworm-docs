---
title: CLI reference
description: "Look up the flags, subcommands, environment variables and exit codes of the three Zilkworm tools."
sidebar_position: 1
---

# CLI reference

Use this page to look up a flag, subcommand, environment variable or exit code for any of Zilkworm's three command-line tools. Everything here matches `v0.1.0-alpha.7`.

`z6m_prover` drives the SP1 Hypercube guest and `z6m_prover_airbender` drives the Airbender guest. The third tool, `state_transition`, runs a block natively, outside any zkVM.

## z6m_prover (Hypercube)

The release ships this binary as `z6m_prover_hypercube`, and `make z6m_prover` builds it at `prover/target/release/z6m_prover`. You can run it in three forms:

```bash
z6m_prover --service [flags]         # fetch, execute and prove in a loop
z6m_prover --test-service [flags]    # execute downloaded blocks or EEST fixtures offline
z6m_prover <subcommand> [flags]      # fetch, execute, prove, setup or verify once
```

Given no mode and no subcommand, it exits with an error. At startup it loads a `.env` file from the working directory.

### Top-level flags

| Flag | Default | Effect |
|---|---|---|
| `--service` | off | Run the service loop. Needs `--rpc-url`. |
| `--test-service` | off | Execute on the CPU, with no RPC and no proving. With `--test-dir` it runs EEST fixtures. Otherwise it runs bundles from `--data-dir` between `--start-block` and `--end-block`. Conflicts with `--service` and with any subcommand. |
| `--rpc-url` | none | JSON-RPC endpoint. It must serve `debug_getRawBlock` and `debug_executionWitness`. |
| `--data-dir` | `temp` | Root data directory. Blocks go to `<data-dir>/blocks/<N>/`, logs to the root. |
| `--save-all-responses` | off | Also save the raw RPC JSON next to each bundle. In service mode it also fetches blocks that match no interval. |
| `--download-only` | off | Service mode: fetch bundles only. It overrides `--prove-every` and `--execute-every`. |
| `--prove-every` | unset | Service mode: prove blocks whose number is a multiple of N. 0 or unset means never. |
| `--execute-every` | unset | Execute blocks whose number is a multiple of N, unless they are proved. `--test-service` without `--test-dir` defaults it to 1 and rejects 0. |
| `--post-every` | unset | Unused. |
| `--start-block` | chain head + 1 | First block. `--test-service` needs it unless `--test-dir` is set. |
| `--end-block` | follow the head | Last block, inclusive. The service exits after it. |
| `--execution-log-file` | `executionLogs.log` in the data or test directory | Read by `--test-service` only. The service and `execute` always append to `<data-dir>/executionLogs.log`. |
| `--test-dir` | none | EEST fixtures for `--test-service`, scanned recursively for `.mfbd` and `.json` files. |
| `--max-file-size` | `20971520` | `--test-service --test-dir` skips larger files. 0 means no limit. |
| `--pk-path` | `pk.bin` | Unused. The proving key is generated in-process. |
| `--proof-type` | `compressed` | Service-mode proof mode: `core`, `compressed`, `groth16` or `plonk`. Unknown values fall back to `compressed`. |
| `--ethproofs-endpoint`, `--ethproofs-token`, `--ethproofs-cluster-id` | none | Ethproofs reporting in `--service`. Set all three, or reporting stays off without a warning. |

### Subcommands

| Subcommand | Options | Effect |
|---|---|---|
| `fetch` | `--rpc-url`, `--block-number`, `--data-dir`, `--save-all-responses`, `--geth` | Fetch one block and its witness and write `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`. An unset or 0 block number means the chain head. A bundle already on disk is reused. |
| `execute` | `--block-number`, `--file-name`, `--is-test`, `--data-dir` | Run the guest on the CPU executor without proving. |
| `prove` | as `execute`, plus `--pk-path`, `--proof-path`, `--proof-type` | Prove one block. The three extra options are unused. See the limits below. |
| `setup` | `--pk-path`, `--vk-path` | No-op. Nothing is written. |
| `verify` | `--proof-path`, `--vk-path` | No-op. No verification runs. |

By default, `execute` and `prove` read `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`. With `--is-test` they read `ethTests<N>.json` as an EEST fixture instead, and `--file-name` overrides the block-number lookup.

When `execute` finishes, it prints `Executed block <N> (gas_used=..., cycles=..., prover_gas=..., syscall_count=...)` and appends a line to `<data-dir>/executionLogs.log`. It exits 1 when `gas_used` is 0.

`--geth` exists only on `fetch`; the service always reads the reth and alloy witness shape.

Before you reach for `prove`, know its limits as of `v0.1.0-alpha.7`:

- It always uses the CUDA prover in compressed mode, and ignores `SP1_PROVER` and `--proof-type`.
- It discards the proof. Nothing is written to disk, and the summary line prints `gas_used=0` and an empty path.
- A key setup failure prints `ERROR` but still exits 0, and a proving failure is not reported at all.
- It never posts to Ethproofs.

If you need proof files, use `--service`.

### Environment variables

- `SP1_PROVER` selects the service-mode backend. Only `cuda` is special-cased, as the local GPU prover; any other value, or none, gives you the CPU prover. `execute` always uses the CPU, and `prove` always uses CUDA.
- `NETWORK_PRIVATE_KEY` appears in `.env.example` for the Succinct Prover Network, but nothing reads it, because `network` and `mock` modes are not wired up.
- `RUST_LOG` sets the log filter, which defaults to `warn`.

For Ethproofs, pass the flags. This binary reads no `ETHPROOFS_*` variables.

## z6m_prover_airbender

`make z6m_prover_airbender` builds this one at `prover/prover_airbender/target/release/z6m_prover_airbender`, and the image `ghcr.io/erigontech/zilkworm-airbender` ships it together with the guest. Like the Hypercube host, it runs as `--service`, as `--test-service`, or with one subcommand.

### Top-level flags

| Flag | Default | Effect |
|---|---|---|
| `--service` | off | Run the proving service. Needs `--rpc-url`. Conflicts with subcommands. |
| `--test-service` | off | Execute downloaded blocks from `--start-block` to `--end-block` on the simulator. Needs both. Conflicts with subcommands. |
| `--data-dir` | `temp` | Root directory with a `blocks/` subdirectory. |
| `--start-block`, `--end-block` | unset | Block range. |
| `--execution-log-file` | `<data-dir>/executionLogs.log` | Read by `--test-service` only. |
| `--guest-bin` | `prover/guest_airbender/build/z6m_guest` | Guest path without the `.bin` or `.text` extension. The default needs the repo root as working directory. |
| `--cycles` | `5000000000` | Simulator cycle bound. Proving clamps it to `1073741822`. |
| `--replay-threads` | unset, 8 on the GPU backend | CPU threads that replay the trace while proving. Env `Z6M_REPLAY_THREADS`. Also accepted after a subcommand. |
| `--rpc-url` | none | JSON-RPC endpoint. Required for `--service`. |
| `--ws-url` | none | WebSocket endpoint for `newHeads`. Without it the service polls `--rpc-url`. |
| `--gpu` | off | Prove on the GPU in service mode. Required with `--prove-every`. |
| `--prove-every` | unset | Service mode: prove blocks whose number is a multiple of N. |
| `--execute-every` | unset | Service mode: execute without proving every N-th block. |
| `--post-every` | unset | Accepted and never read. |
| `--output-dir` | `proofs` | Service proofs go to `<output-dir>/<N>/proof.bin`. |
| `--save-all-responses` | off | Save the raw RPC responses. |
| `--fetch-timeout` | `60` | Seconds one fetch attempt may take. Minimum 1. |
| `--max-lag` | `10` | Blocks the service may fall behind the tip before it skips ahead. 0 never skips. |
| `--ethproofs-endpoint`, `--ethproofs-token`, `--ethproofs-cluster-id` | none | Ethproofs reporting. Env `ETHPROOFS_ENDPOINT`, `ETHPROOFS_TOKEN`, `ETHPROOFS_CLUSTER_ID`. Set all three or nothing is posted. |

### Subcommands

| Subcommand | Options | Effect |
|---|---|---|
| `execute` | `--block-number`, `--file-name`, `--data-dir`, `--is-test`, `--flamegraph <svg>` | Run the guest on the simulator. Check the committed block hash against the input. Fail if the guest does not finish successfully. |
| `vk` | `--output`, default `vk.bin` | Compute the guest's EVKEY001 v2 verification key from the guest and the `FSV_DIR` programs. |
| `prove` | `--block-number`, `--file-name`, `--data-dir`, `--is-test`, `--backend gpu` or `cpu`, `--output-dir` | Run a simulator preflight, prove to the final recursion layer, check the output and write `<output-dir>/proof.bin`. Defaults: `gpu`, `proofs`. |
| `bench` | `--file-name` (required), `--iterations` (default 5), `--backend` | Prove one MFBD file repeatedly with one prover. Print each time and the min, median and max. |
| `verify` | `--proof`, `--vk`, and `--file-name` or `--block-hash` | Verify the proof against the key. Check that its output is the hash of the input's last valid block, or the given hash. |

Without `--file-name`, input comes from `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`, and if that file is missing the prover tries the legacy `unifiedBlockAndStateRlp<N>.bin`. With `--is-test` the input is an EEST JSON fixture. Proof files are gzip EPROOF01 v2. The `cpu` backend is slow, and [Airbender prover](../provers/airbender-prover.md) gives its memory need.

Both `execute` and `--test-service` append to the execution log, and `execute` warns you when a run has more cycles than the prover takes.

### Environment variables

| Variable | Effect |
|---|---|
| `Z6M_REPLAY_THREADS` | Same as `--replay-threads`. |
| `FSV_DIR` | Directory of the `fsv_*` recursion verifier programs. Unset, the prover uses `tools/gkr_verifier` of the zksync-airbender checkout it was built from. The image sets it. |
| `RISCV_MERGE_WINDOW` | Leave unset. The binary sets it to 0, and any other value is an error. The prover's JIT would otherwise fuse word stores the guest jumps into, and prove a wrong run. |
| `Z6M_CONCURRENT_PREFLIGHT` | When set, the service simulates each block alongside proving instead of first. A block the guest rejects then stops the service. |
| `RECURSION_UNROLLED_BLAKE`, `RECURSION_BRIDGE_BLAKE`, `RECURSION_FINAL_BLAKE`, `RECURSION_UNIFIED_BLAKE` | Leave unset. Other values make proofs no published key accepts, so `prove` and `bench` refuse to start. |
| `ETHPROOFS_ENDPOINT`, `ETHPROOFS_TOKEN`, `ETHPROOFS_CLUSTER_ID` | Same as the Ethproofs flags. |
| `RUST_LOG` | Log filter. Defaults to `info`. |

### Docker entrypoint

The image's entrypoint runs the prover with any arguments you pass, plus `--guest-bin`. If you pass none, it runs the service from the environment variables below. It first computes the verification key into `$DATA_DIR/vk-<rev>-<id>/vk.bin`, then runs `--service --gpu` and restarts the service whenever it exits. Proofs go to `$DATA_DIR/proofs/<N>/proof.bin`.

| Variable | Default | Effect |
|---|---|---|
| `RPC_URL` | required | JSON-RPC endpoint that serves `debug_executionWitness`. |
| `WS_URL` | none | WebSocket endpoint for `newHeads`. Without it the service polls. |
| `PROVE_EVERY` | `100` | Prove blocks whose number is a multiple of this. |
| `EXECUTE_EVERY` | none | Execute without proving every N-th block. |
| `START_BLOCK` | chain tip | First block. A restart drops it and starts at the tip. |
| `FETCH_TIMEOUT` | `60` | Seconds one fetch attempt may take. |
| `MAX_LAG` | `10` | Blocks behind the tip before the service skips ahead. 0 never skips. |
| `DATA_DIR` | `/data` | Key, blocks, logs and proofs. Mount a volume here. |
| `ETHPROOFS_ENDPOINT`, `ETHPROOFS_TOKEN`, `ETHPROOFS_CLUSTER_ID` | none | Post to Ethproofs. With any one unset the run is a dry run. |
| `RESTART_DELAY` | `30` | Seconds to wait before a restart. |
| `PROVER_EXTRA_ARGS` | none | More prover options, split on spaces. |

## state_transition

`state_transition` runs the whole state transition natively. You get it from a release as `state_transition_linux_x86_64`, or from a local build at `build/zilk_core/dev/cli/state_transition`.

```bash
state_transition <flatWitnessBundle.mfbd>|<test.json>|<test_dir>
```

The tool picks its mode from the path. A path ending in `.json` runs as an EEST blockchain test, any other file runs as an MFBD bundle, and a directory is scanned recursively. For a bundle it prints `Cumulative Gas Used: <n>`, `FAIL: <path>` or `SKIP: <path>`.

| Exit code | Meaning |
|---|---|
| 0 | Passed. For a directory: at least one file passed and none failed. |
| 1 | Failed, or no argument given. For a directory: any file failed. |
| 2 | Skipped. For a directory: nothing passed. |
| 3 | The bundle could not be read, or an exception was thrown. |
| 4 | An unknown exception. |

Watch out for directory mode. It only picks up `.json` and `.bin` files, so a directory of `.mfbd` files runs nothing and exits 2; pass bundles one at a time instead.

## Further reading

- [Hypercube prover](../provers/hypercube-prover.md)
- [Airbender prover](../provers/airbender-prover.md)
- [Ethproofs posting](../provers/ethproofs-posting.md)
- [`prover/prover_airbender/README.md`](https://github.com/erigontech/zilkworm/blob/main/prover/prover_airbender/README.md)
- [`docs/airbender-docker-service.md`](https://github.com/erigontech/zilkworm/blob/main/docs/airbender-docker-service.md)
