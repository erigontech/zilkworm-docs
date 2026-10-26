---
title: Execution pipeline
description: "A host feeds a block and its witness to a RISC-V guest, the guest commits public values, and the proof ties them to one guest ELF."
sidebar_position: 1
---

# Execution pipeline

Zilkworm is a C++ program that runs Ethereum blocks without a state database. It is compiled to RISC-V once per zkVM. The zkVM runs that guest program and proves the run.

## Four steps from block to proof

1. Witness in. The host fetches a block and its execution witness from a node. It packs them into one input buffer for the guest. On the ERE path, the harness passes a fixture's `statelessInputBytes` unchanged instead.
2. Guest runs. The zkVM runs the guest on that input. The guest anchors the pre-state to the parent header's state root. It runs every transaction, then checks the header's state root and gas used against the run.
3. Public values out. The guest commits a short, fixed record of the result. Depending on the guest, it holds state roots, the block hash, gas used or a validation flag.
4. Proof. The zkVM proves the run. The proof ties the public values to one guest ELF through that ELF's verifying key.

[Witness formats](./witness-formats.md) describes the inputs. [Proof guarantees](./proof-guarantees.md) lists each guest's public values and what a proof leaves out.

## Host and guest

Each zkVM integration has two programs.

- The host is Rust, under `prover/prover_*`. It runs natively. It fetches blocks over JSON-RPC, builds the input and drives the zkVM. In service mode it can also post proofs to Ethproofs.
- The guest is a bare-metal RISC-V program, under `prover/guest_*`. It reads the input, calls the C++ core and commits the public values. No operating system runs underneath it.

The core, `zilk_core`, is one C++23 library. It started as a fork of Silkworm's core: execution, state, protocol rules, trie, RLP and types. It builds natively for development and tests. For each zkVM it is cross-compiled into that zkVM's guest with the xPack `riscv-none-elf-gcc` toolchain.

The Hypercube host embeds its guest ELF at compile time. `prover/prover_hypercube/build.rs` points `include_elf!` at the ELF that `make z6m_guest` builds. The Airbender host loads its guest image from the path in `--guest-bin`. Both hosts also link C++ code directly. Their fetcher converts a node's witness to MFBD through the `prover/witness_ffi` bridge.

## Transaction execution with evmone

Zilkworm embeds evmone to execute transactions. Its fork, ZVM1, lives in `third_party/evmone`. The Zilkworm core handles blocks, the witness, state and the trie. It calls evmone once per transaction. evmone is one component of the guest, not the guest itself.

The zkVM-specific acceleration for hashing and curve math sits mostly in evmone's precompile code. [Precompiles and syscalls](./precompiles-and-syscalls.md) lists it per zkVM.

## Guest targets

Each zkVM gets its own guest build, and the zkVM sets the ISA.

| Guest | Source and build | ISA (`-march`) | Inputs |
|---|---|---|---|
| Hypercube MFBD guest, SP1 | `prover/guest_hypercube`, `make z6m_guest` | `rv64im` | MFBD, EJSN |
| HashState guest, SP1 | `prover/guest_hypercube`, `make z6m_guest_slib` | `rv64im` | `statelessInputBytes`, EJSN |
| Airbender guest | `prover/guest_airbender`, `make z6m_guest_airbender` | `rv32im_zicsr` | MFBD, EJSN |
| ZisK guest, draft PR #86 | `prover/guest_zisk`, `make z6m_guest_zisk` | `rv64im_zicsr_zba_zbb_zbs_zbkb` | MFBD, EJSN |

Airbender's proving machine has only the unsigned multiply and divide instructions. Its guest therefore avoids `mulh`, `mulhsu`, `div` and `rem`. A post-link check, `prover/guest_airbender/cmake/check_unsigned_muldiv.cmake`, guards this in the build.

The ZisK guest exists only on [PR #86](https://github.com/erigontech/zilkworm/pull/86), a draft based on alpha.6. No release ships it.

## DirectState and HashState

DirectState is the default state backend. It reads an MFBD bundle in place: accounts, storage, code and trie nodes sit in flat sections the guest does not decode. The run takes the pre-state root from the parent header that the first block names. When the block ends, the trie fold binds each touched key's pre-value to that root and recomputes the post-state root. That root must match the header. The Hypercube MFBD guest, the Airbender and ZisK guests and the native runner all use DirectState.

HashState takes the EIP-8025 `statelessInputBytes` unchanged. It walks each trie path from the parent state root at the moment of the read, so every read is checked against that root. A read the witness cannot confirm, as a value or as a proven absence, rejects the block. After the run, the guest folds the block's writes over the parent root and accepts only on a matching root. The backend is fixed at compile time with `-DZ6M_HASH_STATE=ON`, with no runtime switch. The HashState build is the ERE guest, released as `stateless-validator-zilkworm-sp1-<SP1 version>.elf`.

## Further reading

- [Witness formats](./witness-formats.md)
- [Proof guarantees](./proof-guarantees.md)
- [Precompiles and syscalls](./precompiles-and-syscalls.md)
- [Choosing a prover](../provers/choosing-a-prover.md)
- [`docs/hashstate.md`](https://github.com/erigontech/zilkworm/blob/main/docs/hashstate.md): the HashState backend in depth
