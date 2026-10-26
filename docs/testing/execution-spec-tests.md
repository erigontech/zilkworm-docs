---
title: Execution spec tests
description: "Zilkworm runs the Ethereum execution spec tests natively and inside the Hypercube and Airbender guests, on a checksum-pinned fixture release."
sidebar_position: 1
---

# Execution spec tests

The Ethereum Execution Spec Tests, or EESTs, are the test vectors for the Ethereum execution layer. They are generated from the execution specs and cover every fork and many edge cases. A failing test usually points to a consensus bug. The fixtures ship as releases of [ethereum/execution-specs](https://github.com/ethereum/execution-specs/releases), and the docs live at [eest.ethereum.org](https://eest.ethereum.org/). CI runs them natively and inside two zkVMs.

## Fixture pins

The fixtures come from release tarballs, pinned by checksum. The manifest `test-fixtures.json` names each tarball's URL, sha256, size and the paths to extract. It has one entry, `eest_stable`. That entry pins `tests@v21.0.1`, sha256 `b9b14391ed1a625e4ca9a058c055d0eacd98a42b76c7a6127c640cdc2d3c9439`, and extracts `fixtures/blockchain_tests`.

```bash
make test-fixtures
```

This runs `tools/test-fixtures.sh`. It downloads each tarball, checks its sha256 and extracts it into `test-fixtures-cache/<key>/`. A rerun does nothing while the pin matches. To move a pin, edit `test-fixtures.json`.

The HashState suite uses a second release, `tests-zkevm@v21.0.6`. The Makefile downloads it with `gh release download`, so it is not checksum-pinned.

## Native run

`make eest-blockchain-tests` needs CMake, Ninja, ctest, a C++23 compiler, Git, Python 3, curl and tar. It needs no Rust. Rust is needed only for the targets that build `z6m_prover`, such as `selftest` and `eest-prover-test`. [Building from source](../reference/building-from-source.md) lists the toolchain.

```bash
git clone https://github.com/erigontech/zilkworm
cd zilkworm
git submodule update --init --recursive
make eest-blockchain-tests
```

The target fetches the pinned tarball. It converts every JSON fixture to MFBD with `eest_to_flat_bundle bulk-convert`. The converted set lands in `test-fixtures-cache/mfbd-<sha>/`, named after the pin. A rerun skips the fetch and the conversion while the pin and the converter binary stay the same. The target then builds with `-DBUILD_TESTING=ON` and runs `ctest --parallel`, one case per fixture file.

## Make targets

| Target | What it does |
|---|---|
| `make test-fixtures` | Downloads, checks and extracts the pinned tarballs |
| `make selftest` | Converts one fixture, `add11`, to MFBD and runs it with `z6m_prover execute` |
| `make eest-blockchain-tests` | Runs the converted MFBD set through native ctest |
| `make eest-blockchain-tests-json` | Runs native ctest on the JSON fixtures, with no conversion |
| `make eest-prover-test` | Runs the MFBD set through `z6m_prover --test-service`, under the SP1 executor |
| `make eest-prover-test-json` | Runs the JSON fixtures through `z6m_prover --test-service` |
| `make eest-zkevm-tests` | Runs the `tests-zkevm@v21.0.6` fixtures through a native HashState build in `build/zkevm` |

`make tests` and `make tests-json` are broken: they pass `--execution-log-dir`, a flag `z6m_prover` does not have.

## Runs inside the zkVMs

CI also runs the pinned set inside the guests.

- The HyperCube EEST Blockchain Tests workflow builds `z6m_prover`. It runs the MFBD set through `tools/scripts/eest_runner.py` under the SP1 executor. The job fails above a set failure threshold.
- The Airbender EEST Blockchain Tests workflow builds the Airbender guest and host. It runs `make eest` in `prover/prover_airbender`. The job fails only on failures outside the known-failures lists.

The native suite runs in the EEST Blockchain Tests workflow. The QEMU runs are on [RISC-V tests under QEMU](./riscv-tests-under-qemu.md).

## Known failures

`zilk_core/dev/eest-known-failures.txt` lists fixtures that the runner gets wrong on every target. Their ctests are registered `WILL_FAIL`, so a listed fixture that passes again fails until it comes off the list. As of v0.1.0-alpha.7 the list holds only its header, so the native suite expects no failures.

`prover/prover_airbender/eest-known-failures.txt` lists 25 fixtures that the Airbender guest does not finish. They hit resource limits such as the execution cycle cap; they are not wrong results. The Airbender job adds the native list to its own.

## State-root check before a release

Before a release, `tools/scripts/release_state_root_check.sh` re-runs a directory of mainnet blocks natively. It builds `state_transition` in Release mode. It then runs every `<dir>/<N>/flatWitnessBundle<N>.mfbd` file in parallel. It reports each block whose output shows `ERROR: State Root Mismatch`, each timeout and each non-zero exit.

```bash
tools/scripts/release_state_root_check.sh --dir <blocks-dir> -j "$(nproc)"
```

`-s` and `-e` limit the block range. Logs go to `temp/release_state_root_check/` unless `-l` names another directory.

## Further reading

- [RISC-V tests under QEMU](./riscv-tests-under-qemu.md)
- [ERE validation](./ere-validation.md)
- [Building from source](../reference/building-from-source.md)
- [Benchmarks and CI](../reference/benchmarks-and-ci.md)
- [`test-fixtures.json`](https://github.com/erigontech/zilkworm/blob/main/test-fixtures.json): the fixture pin
