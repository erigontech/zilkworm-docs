---
title: Background
description: Background of the technology and internals of the zkEVM
sidebar_position: 1
---

# Background

Zilkworm is a C++ Ethereum block execution engine, compiled to RISC-V and run inside a zkVM to produce cryptographic proofs of correct execution. This page explains the ideas behind that engine: what a block proof is, why RISC-V zkVMs make it practical, how Zilkworm is put together, and how it runs live today. For hands-on material, start with the [Quickstart](../getting-started/quickstart-hypercube.md) instead.

This and subsequent pages would use the term "zkEVM" to mean the combined Zilkworm block execution code and the zkVM enclave.

## The proof flow

To create a proof of a full block execution, the state prior to that block must be known. Only a fraction of the state is needed to execute that block (or verify its correctness).

When this block arrives, the corresponding chunk of state needed is evaluated and passed into the zkEVM. The zkEVM then runs the execution using that fork's rules and outputs a signal to certify whether the block is valid and the state-root of the transition is correct.

The state chunk along with all the other data needed for a block is also called the witness. The witness is kept private, as in, the proof verifier ultimately does not need to know the witness to verify the correctness of the proof. In other words, there is no witness that can be passed to a correct zkEVM machinery to generate a bogus proof (the soundness property).

The proof is likely a fixed size around 300KB-1MB for any size of block. It is easy to verify, and a consumer grade laptop could do that in close to 10ms. This does not change with the size of the block.

If proofs are generated in "realtime", that is right after the block is produced, they can be used as an alternate mechanism to validate blocks. Thereby, proofs as a way of verifying blocks can help scale block's size.

## RISC-V-based zkVMs

The zkVMs that Zilkworm targets, such as SP1 Hypercube and ZkSync Airbender, run RISC-V compiled programs and generate proof of correct execution. This means any arbitrary logic that can be written in a language with a RISC-V compiler and tooling can be proved.

The zkVM emulates the RISC-V execution inside of a container. The elements of computing for the executor, such as memory, registers, the program counter are tracked. The state of these elements is recorded at every point of execution into a continuous trace. This trace is then passed through a prover that stitches together the proof of change of state, through intermediate constraints on various RISC-V operations.

The proving is usually a heavily parallelizable operation and is performed well on compute units of a GPU. The prover passes the execution shards to multiple cores of multiple GPUs which then return intermediate first-level proofs. These first-level proofs are further recursed to create a chain of proof of valid-proofs. So, in this process they get compressed down to a manageably small size.

In the current generation of general-purpose zkVM provers, STARK proofs are the most common. There is also support for compressing the STARK proof into a wrapped SNARK proof to further reduce the proof size and verification time.

The choice of RISC-V as the ISA is quite apt. It is open-source, minimal, generic enough with wide enough adoption in the industry. While mainstream RISC-V personal computing devices are very rare, it is commonplace in embedded hardware still.

In our initial assessment of viability of Zilkworm, it was important to note that C++ has mature support in the RISC-V ecosystem including efficient compilers and tooling. This is supplemented by the existence of many examples of high-performance C++ code for embedded systems. This means we can use those examples to improve the efficiency of Zilkworm going forward.

## Zilkworm internals

Zilkworm has 3 major components that are integrated together:

- The core: handles block processing, witness, state and trie management
- ZVM1 (a fork of EVMOne): handles EVM transaction processing
- Prover: integrates to and handles zkVM execution and proving, written in rust

The core is the part that the zkVM entrypoint eventually hands program execution to. It manages the loading of the witness into the state, its sanitization and basic checks, loads the block(s) and transaction(s) from the given payload and then invokes ZVM1's transaction execution mechanism to check per-transaction validity.

After all transaction processing is complete, it performs post-block protocol actions and then goes through a Merkle-Patricia-Trie validation loop. This loop loads the tree in a fixed linear stack starting from the state-root of the parent header. It then verifies that all the pre-state is correct from the initially loaded witness, and applies all state changes after all the execution. Eventually the final state-root is calculated and matched with the one present in the current block's header.

ZVM1 is Zilkworm's fork of EVMOne, a fast implementation of the EVM interpreter also written in C++. It reads the bytes in the code invoked by a transaction and executes the smart contract code while maintaining an internal stack of state after every opcode execution. It compounds the state changes and then hands over control back to the core loop.

Finally, the prover consists of service-level code written in Rust that directly invokes the target zkVM's executor or prover. The program itself and its entrypoint are defined in the compiled ELF (in rv32- or rv64-im). The zkVM's internals handle the request for execution or proving and return the result. This means that a proof is generated using the zkVM's prover code (maintained by the respective zkVM team) on any attached GPUs on the current machine.

