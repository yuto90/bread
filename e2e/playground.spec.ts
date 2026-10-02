import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { routingBodies } from "../src/mixed/routing-scene.ts";
import { compile, render } from "../src/index.ts";

const source = (id: string) =>
  readFile(new URL(`../examples/${id}.bread`, import.meta.url), "utf8");

test("real worker compiles every sample, SVG decodes, download matches core, and layout fits", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  for (const [id, nets] of [
    ["blink", 3],
    ["three-leds", 7],
    ["6-leds", 13],
    ["temperature-alarm", 8],
  ] as const) {
    await page.locator(`[data-sample="${id}"]`).click();
    await expect(page.locator("#preview-status")).toHaveAttribute(
      "data-state",
      "valid",
    );
    await expect(page.locator("#circuit-stats")).toContainText(
      `${nets} static nets`,
    );
    await expect
      .poll(() =>
        page
          .locator("#wiring-image")
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
      )
      .toBe(true);
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download SVG" }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toMatch(/^[a-z0-9-]+\.svg$/);
    const svg = await readFile((await download.path())!, "utf8");
    expect(svg).toBe(render(await source(id)));
    if (id === "temperature-alarm") {
      // Measure the actual SVG paths/rectangles in Chromium, independently of
      // the router's candidate generation and hand-authored body model.
      const drawn = await page.evaluate((markup) => {
        const svg = new DOMParser().parseFromString(
          markup,
          "image/svg+xml",
        ).documentElement;
        document.body.append(svg);
        const boxes = [
          ...svg.querySelectorAll<SVGGraphicsElement>(
            "[data-route-body], [data-lead]",
          ),
        ].map((element) => {
          const box = element.getBBox();
          return {
            id:
              element.getAttribute("data-route-body") ??
              `lead:${element.getAttribute("data-lead")}`,
            left: box.x,
            right: box.x + box.width,
            top: box.y,
            bottom: box.y + box.height,
          };
        });
        svg.remove();
        return boxes;
      }, svg);
      const result = compile(await source(id)),
        modeled = routingBodies(result.circuit, result.placement);
      expect(drawn).toHaveLength(27); // Uno, seven part bodies, nineteen leads.
      for (const actual of drawn) {
        const body = modeled.find((body) => body.id === actual.id)!;
        expect(body).toBeDefined();
        const margin = actual.id.startsWith("lead:") ? 0 : 6;
        expect(body.left).toBeLessThanOrEqual(actual.left - margin);
        expect(body.right).toBeGreaterThanOrEqual(actual.right + margin);
        expect(body.top).toBeLessThanOrEqual(actual.top - margin);
        expect(body.bottom).toBeGreaterThanOrEqual(actual.bottom + margin);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await expect(page.locator("#warnings")).toBeVisible();
  const before = await page.locator("#zoom-level").textContent();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator("#zoom-level")).not.toHaveText(before!);
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  await expect(page.locator("#zoom-level")).toHaveText(before!);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("mixed-parts.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("invalid edits retain a marked stale preview, prevent download, jump to the error and recover", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#preview-status")).toHaveAttribute(
    "data-state",
    "valid",
  );
  const previousImage = await page.locator("#wiring-image").getAttribute("src");
  const editor = page.getByRole("textbox", { name: "Bread source code" });
  await editor.fill((await source("blink")).replace("uno.D13", "uno.D99"));
  await expect(page.locator("#error-code")).toHaveText("E_UNKNOWN_PIN");
  await expect(page.locator("#status-text")).toContainText(
    "Showing last valid preview",
  );
  await expect(page.locator("#download")).toBeDisabled();
  await expect(page.locator("#wiring-image")).toHaveAttribute(
    "src",
    previousImage!,
  );
  await page.locator("#error-line").click();
  await expect(editor).toBeFocused();
  expect(
    await editor.evaluate((field: HTMLTextAreaElement) =>
      field.value.slice(field.selectionStart, field.selectionEnd),
    ),
  ).toContain("uno.D99");
  await editor.fill(await source("7-leds"));
  await expect(page.locator("#error-code")).toHaveText("E_PLACEMENT_CAPACITY");
  await expect(page.locator("#error-line")).toBeHidden();
  await editor.fill(await source("blink-reversed"));
  await expect(page.locator("#preview-status")).toHaveAttribute(
    "data-state",
    "valid",
  );
  await expect(page.locator("#warnings")).toContainText("W_LED_POLARITY");
  await expect(page.locator("#download")).toBeEnabled();
  await editor.focus();
  await page.keyboard.press("Tab");
  await expect(editor).not.toBeFocused();
});
