---
title: Benchmarks and CI
description: "Make targets benchmark the Hypercube, HashState, Airbender and ERE paths, and GitHub workflows run them."
sidebar_position: 4
---

# Benchmarks and CI

The benchmarks below measure cycles and estimated prover cost. Their results for each release are on [Releases and assets](./releases-and-assets.md).

## Hypercube 200-block benchmark

`make sp1-benchmark` runs the Hypercube MFBD guest over 200 mainnet blocks. It builds `z6m_prover`, then runs `make sp1-benchmark-corpus`, then `tools/scripts/sp1_benchmark.py`.

`sp1-benchmark-corpus` converts each `temp/200_benchmark_blocks/<N>/unifiedBlockAndStateRlp<N>.bin` with `legacy_to_flat_bundle`. The bundles go to `temp/200_benchmark_blocks_mfbd_v2/<N>/`. `BENCH_SRC_DIR` and `BENCH_CORPUS_DIR` override the two paths. CI downloads the raw blocks from the [`benchmark-200-spread`](https://github.com/erigontech/zilkworm-testdata/releases/tag/benchmark-200-spread) release of `erigontech/zilkworm-testdata`.

The script takes `--dir`, and optionally `--start` and `--count`. It writes `execution.log` and `summary.md` to `temp/benchmarks/benchmark_<timestamp>/`. It does not compare against a baseline. To compare two builds, run it on each and compare the totals.

## HashState benchmark

`make slib-benchmark` measures the SP1 cycles of the HashState guest. It downloads the 30M-gas `tests-zkevm-benchmark@v21.0.5` fixtures with `gh release download`, so `gh` must be logged in. It builds `z6m_prover_slib` and runs each case through `z6m_prover execute --is-test`. Per-case results go to `temp/slib_benchmark/per_case.csv`.

These numbers are not the production path. `execute --is-test` sends the whole fixture JSON to the guest, and parsing it is about half the cycles. The ERE benchmark below measures the production input. [`docs/slib_benchmark.md`](https://github.com/erigontech/zilkworm/blob/main/docs/slib_benchmark.md) has the details.

`z6m_prover_slib` replaces `prover/target/release/z6m_prover`. Run `make z6m_prover` again before an MFBD run.

## Airbender benchmark

`tools/scripts/airbender_benchmark.sh --dir <corpus>` runs `z6m_prover_airbender execute` on every bundle in the corpus. It takes the layout that `make sp1-benchmark-corpus` writes. It reports gas and cycle statistics, with logs in `temp/airbender_benchmark/`. Options `-j`, `-s`, `-e`, `-l` and `-t` set the jobs, block range, log directory and per-block timeout.

The prover's `bench` subcommand is different. It proves one block several times.

## ERE benchmark

The ERE benchmark runs the HashState guest inside SP1 through `ere-hosts`, on each fixture's `statelessInputBytes`. `make ere-cost` estimates the guest's SP1 cost and prints a cost table. `make ere-compare` runs `ere-cost`, then estimates Reth's cost on the same fixtures and compares the two. `make ere-compare -o ere-cost` reuses an earlier `ere-cost` run.

Both targets run in a `zkevm-benchmark-workload` checkout at `ERE_WORKLOAD_DIR`. Set `ERE_BIN_PATH=build/ere-bin` to run the guest from `make ere-bin`. Without it, the published guest is downloaded. [ERE validation](../testing/ere-validation.md) covers the setup, `ere-validate` and the `output_matched` check.

## CI workflows

All workflows live in [`.github/workflows/`](https://github.com/erigontech/zilkworm/tree/main/.github/workflows). Most run in the `ghcr.io/erigontech/zilkworm-ci` image.

| File | Name | What it runs | Trigger |
|---|---|---|---|
| `unit-tests.yml` | Unit Tests | `zilkworm.tests` three ways: Debug, HashState, and rv32 paths with ASan and UBSan | push, PR to main, master; dispatch |
| `eest-blockchain-tests.yml` | EEST Blockchain Tests | `make eest-blockchain-tests`, native on MFBD | push, PR to main, master, release/*; dispatch |
| `hypercube-eest.yml` | HyperCube EEST Blockchain Tests | `make z6m_prover`, then `eest_runner.py` over the MFBD corpus on the SP1 executor | push, PR to main, master, release/* on path changes; dispatch |
| `sp1-benchmark.yml` | Hypercube 200-block Bench | `sp1-benchmark-corpus` and `sp1_benchmark.py` | push, PR to main, master, release/*; dispatch |
| `hypercube-slib-benchmark.yml` | HyperCube slib Benchmark | `make slib-benchmark` | dispatch only |
| `airbender-eest.yml` | Airbender EEST Blockchain Tests | The guest, the host without GPU features, and `make eest` in `prover/prover_airbender` | push, PR to main, master on path changes; dispatch |
| `airbender-benchmark.yml` | Airbender 200-block Bench | `airbender_benchmark.sh` on the 200-block corpus | push, PR to main, master; dispatch |
| `airbender-image.yml` | Airbender Prover Image | Build and push `ghcr.io/erigontech/zilkworm-airbender`; Airbender release assets | push to main on path changes, PR on path changes; dispatch; called by Release |
| `qemu-eest-blockchain.yml` | Qemu EESTs on RV32IM | `qemu_runner` targets `xpack-elf-eest` and `rerun-ctest` | push, PR to main, master, release/*; every 3 days; dispatch |
| `qemu-eest-blockchain-rv64.yml` | Qemu EESTs on RV64IM | The same with `ARCH=rv64` | push, PR to main, master, release/*; every 3 days; dispatch |
| `ere-benchmark.yml` | ERE Benchmark | `ere-bin`, `ere-validate`, `ere-cost`, and `ere-compare` when asked | push to release/*; dispatch; called by Release |
| `release.yml` | Release | Tag check, Airbender image, `make z6m_prover z6m_guest_vk ere-bin`, `state_transition`, `release-artifacts`, publish, then an ERE run without Reth | tag `v*`; dispatch |
| `ci-image.yml` | Build CI Image | Build `ghcr.io/erigontech/zilkworm-ci` | push to main, master, release/* on Dockerfile changes; dispatch |
| `zisk-eest.yml` | ZisK EEST Blockchain Tests | PR #86 only. EEST under `ziskemu`, execute only | push, PR to main, master, release/* on path changes; dispatch |
| `zisk-benchmark.yml` | ZisK 200-block Bench | PR #86 only. The 200-block corpus under `ziskemu`, execute only | push, PR to main, master, release/* on path changes; dispatch |

The two ZisK workflows exist only on [PR #86](https://github.com/erigontech/zilkworm/pull/86). They run in `ghcr.io/erigontech/zilkworm-ci-zisk`.

## Further reading

- [Releases and assets](./releases-and-assets.md)
- [Execution spec tests](../testing/execution-spec-tests.md)
- [ERE validation](../testing/ere-validation.md)
- [`docs/slib_benchmark.md`](https://github.com/erigontech/zilkworm/blob/main/docs/slib_benchmark.md)
- [`docs/ere_integration.md`](https://github.com/erigontech/zilkworm/blob/main/docs/ere_integration.md)
