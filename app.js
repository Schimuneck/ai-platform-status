const productsEl = document.querySelector("#products");
const generatedEl = document.querySelector("#generated");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortDigest(digest) {
  if (!digest) return "";
  const hex = digest.replace(/^sha256:/, "");
  return `sha256:${hex.slice(0, 12)}`;
}

function resultLabel(workflow) {
  if (workflow.status === "queued" || workflow.status === "pending" || workflow.status === "waiting") {
    return { text: "Queued", className: "run" };
  }
  if (workflow.status === "in_progress") return { text: "Running", className: "run" };
  const conclusion = workflow.conclusion;
  if (conclusion === "success") return { text: "Passed", className: "ok" };
  if (conclusion === "failure" || conclusion === "timed_out") return { text: "Failed", className: "bad" };
  if (conclusion === "cancelled") return { text: "Cancelled", className: "neutral" };
  if (conclusion === "skipped") return { text: "Skipped", className: "neutral" };
  if (workflow.status === "missing" || !conclusion) return { text: "No runs", className: "neutral" };
  return { text: conclusion, className: "neutral" };
}

function link(href, text, className) {
  const anchor = el("a", className, text);
  anchor.href = href;
  anchor.rel = "noreferrer";
  return anchor;
}

function tagList(tags) {
  const list = el("ul", "channels");
  if (!tags.length) {
    list.append(el("li", null, "No channel tags in the latest sync."));
    return list;
  }
  for (const tag of tags) {
    const item = el("li");
    item.append(el("span", "mono", tag.name));
    item.append(document.createTextNode(` · ${shortDigest(tag.digest)} · ${formatWhen(tag.lastModified)}`));
    list.append(item);
  }
  return list;
}

function table(headers, rows) {
  const wrap = el("div", "table-wrap");
  const tableEl = document.createElement("table");
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const header of headers) headRow.append(el("th", null, header));
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    for (const cell of row) tr.append(cell);
    body.append(tr);
  }
  tableEl.append(head, body);
  wrap.append(tableEl);
  return wrap;
}

function cell(node) {
  const td = document.createElement("td");
  if (typeof node === "string") td.textContent = node;
  else td.append(node);
  return td;
}

function renderProduct(product) {
  const section = el("section", "product");
  const head = el("div", "product-head");
  head.append(el("h2", null, product.name));
  if (product.source) head.append(link(product.source, "Source", "source"));
  section.append(head);
  if (product.summary) section.append(el("p", "summary", product.summary));

  section.append(el("h3", null, "Current tags"));
  const channelBlock = el("div");
  for (const image of product.images) {
    const title = el("p", "mono", image.name);
    channelBlock.append(title, tagList(image.channels || []));
  }
  section.append(channelBlock);

  section.append(el("h3", null, "Recent image builds"));
  section.append(
    table(
      ["Component", "Tag", "Digest", "Pushed", "Registry"],
      product.images.flatMap((image) => {
        if (!image.builds.length) {
          return [[cell(image.name), cell("No public tags"), cell(""), cell(""), cell(link(image.registryUrl, "Quay"))]];
        }
        return image.builds.map((build) => [
          cell(image.name),
          cell(link(`${image.registryUrl}?tab=tags`, build.name, "mono")),
          cell(el("span", "mono", shortDigest(build.digest))),
          cell(formatWhen(build.lastModified)),
          cell(link(image.registryUrl, "Quay")),
        ]);
      }),
    ),
  );

  section.append(el("h3", null, "Tests"));
  section.append(
    table(
      ["Workflow", "Result", "Branch", "Updated", "Run"],
      product.workflows.map((workflow) => {
        const result = resultLabel(workflow);
        const pill = el("span", `pill ${result.className}`, result.text);
        return [
          cell(workflow.name),
          cell(pill),
          cell(workflow.branch || ""),
          cell(formatWhen(workflow.updatedAt)),
          cell(link(workflow.url, "Open")),
        ];
      }),
    ),
  );
  return section;
}

async function load() {
  try {
    const response = await fetch("data/status.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`status.json returned ${response.status}`);
    const status = await response.json();
    generatedEl.textContent = `Synced ${formatWhen(status.generatedAt)} from public Quay and GitHub Actions.`;
    productsEl.replaceChildren(...status.products.map(renderProduct));
  } catch (error) {
    generatedEl.textContent = "";
    productsEl.replaceChildren(
      el(
        "p",
        "error",
        `No status snapshot yet. From the repo root, run python3 sync.py and reload. (${error.message})`,
      ),
    );
  }
}

load();
