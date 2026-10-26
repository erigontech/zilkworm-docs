---
title: Ethproofs posting
description: "The Airbender and Hypercube services report each proved block to Ethproofs once an endpoint, a token and a cluster id are set."
sidebar_position: 5
---

# Ethproofs posting

[Ethproofs](https://ethproofs.org) collects proofs of Ethereum blocks from registered proving clusters. The Airbender and Hypercube services can report to it. The ZisK backend cannot yet.

## Live clusters

One Zilkworm cluster posts today: "Zilkworm Airbender v3 2x5090 on-prem". It was the only one on [ethproofs.org/provers](https://ethproofs.org/provers) when checked on 2026-10-26. The Hypercube service has the same posting code, but no Zilkworm Hypercube cluster posts.

## Three settings

Posting needs all three of these:

- `--ethproofs-endpoint`: the API base URL. The service appends paths such as `/proofs/queued` to it.
- `--ethproofs-token`: the API token, sent as `Authorization: Bearer <token>`.
- `--ethproofs-cluster-id`: the numeric cluster id.

With any of them unset, the service still proves but posts nothing. Only `--service` mode posts. The `prove` subcommands of both binaries never post. Both binaries accept `--post-every`, and neither uses it.

The repo documents no production endpoint. Its examples in `docs/airbender-docker-service.md` and `prover/prover_airbender/README.md` use the staging API, `https://staging--ethproofs.netlify.app/api/v0`. Replace `<endpoint>` below with the URL Ethproofs gives your cluster.

Each binary takes the settings in its own way:

- `z6m_prover_hypercube` reads the three flags only.
- `z6m_prover_airbender` reads the flags or the variables `ETHPROOFS_ENDPOINT`, `ETHPROOFS_TOKEN` and `ETHPROOFS_CLUSTER_ID`.
- The Airbender image reads the three variables. If one is missing, its entrypoint unsets all three and logs that nothing is posted.

## Posting lifecycle

For each block it proves, the service sends three POST requests:

1. `/proofs/queued` when the service picks the block, before it waits for the prover.
2. `/proofs/proving` when proving starts.
3. `/proofs/proved` after a successful proof.

`queued` and `proving` carry `block_number` and `cluster_id`. `proved` carries five fields:

| Field | Content |
|---|---|
| `block_number` | The block number |
| `cluster_id` | The cluster id |
| `proving_time` | Proving time in milliseconds, measured by the host |
| `proving_cycles` | The guest's cycle count |
| `proof` | The proof file, base64-encoded |

The proof file is `proof.bin` for Airbender and `proof<N>.bin` for Hypercube. For Airbender, `proving_time` leaves out fetching, witness conversion and the preflight. Airbender posts a proof only after the preflight and the proof both commit the expected block hash.

Each request has a 60 s timeout. `queued` and `proving` are sent once. A `proved` post that gets a 429, a 5xx or no answer is tried up to four times in all:

- After a 429, the service waits as long as the body's `retryAfter` or the `Retry-After` header asks. The default is 30 s.
- After a 5xx or no answer, it waits 10 s.
- No wait is longer than 120 s.
- A 409 on a retry means an earlier attempt landed, and the service stops.

Other errors are logged and not retried. Posts run in the background and never hold up proving. A failed post leaves the proof on disk.

## Cluster and verification key

Ethproofs checks a cluster's proofs against the key registered for it. A cluster that runs the Airbender image registers `z6m_guest_airbender.vk` from the same release:

```bash
curl -LO https://github.com/erigontech/zilkworm/releases/download/v0.1.0-alpha.7/z6m_guest_airbender.vk
sha256sum z6m_guest_airbender.vk
```

The alpha.7 release notes give its sha256 as `ffcdff786029d7f9621ad8c23ece641de9d72c38ecb1097d1d4b5e3e583c1de5`. A cluster that moves to a new release image needs that release's key. On first start, the image's entrypoint also computes a key and logs its sha256.

The repo documents no Ethproofs key upload for Hypercube proofs.

## Command examples

### Airbender image

```bash
export RPC_URL=http://<execution-client>:8545
export ETHPROOFS_ENDPOINT=<endpoint>
export ETHPROOFS_TOKEN=<api-token>
export ETHPROOFS_CLUSTER_ID=<cluster-id>
docker run -d --name zilkworm-airbender --gpus all --restart unless-stopped \
  -v /srv/zilkworm-airbender:/data \
  -e RPC_URL -e PROVE_EVERY=100 \
  -e ETHPROOFS_ENDPOINT -e ETHPROOFS_TOKEN -e ETHPROOFS_CLUSTER_ID \
  ghcr.io/erigontech/zilkworm-airbender:v0.1.0-alpha.7
```

The entrypoint logs `posting to Ethproofs at` with the endpoint and cluster id. Proofs land in `/srv/zilkworm-airbender/proofs/<N>/proof.bin`. [Airbender prover](./airbender-prover.md) covers the rest of the service.

### Hypercube binary

```bash
export RPC_URL=http://<execution-client>:8545
export ETHPROOFS_ENDPOINT=<endpoint>
export ETHPROOFS_TOKEN=<api-token>
export ETHPROOFS_CLUSTER_ID=<cluster-id>
SP1_PROVER=cuda ./z6m_prover_hypercube --service \
  --rpc-url "$RPC_URL" --data-dir data --prove-every 100 \
  --ethproofs-endpoint "$ETHPROOFS_ENDPOINT" \
  --ethproofs-token "$ETHPROOFS_TOKEN" \
  --ethproofs-cluster-id "$ETHPROOFS_CLUSTER_ID"
```

Proofs land in `data/<N>/proof<N>.bin`. [Hypercube prover](./hypercube-prover.md) covers the rest of the service.

## Further reading

- [Airbender prover](./airbender-prover.md)
- [Hypercube prover](./hypercube-prover.md)
- [Releases and assets](../reference/releases-and-assets.md)
- [`prover/common/src/ethproofs_client.rs`](https://github.com/erigontech/zilkworm/blob/main/prover/common/src/ethproofs_client.rs)
- [`docs/airbender-docker-service.md`](https://github.com/erigontech/zilkworm/blob/main/docs/airbender-docker-service.md)
