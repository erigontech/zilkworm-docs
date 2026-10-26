---
title: Witness formats
description: "Guests read MFBD bundles, raw SSZ statelessInputBytes or EJSN-wrapped test fixtures, and each format has its own producers."
sidebar_position: 2
---

# Witness formats

This page shows you the three input formats a guest reads, how a guest tells them apart, and which tools produce each one.

A stateless run needs the block and the part of the state it touches. The host hands the guest all of it in one byte buffer, and the guest reads the first bytes of that buffer to pick a path.

## MFBD bundles

An MFBD file is a 16-byte envelope followed by one or more flat bundles. The envelope is `<u32 magic><u32 version><u64 count>`, with magic `MFBD` (`0x4442464D`) and version 1. Each bundle then starts with a 56-byte header, magic `FBND` (`0x444E4246`), which points at six sections. Those hold the genesis block, the blocks to run, the ancestor headers, the pre-state, the trie nodes and the network name. The guest reads each section where it lies instead of decoding it.

The bundle version is `kFlatBundleVersion` in `zilk_core/core/types_zz/flat_bundle.hpp`, now 14. `load_flat_bundle` rejects any other version, so a stale bundle fails right away.

## Raw statelessInputBytes

The HashState guest takes the EIP-8025 `statelessInputBytes`, the SSZ `StatelessInput` that tests-zkevm fixtures carry, with no wrapper. Its first two bytes are the schema id `0x1501`, big-endian, so the buffer starts `0x15 0x01`. That keeps it easy to spot, because no other input magic starts with `0x15`.

## EJSN test fixtures

EJSN wraps one EEST `blockchain_test` JSON fixture for a guest. Its 8-byte header holds the magic `EJSN` (`0x4E534A45`) and version 1, and the minified JSON follows. The hosts wrap a fixture this way when you pass `--is-test`, and the native runner wraps `.json` files itself. Under HashState, the guest reads each block's `statelessInputBytes` field from that JSON.

## Producers and consumers

| Format | Wire marker | Produced by | Consumed by |
|---|---|---|---|
| MFBD | `MFBD` v1 envelope, `FBND` v14 bundles | The host fetcher, through `prover/witness_ffi`; the CLIs `json_witness_to_flat_bundle`, `eest_to_flat_bundle` and `legacy_to_flat_bundle` | DirectState guests, native `state_transition`, the QEMU runner |
| `statelessInputBytes` | First bytes `0x15 0x01` | tests-zkevm fixtures from ethereum/execution-specs; ERE's `witness-generator-cli` | The HashState guest under ere-hosts; the native HashState tests, inside fixture JSON |
| EJSN | `EJSN` v1, 8-byte header | `z6m_prover --is-test`, `z6m_prover_airbender --is-test`, the native runner | Every guest, and native `state_transition` |
| Legacy unified RLP | None | The old fetcher | `legacy_to_flat_bundle` only |

The three CLIs live in `zilk_core/dev/cli`. `json_witness_to_flat_bundle` converts a node's `debug_executionWitness` JSON, and the host links the same converter. `eest_to_flat_bundle` converts EEST fixtures with `emit` or `bulk-convert`, and `legacy_to_flat_bundle` converts old `unifiedBlockAndStateRlp<N>.bin` files.

## Formats each guest accepts

| Guest | Accepts | Any other input |
|---|---|---|
| Hypercube MFBD guest | MFBD, EJSN | Raw SSZ fails with "needs the HashState guest". Unknown magic fails the run. |
| HashState guest | Raw SSZ, EJSN | MFBD fails, since its path is compiled out. Anything else gives the all-zero result. |
| Airbender guest | MFBD, EJSN | Same as the Hypercube MFBD guest |
| ZisK guest, draft PR #86 | MFBD, EJSN | Same as the Hypercube MFBD guest |
| Native `state_transition` | `.mfbd` files, `.json` files wrapped as EJSN | Release builds lack HashState, so raw SSZ fails |

## Legacy unified RLP

`unifiedBlockAndStateRlp<N>.bin` files carry no magic, and no current guest reads them. They still matter in two places. `legacy_to_flat_bundle` converts them to MFBD, and `make sp1-benchmark-corpus` runs that conversion. The Airbender host also falls back to that file name when a block has no `.mfbd` file, so convert old data first.

## Spec documents

The MFBD spec, `docs/mfbd_design_specs.md`, is normative: it says what a producer and a verifier must check. `docs/flat_witness_bundle.md` is the byte-layout reference. One diagram in the spec still says `FBND` v13, but its section 4.2 and the code say 14.

## Further reading

- [Execution pipeline](./execution-pipeline.md)
- [Proof guarantees](./proof-guarantees.md)
- [`docs/mfbd_design_specs.md`](https://github.com/erigontech/zilkworm/blob/main/docs/mfbd_design_specs.md): the normative MFBD spec
- [`docs/flat_witness_bundle.md`](https://github.com/erigontech/zilkworm/blob/main/docs/flat_witness_bundle.md): the envelope and bundle byte layout
- [`docs/hashstate.md`](https://github.com/erigontech/zilkworm/blob/main/docs/hashstate.md): how HashState parses `statelessInputBytes`
