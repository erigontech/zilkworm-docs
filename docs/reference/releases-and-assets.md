---
title: Releases and assets
description: "Each Zilkworm release ships host binaries, guest images and verification keys, listed here with its measured results."
sidebar_position: 2
---

# Releases and assets

This page tells you what each Zilkworm release ships, which verification key goes with which guest, and how a release is cut.

Releases are on the [GitHub releases page](https://github.com/erigontech/zilkworm/releases), and so far all of them are pre-releases. Each release body opens with the matching section of `CHANGELOG.md`.

This is the only page on the site with performance numbers. Each one comes from the CHANGELOG section of the tag on its line.

## Current status

The latest release is `v0.1.0-alpha.7`, published 25 October 2026, and the EEST pin is `tests@v21.0.1`. Airbender is live on Ethproofs, and the `v0.1.0-alpha.5` result below has Ethproofs provenance. There is no Hypercube cluster on Ethproofs.

The overview's status strip reads `src/data/status.json` in the docs repository, so update that file and this page together on each release.

## Release history

| Tag | Title | Highlights |
|---|---|---|
| `v0.1.0-alpha.1` | First Public Alpha | The C++ guest runs on SP1 Hypercube, with precompiles on SP1 syscalls. |
| `v0.1.0-alpha.2` | More performance more testing and more stability | The notes report "Close to 10% improved proving time", and the EEST suite runs inside the Hypercube prover. |
| `v0.1.0-alpha.2-ere` | ERE zkEVM benchmark integration | This is alpha.2 plus the ERE benchmark integration, and it has no CHANGELOG section. |
| `v0.1.0-alpha.3` | MFBD witness format, pre-trie validation and Amsterdam | It adds the MFBD bundle and pre-state checks against the parent root. |
| `v0.1.0-alpha.4` | ERE stateless input, stateless new-payload checks and Sepolia | On tests-zkevm v21.0.1, 33,635 of 33,637 fixtures report `output_matched`. On Sepolia, the estimated prover cost is 0.500x Reth 0.1.0-rc.4's. |
| `v0.1.0-alpha.5` | Real-time proving with Airbender v3 | Airbender proves 200 consecutive mainnet blocks at a 3.4 s median on 2x RTX 5090, with the slowest at 6.1 s. That run has Ethproofs provenance from 15 October 2026. On 4x RTX 5090 the median is 2.58 s. |
| `v0.1.0-alpha.6` | Native statelessInputBytes with the HashState backend | In the CI 200-block benchmark, Hypercube guest cycles fall from 23.21B at alpha.5 to 17.44B (-24.9%), and Airbender's from 27.86B to 27.65B (-0.8%). The HashState ERE guest is at Z/R 0.477 against Reth 0.1.0-rc.4. |
| `v0.1.0-alpha.7` | SP1 v6.9.0 and a leaner HashState guest | The ERE estimated cost changes by −1.70% on Sepolia 11982400..11982499, and the SP1 bump leaves guest cycles as they were on alpha.6. |

## Assets in v0.1.0-alpha.7

| Asset | What it is | zkVM | Input |
|---|---|---|---|
| `z6m_prover_hypercube` | The Hypercube host `z6m_prover` for x86_64 Linux, with the MFBD guest embedded | SP1 Hypercube v6.9.0 | `.mfbd`, or EEST JSON with `--is-test` |
| `z6m_guest_hypercube_mfbd.elf` | DirectState guest, rv64im, built `USE_HASH_KEY=OFF` | SP1 | MFBD, EJSN |
| `z6m_guest_hypercube_mfbd.vk` | Its SP1 verifying key, from `derive_vk` | SP1 | none |
| `stateless-validator-zilkworm-sp1-v6.9.0.elf` | HashState guest, rv64im; the ERE guest | SP1 v6.9.0 | Raw `statelessInputBytes`, EJSN |
| `stateless-validator-zilkworm-sp1-v6.9.0.vk` | Its SP1 verifying key, named as the ere-guests handbook asks | SP1 | none |
| `state_transition_linux_x86_64` | Native runner, DirectState | none | `.mfbd`, `.json` or a directory |
| `z6m_guest_airbender.bin` | rv32 guest image, copied out of the release image, built `USE_HASH_KEY=ON` | Airbender v3 | MFBD, EJSN |
| `z6m_guest_airbender.text` | Text section of the same guest | Airbender v3 | none |
| `z6m_guest_airbender.vk` | EVKEY001 v2 verification key, computed on CPU by the image's prover | Airbender v3 | none |
| `SHA256SUMS.txt` | sha256 of every file above | none | none |

The release also tags the image `ghcr.io/erigontech/zilkworm-airbender:<tag>`, and its notes give the image digest and the sha256 of `z6m_guest_airbender.vk`. If you run an Ethproofs cluster, upload that key to it so its proofs show as verified.

## Verification keys

A key belongs to one guest build. The Hypercube MFBD guest is built with `USE_HASH_KEY=OFF`, and the Airbender guest with `USE_HASH_KEY=ON`. Since the key depends on that flag, your local build reproduces a published key only if you use the same setting.

Keys can also change when the guest code does not. Keys published for `v0.1.0-alpha.6` do not verify `v0.1.0-alpha.7` proofs, and part of the reason is the SP1 bump. SP1 v6.9.0 loads a guest's initial memory correctly, where v6.6.0 zeroed up to four bytes of it ([sp1#2981](https://github.com/succinctlabs/sp1/pull/2981)). On top of that, [#141](https://github.com/erigontech/zilkworm/pull/141) changed the MFBD and Airbender guests and their keys in `v0.1.0-alpha.7`. Always check a proof against the key from its own release.

## Older asset names

Two earlier releases used other names. `v0.1.0-alpha.5` shipped the Hypercube guest as `z6m_guest_hypercube.{elf,vk}`. The `v0.1.0-alpha.6` release notes call the ERE guest `z6m_guest_hypercube_slib`, while its assets are `stateless-validator-zilkworm-sp1-v6.6.0.{elf,vk}`.

## Release procedure

To cut a release, you work through five steps:

1. Create a branch, usually `release/X.Y.Z`.
2. Bump `PROJECT_VERSION` in `CMakeLists.txt` to `X.Y.Z`.
3. Add a `## vX.Y.Z - <title>` section to `CHANGELOG.md`. It becomes the release body.
4. Commit and push the branch.
5. Tag the release commit `vX.Y.Z` and push the tag. The tag must equal `PROJECT_VERSION`, or the workflow fails.

From there the `Release` workflow takes over. It tags the Airbender image, builds the assets, writes `SHA256SUMS.txt` and publishes the release, then ends with an ERE benchmark run on the published guest.

If you tag a commit on `main`, wait until its `Airbender Prover Image` run has finished. Otherwise the image is built twice, and its commit and release tags can name two different builds.

## Further reading

- [Choosing a prover](../provers/choosing-a-prover.md)
- [Benchmarks and CI](./benchmarks-and-ci.md)
- [ERE validation](../testing/ere-validation.md)
- [`docs/release.md`](https://github.com/erigontech/zilkworm/blob/main/docs/release.md)
- [`CHANGELOG.md`](https://github.com/erigontech/zilkworm/blob/main/CHANGELOG.md)
