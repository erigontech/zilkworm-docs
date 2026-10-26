---
title: Choosing a prover
description: "Compare the Airbender and Hypercube provers, the HashState guest and the ZisK backend by zkVM, artifacts, hardware and status."
sidebar_position: 1
---

# Choosing a prover

This page helps you pick a prover for what you want to do, whether that's posting proofs to Ethproofs, measuring cycles or validating against ERE.

Zilkworm compiles one C++ block execution engine into a RISC-V guest for each zkVM, so every prover pairs the same engine with a different zkVM. Here is how they compare at release v0.1.0-alpha.7.

| Prover | zkVM | ISA | What ships | Inputs | Host check | Hardware | Status | Ethproofs |
|---|---|---|---|---|---|---|---|---|
| [Airbender](./airbender-prover.md) | Airbender v3 | `rv32im_zicsr` | Image `ghcr.io/erigontech/zilkworm-airbender`; guest `.bin`, `.text` and `.vk` | MFBD, EJSN | Fails on a block hash mismatch | 32 GB VRAM per GPU, CUDA 13.1 driver | Live | One live cluster |
| [Hypercube](./hypercube-prover.md), MFBD guest | SP1 Hypercube v6.9.0 | `rv64im` | Binary `z6m_prover_hypercube`; guest `.elf` and `.vk` | MFBD, EJSN | Logs public values only | NVIDIA GPU and `sp1-gpu-server` for proving | Shipped | No live cluster |
| [HashState guest](../testing/ere-validation.md), ERE | SP1 v6.9.0 | `rv64im` | `stateless-validator-zilkworm-sp1-v6.9.0.elf` and `.vk` | SSZ `statelessInputBytes`, EJSN | ere-hosts compares the output | Unspecified | Shipped | No |
| [ZisK](./zisk-prover.md) | ZisK v1.3.1-alpha | `rv64im_zicsr_zba_zbb_zbs_zbkb` | Nothing yet, draft PR #86 | MFBD, EJSN | Verifies each proof before saving | CUDA 12.9, about 25 GB RAM | In progress | No |

If you want to post proofs to Ethproofs today, pick Airbender. Its cluster "Zilkworm Airbender v3 2x5090 on-prem" was the only live Zilkworm cluster on [ethproofs.org/provers](https://ethproofs.org/provers) as of 2026-10-26. Its Docker image runs the whole service from environment variables.

Pick Hypercube when you want to execute blocks and measure SP1 cycles, or to build on the MFBD guest. Its `execute` subcommand runs on the CPU and prints cycles and prover gas. The service can post to Ethproofs as well, though no Zilkworm Hypercube cluster does so today.

The HashState guest isn't meant for operators. It exists for ERE validation and cost estimates: ere-hosts feeds it each fixture's `statelessInputBytes` and compares its 43-byte output with the expected one.

ZisK is still in progress on draft PR #86, and nothing ships for it yet. [ZisK prover](./zisk-prover.md) covers running it from the branch.

## Further reading

- [Ethproofs posting](./ethproofs-posting.md)
- [Execution pipeline](../inside-the-guest/execution-pipeline.md)
- [Releases and assets](../reference/releases-and-assets.md)
- [ERE validation](../testing/ere-validation.md)
- [`docs/architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/architecture.md)
