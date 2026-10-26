import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// _category_.json mirrors labels for generate-llms.py.
const sidebars: SidebarsConfig = {
  documentation: [
    'index',
    {
      type: 'category',
      label: 'Provers',
      link: {
        type: 'generated-index',
        slug: '/provers',
        description: 'Pick a prover, run it on your own hardware, and post its proofs to Ethproofs.',
      },
      collapsible: true,
      collapsed: true,
      items: [
        {type: 'doc', id: 'provers/choosing-a-prover', customProps: {summary: 'which prover to run'}},
        {type: 'doc', id: 'provers/airbender-prover', customProps: {summary: 'published GPU image, live on Ethproofs'}},
        {type: 'doc', id: 'provers/hypercube-prover', customProps: {summary: 'the SP1 binary and its known limits'}},
        {type: 'doc', id: 'provers/zisk-prover', customProps: {summary: 'draft PR #86, execute-only'}},
        {type: 'doc', id: 'provers/ethproofs-posting', customProps: {summary: 'flags, lifecycle, cluster key'}},
      ],
    },
    {
      type: 'category',
      label: 'Inside the guest',
      link: {
        type: 'generated-index',
        slug: '/inside-the-guest',
        description: 'Learn what the guest reads, how it runs a block, and what a proof of that run tells you.',
      },
      collapsible: true,
      collapsed: true,
      items: [
        {type: 'doc', id: 'inside-the-guest/execution-pipeline', customProps: {summary: 'block and witness in, proof out'}},
        {type: 'doc', id: 'inside-the-guest/witness-formats', customProps: {summary: 'MFBD bundles, raw SSZ, EJSN fixtures'}},
        {type: 'doc', id: 'inside-the-guest/precompiles-and-syscalls', customProps: {summary: 'hashing and curve math on zkVM circuits'}},
        {type: 'doc', id: 'inside-the-guest/proof-guarantees', customProps: {summary: 'public values, host checks, verifying key'}},
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      link: {
        type: 'generated-index',
        slug: '/testing',
        description: 'Run the spec tests yourself, natively or under QEMU, and see how the ERE harness checks the guest.',
      },
      collapsible: true,
      collapsed: true,
      items: [
        {type: 'doc', id: 'testing/execution-spec-tests', customProps: {summary: 'spec tests, natively and inside the guests'}},
        {type: 'doc', id: 'testing/riscv-tests-under-qemu', customProps: {summary: 'bare-metal rv32im and rv64im under QEMU'}},
        {type: 'doc', id: 'testing/ere-validation', customProps: {summary: 'the HashState guest in the ERE harness'}},
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: {
        type: 'generated-index',
        slug: '/reference',
        description: 'Look up a flag, a release asset, a build step or a CI workflow when you need it.',
      },
      collapsible: true,
      collapsed: true,
      items: [
        {type: 'doc', id: 'reference/cli-reference', customProps: {summary: 'flags, subcommands, env vars, exit codes'}},
        {type: 'doc', id: 'reference/releases-and-assets', customProps: {summary: 'host binaries, guest images, verification keys'}},
        {type: 'doc', id: 'reference/building-from-source', customProps: {summary: 'native tools, guests, provers, unit tests'}},
        {type: 'doc', id: 'reference/benchmarks-and-ci', customProps: {summary: 'make targets and GitHub workflows'}},
      ],
    },
  ],
};

export default sidebars;
