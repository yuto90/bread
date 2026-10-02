import {
  initialLocale,
  rememberLocale,
  applyStaticCopy,
  text,
  diagnosticText,
  sampleDescriptions,
} from "./i18n.ts";
import type { Locale } from "./i18n.ts";
import { lineRange, svgFilename, MAX_SOURCE_LENGTH } from "./compiler.ts";
import type { CompileResult } from "./compiler.ts";

type Sample = { id: string; filename: string; source: string };
function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(`Missing playground element: ${id}`);
  return value as T;
}
let storage: Storage | undefined;
try {
  storage = window.localStorage;
} catch {
  /* Private contexts may deny access. */
}
const requestedLocale = new URLSearchParams(window.location.search).get("lang");
let locale: Locale =
  requestedLocale === "en" || requestedLocale === "ja"
    ? requestedLocale
    : initialLocale(storage, window.navigator.languages);
const t = (
  key: Parameters<typeof text>[1],
  values?: Record<string, string | number>,
) => text(locale, key, values);
const language = element<HTMLSelectElement>("language");
let selectedSample = "blink";
let lastError: { code: string; message: string; line?: number } | undefined;
const source = element<HTMLTextAreaElement>("source");
const image = element<HTMLImageElement>("wiring-image");
const viewport = element("preview-viewport");
const stage = element("preview-stage");
const status = element("preview-status");
const diagnostic = element("diagnostic");
const download = element<HTMLButtonElement>("download");
const sampleButtons = [
  ...document.querySelectorAll<HTMLButtonElement>("[data-sample]"),
];
const zoomIn = element<HTMLButtonElement>("zoom-in");
const zoomOut = element<HTMLButtonElement>("zoom-out");
const zoomFit = element<HTMLButtonElement>("zoom-fit");
let samples: Sample[] = [];
let worker: Worker;
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let latest: Extract<CompileResult, { ok: true }> | undefined;
let imageUrl: string | undefined;
let pendingImageUrl: string | undefined;
let errorLine: number | undefined;
let zoom = 1;
let fitMode = true;
let previewWidth = 1440;
let previewHeight = 940;