### Repository map

At runtime the components arrange into three layers: the native host, the C++ core that compiles to the guest program, and RISC-V toolchain specific to the zkVM:

- **Prover host (Rust, `prover/*`, e.g. `prover/prover_hypercube/`).** Runs natively on x86_64 or ARM. It fetches block data and witness from an Ethereum node over JSON-RPC (`debug_getRawBlock`, `debug_executionWitness`), encodes them into a single binary blob (mfbd format) for the guest, drives the prove, and — in service mode — posts finished proofs to Ethproofs.
- **Guest program (RISC-V ELF, `prover/guest_*`, e.g. `prover/guest_hypercube/`).** The program whose execution is actually proven. It reads the encoded input from the zkVM's stdin, hands it to the core, and commits the execution result (cumulative gas used, or a failure sentinel) as the proof's public output.
- **Zilk core (C++ static library, `zilk_core/`).** A fork of Silkworm's core: execution, state, protocol rules, trie, RLP and types. It is compiled both natively (for development and testing via the `state_transition` CLI) and cross-compiled to RISC-V for the guest. ZVM1 lives alongside it in `third_party/evmone/`.

The data flow through the layers is: **fetch** (host retrieves block + witness from a node) → **encode** (host packs them into the guest's input format) → **execute** (the zkVM runs the guest ELF, which calls into the C++ core to execute every transaction) → **prove** (the zkVM turns the execution trace into a succinct proof) → **verify** (anyone checks the proof against the guest program's verifying key).

## Prover integration

Prover is a term being used interchangeably with zkVM and can mean that or the overall mechanism of proving. In order to integrate a zkVM, its memory layout, entrypoint semantics, ecall semantics, exit semantics etc. need to be taken care of.

Further, the zkVMs usually provide precompiled proving paths (custom circuits) for certain cryptographic operations such as Keccak, SHA, ECC, Big-Integer and others. They usually have different calling conventions. So these cryptographic calls are implemented as glue-code macros at various points within ZVM1 and the core. In our case, each wrapper compiles down to a single `ecall` instruction, and the zkVM executes the operation with a dedicated circuit, out of band. In the SP1 Hypercube integration this covers, among others, the Keccak-256 permutation (which dominates trie hashing), SHA-256 compression, secp256k1 point operations for ecrecover, BN254 and BLS12-381 curve and field arithmetic, and 256-bit modular multiplication.

Another aspect of the integration is the guest's runtime environment. The guest is a bare-metal program: there is no operating system and no standard C library underneath it. Zilkworm's SP1 Hypercube guest therefore ships its own hand-written assembly entrypoint. It also contains some hand-tuned `memcpy`/`memmove` routines — inside a zkVM every instruction becomes trace rows to prove, so even these basics are written for minimal cycle count. The whole C++ codebase is cross-compiled with a bare-metal RISC-V GCC toolchain into a single rv64im ELF.

The host side mirrors this: the Rust program in `prover/prover_hypercube/` embeds the guest ELF and uses the zkVM's SDK to execute it (for fast dry-runs) or prove it (on CPU, on a local GPU, or via a proving network). Because the proof commits to the exact guest binary through its verifying key, every proof also identifies precisely which version of Zilkworm produced it.

## Live prover for mainnet

An important aspect of Zilkworm's involvement in the community and the real world is its continuous participation in [Ethproofs](https://ethproofs.org: the public registry and leaderboard where provers post real-time proofs of Ethereum mainnet blocks, alongside proving time and cycle counts, on the same blocks as every other participating team.

The `z6m_prover` binary has a service mode that follows the chain head in a continuous fetch → execute → prove loop, persisting each proof to disk, and three flags turn that same service into an Ethproofs-posting one — reporting each block as queued, proving, and finally proved with the serialized proof attached. Everything needed to run it — the host binary, the guest ELF, and the GPU proving server — ships in the `somnergy/z6m_prover` docker image, so anyone with an NVIDIA GPU and an RPC node exposing the debug namespace can reproduce the setup that proves mainnet blocks today.

Running the live prover end to end is covered in the getting-started guides:

- [Quickstart: Hypercube prover](../getting-started/quickstart-hypercube.md) — the fast path from docker pull to a first proof.
- [Running the prover](../getting-started/running-the-prover.md) — service mode in depth, proof types, building from source.
- [Ethproofs prover](../getting-started/ethproofs-prover.md) — cluster registration and the posting lifecycle.
