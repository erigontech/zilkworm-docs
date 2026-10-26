---
title: Building from source
description: "Build the native tools, the guests and the host provers from source, and run the unit tests."
sidebar_position: 3
---

# Building from source

## Native build

You need CMake 3.28 or newer, Ninja and GCC 15. Clone the repository with its one submodule, `third_party/evmone`. It holds ZVM1, the Zilkworm fork of evmone.

```bash
git clone https://github.com/erigontech/zilkworm
cd zilkworm
git submodule update --init --recursive
cmake -DCMAKE_BUILD_TYPE=Release -B build -G Ninja -S .
cmake --build build -j$(nproc)
```

The guests also need the xPack `riscv-none-elf-gcc` cross-compiler. CI pins version `15.2.0-1.1`:

```bash
npm install -g xpm
xpm install @xpack-dev-tools/riscv-none-elf-gcc@15.2.0-1.1 --global
```

The Makefile puts the first xPack GCC it finds under `~/.local/xPacks` on `PATH`. On macOS it looks under `~/Library/xPacks`. Keep only `15.2.0-1.1` installed, or a guest can build with an older compiler.

## state_transition

The native build produces `build/zilk_core/dev/cli/state_transition`. It runs the whole state transition outside any zkVM.

```bash
build/zilk_core/dev/cli/state_transition <flatWitnessBundle.mfbd>
```

It also takes an EEST blockchain-test JSON or a directory. [CLI reference](./cli-reference.md#state_transition) lists its inputs and exit codes.

## Converters

Three converters sit next to it. Each writes the MFBD bundle that [Witness formats](../inside-the-guest/witness-formats.md) describes.

- `json_witness_to_flat_bundle` reads a witness JSON document on stdin and writes the bundle to stdout.
- `legacy_to_flat_bundle <in.bin> <out.mfbd>` converts an older `unifiedBlockAndStateRlp<N>.bin` file.
- `eest_to_flat_bundle` converts EEST blockchain-test JSON. `emit --json <PATH> --index <N>` writes one case to stdout. `bulk-convert --input-dir <D> --output-dir <D>` mirrors a whole tree.

## Guest targets

Each guest target cross-compiles the C++ core for one zkVM.

| Target | Builds | Output |
|---|---|---|
| `make z6m_guest` | Hypercube DirectState guest for MFBD input, `USE_HASH_KEY=OFF` | `prover/guest_hypercube/build/z6m_guest.elf` |
| `make z6m_guest_slib` | Hypercube HashState guest for `statelessInputBytes`, with `-DZ6M_HASH_STATE=ON` | `prover/guest_hypercube/build-slib/z6m_guest.elf` |
| `make z6m_guest_airbender` | Airbender guest, `USE_HASH_KEY=ON` | `prover/guest_airbender/build/z6m_guest.bin` and `.text` |
| `make z6m_guest_zisk` | ZisK guest, only on PR #86; see [ZisK prover](../provers/zisk-prover.md) | `prover/guest_zisk/build/z6m_guest.elf` |

The Hypercube guests use the toolchain file `prover/guest_hypercube/cmake/riscv64im-sp1.cmake`. The Airbender guest uses `prover/guest_airbender/cmake/riscv32im.cmake`. `USE_HASH_KEY` changes the verification key, as [Releases and assets](./releases-and-assets.md#verification-keys) explains.

## Host targets

| Target | Builds | Output |
|---|---|---|
| `make z6m_prover` | The MFBD guest and the Hypercube host that embeds it | `prover/target/release/z6m_prover` |
| `make z6m_prover_slib` | The same host with the HashState guest embedded | `prover/target/release/z6m_prover` |
| `make z6m_prover_airbender` | The Airbender guest and its host | `prover/prover_airbender/target/release/z6m_prover_airbender` |
| `make derive_vk` | `derive_vk <elf> <vk>`, which writes a guest's 32-byte SP1 key | `prover/target/release/derive_vk` |

`make z6m_prover` and `make z6m_prover_slib` write the same binary, so the last one built wins. `make z6m_guest_vk` and `make ere-bin` run `derive_vk` with `SP1_PROVER=mock`.

:::caution
A tree that ran `make z6m_prover_slib` before `v0.1.0-alpha.7` must delete `prover/guest_hypercube/build/z6m_guest.elf` once. Otherwise `make z6m_prover` keeps embedding the HashState guest.
:::

The Airbender host builds with GPU support by default. Without CUDA, build it with `cargo build --release --no-default-features` in `prover/prover_airbender`, as CI does. Each Rust workspace pins its toolchain in `rust-toolchain.toml`.

## Tests

The unit tests build and run as in CI:

```bash
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTING=ON
cmake --build build --target zilkworm.tests
ctest --test-dir build --output-on-failure --parallel
```

Add `-DZ6M_HASH_STATE=ON` to run them on the HashState backend. The EEST suites are on [Execution spec tests](../testing/execution-spec-tests.md) and [RISC-V tests under QEMU](../testing/riscv-tests-under-qemu.md).

## Code style

The C++ code follows Silkworm's style: the C++ Core Guidelines and Google's C++ style guide, with project changes.
`zilk_core/.clang-format` holds the format rules.
`zilk_core/.clang-tidy` holds the lint checks.

## Repo docs

- [`docs/architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/architecture.md): the layers, the input envelope and the public values.
- [`docs/mfbd_design_specs.md`](https://github.com/erigontech/zilkworm/blob/main/docs/mfbd_design_specs.md): the MFBD spec for producers and verifiers.
- [`docs/hashstate.md`](https://github.com/erigontech/zilkworm/blob/main/docs/hashstate.md): the HashState backend and its SSZ input.
- [`docs/airbender_architecture.md`](https://github.com/erigontech/zilkworm/blob/main/docs/airbender_architecture.md): the rv32 guest, its toolchain and its CSR delegations.
- [`docs/release.md`](https://github.com/erigontech/zilkworm/blob/main/docs/release.md): the release process.

## Further reading

- [Execution spec tests](../testing/execution-spec-tests.md)
- [CLI reference](./cli-reference.md)
- [Benchmarks and CI](./benchmarks-and-ci.md)
- [`Makefile`](https://github.com/erigontech/zilkworm/blob/main/Makefile)
