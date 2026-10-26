---
title: Precompiles and syscalls
description: "Each guest hands hashing and big-number math to its zkVM's circuits, through SP1 ecalls or Airbender and ZisK CSRs."
sidebar_position: 3
---

# Precompiles and syscalls

This page shows you where each guest hands work to its zkVM's dedicated circuits, which call reaches which circuit, and what stays in plain RISC-V code.

Hashing and curve math take many RISC-V instructions, and a zkVM proves every instruction it runs, so plain code for these routines makes a long trace. That is why each zkVM offers dedicated circuits for them. The guest reaches a circuit through an `ecall` on SP1, or through a CSR access on Airbender and ZisK. Each such call replaces a software routine the prover would otherwise trace cycle by cycle.

## SP1 ecalls

Both Hypercube guests declare their ecalls in `prover/guest_hypercube/src/include/sp1_syscalls.hpp`. Most wrappers are always inlined and compile to a single `ecall`, and most call sites sit in ZVM1, the evmone fork in `third_party/evmone`.

| Ecalls | Called from | Used for |
|---|---|---|
| `keccak_permute` | `lib/evmone_precompiles/keccak.c` | Every Keccak-256 hash: KECCAK256, trie nodes, addresses |
| `sha256_extend`, `sha256_compress` | `lib/evmone_precompiles/sha256.cpp` | The SHA256 precompile, and the public-values digest |
| `secp256k1_add`, `secp256k1_double` | `lib/evmone_precompiles/secp256k1.cpp` | ECRECOVER and transaction sender recovery |
| `uint256_mulmod` | `lib/evmone/instructions.hpp`, `lib/evmone_precompiles/modexp.cpp` | ADDMOD, MULMOD and MODEXP |
| `bn254_fp_*mod`, `bn254_fp2_*mod` | `lib/evmone_precompiles/modarith.hpp`, `pairing/field_template.hpp` | Field math for ECADD, ECMUL and ECPAIRING |
| `bn254_add`, `bn254_double` | evmone's precompile dispatch, `test/state/precompiles.cpp` | Point math for ECADD and ECMUL |
| `bls12381_fp_*mod`, `bls12381_fp2_*mod` | `cmake/patch_blst_sp1.sh`, a build-time patch of blst | The BLS12-381 precompiles and KZG point evaluation |

The header also declares ecalls that nothing in the guest calls at the current ZVM1 pin. Those are the secp256r1 and ed25519 point ecalls, `bls12381_add` and `bls12381_double`, `u256x2048_mul`, and the two `uint256_*_with_carry` calls.

Public values take a different route. The guest commits them by writing to file descriptor 13, `SP1_FD_PUBLIC_VALUES`, and the runtime in `prover/guest_hypercube/src/sp1_runtime.cpp` buffers those bytes. At halt it hashes them with SHA-256 and commits the digest.

## Airbender CSRs

The Airbender guest reaches its delegation circuits by writing to CSRs, which `prover/guest_airbender/src/include/airbender_csr.hpp` names.

| CSR | Name | Use in the guest |
|---|---|---|
| `0x7C0` | Non-determinism oracle | Reads the input words and writes log output |
| `0x7CA` | BigInt | 256-bit add, subtract, multiply, compare and copy |
| `0x7CC`, `0x7CD`, `0x7CE` | keccak_f1600: theta and rho, column parity, chi5 | One Keccak permutation per run of writes |
| `0x7C7` | Blake2s | Declared only; no guest code calls it |

The curve and scalar logic around these calls stays RISC-V code in ZVM1. The alpha.5 release notes map each precompile to a delegation:

| Precompile | Delegation | Code path |
|---|---|---|
| ECRECOVER, and every transaction's sender recovery | BigInt | evmone's secp256k1, with Montgomery field arithmetic on BigInt |
| SHA256, RIPEMD160, IDENTITY, BLAKE2F | None | Plain rv32 code |
| MODEXP | BigInt | Montgomery exponentiation for 256-bit operands; the generic path otherwise |
| ECADD, ECMUL, ECPAIRING | BigInt | bn254 field arithmetic |
| POINT_EVALUATION and the BLS12-381 precompiles | BigInt | blst, patched at build time to multiply on BigInt |
| P256VERIFY | BigInt | evmone's generic Montgomery field template |
| KECCAK256, and every hash the guest computes | keccak_f1600 | One delegation run per permutation |

BigInt also carries the EVM's own 256-bit add, subtract and multiply, along with its 32-byte copies.

## ZisK CSRs on PR #86

The ZisK guest exists only on [draft PR #86](https://github.com/erigontech/zilkworm/pull/86). It calls ZisK's CSR precompiles, in the range `0x800` to `0x819`, and its `memcpy`, `memmove`, `memset` and `memcmp` go to ZisK's DMA precompiles.

| Area | ZisK precompiles |
|---|---|
| keccak-f | `0x800` |
| SHA256 | `0x805` |
| ADDMOD, MULMOD, and MODEXP up to 32-byte operands | `0x802` |
| ECRECOVER | `0x802`, `0x803`, `0x804`, plus square-root, inverse and GLV-split hints |
| ECADD, ECMUL, ECPAIRING | `0x802`, `0x806`, `0x807`, `0x808` to `0x80A` |
| BLS12-381 and KZG, through patched blst | `0x80B`, `0x80E` to `0x810`, plus an inverse hint |
| BLAKE2F | `0x819` |
| P256VERIFY | `0x802`, `0x817`, `0x818`, plus an inverse hint |
| Memory copy, set and compare | DMA `0x813`, `0x814`, `0x816` |
| EVM ADD, MUL, EXP, MOD | `0x811` for ADD, `0x801` for MUL and EXP, `0x802` for MOD |

RIPEMD160, IDENTITY and MODEXP with operands over 32 bytes stay in software. DIV, SDIV and SMOD use a division hint that the guest checks.

Hints deserve a closer look. A hint, or fcall, returns a value the prover supplies freely, so the guest checks every hint before it uses the result. A bad inverse, square-root or division hint halts the run with an error, and no proof can exist. The one exception is a bad GLV-split hint: the guest just falls back to the software split, which needs no hint.

## Further reading

- [Execution pipeline](./execution-pipeline.md)
- [ZisK prover](../provers/zisk-prover.md)
- [`prover/guest_hypercube/src/include/sp1_syscalls.hpp`](https://github.com/erigontech/zilkworm/blob/main/prover/guest_hypercube/src/include/sp1_syscalls.hpp): the SP1 ecall declarations
- [`docs/airbender_architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/airbender_architecture.md): the Airbender guest, its memory map and CSR delegations
