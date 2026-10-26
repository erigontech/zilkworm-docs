---
title: Overview
description: "Zilkworm runs stateless Ethereum block execution in RISC-V zkVM guests and ships provers for Airbender and SP1 Hypercube."
sidebar_position: 1
slug: /
---

import StatusStrip from '@site/src/components/Overview/StatusStrip';
import ProductCards from '@site/src/components/Overview/ProductCards';
import ReaderCards from '@site/src/components/Overview/ReaderCards';

# Zilkworm

Zilkworm is a stateless Ethereum block execution engine in C++, compiled to RISC-V guests for zkVMs.
Each proof covers one block: it shows the guest ran the block from its witness and committed the result.
Ethproofs operators run it to prove mainnet blocks, researchers use it to estimate proving cost, and contributors build and test it.

<StatusStrip />

<ProductCards />

<ReaderCards />

The code is on [GitHub](https://github.com/erigontech/zilkworm), and release assets are on the [releases page](https://github.com/erigontech/zilkworm/releases).
