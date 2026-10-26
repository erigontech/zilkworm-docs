---
title: Execution spec tests
description: "Zilkworm runs the Ethereum execution spec tests natively and inside the Hypercube and Airbender guests, on a checksum-pinned fixture release."
sidebar_position: 1
---

# Execution spec tests

By the end of this page you can run the Ethereum execution spec tests against Zilkworm yourself. You will also know how CI runs them inside the zkVMs.

The Ethereum Execution Spec Tests, or EESTs, are the test vectors for the Ethereum execution layer. They are generated from the execution specs and cover every fork plus many edge cases, so a failing test usually points to a consensus bug. The fixtures ship as releases of [ethereum/execution-specs](https://github.com/ethereum/execution-specs/releases), and the docs live at [eest.ethereum.org](https://eest.ethereum.org/). CI runs them natively and inside two zkVMs.

## Fixture pins

The fixtures come from release tarballs, pinned by checksum. A manifest, `test-fixtures.json`, names each tarball's URL, sha256 and size, along with the paths to extract. It has one entry, `eest_stable`, which pins `tests@v21.0.1` with sha256 `b9b14391ed1a625e4ca9a058c055d0eacd98a42b76c7a6127c640cdc2d3c9439` and extracts `fixtures/blockchain_tests`. You fetch them with one command:

```bash
make test-fixtures
```

This runs `tools/test-fixtures.sh`, which downloads each tarball, checks its sha256 and extracts it into `test-fixtures-cache/<key>/`. A rerun does nothing while the pin matches. To move a pin, edit `test-fixtures.json`.

The HashState suite is the exception. It uses a second release, `tests-zkevm@v21.0.6`, which the Makefile downloads with `gh release download`, so that one is not checksum-pinned.

## Native run

To run `make eest-blockchain-tests` you need CMake, Ninja, ctest, a C++23 compiler, Git, Python 3, curl and tar. You do not need Rust for it. Only the targets that build `z6m_prover`, such as `selftest` and `eest-prover-test`, need Rust. [Building from source](../reference/building-from-source.md) lists the toolchain.

```bash
git clone https://github.com/erigontech/zilkworm
cd zilkworm
git submodule update --init --recursive
make eest-blockchain-tests
```

The target first fetches the pinned tarball and converts every JSON fixture to MFBD with `eest_to_flat_bundle bulk-convert`. The converted set lands in `test-fixtures-cache/mfbd-<sha>/`, named after the pin. A rerun skips the fetch and the conversion as long as the pin and the converter binary stay the same. Then the target builds with `-DBUILD_TESTING=ON` and runs `ctest --parallel`, one case per fixture file.

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

Skip `make tests` and `make tests-json`. Both are broken, because they pass `--execution-log-dir`, a flag `z6m_prover` does not have.

## Runs inside the zkVMs

CI also runs the pinned set inside the guests, in two workflows. The HyperCube EEST Blockchain Tests workflow builds `z6m_prover` and runs the MFBD set through `tools/scripts/eest_runner.py` under the SP1 executor; that job fails above a set failure threshold. The Airbender EEST Blockchain Tests workflow builds the Airbender guest and host, then runs `make eest` in `prover/prover_airbender`. It fails only on failures outside the known-failures lists.

The native suite has its own workflow, EEST Blockchain Tests. The QEMU runs have a page of their own, [RISC-V tests under QEMU](./riscv-tests-under-qemu.md).

## Known failures

Two files track the fixtures that are expected to fail. The first, `zilk_core/dev/eest-known-failures.txt`, lists fixtures that the runner gets wrong on every target. Their ctests are registered `WILL_FAIL`, so a listed fixture that passes again shows up as a failure until you take it off the list. As of v0.1.0-alpha.7 that list holds only its header, which means the native suite expects no failures.

The second, `prover/prover_airbender/eest-known-failures.txt`, lists 25 fixtures that the Airbender guest does not finish. These are not wrong results. They hit resource limits such as the execution cycle cap. The Airbender job adds the native list to its own.

## State-root check before a release

Before a release, you re-run a directory of mainnet blocks natively with `tools/scripts/release_state_root_check.sh`. The script builds `state_transition` in Release mode and then runs every `<dir>/<N>/flatWitnessBundle<N>.mfbd` file in parallel. It reports each block whose output shows `ERROR: State Root Mismatch`, along with each timeout and each non-zero exit.

```bash
tools/scripts/release_state_root_check.sh --dir <blocks-dir> -j "$(nproc)"
```

Use `-s` and `-e` to limit the block range. Logs go to `temp/release_state_root_check/` unless you name another directory with `-l`.

## Further reading

- [RISC-V tests under QEMU](./riscv-tests-under-qemu.md)
- [ERE validation](./ere-validation.md)
- [Building from source](../reference/building-from-source.md)
- [Benchmarks and CI](../reference/benchmarks-and-ci.md)
- [`test-fixtures.json`](https://github.com/erigontech/zilkworm/blob/main/test-fixtures.json): the fixture pin
