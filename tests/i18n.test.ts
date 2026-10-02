import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseLocale,
  initialLocale,
  rememberLocale,
  diagnosticText,
  text,
  sampleDescriptions,
  LANGUAGE_KEY,
} from "../playground/i18n.ts";
import { staticCopy } from "../playground/i18n-static.ts";

test("Locale selection honors valid preference, supported browser languages and English fallback", () => {
  assert.equal(chooseLocale("ja", ["en-US"]), "ja");
  assert.equal(chooseLocale("en", ["ja-JP"]), "en");
  assert.equal(chooseLocale("invalid", ["fr-FR", "ja-JP"]), "ja");
  assert.equal(chooseLocale(null, ["en-GB", "ja"]), "en");
  assert.equal(chooseLocale(null, ["JA-jp"]), "ja");
  assert.equal(chooseLocale(null, ["fr-FR"]), "en");
  assert.equal(chooseLocale(null, []), "en");
});
test("Denied storage does not prevent locale selection or current-tab changes", () => {
  const denied = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
  };
  assert.equal(initialLocale(denied, ["ja"]), "ja");
  assert.doesNotThrow(() => rememberLocale(denied, "en"));
  const values = new Map<string, string>();
  rememberLocale(
    {
      setItem(key, value) {
        values.set(key, value);
      },
    },
    "ja",
  );
  assert.deepEqual([...values], [[LANGUAGE_KEY, "ja"]]);
});
test("Localized diagnostics retain the exact original detail and stable identifiers", () => {
  const detail = "<img src=x onerror=alert(1)> uno.D99";
  assert.equal(diagnosticText("en", "E_UNKNOWN_PIN", detail), detail);
  assert.ok(diagnosticText("ja", "E_UNKNOWN_PIN", detail).endsWith(detail));
  assert.ok(diagnosticText("ja", "E_FUTURE_CODE", detail).endsWith(detail));
  assert.equal(
    text("ja", "stats", { parts: 4, nets: 5 }),
    "4 部品 · 5 個の静的ネット · 固定 300 穴ボード",
  );
  assert.ok(
    text("ja", "alt", { title: "$&<title>", nets: 3 }).startsWith("$&<title>"),
  );
});
test("Static translations target unique safe attributes and every shipped sample has both descriptions", () => {
  assert.equal(
    new Set(staticCopy.map((c) => `${c.selector}:${c.attribute}`)).size,
    staticCopy.length,
  );
  for (const copy of staticCopy) {
    assert.ok(copy.en.trim() && copy.ja.trim());
    assert.ok(
      copy.attribute === null ||
        copy.attribute === "aria-label" ||
        copy.attribute === "content",
    );
  }
  assert.equal(Object.keys(sampleDescriptions).length, 6);
  for (const descriptions of Object.values(sampleDescriptions))
    assert.ok(descriptions[0] && descriptions[1]);
});
