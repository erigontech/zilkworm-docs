---
title: ERE validation
description: "The HashState guest runs in the ERE harness, which checks its output against each fixture and estimates its SP1 proving cost."
sidebar_position: 3
---

# ERE validation

The zkEVM benchmark workload, [eth-act/zkevm-benchmark-workload](https://github.com/eth-act/zkevm-benchmark-workload), runs stateless-validator guests inside zkVMs through ERE, [eth-act/ere](https://github.com/eth-act/ere). Its `ere-hosts` tool runs a guest on each fixture. Zilkworm takes part as an execution client, with its HashState guest on SP1.

## The ERE guest

The ERE guest is the HashState build of the Hypercube guest. `make z6m_guest_slib` builds it with `-DZ6M_HASH_STATE=ON`. It takes each fixture's `statelessInputBytes` unchanged, with no host adapter in between. [Witness formats](../inside-the-guest/witness-formats.md) describes that input.

Releases publish the guest as `stateless-validator-zilkworm-sp1-<version>.elf` and `.vk`. The name follows the ere-guests handbook pattern, `stateless-validator-<guest>-<zkVM>-<zkVM version>`. The version is the `sp1-sdk` tag that `derive_vk` builds against, read from `prover/stateless_validator/Cargo.toml`. For v0.1.0-alpha.7 the files are `stateless-validator-zilkworm-sp1-v6.9.0.elf` and `.vk`.

## Checks per fixture

For each fixture, ere-hosts feeds the guest the fixture's `statelessInputBytes`. The guest commits the 43-byte `StatelessValidationResult`. ere-hosts compares those bytes with the fixture's `statelessOutputBytes` and records `output_matched`. A cost run does not prove. It asks SP1 for an estimate of the proving cost instead. `tools/ere_compare.py` turns the per-fixture records into tables.

[Proof guarantees](../inside-the-guest/proof-guarantees.md) gives the 43-byte layout.

## Make targets

| Target | What it does |
|---|---|
| `make ere-bin` | Builds the HashState guest and derives its VK. Stages `build/ere-bin/stateless-validator-zilkworm-sp1.elf` and `.vk`. |
| `make ere-validate` | Runs every fixture in `ERE_INPUT_FOLDER` under ere-hosts, then checks `output_matched` with `ere_compare.py --validate` |
| `make ere-cost` | Runs ere-hosts with `--action estimate-cost`, then prints the cost table and report |
| `make ere-compare` | Runs `ere-cost`, then the same estimate for Reth's guest, and compares the two |
| `make ere-fixtures` | Generates EEST fixtures with `witness-generator-cli`; runs first only when `ERE_GEN_FIXTURES` is set |

The targets run `ere-hosts` inside a checkout of the benchmark workload, set by `ERE_WORKLOAD_DIR`. Every run passes `--force-rerun`, so no stale result from an older guest survives. `ERE_IMAGE_REGISTRY` points ERE at its prebuilt zkVM images on `ghcr.io/eth-act/ere`.

`ERE_BIN_PATH` names a local guest directory, such as `build/ere-bin`. When it is set, `ere-bin-link` links the files under the versioned name ere-hosts loads. It stops if the workload's SP1 version differs from the one `derive_vk` used. When `ERE_BIN_PATH` is empty, ere-hosts downloads the published guest.

## Local run

A local run needs Rust and a container engine, since ere-hosts drives ERE's SP1 server in a container. `tools/ere-fetch-fixtures.sh` fetches stateless fixtures from a public Sepolia block catalog. It caches them under `test-fixtures-cache/ere-sepolia/`. `latest N` extracts the N latest batches to `latest/`.

`ERE_WORKLOAD_DIR` must point at a workload checkout that has the `zilkworm` client. Today that is the `som/ere-v0.19.5` branch of the erigontech fork, which the first command clones. Run every command from the Zilkworm repository root.

```bash
git clone --branch som/ere-v0.19.5 https://github.com/erigontech/zkevm-benchmark-workload ../zkevm-benchmark-workload_fork
make ere-bin
tools/ere-fetch-fixtures.sh latest 1
make ere-validate \
    ERE_WORKLOAD_DIR=../zkevm-benchmark-workload_fork \
    ERE_BIN_PATH=build/ere-bin \
    ERE_INPUT_FOLDER=$(pwd)/test-fixtures-cache/ere-sepolia/latest
```

Swap `ere-validate` for `ere-cost` or `ere-compare` to estimate cost with the same variables.

## ERE benchmark workflow

`.github/workflows/ere-benchmark.yml` runs the same targets in CI. It runs on pushes to `release/*`, on demand, and when `release.yml` calls it after each `v*` release.

- Guest source. `build` runs `make ere-bin` at the run's ref. `release` downloads the release's ERE guest and checks it against `SHA256SUMS.txt`.
- Fixtures. The job fetches the latest batches of the public Sepolia catalog, one batch by default.
- Steps. It runs `ere-validate` and `ere-cost`, and `ere-compare` when the `compare` input is on.
- Repositories. It uses the erigontech forks of zkevm-benchmark-workload and ere-guests, branch `som/ere-v0.19.5`. The forks carry the Zilkworm client until it is upstreamed.
- Output. The step summary holds the result tables, and the run uploads the per-fixture records as the `ere-metrics` artifact.

`release.yml` calls the workflow with `compare: false`. Its comment says ere-guests had no Reth SP1 v6.9.0 guest yet. The alpha.7 release notes add that the fork registry has since taken one, so `make ere-compare` runs on the forks again.

## Results

[Releases and assets](../reference/releases-and-assets.md) lists the published ERE results with their release tags. Each workflow run's summary holds its own tables.

## Further reading

- [Releases and assets](../reference/releases-and-assets.md)
- [Proof guarantees](../inside-the-guest/proof-guarantees.md)
- [Execution spec tests](./execution-spec-tests.md)
- [`docs/ere_integration.md`](https://github.com/erigontech/zilkworm/blob/main/docs/ere_integration.md): harness setup, variables and past runs
- [`docs/hashstate.md`](https://github.com/erigontech/zilkworm/blob/main/docs/hashstate.md): the HashState backend