function updateGutter(): void {
  const gutter = element("line-numbers");
  const numbers = Array.from(
    { length: source.value.slice(0, MAX_SOURCE_LENGTH).split("\n").length },
    (_, index) => String(index + 1),
  );
  if (errorLine === undefined) {
    gutter.textContent = numbers.join("\n");
  } else {
    const highlighted = document.createElement("span");
    highlighted.className = "error-number";
    highlighted.textContent = numbers[errorLine - 1] ?? "";
    const before = numbers.slice(0, errorLine - 1).join("\n");
    const after = numbers.slice(errorLine).join("\n");
    gutter.replaceChildren(
      document.createTextNode(before ? before + "\n" : ""),
      highlighted,
      document.createTextNode(after ? "\n" + after : ""),
    );
  }
  gutter.scrollTop = source.scrollTop;
}
function updateCursor(): void {
  const before = source.value.slice(0, source.selectionStart).split("\n");
  element("cursor-position").textContent = t("cursor", {
    line: before.length,
    column: before.at(-1)!.length + 1,
  });
}
function setStatus(state: string, text: string): void {
  status.dataset.state = state;
  element("status-text").textContent = text;
}
function updateZoom(): void {
  if (!latest) return;
  if (fitMode) {
    const padding = parseFloat(getComputedStyle(stage).paddingLeft) * 2;
    zoom = Math.min(
      1,
      Math.max(
        0.05,
        Math.min(
          (viewport.clientWidth - padding) / previewWidth,
          (viewport.clientHeight - padding) / previewHeight,
        ),
      ),
    );
  }
  image.style.width = `${previewWidth * zoom}px`;
  image.style.height = `${previewHeight * zoom}px`;
  element("zoom-level").textContent = `${Math.round(zoom * 100)}%`;
  zoomOut.disabled = zoom <= 0.05;
  zoomIn.disabled = zoom >= 2;
  zoomFit.disabled = false;
}
function showError(code: string, message: string, line?: number): void {
  lastError = { code, message, line };
  errorLine = line;
  diagnostic.hidden = false;
  element("error-code").textContent = code;
  element("error-message").textContent = diagnosticText(locale, code, message);
  const jump = element<HTMLButtonElement>("error-line");
  jump.hidden = line === undefined;
  jump.textContent = line === undefined ? "" : t("jump", { line });
  source.setAttribute("aria-invalid", "true");
  source.setAttribute(
    "aria-describedby",
    "editor-hint error-code error-message",
  );
  download.disabled = true;
  element("warnings").hidden = true;
  setStatus(
    "error",
    `${code}${line === undefined ? "" : ` · ${t("line", { line })}`} · ${t(latest ? "stale" : "noPreview")}`,
  );
  if (!latest) {
    element("empty-preview").querySelector("p")!.textContent = t("emptyError");
    element("empty-preview").querySelector("span:last-child")!.textContent =
      t("emptyHelp");
  }
  updateGutter();
}
function receive(result: CompileResult): void {
  // A result that was already in flight must never replace newer edits.
  if (result.revision !== revision) return;
  if (!result.ok) {
    viewport.setAttribute("aria-busy", "false");
    showError(result.code, result.message, result.line);
    return;
  }
  const url = URL.createObjectURL(
    new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  pendingImageUrl = url;
  const candidate = new Image();
  candidate.onload = () => {
    if (result.revision !== revision) {
      URL.revokeObjectURL(url);
      return;
    }
    pendingImageUrl = undefined;
    viewport.setAttribute("aria-busy", "false");
    showPreview(result, url);
  };
  candidate.onerror = () => {
    URL.revokeObjectURL(url);
    if (result.revision !== revision) return;
    pendingImageUrl = undefined;
    viewport.setAttribute("aria-busy", "false");
    showError(
      "E_PREVIEW_IMAGE",
      "The diagram could not be displayed. Try another title or reload the page.",
    );
  };
  candidate.src = url;
}
function showPreview(
  result: Extract<CompileResult, { ok: true }>,
  url: string,
): void {
  latest = result;
  lastError = undefined;
  errorLine = undefined;
  diagnostic.hidden = true;
  source.removeAttribute("aria-invalid");
  source.setAttribute("aria-describedby", "editor-hint");
  const oldUrl = imageUrl;
  imageUrl = url;
  image.src = imageUrl;
  if (oldUrl) URL.revokeObjectURL(oldUrl);
  // Embed the checked SVG as an image, isolated from the application's DOM.
  const dimensions = result.svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  previewWidth = Number(dimensions?.[1] ?? 1440);
  previewHeight = Number(dimensions?.[2] ?? 940);

  image.hidden = false;
  element("empty-preview").hidden = true;
  updatePreviewText(result);
  download.disabled = false;
  updateGutter();
  updateZoom();
}
function updatePreviewText(result: Extract<CompileResult, { ok: true }>): void {
  image.alt = t("alt", { title: result.title, nets: result.nets });
  element("circuit-stats").textContent = t("stats", {
    parts: result.parts,
    nets: result.nets,
  });
  setStatus(
    "valid",
    t("verified", { nets: result.nets }) +
      (result.warnings.length
        ? t(result.warnings.length === 1 ? "warning" : "warnings", {
            count: result.warnings.length,
          })
        : t("current")),
  );
  const warnings = element("warnings");
  warnings.replaceChildren(
    ...result.warnings.map((warning) => {
      const p = document.createElement("p");
      p.textContent = diagnosticText(locale, warning.split(":")[0], warning);
      return p;
    }),
  );
  warnings.hidden = result.warnings.length === 0;
}
function updateSampleDescription(): void {
  const copy = sampleDescriptions[selectedSample];
  element("sample-description").textContent = copy
    ? copy[locale === "ja" ? 1 : 0]
    : t("custom");
}
function refreshLanguage(): void {
  applyStaticCopy(document, locale);
  language.value = locale;
  updateCursor();
  updateSampleDescription();
  if (latest) {
    image.alt = t("alt", { title: latest.title, nets: latest.nets });
    element("circuit-stats").textContent = t("stats", {
      parts: latest.parts,
      nets: latest.nets,
    });
  }
  if (status.dataset.state === "error" && lastError)
    showError(lastError.code, lastError.message, lastError.line);
  else if (status.dataset.state === "valid" && latest)
    updatePreviewText(latest);
  else if (status.dataset.state === "pending")
    setStatus("pending", t(latest ? "updating" : "checking"));
}
language.addEventListener("change", () => {
  if (language.value !== "en" && language.value !== "ja") return;
  locale = language.value;
  rememberLocale(storage, locale);
  refreshLanguage(); // Do not recompile, replace source, or re-enable stale downloads.
});
function schedule(immediate = false): void {
  lastError = undefined;
  revision++;
  clearTimeout(timer);
  if (pendingImageUrl) {
    URL.revokeObjectURL(pendingImageUrl);
    pendingImageUrl = undefined;
  }
  download.disabled = true;
  diagnostic.hidden = true;
  errorLine = undefined;
  source.removeAttribute("aria-invalid");
  source.setAttribute("aria-describedby", "editor-hint");
  element("warnings").hidden = true;
  viewport.setAttribute("aria-busy", "true");
  setStatus("pending", t(latest ? "updating" : "checking"));
  updateGutter();
  updateCursor();
  const request = { revision, source: source.value };
  timer = setTimeout(() => worker.postMessage(request), immediate ? 0 : 180);
}
function chooseSample(id: string): void {
  const sample = samples.find((item) => item.id === id);
  if (!sample) return;
  selectedSample = id;
  updateSampleDescription();
  source.value = sample.source;
  source.scrollTop = 0;
  source.scrollLeft = 0;
  source.setSelectionRange(0, 0);
  element("filename").textContent = sample.filename;
  sampleButtons.forEach((button) => {
    const selected = button.dataset.sample === id;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  fitMode = true;
  viewport.scrollTo(0, 0);
  schedule(true);
}
source.addEventListener("input", () => {
  selectedSample = "";
  updateSampleDescription();
  element("filename").textContent = "untitled.bread";
  sampleButtons.forEach((button) => {
    button.classList.remove("active");
    button.setAttribute("aria-pressed", "false");
  });
  schedule();
});
source.addEventListener("scroll", () => {
  element("line-numbers").scrollTop = source.scrollTop;
});
source.addEventListener("keyup", updateCursor);
source.addEventListener("click", updateCursor);
source.addEventListener("select", updateCursor);
// Keep native Tab navigation so keyboard users can always leave the editor.
element("error-line").addEventListener("click", () => {
  if (errorLine === undefined) return;
  const [start, end] = lineRange(source.value, errorLine);
  source.focus();
  source.setSelectionRange(start, end);
  source.scrollTop = Math.max(0, (errorLine - 3) * 22);
  updateCursor();
});
sampleButtons.forEach((button) =>
  button.addEventListener("click", () => chooseSample(button.dataset.sample!)),
);
function changeZoom(factor: number): void {
  fitMode = false;
  zoom = Math.min(2, Math.max(0.05, zoom * factor));
  updateZoom();
}
zoomIn.addEventListener("click", () => changeZoom(1.25));
zoomOut.addEventListener("click", () => changeZoom(1 / 1.25));
zoomFit.addEventListener("click", () => {
  fitMode = true;
  updateZoom();
  viewport.scrollTo(0, 0);
});
new ResizeObserver(() => {
  if (fitMode) updateZoom();
}).observe(viewport);
download.addEventListener("click", () => {
  if (!latest || download.disabled || latest.revision !== revision) return;
  const url = URL.createObjectURL(
    new Blob([latest.svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = svgFilename(latest.title);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
});
window.addEventListener("pagehide", () => {
  clearTimeout(timer);
  worker?.terminate();
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});
async function start(): Promise<void> {
  try {
    const response = await fetch("./samples.json");
    if (!response.ok) throw new Error("Sample loading failed");
    samples = (await response.json()) as Sample[];
    worker = new Worker(new URL("./worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<CompileResult>) =>
      receive(event.data);
    worker.onerror = () => {
      clearTimeout(timer);
      revision++;
      worker.terminate();
      viewport.setAttribute("aria-busy", "false");
      showError(
        "E_PREVIEW",
        "The preview worker stopped. Reload the page to restart it.",
      );
      source.disabled = true;
      sampleButtons.forEach((button) => {
        button.disabled = true;
      });
    };
    source.disabled = false;
    sampleButtons.forEach((button) => {
      button.disabled = false;
    });
    const requested = new URLSearchParams(window.location.search).get("sample");
    chooseSample(
      samples.some((sample) => sample.id === requested) ? requested! : "blink",
    );
  } catch {
    viewport.setAttribute("aria-busy", "false");
    showError(
      "E_LOAD",
      "The playground could not load. Run npm run playground and open its local HTTP address, or reload this page.",
    );
  }
}
refreshLanguage();
void start();
