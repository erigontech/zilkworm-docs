---
title: Hypercube prover
description: "Run the SP1 Hypercube prover binary to execute blocks with the MFBD guest or prove them on a GPU."
sidebar_position: 3
---

# Hypercube prover

The Hypercube prover runs Zilkworm on SP1 Hypercube v6.9.0. It ships as one Linux binary with the guest built in. It can execute blocks, prove them and post to Ethproofs. No Zilkworm Hypercube cluster posts to Ethproofs today.

## Shipped artifacts

Release v0.1.0-alpha.7 attaches three Hypercube files:

- `z6m_prover_hypercube`: the host for x86_64 Linux. It names itself `z6m_prover` and embeds the guest below.
- `z6m_guest_hypercube_mfbd.elf`: the DirectState guest, `rv64im` with the `lp64` ABI.
- `z6m_guest_hypercube_mfbd.vk`: its 32-byte SP1 program verification key.

The host builds on the `erigon/patches-v6.9.0` branch of `erigontech/sp1`. Keys published for alpha.6 do not verify alpha.7 proofs.

The guest reads MFBD witness bundles. With `--is-test`, the host wraps an EEST JSON fixture as EJSN. Raw SSZ input makes this guest return an error; the [HashState guest](../testing/ere-validation.md) takes that format. [Witness formats](../inside-the-guest/witness-formats.md) describes all three.

## Hardware

The repo states no VRAM or RAM figure for SP1 proving.

`execute` runs on the CPU. GPU proving needs an NVIDIA GPU and SP1's `sp1-gpu-server`. No release asset carries `sp1-gpu-server`. The root `Dockerfile` builds it from `erigontech/sp1` with `CUDA_ARCHS=89` by default.

## Run it

Download the binary and point it at a node:

```bash
curl -LO https://github.com/erigontech/zilkworm/releases/download/v0.1.0-alpha.7/z6m_prover_hypercube
chmod +x z6m_prover_hypercube
export RPC_URL=http://<execution-client>:8545
```

The node must serve `debug_getRawBlock` and `debug_executionWitness`.

### Proving service

```bash
SP1_PROVER=cuda ./z6m_prover_hypercube --service \
  --rpc-url "$RPC_URL" --data-dir data --prove-every 100
```

The service starts at the chain head plus one and runs until stopped. It fetches and proves every block whose number is a multiple of 100. It skips other blocks without fetching them. Without `SP1_PROVER=cuda`, it proves on the CPU.

Outputs land in `data/`:

- `blocks/<N>/flatWitnessBundle<N>.mfbd`: each fetched bundle.
- `<N>/proof<N>.bin`: each proof, outside `blocks/`.
- `provingLogs.log`: one line per proved or failed block.
- `executionLogs.log`: one line per executed block.

`--execute-every N` adds execution runs for blocks that are not proved. `--end-block` stops the service after that block. [Ethproofs posting](./ethproofs-posting.md) adds the three Ethproofs flags.

### One-block execution

```bash
./z6m_prover_hypercube fetch --rpc-url "$RPC_URL" --data-dir data
N=$(ls data/blocks | sort -n | tail -1)
./z6m_prover_hypercube execute --block-number $N --data-dir data
```

`fetch` without `--block-number` takes the chain head. It writes `data/blocks/<N>/flatWitnessBundle<N>.mfbd`. Add `--geth` to `fetch` for a Geth node.

`execute` runs the guest in the SP1 executor on the CPU. It prints `Executed block <N>` with gas used, cycles, prover gas and syscall count. It also appends a line to `data/executionLogs.log`.

### One-block proof

:::warning
The `prove` subcommand writes no proof file. To prove one block, run the service bounded to that block, as below. [Known limits](#known-limits) explains why.
:::

```bash
N=$(ls data/blocks | sort -n | tail -1)
SP1_PROVER=cuda ./z6m_prover_hypercube --service --rpc-url "$RPC_URL" --data-dir data \
  --start-block $N --end-block $N --prove-every 1
```

The service fetches the block again, so the node must still serve its witness. The proof lands in `data/<N>/proof<N>.bin`. The service exits once the proof is written.

## Inputs and outputs

The service follows the chain head with `eth_blockNumber`. For each block it calls `eth_getBlockByNumber`, `debug_getRawBlock` and `debug_executionWitness`. It reads the witness in the reth shape; only `fetch --geth` reads the Geth shape. It converts the response to an MFBD bundle in process. `fetch` reuses a bundle already on disk, and the service always rebuilds it. `--save-all-responses` also writes `block<N>.json`, `blockRlp<N>.json` and `executionWitness<N>.json`.

The host passes the bundle unchanged on SP1 stdin. The guest commits 112 bytes of public values: `gas_used`, the pre-state root, the post-state root, the block hash and the chain id. [Proof guarantees](../inside-the-guest/proof-guarantees.md) gives the byte layout.

A proof file holds a bincode-encoded `SP1ProofWithPublicValues`. `--proof-type` picks `core`, `compressed`, `groth16` or `plonk`. The default is `compressed`, and unknown values fall back to it. The service proves one block at a time, with a 30-minute timeout per proof.

## Host checks

The service parses the 112-byte public values of each proof and logs them. It does not compare them with the input or the chain. `execute` treats a `gas_used` of 0 as a failure and exits 1. The guest's own checks are on [Proof guarantees](../inside-the-guest/proof-guarantees.md).

## Known limits

At v0.1.0-alpha.7:

- `prove` discards the proof and writes no file.
- `prove` exits 0 when setup fails, after printing `ERROR` and the cause.
- `prove` always uses CUDA, whatever `SP1_PROVER` says.
- `verify` is a no-op.
- `setup` is a no-op.
- The service logs the 112-byte public values and does not compare them with the input.
- `--post-every`, `--pk-path` and `--proof-path` are accepted and unused.
- The Docker image `somnergy/z6m_prover` is built by hand from the root `Dockerfile`. No workflow publishes it.

## Measured

At v0.1.0-alpha.7, no proving time is published. Guest cycle counts are on [Releases and assets](../reference/releases-and-assets.md).

## Further reading

- [Ethproofs posting](./ethproofs-posting.md)
- [CLI reference](../reference/cli-reference.md)
- [Execution spec tests](../testing/execution-spec-tests.md)
- [`prover/prover_hypercube/src/main.rs`](https://github.com/erigontech/zilkworm/blob/main/prover/prover_hypercube/src/main.rs)
- [`docs/architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/architecture.md)
