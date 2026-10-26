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
        description: 'Pick a prover, run it, and post its proofs to Ethproofs.',
      },
      collapsible: true,
      collapsed: false,
      items: [
        'provers/choosing-a-prover',
        'provers/airbender-prover',
        'provers/hypercube-prover',
        'provers/zisk-prover',
        'provers/ethproofs-posting',
      ],
    },
    {
      type: 'category',
      label: 'Inside the guest',
      link: {
        type: 'generated-index',
        slug: '/inside-the-guest',
        description: 'See what the guest reads, runs and commits, and what its proof guarantees.',
      },
      collapsible: true,
      collapsed: false,
      items: [
        'inside-the-guest/execution-pipeline',
        'inside-the-guest/witness-formats',
        'inside-the-guest/precompiles-and-syscalls',
        'inside-the-guest/proof-guarantees',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      link: {
        type: 'generated-index',
        slug: '/testing',
        description: 'Check the guests against the execution spec tests, QEMU runs and ERE fixtures.',
      },
      collapsible: true,
      collapsed: false,
      items: [
        'testing/execution-spec-tests',
        'testing/riscv-tests-under-qemu',
        'testing/ere-validation',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      link: {
        type: 'generated-index',
        slug: '/reference',
        description: 'Look up CLI flags, release assets, build steps and CI workflows.',
      },
      collapsible: true,
      collapsed: false,
      items: [
        'reference/cli-reference',
        'reference/releases-and-assets',
        'reference/building-from-source',
        'reference/benchmarks-and-ci',
      ],
    },
  ],
};

export default sidebars;
