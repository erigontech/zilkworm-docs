---
title: Proof guarantees
description: "Each guest commits a fixed public-values layout, each host checks it to a different degree, and the verifying key ties a proof to one guest ELF."
sidebar_position: 4
---

# Proof guarantees

This page tells you what a Zilkworm proof lets you trust, guest by guest, and what you still have to check yourself.

A proof says that one guest ELF ran on some input and committed some public values. The verifying key names the ELF, and the public values say what the run found. What you can trust depends on both, and on how much the host checks.

## Public values per guest

### Hypercube MFBD guest, 112 bytes

A release publishes this guest as `z6m_guest_hypercube_mfbd`, and it commits 112 bytes.

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 0 | 8 | `gas_used` | Gas used, little-endian. A failed run writes `UINT64_MAX` and a skipped run `UINT64_MAX - 1`. |
| 8 | 32 | `pre_state_root` | The parent state root the run starts from |
| 40 | 32 | `post_state_root` | The state root after the last block |
| 72 | 32 | `block_hash` | The hash of the last block |
| 104 | 8 | `chain_id` | The chain ID, little-endian |

The ZisK guest on draft PR #86 commits the same 112 bytes, in ZisK output slots 0 to 27.

### HashState guest, 43 bytes

The HashState guest is the ERE guest, `stateless-validator-zilkworm-sp1-<SP1 version>`. On `statelessInputBytes` input, it commits the SSZ `StatelessValidationResult`.

| Offset | Bytes | Field | Meaning |
|---|---|---|---|
| 0 | 32 | `new_payload_request_root` | The root of the block's `NewPayloadRequest` |
| 32 | 1 | `successful_validation` | 1 if the guest accepted the block, else 0 |
| 33 | 8 | `chain_id` | The chain ID, little-endian |
| 41 | 2 | `schema_id` | The input schema id, little-endian |

A rejected block still yields a result, with `successful_validation` set to 0. Only an input that does not decode gives the all-zero result. On EJSN input, the same guest writes the 112-byte layout above instead.

### Airbender guest, 32 bytes

The Airbender guest commits the hash of the last block it validated. It writes the hash's bytes in order, as little-endian words, to registers `a0` to `a7`. Small as it is, that hash binds the parent's state root and the block's post-state root, gas used and receipts root.

The value is zero when the run validated no block, which happens on an EJSN success or on an MFBD whose every block is flagged expected-invalid. A failed or skipped run ends at `finish_error` and commits nothing, so it cannot be proven.

## Checks inside the guest

Before a DirectState guest commits, it checks the chain it ran. It takes the pre-state root from the parent header that the first block names and requires each later block to extend the one before it. It also checks each header's state root and gas used against the run.

An MFBD envelope can hold several bundles, each its own chain. In that case the public values cover only the last validated block's bundle.

The HashState guest checks that the witness headers chain by parent hash and end at the block's parent. Every account and storage read is checked against the parent state root. The guest rejects the block on a read it cannot confirm, or on a malformed witness, and it accepts the block only if the folded post-state root matches the header.

## Checks in each host

The hosts check the public values to very different degrees:

- The Airbender host derives the expected block hash from the input. When the guest commits another, it fails `execute`, `prove`, `verify`, `--test-service` and `--service`.
- The Hypercube host parses the 112 bytes and logs them, but it does not compare them with the input or with a node.
- The ERE harness, ere-hosts, compares the 43 bytes with the fixture's `statelessOutputBytes` and records the result as `output_matched`.

So if you need a Hypercube proof to match the chain, compare `block_hash` and `post_state_root` with a node yourself.

## Keys and guest builds

The verifying key is derived from the guest ELF, so every new guest build gets a new key. Each release publishes the key of each guest right next to the guest.

Build flags count too. The Hypercube MFBD guest is built with `USE_HASH_KEY=OFF` and the Airbender guest with `USE_HASH_KEY=ON`, and the key depends on that flag. The Airbender key also depends on the recursion verifier programs, and its prover accepts only their default `RECURSION_*_BLAKE` modes.

Keys can also rotate without any guest change, when the zkVM itself moves. SP1 v6.9.0 loads a guest's initial memory differently from v6.6.0, so SP1 keys published for alpha.6 do not verify alpha.7 proofs. In the same release, a DirectState runner fix changed the MFBD and Airbender keys but left the ERE guest's key alone.

:::warning
Verify a proof with the key from the release that built its guest. Keys can change between releases even when the guest code does not.
:::

## Out of scope

A proof covers execution of the input it was given, and nothing more. It does not cover:

- Consensus validity. Nothing in the proof says the block is canonical or attested.
- Blob availability. The guest never sees blob data, so the proof cannot say the blobs were published.
- The parent header's origin. The guest anchors to the parent header in its input, so a verifier checks the committed roots or block hash against a trusted node.

## Further reading

- [Execution pipeline](./execution-pipeline.md)
- [Witness formats](./witness-formats.md)
- [Releases and assets](../reference/releases-and-assets.md)
- [Ethproofs posting](../provers/ethproofs-posting.md)
- [`docs/architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/architecture.md): the input envelope and the 112- and 32-byte layouts
