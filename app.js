/* ── Helpers ─────────────────────────────────────────────────────────── */

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function shortDigest(digest) {
  if (!digest) return "";
  return "sha256:" + digest.replace(/^sha256:/, "").slice(0, 12);
}

function extLink(url, text, cls) {
  const a = el("a", cls, text);
  a.href = url;
  a.target = "_blank";
  a.rel = "noreferrer";
  return a;
}

function statusPill(workflow) {
  const s = workflow.status;
  const c = workflow.conclusion;
  if (s === "queued" || s === "pending" || s === "waiting") return ["Queued", "pill-info"];
  if (s === "in_progress") return ["Running", "pill-warn"];
  if (c === "success") return ["Passed", "pill-ok"];
  if (c === "failure" || c === "timed_out") return ["Failed", "pill-bad"];
  if (c === "cancelled") return ["Cancelled", "pill-neutral"];
  if (c === "skipped") return ["Skipped", "pill-neutral"];
  return ["No data", "pill-neutral"];
}

async function copyCmd(text, btn) {
  const orig = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied!"; }
  catch { btn.textContent = "Error"; }
  setTimeout(() => { btn.textContent = orig; }, 1400);
}

function cmdBlock(value) {
  const wrap = el("div", "cmd-wrap");
  wrap.append(el("code", null, value));
  const btn = el("button", "cmd-copy", "Copy");
  btn.type = "button";
  btn.addEventListener("click", () => copyCmd(value, btn));
  wrap.append(btn);
  return wrap;
}

/* ── Data fetching ──────────────────────────────────────────────────── */

let catalog = null;
let liveData = null;

async function loadData() {
  const [cat, live] = await Promise.all([
    fetch("products.json", { cache: "no-store" }).then(r => r.json()),
    fetch("data/status.json", { cache: "no-store" }).then(r => r.json()).catch(() => null),
  ]);
  catalog = cat;
  liveData = live;
}

function liveProduct(key) {
  return (liveData?.products || []).find(p => p.key === key) || null;
}

/* ── Sidebar ────────────────────────────────────────────────────────── */

const nav = document.getElementById("product-nav");
const syncEl = document.getElementById("sync-time");
const contentInner = document.getElementById("content-inner");
const sidebar = document.getElementById("sidebar");
const toggle = document.getElementById("menu-toggle");
let activeKey = null;

toggle.addEventListener("click", () => sidebar.classList.toggle("open"));

function buildNav() {
  const products = catalog?.products || [];
  products.forEach(product => {
    const item = el("a", "nav-item", product.name);
    item.dataset.key = product.key;
    item.addEventListener("click", () => selectProduct(product.key));
    nav.append(item);
  });
  if (liveData?.generatedAt) {
    syncEl.textContent = "Synced " + formatDate(liveData.generatedAt);
  }
}

function selectProduct(key) {
  if (activeKey === key) return;
  activeKey = key;
  nav.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.key === key);
  });
  sidebar.classList.remove("open");
  const product = (catalog?.products || []).find(p => p.key === key);
  if (!product) return;
  renderProduct(product);
  window.scrollTo(0, 0);
  history.replaceState(null, "", "#" + key);
}

/* ── Renderers ──────────────────────────────────────────────────────── */

function renderHero(p) {
  const hero = el("div", "hero");
  hero.append(el("div", "hero-eyebrow", "Red Hat OpenShift AI"));
  hero.append(el("h1", null, p.name));
  if (p.tagline) hero.append(el("p", "hero-tagline", p.tagline));
  if (p.description) hero.append(el("p", "hero-description", p.description));
  const actions = el("div", "hero-actions");
  const primaryDoc = (p.docs || []).find(d => d.url);
  if (primaryDoc) actions.append(extLink(primaryDoc.url, "Get started →", "btn btn-primary"));
  if (p.source) actions.append(extLink(p.source, "Source code", "btn btn-secondary"));
  hero.append(actions);
  return hero;
}

function renderInstall(p) {
  const section = el("div", "section");
  section.id = "install";
  section.append(el("h2", null, "Install"));
  section.append(el("p", "section-lead", "Choose the method that fits your environment."));
  if (p.requirements) {
    const req = el("div", "requirements");
    req.append(el("strong", null, "Requirements: "));
    req.append(document.createTextNode(p.requirements));
    section.append(req);
  }
  const grid = el("div", "cards");
  for (const dl of p.downloads || []) {
    const card = el("div", "card");
    card.append(el("h3", null, dl.title));
    if (dl.detail) card.append(el("p", null, dl.detail));
    card.append(cmdBlock(dl.value));
    grid.append(card);
  }
  section.append(grid);
  return section;
}

