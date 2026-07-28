---
title: Running The Prover Service
description: This page describes how to use these features through various commands and subcommands.
sidebar_position: 3
---

# Running The Prover Service

Alongside the guest program, Zilkworm ships with a `z6m_prover` binary that encapsulates the underlying zkVM and other interface services required to drive block proving. The functionalities provided by the binary include: fetching block and witness from RPC, converting witness JSON to MFBD format for the guest, raw execution inside of the zkVM, end-to-end proving in the zkVM with its GPU prover library, and integration with Ethproofs. This page describes how to use these features through various commands and subcommands.

## Prerequisites
**RPC node.** A node running Erigon or Reth (initial support for Geth also with `--geth` flag) that exposes the `debug_` namespace without restrictions. This is necessary for `debug_getRawBlock` and `debug_executionWitness` calls that the service relies on.

**NVIDIA GPU.** Currently only the CUDA stack is supported by the integrated zkVMs such as Succinct SP1 and ZKsync Airbender. For GPU proving, an NVIDIA GPU with a minimum 24GB VRAM is required. Further, the machine the prover is running on must have the latest NVIDIA drivers installed. For running within containers, the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) should be installed as well.

**Software.** Either Docker (recommended, everything prebuilt) or the building toolchains (see [Running from source](#running-from-source)) are needed.

## Service mode

The binary built from source as well as the shipped docker image come with a continuous service facility that can fetch blocks and go on proving. This is invoked through the `--service` command-line option. It is required to use this with the `--rpc-url "$RPC_URL"` option. The RPC node should support the `debug_` namespace.
A typical example of this would be:
```bash
z6m_prover --service --rpc-url "$RPC_URL" --data-dir /mnt/data \
  --prove-every 10 --execute-every 1
```

This would poll the chain-head continuously from the RPC node, fetch each of the blocks and their witnesses. The emulated execution is run for every block, as specified by the `--execute-every` option, while proving is performed only every 10 blocks (block numbers that end with a "0").

### Options overview
A few things about how to provide the right options:
- **Block range.** Without `--start-block` the service begins at chain head + 1; without `--end-block` it runs until stopped. `--end-block` is inclusive and the service exits after it.
- **Intervals.** `--prove-every N` proves blocks whose number is divisible by N; `--execute-every N` does the same for execution, and is skipped when the block also matches the prove interval. 0 or unset means never.
- **Skipping.** Blocks matching no interval are skipped entirely — not even fetched — unless `--save-all-responses` (fetch every block, saving raw JSON) or `--download-only` (fetch bundles only, overriding both intervals) is set.
- **Proof types (for hypercube).** `--proof-type core|compressed|groth16|plonk` (default `compressed`); unknown values fall back to compressed. Honored by service-mode proving only.
- **Back-pressure.** One proof at a time; each has a 30-minute timeout. Executions race a second, always-CPU client, so an execution can run while a proof is in flight; a second queued proof, however, blocks the loop (and any later executions) until the current proof finishes.
- **Ethproofs.** Adding `--ethproofs-endpoint`, `--ethproofs-token`, and `--ethproofs-cluster-id` (all three required) makes the service post queued/proving/proved updates to [Ethproofs](https://ethproofs.org) — see [Ethproofs prover](ethproofs-prover.md).

Outputs under `--data-dir`:

| Path                                   | Content                                                  |
| -------------------------------------- | -------------------------------------------------------- |
| `blocks/<N>/flatWitnessBundle<N>.mfbd` | Fetched witness bundle                                   |
| `<N>/proof<N>.bin`                     | Serialized proof (note: not under `blocks/`)             |
| `executionLogs.log`                    | One line per executed block                              |
| `provingLogs.log`                      | One line per proved block (proof path, type, proving_ms) |

### Test-service mode
There is a test mode in which the service would run off of pre-downloaded offline blocks. It can be invoked with `--test-service` (conflicts with `--service`). It does CPU execution only:

```bash
# Execute a range of already-downloaded bundles from <data-dir>/blocks/<N>/
z6m_prover --test-service --data-dir /mnt/data \
  --start-block 23100000 --end-block 23100100 --execute-every 1

# Or run EEST fixtures, scanned recursively for .mfbd/.json files
z6m_prover --test-service --test-dir fixtures/
```

Without `--test-dir`, `--start-block` and `--end-block` are required and `--execute-every` defaults to 1; missing blocks are skipped with a warning. With `--test-dir`, files larger than `--max-file-size` bytes (default 20 MiB) are skipped and a pass/fail summary is printed. `--execution-log-file` overrides the default log location.

Two flags are currently inert everywhere: `--post-every` (reserved) and the top-level `--pk-path` (keys are generated in-process at startup).

## Running via Docker (recommended)

Pre-built docker images ship with all necessary binaries and libraries for the guest, zkVM and NVIDIA dependencies to run proving on a server with GPU. It is highly recommended to run these images for the proving service.

```bash
docker pull somnergy/z6m_prover:latest
```

CPU dry-run over a pre-fetched bundle after mounting your data directory at a stable path:

```bash
docker run --rm -v "$PWD:/work" somnergy/z6m_prover \
  execute --block-number 23100000 --data-dir /work/data
```

Proving a block on GPU for a single block can be initiated as follows:
```bash
docker run --rm --gpus all --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/work" \
  -e SP1_PROVER=cuda \
  somnergy/z6m_prover:latest \
  prove --block-number 23100000 --data-dir /work/data
```

The docker image builds with `CUDA_ARCHS="89,90,100"` so it already bakes in support for the latest NVIDIA GPU architectures for SP1-GPU.
To prove the blocks in a continuous fashion, you can use the `--service` mode as follows:

```bash
z6m_prover --service --rpc-url "$RPC_URL" --data-dir /mnt/data \
  --prove-every 100 --execute-every 10 --proof-type compressed
```


### SP1_PROVER modes

The prover reads `SP1_PROVER` from the environment; a `.env` file in the working directory is loaded automatically (see `.env.example`).

| Mode      | Function                                                                                                               | When to use                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `mock`    | Mock proofs, no real cryptography                                                                                      | Wiring and integration tests |
| `cpu`     | In-process CPU prover                                                                                                  | Dry-runs, slow real proofs   |
| `cuda`    | Local GPU proving via `sp1-gpu-server`                                                                                 | Real proving (recommended)   |
| `network` | [Succinct Prover Network](https://docs.succinct.xyz/docs/network/developers/key-setup); requires `NETWORK_PRIVATE_KEY` | Proving without local GPUs   |

## Running from source

Toolchain prerequisites (full detail in GitHub source at `prover/guest_hypercube/Instructions.md`):

- `git submodule update --init --recursive`. EEST fixtures come via `make test-fixtures`, which downloads sha256-pinned tarballs into `test-fixtures-cache/` — they are not in Git LFS.
- `protoc` (`sudo apt install protobuf-compiler`).
- The SP1 Hypercube toolchain: install `cargo-prove` from source, then `cargo prove install-toolchain`.
- The xpack RISC-V bare-metal GCC: `npm install -g xpm && xpm install @xpack-dev-tools/riscv-none-elf-gcc@latest --global`.
- The prebuilt standard libraries: download `prelibs64.tar.xz` from the repo's `prelibs` release and extract it into `prover/`.
- For CUDA proving: `sp1-gpu-server` built from `sp1-gpu/crates/server/` in the `erigontech/sp1` repository.

Build the guest ELF and the host binary (the `z6m_prover` target builds both):

```bash
make z6m_prover        # cross-compiles the C++ guest, then builds the Rust host
```

The binary lands at `prover/target/release/z6m_prover`. To fetch blocks you also need the native C++ witness converter, which the fetcher expects at `build/zilk_core/dev/cli/json_witness_to_flat_bundle`:

```bash
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --target json_witness_to_flat_bundle
```

All subcommands below work identically with `prover/target/release/z6m_prover` in place of the `docker run` prefix.

## One-shot workflow: fetch, execute, prove

Fetch a block and write its flat witness bundle to `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`:

```bash
z6m_prover fetch --rpc-url "$RPC_URL" --block-number 23100000 --data-dir data
```

- Omit `--block-number` (or pass 0) to fetch the latest block.
- `--geth` switches to Geth's witness format.
- `--save-all-responses` also writes the raw RPC JSON (`block<N>.json`, `blockRlp<N>.json`, `executionWitness<N>.json`) next to the bundle.
- `fetch` reuses an existing bundle if one is already on disk; service mode always rebuilds it.

Execute the block in the zkVM without proving (CPU-only, no GPU needed):

```bash
z6m_prover execute --block-number 23100000 --data-dir data
```

Success prints `Executed block <N> (gas_used=..., cycles=..., prover_gas=..., syscall_count=...)`; failure prints `FAILED block ...` and exits non-zero. Results append to `<data-dir>/executionLogs.log`. Use `--file-name <path>` to point at an explicit bundle instead of resolving via `--data-dir`, and `--is-test` for an ethereum/tests JSON fixture.

Prove the block:

```bash
z6m_prover prove --block-number 23100000 --data-dir data
```

Note that the one-shot `prove` currently keeps the proof in memory and does not write it to disk (`--proof-path` and `--proof-type` are accepted but ignored); use service mode for persisted proofs.

## Airbender — coming soon

Zilkworm is designed to target multiple RISC-V zkVMs, not just SP1 Hypercube. An integration with ZKsync's Airbender zkVM is under development; it does not exist in the repository tree yet. This section will be expanded when it lands.

## Where to go next

- [Quickstart: Hypercube prover](quickstart-hypercube.md) — the fast path to a first proof.
- [Ethproofs prover](ethproofs-prover.md) — cluster registration, posting flow, operations.
- [CLI reference](cli-reference.md) — every flag and subcommand.
