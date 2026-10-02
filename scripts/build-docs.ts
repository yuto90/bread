import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../src/index.ts";
import { guides, sampleIds } from "../docs-site/content.ts";
import type { Guide, Section } from "../docs-site/content.ts";
import { sampleDescriptions } from "../playground/i18n.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
export const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function buildDocs(output: string): Promise<void> {
  const target = join(output, "docs");
  await mkdir(join(target, "ja"), { recursive: true });
  await mkdir(join(target, "examples"), { recursive: true });
  const samples = new Map<string, { source: string; svg: string }>();
  for (const id of sampleIds) {
    const source = await readFile(
      join(root, "examples", `${id}.bread`),
      "utf8",
    );
    const svg = render(source); // Exact core output, including attribution metadata.
    samples.set(id, { source, svg });
    await writeFile(join(target, "examples", `${id}.bread`), source);
    await writeFile(join(target, "examples", `${id}.svg`), svg);
  }
  for (const file of ["style.css", "search.js"])
    await copyFile(join(root, "docs-site", file), join(target, file));
  for (const locale of ["en", "ja"] as const) {
    const ja = locale === "ja",
      assets = ja ? "../" : "./",
      app = ja ? "../../" : "../";
    const copy = (en: string, jp: string) => (ja ? jp : en);
    const pages = guides[locale];
    const example = (id: string): string => {
      const sample = samples.get(id);
      if (!sample) throw new Error(`Unknown docs sample: ${id}`);
      const description = sampleDescriptions[id][ja ? 1 : 0];
      return `<figure class="example"><figcaption><strong>${escapeHtml(id)}.bread</strong><span>${escapeHtml(description)}</span></figcaption>
<div class="example-pair"><pre><code>${escapeHtml(sample.source)}</code></pre><a class="diagram" href="${assets}examples/${id}.svg" aria-label="${escapeHtml(copy(`Open ${id} diagram`, `${id} の図を開く`))}"><img src="${assets}examples/${id}.svg" alt="${escapeHtml(description)}" loading="lazy"></a></div>
<div class="example-links"><a href="${app}?lang=${locale}&amp;sample=${id}">${copy("Open in Playground", "Playground で開く")} ↗</a><a href="${assets}examples/${id}.bread" download>${copy("Download source", "ソースを保存")}</a><a href="${assets}examples/${id}.svg" download>SVG ↓</a></div>
<p class="credit">${copy("Illustration adapted from Arduino UNO R3 CAD by Bread contributors; CC-BY-SA-4.0. Source and modifications are embedded in the SVG.", "Arduino UNO R3 CAD を Bread contributors が改変したイラスト。CC-BY-SA-4.0。出典と変更情報を SVG に保持しています。")} <a href="${app}LICENSES/README.md">${copy("Attribution", "出典と適用範囲")}</a></p></figure>`;
    };
    const section = (s: Section): string =>
      `<section aria-labelledby="${s.id}"><h2 id="${s.id}">${escapeHtml(s.title)}</h2>${(s.paragraphs ?? []).map((p) => `<p>${escapeHtml(p)}</p>`).join("")}${s.code ? `<pre><code>${escapeHtml(s.code)}</code></pre>` : ""}${
        s.table
          ? `<div class="table-scroll"><table><thead><tr>${s.table[0].map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${s.table
              .slice(1)
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
              )
              .join("")}</tbody></table></div>`
          : ""
      }${(s.samples ?? []).map(example).join("")}</section>`;
    for (const [index, page] of pages.entries()) {
      const nav = pages
        .map(
          (p) =>
            `<a href="./${p.slug}.html"${p.slug === page.slug ? ' aria-current="page"' : ""}>${escapeHtml(p.title)}</a>`,
        )
        .join("");
      const adjacent = (
        p: Guide | undefined,
        direction: "previous" | "next",
      ): string =>
        p
          ? `<a rel="${direction === "previous" ? "prev" : "next"}" href="./${p.slug}.html"><small>${direction === "previous" ? copy("Previous", "前へ") : copy("Next", "次へ")}</small>${escapeHtml(p.title)} ${direction === "next" ? "→" : ""}</a>`
          : "<span></span>";
      const markup = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'"><meta name="description" content="${escapeHtml(page.summary)}"><title>${escapeHtml(page.title)} — Bread Docs</title><link rel="icon" href="${app}icon.svg"><link rel="stylesheet" href="${assets}style.css"><script src="${assets}search.js" defer></script></head>
<body><a class="skip" href="#content">${copy("Skip to content", "本文へ移動")}</a><header class="topbar"><a class="brand" href="./index.html">bread<span>.</span> <small>DOCS</small></a><nav aria-label="${copy("Resources and language", "資料と言語")}"><a href="${app}?lang=${locale}">Playground ↗</a><a href="https://github.com/yuto90/bread">GitHub</a><a id="docs-language" lang="${ja ? "en" : "ja"}" hreflang="${ja ? "en" : "ja"}" href="${ja ? "../" : "./ja/"}${page.slug}.html">${ja ? "English" : "日本語"}</a></nav></header>
<div class="layout"><aside><form class="search" role="search" data-index="${assets}search-${locale}.json"><label for="docs-search">${copy("Search these docs", "ドキュメント内を検索")}</label><input id="docs-search" type="search" maxlength="120" placeholder="${copy("Try pins, diode, limits…", "ピン、ダイオード、制限…")}" autocomplete="off"><p id="search-status" role="status" aria-live="polite"></p><ul id="search-results" hidden></ul></form><details class="nav-disclosure" open><summary>${copy("Documentation", "ドキュメント")}</summary><nav class="sidebar" aria-label="${copy("Documentation pages", "ガイド一覧")}">${nav}</nav></details></aside>
<main id="content"><p class="eyebrow">BREAD / ${copy("GUIDES", "ガイド")}</p><h1>${escapeHtml(page.title)}</h1><p class="lead">${escapeHtml(page.summary)}</p><nav class="toc" aria-label="${copy("On this page", "このページの内容")}"><strong>${copy("On this page", "このページの内容")}</strong>${page.sections.map((s) => `<a href="#${s.id}">${escapeHtml(s.title)}</a>`).join("")}</nav>${page.sections.map(section).join("")}
${page.slug === "licensing" ? `<p class="license-links"><a href="${app}LICENSE">MIT</a> · <a href="${app}LICENSES/README.md">${copy("File-level scope and attribution", "ファイル別の適用範囲と出典")}</a> · <a href="${app}LICENSES/CC-BY-SA-4.0.txt">CC-BY-SA-4.0</a></p>` : ""}
${page.slug === "contributing" ? '<p><a href="https://github.com/yuto90/bread/blob/main/CONTRIBUTING.md">CONTRIBUTING.md ↗</a></p>' : ""}
<nav class="pagination" aria-label="${copy("Previous and next guide", "前後のガイド")}">${adjacent(pages[index - 1], "previous")}${adjacent(pages[index + 1], "next")}</nav></main></div>
<footer>${copy("Original docs: MIT. Generated illustrations: CC-BY-SA-4.0. Static wiring only; hardware fit and behavior remain unverified.", "独自ドキュメント: MIT。生成イラスト: CC-BY-SA-4.0。静的な配線のみ。実機の収まりや動作は未検証です。")} <a href="./licensing.html">${copy("License scope", "ライセンスの範囲")}</a></footer></body></html>\n`;
      await writeFile(
        join(target, ja ? "ja" : "", `${page.slug}.html`),
        markup,
      );
    }
    const index = pages.map((page) => ({
      title: page.title,
      href: `./${page.slug}.html`,
      summary: page.summary,
      text: [
        page.title,
        page.summary,
        ...page.sections.flatMap((s) => [
          s.title,
          ...(s.paragraphs ?? []),
          s.code ?? "",
          ...(s.table ?? []).flat().join(" "),
          ...(s.samples ?? []).map((id) => samples.get(id)!.source),
        ]),
      ].join("\n"),
    }));
    await writeFile(
      join(target, `search-${locale}.json`),
      JSON.stringify(index, null, 2) + "\n",
    );
  }
}