function renderDocs(p) {
  const section = el("div", "section");
  section.id = "docs";
  section.append(el("h2", null, "Documentation"));
  section.append(el("p", "section-lead", "Everything you need to deploy, configure, and operate."));
  const grid = el("div", "cards");
  for (const doc of p.docs || []) {
    const card = extLink(doc.url, null, "card doc-card");
    card.append(el("h3", null, doc.title));
    if (doc.detail) card.append(el("p", null, doc.detail));
    card.append(el("span", "doc-open", "Open →"));
    grid.append(card);
  }
  section.append(grid);
  return section;
}

function renderImages(p, live) {
  const section = el("div", "section");
  section.id = "images";
  section.append(el("h2", null, "Container images"));
  section.append(el("p", "section-lead", "Published to the public Open Data Hub Quay organisation. Pull with podman or docker."));
  const liveImages = new Map((live?.images || []).map(i => [i.repository, i]));
  const grid = el("div", "image-row");
  for (const img of p.images || []) {
    const card = el("div", "image-card");
    card.append(el("h3", null, img.name));
    if (img.role) card.append(el("p", "role", img.role));
    const tag = img.pullTag || "odh-stable";
    card.append(cmdBlock(`podman pull ${img.repository}:${tag}`));
    const liveImg = liveImages.get(img.repository);
    const meta = el("div", "image-meta");
    if (liveImg?.pull) {
      meta.innerHTML = `<strong>${tag}</strong> · ${shortDigest(liveImg.pull.digest)} · ${formatDate(liveImg.pull.lastModified)}<br/>`;
    }
    const repo = img.repository.replace("quay.io/", "");
    meta.append(extLink(`https://quay.io/repository/${repo}`, "View on Quay →", null));
    card.append(meta);
    grid.append(card);
  }
  section.append(grid);
  return section;
}

function renderChecks(live) {
  const workflows = live?.workflows || [];
  if (!workflows.length) return null;
  const section = el("div", "section");
  section.id = "checks";
  section.append(el("h2", null, "CI status"));
  section.append(el("p", "section-lead", "Public GitHub Actions workflows across downstream and upstream repositories."));

  const groups = new Map();
  for (const wf of workflows) {
    const repo = wf.repo || "unknown";
    if (!groups.has(repo)) groups.set(repo, []);
    groups.get(repo).push(wf);
  }

  for (const [repo, wfs] of groups) {
    const groupLabel = el("div", "check-group-label");
    groupLabel.append(extLink(`https://github.com/${repo}/actions`, repo, null));
    section.append(groupLabel);
    const list = el("ul", "checks-list");
    for (const wf of wfs) {
      const row = el("li", "check-row");
      const info = el("div", "check-info");
      info.append(el("div", "check-name", wf.name));
      const meta = [wf.branch, formatDate(wf.updatedAt)].filter(Boolean).join(" · ");
      if (meta) info.append(el("div", "check-meta", meta));
      row.append(info);
      const [label, cls] = statusPill(wf);
      row.append(el("span", "pill " + cls, label));
      if (wf.url) row.append(extLink(wf.url, "View", "check-link"));
      list.append(row);
    }
    section.append(list);
  }
  return section;
}

function renderProduct(p) {
  const live = liveProduct(p.key);
  const fragment = document.createDocumentFragment();
  fragment.append(renderHero(p));
  fragment.append(renderInstall(p));
  fragment.append(renderDocs(p));
  fragment.append(renderImages(p, live));
  const checks = renderChecks(live);
  if (checks) fragment.append(checks);
  contentInner.replaceChildren(fragment);
}

/* ── Init ───────────────────────────────────────────────────────────── */

(async () => {
  try {
    await loadData();
    buildNav();
    const hash = location.hash.replace("#", "");
    const first = (catalog?.products || [])[0];
    const initial = hash && (catalog?.products || []).find(p => p.key === hash) ? hash : first?.key;
    if (initial) selectProduct(initial);
  } catch (err) {
    contentInner.innerHTML = `<div class="splash"><h1>Could not load</h1><p>${err.message}</p></div>`;
  }
})();
