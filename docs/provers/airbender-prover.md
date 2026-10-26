---
title: Airbender prover
description: "Run the Airbender GPU prover from its Docker image to follow the chain, prove blocks and post them to Ethproofs."
sidebar_position: 2
---

# Airbender prover

This page shows you how to run the Airbender prover as a service, prove or check a single block by hand, and read what each proof commits.

The Airbender prover runs Zilkworm on ZKsync Airbender v3. It ships as one Docker image that holds the host, the guest and the CUDA runtime. Airbender is also the zkVM behind the only live Zilkworm cluster on Ethproofs.

## Shipped artifacts

Release v0.1.0-alpha.7 publishes the image `ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7`, and you can pull it without credentials. Whenever a push to `main` changes the image inputs, the image is also tagged with that commit sha and with `:main`.

Inside the image you'll find four things:

- `/usr/local/bin/z6m_prover_airbender`: the host, with the witness converter linked in.
- `/opt/z6m/z6m_guest.bin` and `.text`: the guest.
- `/opt/z6m/fsv/`: the three recursion verifier programs, each as a `.bin` and a `.text` file.
- `/usr/local/bin/airbender-entrypoint`: the entrypoint.

The release also attaches the guest and its key, so you can get them without opening the image:

- `z6m_guest_airbender.bin` and `z6m_guest_airbender.text`: the guest, copied out of the image.
- `z6m_guest_airbender.vk`: its `EVKEY001` v2 verification key. Register it with Ethproofs for a cluster that runs this release.

The release notes give the image digest and the key's sha256.

The guest targets `rv32im_zicsr` with the `ilp32` ABI. It reads MFBD witness bundles and EEST JSON fixtures wrapped as EJSN, and [Witness formats](../inside-the-guest/witness-formats.md) describes both.

## Hardware

Here is what a proving host needs:

- NVIDIA GPUs with at least 32 GB of VRAM each. Every GPU the container sees works on the same block.
- About 24 GB of pinned host RAM per GPU, plus a few GB for the service.
- An NVIDIA driver for CUDA 13.1 or newer, and the NVIDIA Container Toolkit.
- A GPU of compute capability 8.0, 8.9, 9.0 or 12.0. B200 is 10.0, so it isn't supported.
- About 96 GB of RAM if you use the CPU backend of `prove`.
- Disk for the data directory, which grows by a few MB per fetched block and about 1 MB per proof.

## Run it

The image works in two ways. Started with no arguments, it runs the proving service. Given arguments, it runs a single prover command instead, which is handy when you want to look at one block.

### Proving service

```bash
export RPC_URL=http://<execution-client>:8545
docker run -d --name zilkworm-airbender --gpus all --restart unless-stopped \
  -v /srv/zilkworm-airbender:/data \
  -e RPC_URL -e PROVE_EVERY=100 \
  ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7
```

The node behind `RPC_URL` has to serve `debug_executionWitness`. The entrypoint starts the service and starts it again 30 s after any exit. On first start it spends about two minutes computing the verification key on the CPU. From then on, the service follows the chain tip and proves every block whose number is a multiple of `PROVE_EVERY`.

Everything it writes lands in `/srv/zilkworm-airbender`:

- `proofs/<N>/proof.bin`: one proof per proved block.
- `provingLogs.log`: one line per proved, skipped or failed block.
- `blocks/<N>/flatWitnessBundle<N>.mfbd`: each fetched bundle.
- `vk-<revision>-<id>/vk.bin`: the verification key the entrypoint computed.

Service logs go to stdout, so you can follow them with `docker logs -f zilkworm-airbender`.

You configure the entrypoint through these variables:

| Variable | Meaning |
|---|---|
| `RPC_URL` | JSON-RPC endpoint that serves `debug_executionWitness`; required |
| `WS_URL` | WebSocket endpoint for `newHeads`; without it the service polls |
| `PROVE_EVERY` | Prove blocks whose number is a multiple of this; default 100 |
| `EXECUTE_EVERY` | Execute without proving every N-th block; default none |
| `START_BLOCK` | First block; default the chain tip |
| `FETCH_TIMEOUT` | Seconds one fetch attempt may take; default 60 |
| `MAX_LAG` | Blocks the service may fall behind the tip before it skips ahead; default 10, 0 never skips |
| `DATA_DIR` | Key, blocks, logs and proofs; default `/data` |
| `ETHPROOFS_ENDPOINT`, `ETHPROOFS_TOKEN`, `ETHPROOFS_CLUSTER_ID` | Post to Ethproofs when all three are set |
| `RESTART_DELAY` | Seconds before a restart; default 30 |
| `PROVER_EXTRA_ARGS` | Further prover options, split on spaces |

[Ethproofs posting](./ethproofs-posting.md) shows the service with the three Ethproofs variables set.

If your host's NVIDIA runtime uses CDI, `--gpus all` won't reach the GPUs. Use `--runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=all` instead.

### One-block execution

