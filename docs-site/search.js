// All results come from the same-origin static build. Text is never inserted as HTML.
const form = document.querySelector(".search");
const input = document.querySelector("#docs-search");
const results = document.querySelector("#search-results");
const status = document.querySelector("#search-status");
const japanese = document.documentElement.lang === "ja";
let indexPromise;
let revision = 0;
form.addEventListener("submit", (event) => event.preventDefault());
input.addEventListener("input", async () => {
  const request = ++revision;
  const query = input.value.trim().toLocaleLowerCase().slice(0, 120);
  results.replaceChildren();
  results.hidden = true;
  status.textContent = "";
  if (!query) return;
  try {
    indexPromise ??= fetch(form.dataset.index)
      .then((response) => {
        if (!response.ok) throw new Error("Search index unavailable");
        return response.json();
      })
      .catch((error) => {
        indexPromise = undefined;
        throw error;
      });
    const index = await indexPromise;
    if (request !== revision) return;
    const terms = query.split(/\s+/);
    const matches = index
      .filter((page) =>
        terms.every((term) => page.text.toLocaleLowerCase().includes(term)),
      )
      .slice(0, 9);
    status.textContent = japanese
      ? `${matches.length} 件のガイド`
      : `${matches.length} guides found`;
    for (const page of matches) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = page.href;
      link.textContent = page.title;
      const summary = document.createElement("span");
      summary.textContent = page.summary;
      item.append(link, summary);
      results.append(item);
    }
    results.hidden = matches.length === 0;
  } catch {
    if (request === revision)
      status.textContent = japanese
        ? "検索を読み込めません。ガイド一覧を利用してください。"
        : "Search unavailable. Use the guide navigation.";
  }
});
