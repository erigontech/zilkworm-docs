---
title: ZisK prover
description: "The ZisK backend lives in draft PR #86, runs execute-only in CI and has had one GPU proving run."
sidebar_position: 4
---

# ZisK prover

This page shows you how to build the ZisK backend from its draft branch, execute and prove mainnet blocks with it, and see what is still untested.

ZisK support lives in [PR #86](https://github.com/erigontech/zilkworm/pull/86), a draft based on alpha.6. It runs Zilkworm on ZisK v1.3.1-alpha. Because it isn't on `main` and no release ships it, every command below runs from a checkout of the PR branch, `som/zisk-impl`.

## Shipped artifacts

No release carries ZisK files. Instead, the branch adds:

- `prover/guest_zisk/`: the guest, built for `rv64im_zicsr_zba_zbb_zbs_zbkb`.
- `prover/prover_zisk/`: the host `z6m_prover_zisk`, on `zisk-sdk` 1.3.1-alpha.
- `zisk-eest.yml` and `zisk-benchmark.yml`: two CI workflows on the image `ghcr.io/erigontech/zilkworm-ci-zisk`.

The host has the same commands and log format as `z6m_prover`: `setup`, `fetch`, `execute`, `prove`, `verify`, `--test-service` and `--service`. On top of those it adds `--executor`, `--elf`, `--proving-key` and `--remote`. `--executor` picks `emulator`, the default, or `assembly` or `ziskemu`.

The guest reads MFBD witness bundles, and with `--is-test` the host wraps an EEST JSON fixture as EJSN. The ZisK EEST job runs MFBD files that `make eest-mfbd-build` converts.

## Hardware

You'll need:

- An NVIDIA driver 525.60.13 or newer.
- CUDA Toolkit 12.9 or newer, installed under `/usr/local/cuda`.
- About 25 GB of RAM per prover process, which is what ZisK's own docs ask for.
- At least 64 GB of RAM for the `assembly` executor, and at least 32 GB for the Rust emulator.
- An unlimited memlock limit, for the `assembly` executor only.
- About 21 GB of disk for the proving key once it is set up.
- Ubuntu 22.04 or newer. The reference machine runs Ubuntu 25.10.

For VRAM, the only data point is the one GPU run so far: it used a 32 GB card and filled it on every block.

## Run it

No service command has run against a live node yet, so this section sticks to building the backend, executing a block and proving it.

### Toolchain and ZisK

Install xPack `riscv-none-elf-gcc` 15.2.0-1.1 and no other version. The Makefile puts the first xPack version it finds on `PATH`, so an older one sitting next to it wins silently.

```bash
git clone https://github.com/erigontech/zilkworm.git && cd zilkworm
git checkout som/zisk-impl
git submodule update --init --recursive
sudo npm install --global xpm@latest
xpm install @xpack-dev-tools/riscv-none-elf-gcc@15.2.0-1.1 --global
mkdir -p ~/.zisk/bin
curl -L https://raw.githubusercontent.com/0xPolygonHermez/zisk/v1.3.1-alpha/ziskup/ziskup -o ~/.zisk/bin/ziskup
chmod +x ~/.zisk/bin/ziskup
mkdir -p temp/runtime && cd temp/runtime
~/.zisk/bin/ziskup --version 1.3.1-alpha --gpu --provingkey
cd - && source ~/.bashrc
cargo-zisk-dev check-setup --proving-key ~/.zisk/provingKey --gpu
```

`ziskup` installs ZisK into `~/.zisk` and the proving key into `~/.zisk/provingKey`. It downloads the key tarball into the current directory, which is why the script changes into `temp/runtime` first. Always pass `--version`. Without it, `ziskup` installs the latest release, and that release's key and binaries do not match the host.

`ziskup` runs `check-setup` with `-a`, which skips the recursive setups, so the last command checks them as well. You'll find the full package list and the fixes for Ubuntu 25.10 in `docs/zisk-docs.md` on the branch.

### Guest and host build

```bash
make z6m_guest_zisk
(cd prover/prover_zisk && cargo build --release --no-default-features --features gpu)
```

The guest lands in `prover/guest_zisk/build/z6m_guest.elf` and the GPU host in `prover/prover_zisk/target/release/z6m_prover_zisk`. Be careful with `make z6m_prover_zisk`, which writes a CPU-only host to the same path and replaces the GPU one.

### Block execution

Next, get the 200-block mainnet corpus and convert it to MFBD:

```bash
curl -L -o temp/200_benchmark_blocks.tar.gz \
  https://github.com/erigontech/zilkworm-testdata/releases/download/benchmark-200-spread/200_benchmark_blocks.tar.gz
tar xzf temp/200_benchmark_blocks.tar.gz -C temp && rm temp/200_benchmark_blocks.tar.gz
make sp1-benchmark-corpus
```

The bundles land in `temp/200_benchmark_blocks_mfbd_v2/<N>/flatWitnessBundle<N>.mfbd`. Now you can execute one block under `ziskemu`:

```bash
P=prover/prover_zisk/target/release/z6m_prover_zisk
$P --executor ziskemu execute \
  --file-name temp/200_benchmark_blocks_mfbd_v2/24545295/flatWitnessBundle24545295.mfbd
```

`execute` needs no proving key. It prints an `Executed block` line and a `Public Values:` line to stdout, and with `--file-name` it prints the block number as 0. To run all 200 blocks and compare their public values with native `state_transition`, use `make zisk-emu-check`.

### Block proof

Before you prove anything, keep temporary files on disk. The ZisK SDK writes them to `/tmp`, which is often in RAM.

```bash
export TMPDIR=$PWD/temp/runtime/tmp && mkdir -p "$TMPDIR" temp/proofs
P=prover/prover_zisk/target/release/z6m_prover_zisk
$P setup
$P prove --file-name temp/200_benchmark_blocks_mfbd_v2/24545295/flatWitnessBundle24545295.mfbd \
  --proof-path temp/proofs/24545295.bin
$P verify --proof-path temp/proofs/24545295.bin
```

The proof lands in `temp/proofs/24545295.bin`, and `prove` also appends a line to `temp/provingLogs.log`. Run `setup` once per guest ELF, because `verify` needs the program key it caches.

Each `prove` process loads the proving key again. When you want to prove many blocks, run them in one process:

```bash
mkdir -p temp/zisk_gpu_run && ln -sfn ../200_benchmark_blocks_mfbd_v2 temp/zisk_gpu_run/blocks
$P --test-service --data-dir temp/zisk_gpu_run \
  --start-block 24491136 --end-block 24640322 --prove-every 1
```

Proofs land in `temp/zisk_gpu_run/<N>/proof<N>.bin`, with one log line each in `temp/zisk_gpu_run/provingLogs.log`.

## Inputs and outputs

The host reads MFBD bundles by path, or from `<data-dir>/blocks/<N>/` in `--test-service` mode. The guest commits 112 bytes of public values in the same layout as the Hypercube guest, placed in ZisK output slots 0 to 27. [Proof guarantees](../inside-the-guest/proof-guarantees.md) gives the layout.

`prove` writes the proof to `--proof-path`. The default proof type is `compressed`, which ZisK calls VadcopFinal.

## Host checks

`prove` verifies each new proof before it saves it, and `verify` checks a proof against the program key from the setup cache. For the public values, `tools/scripts/zisk_execute.py` and `make zisk-emu-check` compare them with native `state_transition`.

Inside the guest, every free-input hint from a ZisK precompile is checked. A bad inverse, square root or division hint halts the guest, so no proof can exist. A bad GLV hint simply falls back to plain code.

## Known limits

- PR #86 is a draft based on alpha.6, so it lacks the changes merged to `main` after alpha.6.
- No release ships ZisK files.
- CI is execute-only. Both ZisK workflows run the guest under `ziskemu`, with no proving key, no GPU and no proofs.
- There has been one GPU run so far, on one RTX 5090 with `compressed` proofs.
- The `minimal` and `plonk` proof types, more than one GPU, the `assembly` executor, `--remote`, and `--service` against a live node are all untested.
- On EEST at tests@v21.0.1, 12,253 of 12,266 fixtures pass, 10 are skipped for exceeding the 20 MB size cap, and three fail.
- Two of those failures need more than ZisK's fixed 512 MiB of RAM. The third, `tx_invalid_first_in_block`, also failed on SP1 at alpha.6. PR #141 on `main` fixes it, but the branch doesn't have that fix.
- Ethproofs posting for ZisK is deferred.
- `--executor ziskemu` is execute-only, and `prove` with it exits 1.
- `ziskemu` exits 0 even when the guest halts with an error, so check stderr for `finished with error`.
- The prover fills the VRAM of a 32 GB card, and the host doesn't yet expose `max_streams` or `minimal_memory` for smaller cards.

## Measured

PR #86 reports one GPU run, on 2026-10-08, in which one RTX 5090 proved 200 of 200 corpus blocks at a median proving time of 31.5 s. Since ZisK has no release, [Releases and assets](../reference/releases-and-assets.md) lists no ZisK figures.

## Further reading

- [Choosing a prover](./choosing-a-prover.md)
- [Hypercube prover](./hypercube-prover.md)
- [Execution spec tests](../testing/execution-spec-tests.md)
- [PR #86](https://github.com/erigontech/zilkworm/pull/86)
- [`docs/zisk-docs.md` on `som/zisk-impl`](https://github.com/erigontech/zilkworm/blob/som/zisk-impl/docs/zisk-docs.md)