When you pass arguments, the entrypoint runs `z6m_prover_airbender` with them and adds the guest path for you. The image has no fetch command, though. Use a bundle the service already fetched, or get one with the `fetch` subcommand of the [Hypercube prover](./hypercube-prover.md).

```bash
N=$(ls /srv/zilkworm-airbender/blocks | sort -n | tail -1)
docker run --rm -v /srv/zilkworm-airbender/blocks/$N:/in:ro \
  ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7 \
  execute --file-name /in/flatWitnessBundle$N.mfbd
```

`execute` runs the guest on the simulator, so it doesn't need a GPU. It prints an `Executed block` line with gas used and cycles, followed by the block hash the guest committed. The result goes only to stdout.

### One-block proof

To prove the same block, give `prove` the GPUs and somewhere to write:

```bash
N=$(ls /srv/zilkworm-airbender/blocks | sort -n | tail -1)
mkdir -p out
docker run --rm --gpus all \
  -v /srv/zilkworm-airbender/blocks/$N:/in:ro -v "$PWD/out:/out" \
  ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7 \
  prove --file-name /in/flatWitnessBundle$N.mfbd --output-dir /out
```

The proof lands in `out/proof.bin`. `prove` runs the simulator first, and if the guest rejects the block, it stops with an error and writes no proof.

### Proof verification

To check that proof, download the release's verification key and hand both to `verify`:

```bash
N=$(ls /srv/zilkworm-airbender/blocks | sort -n | tail -1)
curl -LO https://github.com/erigontech/zilkworm/releases/download/v0.1.0-alpha.7/z6m_guest_airbender.vk
docker run --rm -v "$PWD:/w" -v /srv/zilkworm-airbender/blocks/$N:/in:ro \
  ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7 \
  verify --proof /w/out/proof.bin --vk /w/z6m_guest_airbender.vk \
  --file-name /in/flatWitnessBundle$N.mfbd
```

`verify` runs on the CPU. When you don't have the input at hand, pass `--block-hash` instead of `--file-name`.

## Inputs and outputs

The service follows the chain head by polling `eth_blockNumber`, or through `newHeads` when `WS_URL` is set. For each block it calls `eth_getBlockByNumber`, `debug_getRawBlock` and `debug_executionWitness`. It gives a block up to five tries, each within `FETCH_TIMEOUT`, and then skips it. The response becomes an MFBD bundle in process, written to `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`.

Inside the zkVM, the guest reads its input through the CSR oracle at `0x7C0`, as [Precompiles and syscalls](../inside-the-guest/precompiles-and-syscalls.md) describes. It commits 32 bytes of public values: the hash of the last block it validated, laid out as little-endian words in registers `a0` to `a7`. An EJSN run commits zero, while a failed run ends at `finish_error` and commits nothing, so it can't be proven. [Proof guarantees](../inside-the-guest/proof-guarantees.md) gives the full layout.

On disk, `proof.bin` is a gzipped `EPROOF01` v2 envelope, which is the format Ethproofs takes, and the key is an `EVKEY001` v2 file.

## Host checks

The host derives the expected public output from the input alone. It reads the MFBD bundle and takes the hash of the last block not flagged invalid. If the guest commits any other value, `execute`, `prove`, `verify`, `--test-service` and `--service` all fail.

The service adds a second gate in front of the prover. It runs each block on the simulator first and proves only a run that reaches the guest's exit point within the prover's cycle limit. That run and the proof must both commit the expected hash, or the block is logged as `SKIPPED` in `provingLogs.log`. When the prover panics, the block is logged as `FAILED`, and the service rebuilds the prover and moves on.

## Known limits

- The prover takes at most 1,073,741,822 cycles per block, and a heavier block is skipped.
- The `cpu` backend of `prove` is very slow and needs the RAM listed under Hardware.
- The image has no kernels for B200 GPUs.
- `prover/prover_airbender/eest-known-failures.txt` lists 25 EEST fixtures the guest does not finish. They hit resource limits rather than produce wrong results.
- A restarted service starts at the chain tip, so blocks between a crash and the restart don't get proved.
- Reth's witness can miss an account that the block deletes. The guest recovers it from its trie path when the witness has that path. Otherwise the preflight fails and the block is skipped.
- Reth serves no witness for a block more than about 12 blocks behind its tip, so an old `START_BLOCK` gets no witnesses from reth.
- You can't configure the prover's pinned host memory.

## Measured

At v0.1.0-alpha.5, the guest proved 200 consecutive mainnet blocks at a 3.4 s median on 2x RTX 5090. You'll find the figures for each release on [Releases and assets](../reference/releases-and-assets.md).

## Further reading

- [Ethproofs posting](./ethproofs-posting.md)
- [CLI reference](../reference/cli-reference.md)
- [Proof guarantees](../inside-the-guest/proof-guarantees.md)
- [`docs/airbender-docker-service.md`](https://github.com/erigontech/zilkworm/blob/main/docs/airbender-docker-service.md)
- [`prover/prover_airbender/README.md`](https://github.com/erigontech/zilkworm/blob/main/prover/prover_airbender/README.md)
