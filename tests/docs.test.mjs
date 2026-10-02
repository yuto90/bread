import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JSDOM } from "jsdom";
import { buildPlayground } from "../scripts/build-playground.ts";
import { escapeHtml } from "../scripts/build-docs.ts";
import { guides, sampleIds } from "../docs-site/content.ts";
import { render } from "../src/index.ts";
let output;
before(async () => {
  output = await mkdtemp(join(tmpdir(), "bread-docs-"));
  await buildPlayground(output);
});
after(async () => {
  if (output) await rm(output, { recursive: true, force: true });
});

test("Both locales have the same nine guides and section anchors", () => {
  assert.equal(guides.en.length, 9);
  assert.deepEqual(
    guides.en.map((p) => [p.slug, p.sections.map((s) => s.id)]),
    guides.ja.map((p) => [p.slug, p.sections.map((s) => s.id)]),
  );
  assert.equal(new Set(guides.en.map((p) => p.slug)).size, 9);
});
test("Every local documentation link, image, script, stylesheet and fragment resolves", async () => {
  for (const locale of ["en", "ja"])
    for (const guide of guides[locale]) {
      const path = `/docs/${locale === "ja" ? "ja/" : ""}${guide.slug}.html`;
      const dom = new JSDOM(await readFile(join(output, path), "utf8"), {
        url: `https://bread.test${path}`,
      });
      const doc = dom.window.document;
      assert.equal(doc.documentElement.lang, locale);
      assert.ok(doc.querySelector("main h1")?.textContent);
      assert.equal(doc.querySelectorAll(".sidebar a").length, 9);
      for (const element of doc.querySelectorAll("[href], [src]")) {
        const url = new URL(
          element.getAttribute("href") ?? element.getAttribute("src"),
          dom.window.location.href,
        );
        if (url.origin !== "https://bread.test") continue;
        const local = join(
          output,
          url.pathname.endsWith("/")
            ? url.pathname + "index.html"
            : url.pathname,
        );
        assert.ok((await stat(local)).isFile(), `${path}: ${url.pathname}`);
        if (url.hash) {
          const linked = new JSDOM(await readFile(local, "utf8"));
          assert.ok(
            linked.window.document.getElementById(url.hash.slice(1)),
            `${path}: ${url.hash}`,
          );
          linked.window.close();
        }
      }
      assert.equal(
        doc.querySelectorAll("script:not([src]), [onclick]").length,
        0,
      );
      dom.window.close();
    }
});
test("Docs examples and previews use exact source and renderer bytes, with attribution", async () => {
  for (const id of sampleIds) {
    const source = await readFile(
      new URL(`../examples/${id}.bread`, import.meta.url),
      "utf8",
    );
    assert.equal(
      await readFile(join(output, "docs/examples", `${id}.bread`), "utf8"),
      source,
    );
    const svg = await readFile(
      join(output, "docs/examples", `${id}.svg`),
      "utf8",
    );
    assert.equal(svg, render(source));
    assert.match(svg, /creativecommons.org\/licenses\/by-sa\/4.0/);
    for (const language of ["", "ja/"]) {
      const dom = new JSDOM(
        await readFile(join(output, `docs/${language}examples.html`), "utf8"),
      );
      assert.ok(
        [...dom.window.document.querySelectorAll("pre code")].some(
          (code) => code.textContent === source,
        ),
      );
      dom.window.close();
    }
  }
});
test("Search includes localized guide text and DSL identifiers; escaping is literal", async () => {
  for (const locale of ["en", "ja"]) {
    const index = JSON.parse(
      await readFile(join(output, `docs/search-${locale}.json`), "utf8"),
    );
    assert.equal(index.length, 9);
    assert.ok(index.some((entry) => entry.text.includes("diode-1n4148")));
    assert.ok(index.every((entry) => /^\.\/[a-z-]+\.html$/.test(entry.href)));
  }
  assert.equal(
    escapeHtml('<img onerror="x">&\''),
    "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;",
  );
});
