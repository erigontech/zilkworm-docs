---
title: Execution pipeline
description: "A host feeds a block and its witness to a RISC-V guest, the guest commits public values, and the proof ties them to one guest ELF."
sidebar_position: 1
---

# Execution pipeline

This page follows a block from the node to the proof, so you know which program does what and where the state comes from.

Zilkworm is a C++ program that runs Ethereum blocks without a state database. It is compiled to RISC-V once per zkVM, and the zkVM runs that guest program and proves the run.

## Four steps from block to proof

1. The host fetches a block and its execution witness from a node and packs them into one input buffer for the guest. On the ERE path, the harness passes a fixture's `statelessInputBytes` through unchanged instead.
2. The zkVM runs the guest on that input. The guest anchors the pre-state to the parent header's state root and runs every transaction. Then it checks the header's state root and gas used against the run.
3. The guest commits a short, fixed record of the result as its public values. Depending on the guest, that record holds state roots, the block hash, gas used or a validation flag.
4. The zkVM proves the run. The proof ties the public values to one guest ELF through that ELF's verifying key.

[Witness formats](./witness-formats.md) describes the inputs, and [Proof guarantees](./proof-guarantees.md) lists each guest's public values and what a proof leaves out.

## Host and guest

Each zkVM integration has two programs, a host and a guest. The host is Rust, under `prover/prover_*`, and it runs natively. It fetches blocks over JSON-RPC, builds the input and drives the zkVM. In service mode it can also post proofs to Ethproofs.

The guest is a bare-metal RISC-V program under `prover/guest_*`, with no operating system running underneath it. All it does is read the input, call the C++ core and commit the public values.

That core, `zilk_core`, is one C++23 library. It started as a fork of Silkworm's core, covering execution, state, protocol rules, trie, RLP and types. You can build it natively for development and tests, and for each zkVM it is cross-compiled into that zkVM's guest with the xPack `riscv-none-elf-gcc` toolchain.

The two shipped hosts find their guest in different ways. The Hypercube host embeds its guest ELF at compile time, since `prover/prover_hypercube/build.rs` points `include_elf!` at the ELF that `make z6m_guest` builds. The Airbender host loads its guest image from the path in `--guest-bin`. Both hosts also link C++ code directly: their fetcher converts a node's witness to MFBD through the `prover/witness_ffi` bridge.

## Transaction execution with evmone

Zilkworm embeds evmone to execute transactions, and its fork, ZVM1, lives in `third_party/evmone`. The split is simple. The Zilkworm core handles blocks, the witness, state and the trie, and it calls evmone once per transaction. So evmone is one component of the guest, not the guest itself.

Most of the zkVM-specific acceleration for hashing and curve math sits in evmone's precompile code. [Precompiles and syscalls](./precompiles-and-syscalls.md) lists it per zkVM.

## Guest targets

Each zkVM gets its own guest build, and the zkVM sets the ISA.

| Guest | Source and build | ISA (`-march`) | Inputs |
|---|---|---|---|
| Hypercube MFBD guest, SP1 | `prover/guest_hypercube`, `make z6m_guest` | `rv64im` | MFBD, EJSN |
| HashState guest, SP1 | `prover/guest_hypercube`, `make z6m_guest_slib` | `rv64im` | `statelessInputBytes`, EJSN |
| Airbender guest | `prover/guest_airbender`, `make z6m_guest_airbender` | `rv32im_zicsr` | MFBD, EJSN |
| ZisK guest, draft PR #86 | `prover/guest_zisk`, `make z6m_guest_zisk` | `rv64im_zicsr_zba_zbb_zbs_zbkb` | MFBD, EJSN |

Airbender's proving machine has only the unsigned multiply and divide instructions, so its guest avoids `mulh`, `mulhsu`, `div` and `rem`. A post-link check, `prover/guest_airbender/cmake/check_unsigned_muldiv.cmake`, guards this in the build.

The ZisK guest exists only on [PR #86](https://github.com/erigontech/zilkworm/pull/86), a draft based on alpha.6, and no release ships it.

## DirectState and HashState

Zilkworm has two state backends, and the backend decides which input a guest takes.

DirectState is the default. It reads an MFBD bundle in place: accounts, storage, code and trie nodes sit in flat sections the guest does not decode. The run takes the pre-state root from the parent header that the first block names. When the block ends, the trie fold binds each touched key's pre-value to that root and recomputes the post-state root, which must match the header. The Hypercube MFBD guest, the Airbender and ZisK guests and the native runner all use DirectState.

HashState takes the EIP-8025 `statelessInputBytes` unchanged and checks as it goes. It walks each trie path from the parent state root at the moment of the read, so every read is checked against that root. If the witness can't confirm a read, either as a value or as a proven absence, the block is rejected. After the run, the guest folds the block's writes over the parent root and accepts only on a matching root.

The backend is fixed at compile time with `-DZ6M_HASH_STATE=ON`, and there is no runtime switch. That HashState build is the ERE guest, released as `stateless-validator-zilkworm-sp1-<SP1 version>.elf`.

## Further reading

- [Witness formats](./witness-formats.md)
- [Proof guarantees](./proof-guarantees.md)
- [Precompiles and syscalls](./precompiles-and-syscalls.md)
- [Choosing a prover](../provers/choosing-a-prover.md)
- [`docs/hashstate.md`](https://github.com/erigontech/zilkworm/blob/main/docs/hashstate.md): the HashState backend in depth
