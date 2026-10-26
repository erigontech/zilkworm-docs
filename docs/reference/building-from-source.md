---
title: Building from source
description: "Build the native tools, the guests and the host provers from source, and run the unit tests."
sidebar_position: 3
---

# Building from source

Follow this page to build Zilkworm's native tools, guests and host provers from source, and to run the unit tests.

## Native build

For the native build you need CMake 3.28 or newer, Ninja and GCC 15. Clone the repository with its one submodule, `third_party/evmone`, which holds ZVM1, the Zilkworm fork of evmone. Then configure and build:

```bash
git clone https://github.com/erigontech/zilkworm
cd zilkworm
git submodule update --init --recursive
cmake -DCMAKE_BUILD_TYPE=Release -B build -G Ninja -S .
cmake --build build -j$(nproc)
```

To build the guests you also need the xPack `riscv-none-elf-gcc` cross-compiler. CI pins version `15.2.0-1.1`:

```bash
npm install -g xpm
xpm install @xpack-dev-tools/riscv-none-elf-gcc@15.2.0-1.1 --global
```

The Makefile puts the first xPack GCC it finds under `~/.local/xPacks` on `PATH`, or under `~/Library/xPacks` on macOS. Since it takes the first one, keep only `15.2.0-1.1` installed, or a guest can build with an older compiler.

## state_transition

The native build produces `build/zilk_core/dev/cli/state_transition`, which runs the whole state transition outside any zkVM. Point it at a bundle:

```bash
build/zilk_core/dev/cli/state_transition <flatWitnessBundle.mfbd>
```

It also takes an EEST blockchain-test JSON or a directory, and [CLI reference](./cli-reference.md#state_transition) lists its inputs and exit codes.

## Converters

Three converters sit next to it, and each one writes the MFBD bundle that [Witness formats](../inside-the-guest/witness-formats.md) describes.

- `json_witness_to_flat_bundle` reads a witness JSON document on stdin and writes the bundle to stdout.
- `legacy_to_flat_bundle <in.bin> <out.mfbd>` converts an older `unifiedBlockAndStateRlp<N>.bin` file.
- `eest_to_flat_bundle` converts EEST blockchain-test JSON. Its `emit --json <PATH> --index <N>` writes one case to stdout, and `bulk-convert --input-dir <D> --output-dir <D>` mirrors a whole tree.

## Guest targets

Each guest target cross-compiles the C++ core for one zkVM.

| Target | Builds | Output |
|---|---|---|
| `make z6m_guest` | Hypercube DirectState guest for MFBD input, `USE_HASH_KEY=OFF` | `prover/guest_hypercube/build/z6m_guest.elf` |
| `make z6m_guest_slib` | Hypercube HashState guest for `statelessInputBytes`, with `-DZ6M_HASH_STATE=ON` | `prover/guest_hypercube/build-slib/z6m_guest.elf` |
| `make z6m_guest_airbender` | Airbender guest, `USE_HASH_KEY=ON` | `prover/guest_airbender/build/z6m_guest.bin` and `.text` |
| `make z6m_guest_zisk` | ZisK guest, only on PR #86; see [ZisK prover](../provers/zisk-prover.md) | `prover/guest_zisk/build/z6m_guest.elf` |

The Hypercube guests use the toolchain file `prover/guest_hypercube/cmake/riscv64im-sp1.cmake`, and the Airbender guest uses `prover/guest_airbender/cmake/riscv32im.cmake`. Keep an eye on `USE_HASH_KEY`, because it changes the verification key, as [Releases and assets](./releases-and-assets.md#verification-keys) explains.

## Host targets

On the host side, three targets build the provers and a fourth builds `derive_vk`.

| Target | Builds | Output |
|---|---|---|
| `make z6m_prover` | The MFBD guest and the Hypercube host that embeds it | `prover/target/release/z6m_prover` |
| `make z6m_prover_slib` | The same host with the HashState guest embedded | `prover/target/release/z6m_prover` |
| `make z6m_prover_airbender` | The Airbender guest and its host | `prover/prover_airbender/target/release/z6m_prover_airbender` |
| `make derive_vk` | `derive_vk <elf> <vk>`, which writes a guest's 32-byte SP1 key | `prover/target/release/derive_vk` |

`make z6m_prover` and `make z6m_prover_slib` write the same binary, so whichever you built last wins. Both `make z6m_guest_vk` and `make ere-bin` run `derive_vk` with `SP1_PROVER=mock`.

:::caution
If your tree ran `make z6m_prover_slib` before `v0.1.0-alpha.7`, delete `prover/guest_hypercube/build/z6m_guest.elf` once. Otherwise `make z6m_prover` keeps embedding the HashState guest.
:::

The Airbender host builds with GPU support by default. If you have no CUDA, build it with `cargo build --release --no-default-features` in `prover/prover_airbender`, as CI does. Each Rust workspace pins its own toolchain in `rust-toolchain.toml`.

## Tests

To build and run the unit tests the way CI does:

```bash
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug -DBUILD_TESTING=ON
cmake --build build --target zilkworm.tests
ctest --test-dir build --output-on-failure --parallel
```

Add `-DZ6M_HASH_STATE=ON` to run them on the HashState backend. For the EEST suites, see [Execution spec tests](../testing/execution-spec-tests.md) and [RISC-V tests under QEMU](../testing/riscv-tests-under-qemu.md).

## Code style

The C++ code follows Silkworm's style, which is the C++ Core Guidelines plus Google's C++ style guide, with project changes. The format rules live in `zilk_core/.clang-format`, and the lint checks in `zilk_core/.clang-tidy`.

## Repo docs

The Zilkworm repository has its own docs on each part:

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
