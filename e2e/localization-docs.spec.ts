import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { render } from "../src/index.ts";
const source = (id: string) =>
  readFile(new URL(`../examples/${id}.bread`, import.meta.url), "utf8");

test("Japanese browser locale, all six exports, error language changes, persistence and escaping", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    locale: "ja-JP",
    viewport: info.project.use.viewport,
    isMobile: info.project.use.isMobile,
    hasTouch: info.project.use.hasTouch,
    baseURL: String(info.project.use.baseURL),
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("#language")).toHaveValue("ja");
    await expect(page.locator("#download")).toContainText("SVG をダウンロード");
    for (const id of [
      "blink",
      "three-leds",
      "6-leds",
      "temperature-alarm",
      "diode-led",
      "diode-decoupling",
    ]) {
      await page.locator(`[data-sample="${id}"]`).click();
      await expect(page.locator("#preview-status")).toHaveAttribute(
        "data-state",
        "valid",
      );
      await expect(page.locator("#status-text")).toContainText("検証済み");
      const downloading = page.waitForEvent("download");
      await page.locator("#download").click();
      expect(await readFile((await (await downloading).path())!, "utf8")).toBe(
        render(await source(id)),
      );
    }
    await expect(page.locator("#warnings")).toContainText("リード");
    const editor = page.locator("#source");
    const good = await source("blink");
    await editor.fill(good.replace("uno.D13", "uno.D99"));
    await expect(page.locator("#error-code")).toHaveText("E_UNKNOWN_PIN");
    await expect(page.locator("#error-message")).toContainText("詳細（原文）");
    const invalid = await editor.inputValue(),
      image = await page.locator("#wiring-image").getAttribute("src");
    await page.locator("#language").selectOption("en");
    await expect(editor).toHaveValue(invalid);
    await expect(page.locator("#status-text")).toContainText(
      "Showing last valid preview",
    );
    await expect(page.locator("#wiring-image")).toHaveAttribute("src", image!);
    await expect(page.locator("#download")).toBeDisabled();
    await page.locator("#language").selectOption("ja");
    await page.locator("#error-line").click();
    await expect(editor).toBeFocused();
    await editor.fill(
      good.replace("Arduino LED", "<img src=x onerror=alert(1)>"),
    );
    await expect(page.locator("#preview-status")).toHaveAttribute(
      "data-state",
      "valid",
    );
    await expect(page.locator("#wiring-image")).toHaveAttribute(
      "alt",
      /<img src=x onerror=alert\(1\)>/,
    );
    expect(await page.locator("[onerror]").count()).toBe(0);
    await page.locator("#language").selectOption("en");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator("#language").selectOption("ja");
    await page.locator('[data-sample="diode-decoupling"]').click();
    await expect(page.locator("#preview-status")).toHaveAttribute(
      "data-state",
      "valid",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("playground-ja.png"),
      fullPage: true,
    });
    await page.locator("#docs-link").click();
    await expect(page).toHaveURL(/\/docs\/ja\//);
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("Denied storage and unsupported browser language remain usable; explicit docs locale and sample work", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    locale: "fr-FR",
    viewport: info.project.use.viewport,
    baseURL: String(info.project.use.baseURL),
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  const page = await context.newPage();
  try {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#preview-status")).toHaveAttribute(
      "data-state",
      "valid",
    );
    await page.locator("#language").selectOption("ja");
    await expect(page.locator("#status-text")).toContainText("検証済み");
    await page.goto("/?lang=ja&sample=diode-led");
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("#source")).toHaveValue(
      await source("diode-led"),
    );
    await expect(page.locator("#download")).toBeEnabled();
    await page.goto("/?lang=invalid&sample=unknown");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("#source")).toHaveValue(await source("blink"));
  } finally {
    await context.close();
  }
});

test("Bilingual docs navigation, safe local search, exact samples and Playground links", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/docs/");
  await expect(page.locator("main h1")).toHaveText(
    "Connections in. Wiring out.",
  );
  const search = page.getByRole("searchbox");
  await search.fill("diode-1n4148");
  await expect(page.locator("#search-results")).toBeVisible();
  await expect(page.locator("#search-results a").first()).toBeVisible();
  await search.fill("<img src=x onerror=alert(1)>");
  await expect(page.locator("#search-status")).toHaveText("0 guides found");
  expect(await page.locator("[onerror]").count()).toBe(0);
  await search.fill("");
  await page.locator('.sidebar a[href="./parts.html"]').click();
  await page.locator("#docs-language").click();
  await expect(page).toHaveURL(/\/docs\/ja\/parts.html/);
  await expect(page.locator("main h1")).toHaveText("部品と端子");
  await page.getByRole("searchbox").fill("ダイオード");
  await expect(page.locator("#search-results")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.locator('.sidebar a[href="./examples.html"]').click();
  await expect(page.locator(".example")).toHaveCount(6);
  for (const image of await page.locator(".diagram img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (img) =>
            (img as HTMLImageElement).complete &&
            (img as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath("docs-ja.png") });
  const first = page.locator(".example").first();
  const downloading = page.waitForEvent("download");
  await first.getByRole("link", { name: "ソースを保存" }).click();
  expect(await readFile((await (await downloading).path())!, "utf8")).toBe(
    await source("blink"),
  );
  await first.getByRole("link", { name: /Playground/ }).click();
  await expect(page.locator("#language")).toHaveValue("ja");
  await expect(page.locator("#source")).toHaveValue(await source("blink"));
  await expect(page.locator("#preview-status")).toHaveAttribute(
    "data-state",
    "valid",
  );
  expect(errors).toEqual([]);
});
