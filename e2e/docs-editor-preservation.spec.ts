import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { render } from "../src/index.ts";

for (const locale of ["en", "ja"] as const) {
  test(`Docs opens separately and preserves valid and invalid ${locale} edits`, async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`/?lang=${locale}`);
    const editor = page.locator("#source");
    await expect(editor).toBeEnabled();
    const edited = (await readFile(new URL("../examples/blink.bread", import.meta.url), "utf8"))
      .replace("uno.D13", "uno.D12");
    await editor.fill(edited);
    await expect(page.locator("#preview-status")).toHaveAttribute("data-state", "valid");
    await page.locator("#zoom-in").click();
    const image = await page.locator("#wiring-image").getAttribute("src");
    const zoom = await page.locator("#zoom-level").textContent();
    const originalURL = page.url();
    const docsLink = page.locator("#docs-link");
    await expect(docsLink).toHaveAttribute("target", "_blank");
    await expect(docsLink).toHaveAttribute("rel", "noopener");
    await expect(docsLink).toHaveAccessibleName(locale === "ja"
      ? "ドキュメント（新しいタブで開く）" : "Docs (opens in a new tab)");

    for (const invalid of [false, false, true]) {
      const value = invalid ? edited.replace("uno.D12", "uno.D99") : edited;
      if (invalid) {
        await editor.fill(value);
        await expect(page.locator("#error-code")).toHaveText("E_UNKNOWN_PIN");
      }
      const opening = context.waitForEvent("page");
      await docsLink.click();
      const docs = await opening;
      docs.on("pageerror", error => errors.push(error.message));
      await expect(docs).toHaveURL(new RegExp(`/docs/${locale === "ja" ? "ja/" : ""}$`));
      await expect(docs.locator("html")).toHaveAttribute("lang", locale);
      expect(await docs.evaluate(() => window.opener)).toBeNull();
      await docs.locator('.sidebar a[href="./parts.html"]').click();
      await expect(docs).toHaveURL(/parts\.html$/);
      await docs.goBack();
      await expect(docs.locator("main h1")).toBeVisible();
      await docs.close();
      await page.bringToFront();
      await expect(page).toHaveURL(originalURL);
      await expect(editor).toHaveValue(value);
      await expect(page.locator("#wiring-image")).toHaveAttribute("src", image!);
      await expect(page.locator("#zoom-level")).toHaveText(zoom!);
      if (invalid) {
        await expect(page.locator("#download")).toBeDisabled();
        await expect(page.locator("#error-code")).toHaveText("E_UNKNOWN_PIN");
      } else {
        await expect(page.locator("#download")).toBeEnabled();
        const downloading = page.waitForEvent("download");
        await page.locator("#download").click();
        expect(await readFile((await (await downloading).path())!, "utf8")).toBe(render(edited));
      }
    }
    expect(errors).toEqual([]);
  });
}
