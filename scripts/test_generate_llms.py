"""Unit tests for generate-llms.py.

Run from repo root:
  python3 -m unittest discover scripts -v
  python3 scripts/test_generate_llms.py    # direct invocation also works
"""

import importlib.util
import unittest
from pathlib import Path

_HERE = Path(__file__).parent
_spec = importlib.util.spec_from_file_location("generate_llms", _HERE / "generate-llms.py")
g = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(g)


class StripMdxTests(unittest.TestCase):
    def test_strips_mdx_import_line(self):
        out = g.strip_mdx("import Link from '@docusaurus/Link';\n\nReal content.")
        self.assertNotIn("import Link", out)
        self.assertIn("Real content", out)

    def test_strips_jsx_comment(self):
        out = g.strip_mdx("Before {/* a comment */} after.")
        self.assertNotIn("a comment", out)
        self.assertIn("Before", out)
        self.assertIn("after", out)

    def test_strips_self_closing_tag(self):
        out = g.strip_mdx('Text <img src="x.png" /> more.')
        self.assertNotIn("<img", out)
        self.assertIn("Text", out)
        self.assertIn("more", out)

    def test_strips_paired_jsx_tag(self):
        out = g.strip_mdx("<Tabs>\n  Hello\n</Tabs>")
        self.assertNotIn("<Tabs>", out)
        self.assertNotIn("</Tabs>", out)

    def test_collapses_excess_blank_lines(self):
        out = g.strip_mdx("a\n\n\n\nb")
        self.assertEqual(out, "a\n\nb")

    def test_plain_markdown_unchanged(self):
        out = g.strip_mdx("# Title\n\nA normal paragraph with `code`.")
        self.assertIn("# Title", out)
        self.assertIn("`code`", out)


class FrontmatterTests(unittest.TestCase):
    def test_simple_kv(self):
        meta, body = g.parse_frontmatter("---\ntitle: Hello\nposition: 1\n---\nbody")
        self.assertEqual(meta["title"], "Hello")
        self.assertEqual(meta["position"], "1")
        self.assertEqual(body.strip(), "body")

    def test_quoted_value_with_colon(self):
        meta, _ = g.parse_frontmatter('---\ntitle: "Hello: World"\n---\n')
        self.assertEqual(meta["title"], "Hello: World")

    def test_indented_continuation_skipped(self):
        meta, _ = g.parse_frontmatter("---\ntags:\n  - one\n  - two\ntitle: Foo\n---\n")
        self.assertEqual(meta["title"], "Foo")
        self.assertNotIn("- one", meta)

    def test_no_frontmatter(self):
        meta, body = g.parse_frontmatter("# Heading\n\nBody only.")
        self.assertEqual(meta, {})
        self.assertIn("# Heading", body)


class UrlForTests(unittest.TestCase):
    def test_index_maps_to_route_base(self):
        url = g.url_for(g.DOCS_DIR / "index.md")
        self.assertEqual(url, f"{g.SITE_URL}{g.ROUTE_BASE}")

    def test_nested_page(self):
        url = g.url_for(g.DOCS_DIR / "getting-started" / "install.md")
        self.assertEqual(url, f"{g.SITE_URL}{g.ROUTE_BASE}/getting-started/install")


if __name__ == "__main__":
    unittest.main()
