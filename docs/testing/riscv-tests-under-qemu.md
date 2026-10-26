---
title: RISC-V tests under QEMU
description: "The execution spec tests also run on bare-metal rv32im and rv64im builds of the core under QEMU, to catch bugs that only show on RISC-V."
sidebar_position: 2
---

# RISC-V tests under QEMU

A test should run as close to the real target as it can. For Zilkworm, the real target is a bare-metal RISC-V guest inside a zkVM. The QEMU runner in `qemu_runner/` builds the core for rv32im or rv64im. It then runs every [execution spec test](./execution-spec-tests.md) fixture on it under QEMU.

## Requirements

The QEMU suite uses the same pinned fixtures as the native suite, from `test-fixtures.json`. You need:

- CMake, Ninja, ctest, Git, Python 3, curl and tar
- a C++23 host compiler, for the fixture converter
- QEMU's RISC-V system emulators, `qemu-system-misc` on Ubuntu
- Node.js and npm, to install the cross-compiler

Install [xPack's RISC-V toolchain](https://xpack-dev-tools.github.io/riscv-none-elf-gcc-xpack/docs/install/). CI uses version 15.2.0-1.1:

```bash
npm i -g xpm
xpm install @xpack-dev-tools/riscv-none-elf-gcc@15.2.0-1.1 --global --verbose
export PATH=$HOME/.local/xPacks/@xpack-dev-tools/riscv-none-elf-gcc/15.2.0-1.1/.content/bin:$PATH
```

## Quickstart

Clone the repository and its submodule:

```bash
git clone https://github.com/erigontech/zilkworm
cd zilkworm
git submodule update --init --recursive
```

Run the suite on rv32im:

```bash
cd qemu_runner
make eest-rv32
```

The target fetches and converts the pinned fixtures, as the native suite does. It cross-compiles the core for rv32im and builds the test runner in `qemu_runner/build`. Then `ctest` starts one `qemu-system-riscv32` instance per fixture.

`make eest-rv64` runs the same suite on rv64im, in `qemu_runner/build64`. `make rerun-ctest` runs ctest again with verbose output and a longer per-test timeout. Add `ARCH=rv64` to target rv64im. The QEMU ctests read the native known-failures list, `zilk_core/dev/eest-known-failures.txt`.

## CI workflows

Two workflows run the suite: Qemu EESTs on RV32IM and Qemu EESTs on RV64IM. Each runs on pushes and pull requests to `main`, `master` and `release/*`. Each also runs on a cron every three days, and on demand. They use the `ghcr.io/erigontech/zilkworm-ci` image and add `qemu-system-misc`. Then they run `make xpack-elf-eest` and `make rerun-ctest`.

## Bugs that cross-architecture runs catch

The native suite catches logic and spec errors quickly. The QEMU runs catch bugs that stay hidden on a 64-bit x86 host. On rv32, `size_t`, `uintptr_t` and `long` are 32 bits wide, so truncation and overflow in size math show up. Alignment and struct-layout assumptions can break. `rv32im` has no atomics and no floating point, so an accidental use of either pulls in library code or breaks the link. A path that is cheap on x86_64 can also turn out costly in instructions on rv32, and in a zkVM every instruction is proven. The QEMU build is plain `rv32im`, so it does not check Airbender's ban on signed multiply and divide. The Airbender guest's post-link check covers that.

A test that fails on both native and QEMU usually has a logic or spec error. A test that fails only under QEMU points to a width, alignment or ISA issue.

## Further reading

- [Execution spec tests](./execution-spec-tests.md)
- [Execution pipeline](../inside-the-guest/execution-pipeline.md)
- [Benchmarks and CI](../reference/benchmarks-and-ci.md)
- [`qemu_runner/Makefile`](https://github.com/erigontech/zilkworm/blob/main/qemu_runner/Makefile): the QEMU build and test targets
