---
title: RISC-V tests under QEMU
description: "The execution spec tests also run on bare-metal rv32im and rv64im builds of the core under QEMU, to catch bugs that only show on RISC-V."
sidebar_position: 2
---

# RISC-V tests under QEMU

Here you will learn to run the spec tests on bare-metal RISC-V builds of the core, and what those runs catch that native runs miss.

A test should run as close to the real target as it can, and for Zilkworm the real target is a bare-metal RISC-V guest inside a zkVM. The QEMU runner in `qemu_runner/` builds the core for rv32im or rv64im. It then runs every [execution spec test](./execution-spec-tests.md) fixture on that build under QEMU.

## Requirements

The QEMU suite uses the same pinned fixtures as the native suite, from `test-fixtures.json`. You need:

- CMake, Ninja, ctest, Git, Python 3, curl and tar
- a C++23 host compiler, for the fixture converter
- QEMU's RISC-V system emulators, `qemu-system-misc` on Ubuntu
- Node.js and npm, to install the cross-compiler

Then install the cross-compiler, [xPack's RISC-V toolchain](https://xpack-dev-tools.github.io/riscv-none-elf-gcc-xpack/docs/install/). CI uses version 15.2.0-1.1:

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

Then run the suite on rv32im:

```bash
cd qemu_runner
make eest-rv32
```

Like the native suite, the target fetches and converts the pinned fixtures. It then cross-compiles the core for rv32im, builds the test runner in `qemu_runner/build`, and has `ctest` start one `qemu-system-riscv32` instance per fixture.

For rv64im, run `make eest-rv64` instead; it builds in `qemu_runner/build64`. `make rerun-ctest` runs ctest again with verbose output and a longer per-test timeout, and you add `ARCH=rv64` to target rv64im. The QEMU ctests share the native known-failures list, `zilk_core/dev/eest-known-failures.txt`.

## CI workflows

In CI, two workflows run the suite: Qemu EESTs on RV32IM and Qemu EESTs on RV64IM. Each one runs on pushes and pull requests to `main`, `master` and `release/*`, on a cron every three days, and on demand. Both start from the `ghcr.io/erigontech/zilkworm-ci` image and add `qemu-system-misc`. Then they run `make xpack-elf-eest` and `make rerun-ctest`.

## Bugs that cross-architecture runs catch

The native suite catches logic and spec errors quickly. The QEMU runs catch the bugs that stay hidden on a 64-bit x86 host.

On rv32, `size_t`, `uintptr_t` and `long` are 32 bits wide, so truncation and overflow in size math show up. Alignment and struct-layout assumptions can break too. Because `rv32im` has no atomics and no floating point, an accidental use of either pulls in library code or breaks the link. Cost matters as well: a path that is cheap on x86_64 can turn out costly in instructions on rv32, and in a zkVM every instruction is proven.

One check is left to the Airbender build. The QEMU build is plain `rv32im`, so it does not check Airbender's ban on signed multiply and divide; the Airbender guest's post-link check covers that.

This gives you a quick way to read a failure. A test that fails both natively and under QEMU usually has a logic or spec error. One that fails only under QEMU points to a width, alignment or ISA issue.

## Further reading

- [Execution spec tests](./execution-spec-tests.md)
- [Execution pipeline](../inside-the-guest/execution-pipeline.md)
- [Benchmarks and CI](../reference/benchmarks-and-ci.md)
- [`qemu_runner/Makefile`](https://github.com/erigontech/zilkworm/blob/main/qemu_runner/Makefile): the QEMU build and test targets
