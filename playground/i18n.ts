import { staticCopy } from "./i18n-static.ts";
export type Locale = "en" | "ja";
export const LANGUAGE_KEY = "bread.language";
export function chooseLocale(
  saved: string | null,
  languages: readonly string[],
): Locale {
  if (saved === "en" || saved === "ja") return saved;
  for (const language of languages) {
    const base = language.toLowerCase().split("-")[0];
    if (base === "en" || base === "ja") return base;
  }
  return "en";
}
export function initialLocale(
  storage: Pick<Storage, "getItem"> | undefined,
  languages: readonly string[],
): Locale {
  let saved: string | null = null;
  try {
    saved = storage?.getItem(LANGUAGE_KEY) ?? null;
  } catch {
    /* Storage may be disabled. */
  }
  return chooseLocale(saved, languages);
}
export function rememberLocale(
  storage: Pick<Storage, "setItem"> | undefined,
  locale: Locale,
): void {
  try {
    storage?.setItem(LANGUAGE_KEY, locale);
  } catch {
    /* The current tab still works. */
  }
}
const messages = {
  cursor: ["Ln {line}, Col {column}", "{line} 行、{column} 列"],
  jump: ["Go to line {line} ↗", "{line} 行へ移動 ↗"],
  line: ["line {line}", "{line} 行"],
  stale: ["Showing last valid preview", "最後に成功したプレビューを表示中"],
  noPreview: ["No valid preview yet", "有効なプレビューはまだありません"],
  emptyError: ["Let’s check those connections", "接続を確認しましょう"],
  emptyHelp: [
    "Fix the error in the editor to see your wiring.",
    "エディターのエラーを修正すると配線図を表示できます。",
  ],
  updating: [
    "Updating… · Showing last valid preview",
    "更新中… · 最後に成功したプレビューを表示中",
  ],
  checking: ["Checking connections…", "接続を検証中…"],
  alt: [
    "{title}. Automatically placed wiring diagram and insertion guide. {nets} static nets verified.",
    "{title}。自動配置した配線図と挿入ガイド。{nets} 個の静的ネットを検証済み。",
  ],
  stats: [
    "{parts} parts · {nets} static nets · fixed 300-hole board",
    "{parts} 部品 · {nets} 個の静的ネット · 固定 300 穴ボード",
  ],
  verified: ["{nets} static nets verified", "{nets} 個の静的ネットを検証済み"],
  warning: [" · {count} warning", " · 警告 {count} 件"],
  warnings: [" · {count} warnings", " · 警告 {count} 件"],
  current: [" · Preview up to date", " · プレビューは最新です"],
  custom: [
    "Custom circuit. Only the supported circuit families can be rendered.",
    "編集中の回路。描画できるのは対応する回路構成のみです。",
  ],
} as const;
export function text(
  locale: Locale,
  key: keyof typeof messages,
  values: Record<string, string | number> = {},
): string {
  return messages[key][locale === "ja" ? 1 : 0].replace(
    /\{(\w+)\}/g,
    (whole, name: string) => String(values[name] ?? whole),
  );
}
export const sampleDescriptions: Record<string, readonly [string, string]> = {
  blink: [
    "One Uno, one 220Ω resistor and one LED in series.",
    "Uno、220Ω 抵抗、LED 各1個の直列回路。",
  ],
  "three-leds": [
    "Three separate resistor/LED branches sharing GND1.",
    "GND1 を共有する、抵抗と LED の3分岐。",
  ],
  "6-leds": [
    "Six resistor/LED branches; crossings are not junctions.",
    "抵抗と LED の6分岐。線の交差は接続点ではありません。",
  ],
  "temperature-alarm": [
    "DHT22, open button, trimmer and LED wiring only; no alarm simulation.",
    "DHT22、開状態のボタン、半固定抵抗、LED の配線例。アラーム動作はシミュレーションしません。",
  ],
  "diode-led": [
    "1N4148 A/K and LED A/K in series; diode lead forming is assumed.",
    "1N4148 の A/K と LED の A/K を直列接続。ダイオードのリード加工を仮定します。",
  ],
  "diode-decoupling": [
    "The diode/LED family plus one non-polar 100nF capacitor across 5V/GND1.",
    "ダイオードと LED の回路に、5V/GND1 間の無極性 100nF コンデンサー1個を追加。",
  ],
};
const hints: Record<string, string> = {
  E_SYNTAX:
    "構文を確認してください。先頭は bread 0.1、部品宣言は part、接続は -- です。",
  E_ATTRIBUTE: "この部品・回路で対応している value 属性を確認してください。",
  E_UNKNOWN_COMPONENT: "部品の識別子または型が認識されません。",
  E_UNKNOWN_PIN: "ピン名が認識されません。大文字・小文字も確認してください。",
  E_DUPLICATE_COMPONENT_ID: "部品の識別子が重複しています。",
  E_COMPONENT_SHORT: "部品の両端が同じネットに接続されています。",
  E_UNSUPPORTED_CIRCUIT:
    "現在対応している回路構成ではありません。サンプルと対応範囲を確認してください。",
  E_PLACEMENT_CAPACITY: "現在の部品形状・配置方式ではボードに配置できません。",
  E_ROUTING_FAILED:
    "限られた配線候補の中に、検証に通る経路が見つかりませんでした。",
  E_POWER_NET: "電源と GND の接続を確認してください。",
  E_NC_CONNECTED: "NC（未接続）ピンには接続できません。",
  E_DHT_PULLUP:
    "DHT22 の DATA には 5V への独立した 10kΩ プルアップ抵抗が必要です。",
  E_BUTTON_PULLDOWN:
    "ボタンには GND1 への独立した 10kΩ プルダウン抵抗が必要です。",
  E_DIODE_POLARITY:
    "この回路ではダイオードと LED の A/K を指定の向きに接続してください。",
  E_SOURCE_LIMIT: "Playground のソース上限は 32,768 文字（UTF-16）です。",
  E_SVG_TEXT: "タイトルに SVG/XML で表現できない文字が含まれています。",
  E_PREVIEW_IMAGE:
    "配線図を表示できませんでした。タイトルを確認するか再読み込みしてください。",
  E_PREVIEW:
    "プレビュー処理に失敗しました。サンプルを選ぶか再読み込みしてください。",
  E_LOAD:
    "Playground を読み込めませんでした。HTTP 経由で開いていることを確認し、再読み込みしてください。",
  W_LED_POLARITY:
    "指定どおり LED の逆向きを保持しています。実機動作を保証するものではありません。",
  W_BUTTON_FOOTPRINT:
    "ボタンのリードを 7.62 × 5.08mm に加工する前提です。機械的な適合は未検証です。",
  W_DIODE_FOOTPRINT:
    "ダイオードのリードを 10.16mm 幅に加工する前提です。実機での適合は未検証です。",
};
// Preserve precise compiler details, including user identifiers, as plain text.
export function diagnosticText(
  locale: Locale,
  code: string,
  original: string,
): string {
  if (locale === "en") return original;
  return `${hints[code] ?? "検証の詳細を確認してください。"}\n詳細（原文）: ${original}`;
}
export function applyStaticCopy(document: Document, locale: Locale): void {
  document.documentElement.lang = locale;
  for (const copy of staticCopy) {
    const element = document.querySelector(copy.selector);
    if (!element)
      throw new Error(`Missing translated element: ${copy.selector}`);
    if (copy.attribute) element.setAttribute(copy.attribute, copy[locale]);
    else element.textContent = copy[locale];
  }
  document.querySelector<HTMLAnchorElement>("#docs-link")!.href =
    locale === "ja" ? "./docs/ja/" : "./docs/";
}
