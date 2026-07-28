---
title: "Quickstart: Hypercube prover"
description: This guide walks you through running proofs for mainnet Ethereum blocks with the SP1 Hypercube prover. Hypercube is deeply integrated within zilkworm to run efficiently. Zilkworm's compiled guest is hosted and run through the Hypercube zkVM with the service command. Optionally, the service provides direct Ethproofs integration. This example guide uses the pre-built docker image.
sidebar_position: 2
---

# Quickstart: Hypercube prover
This guide walks you through running proofs for mainnet Ethereum blocks with the SP1 Hypercube prover. Hypercube is deeply integrated within zilkworm to run efficiently. Zilkworm's compiled guest is hosted and run through the Hypercube zkVM with the service command. Optionally, the service provides direct Ethproofs integration. This example guide uses the pre-built docker image.

## Prerequisites

- Docker.
- An Ethereum RPC endpoint exposing `debug_getRawBlock` and `debug_executionWitness` (a Reth or Geth node with the debug namespace enabled). Add `--geth` to `fetch` when the node is Geth; the default expects the Reth/alloy witness format.
- For GPU-accelerated proving: an NVIDIA GPU with drivers and the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).


## 1. Get the pre-built docker image

The docker image ships the prover binary, the RISC-V guest ELF, and the CUDA proving server.
```bash
docker pull somnergy/z6m_prover:latest
```

## 2. Test the setup: Fetch and execute a block
Let's first execute a block downloaded through the RPC without using a GPU.

```bash
export RPC_URL=http://localhost:8545   # must expose the two debug_ methods

docker run --rm --network host -v "$PWD:/work" somnergy/z6m_prover \
  fetch --rpc-url "$RPC_URL" --block-number 23100000 --data-dir /work/data
```
This writes the flat witness bundle to `<data-dir>/blocks/<N>/flatWitnessBundle<N>.mfbd`.
**Notes**
- `--network host` is only needed when the RPC node listens on the host's localhost.
- Omit `--block-number` to fetch the latest block; add `--geth` for a Geth node.

Execute the block inside the zkVM without proving:
```bash
docker run --rm -v "$PWD:/work" somnergy/z6m_prover \
  execute --block-number 23100000 --data-dir /work/data
```
That should print
```
Executed block 23100000 (gas_used=..., cycles=..., prover_gas=..., syscall_count=...)
```
A non-zero `gas_used` means the block executed and verified correctly; failures print `FAILED block ...` instead. Results append to `<data-dir>/executionLogs.log`.

## 3. GPU-accelerated proving
Currently the default SP1 Hypercube prover supports only a **single GPU** — a limitation zilkworm cannot work around. Multi-GPU proving exists in Succinct's sp1-cluster, but it is beyond the scope of this guide.
```bash
docker run --rm --gpus all --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/work" \
  -e SP1_PROVER=cuda \
  somnergy/z6m_prover:latest \
  prove --block-number 23100000 --data-dir /work/data
```

The proof is generated as a compressed proof and currently stays in memory — `prove` does not write it to disk. Use service mode (next section) for persisted proofs.

## 4. Continuous proving with Ethproofs

Service mode follows the chain head, fetching and proving each block whose number is divisible by `--prove-every N`; other blocks are skipped entirely (add `--save-all-responses` to fetch every block). Ethproofs reporting activates only when all three `--ethproofs-*` flags are set; the service then posts queued, proving, and proved updates for every proven block. Registering a cluster with [Ethproofs](https://ethproofs.org) gets you the endpoint, API token, and cluster id.

```bash
export ETHPROOFS_ENDPOINT=<endpoint>       # from your Ethproofs cluster registration
export ETHPROOFS_TOKEN=<api-token>
export ETHPROOFS_CLUSTER_ID=<cluster-id>

docker run --rm --gpus all --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD:/work" \
  -e SP1_PROVER=cuda \
  somnergy/z6m_prover:latest \
  --service \
  --rpc-url "$RPC_URL" \
  --data-dir /work/data \
  --prove-every 100 \
  --ethproofs-endpoint "$ETHPROOFS_ENDPOINT" \
  --ethproofs-token "$ETHPROOFS_TOKEN" \
  --ethproofs-cluster-id "$ETHPROOFS_CLUSTER_ID"
```

Each proof is written to `<data-dir>/<N>/proof<N>.bin` and logged in `<data-dir>/provingLogs.log`. Omit the `--ethproofs-*` flags to prove without reporting. Without `--start-block` the service begins at chain head + 1; without `--end-block` it runs until stopped.

## Where to go next

- [Running the prover](running-the-prover.md) — the full guide: `SP1_PROVER` modes, proof types, service mode in depth, building from source.
- [Ethproofs prover](ethproofs-prover.md) — cluster setup, posting flow, operational monitoring.
- [CLI reference](cli-reference.md) — every flag and subcommand.
