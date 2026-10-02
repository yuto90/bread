import { readFileSync } from "node:fs";
const canonical = readFileSync(
  new URL("../examples/temperature-alarm.bread", import.meta.url),
  "utf8",
);
export function routingCorpus(): { id: string; source: string }[] {
  const cases = [{ id: "canonical", source: canonical }];
  for (let i = 0; i < 12; i++) {
    const pins = [i + 2, 2 + ((i + 4) % 12), 2 + ((i + 8) % 12)];
    const source = canonical.replace(
      /uno\.D(13|4|2)\b/g,
      (_, pin) => `uno.D${pins[["13", "4", "2"].indexOf(pin)]}`,
    );
    cases.push({ id: `pins-${pins.join("-")}`, source });
    const renamed = source
      .replace(/\btemperature\b/g, "sensor")
      .replace(/\backnowledge\b/g, "button")
      .replace(/\bthreshold\b/g, "knob");
    const lines = renamed.split("\n");
    cases.push({
      id: `renamed-reordered-${pins.join("-")}`,
      source: [
        ...lines.filter((l) => !l.startsWith("part ") && !l.includes(" -- ")),
        ...lines.filter((l) => l.startsWith("part ")).reverse(),
        ...lines.filter((l) => l.includes(" -- ")).reverse(),
      ].join("\n"),
    });
  }
  return cases;
}
