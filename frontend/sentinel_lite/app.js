const BRANCH_LABELS = {
  "macro-list": "Macro List",
  "variable-list": "Variable List",
  processor: "Processor",
  drivers: "Drivers",
  controllers: "Controllers",
  sources: "Sources",
  activities: "Activities",
  "room-events": "Room Events",
};

const TEMPLATE_LABELS = {
  system: "System",
  programming: "Programming",
};

const TEMPLATE_ORDER = ["system", "programming"];

const KIND_LABELS = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
};

const KIND_ORDER = ["added", "removed", "changed"];

/**
 * Lifetime Compare Count (top-right). Server-side total of Compare button hits
 * since going live. Count-only beacon — never sends file names, paths, or lines.
 */
const COMPARE_COUNT_PATH = "/api/sentinel_lite/compare-count";

/** Display order for [added, changed, removed] badges. */
const COUNT_KIND_ORDER = ["added", "changed", "removed"];

const GLOBAL_BRANCHES = [
  "macro-list",
  "variable-list",
  "processor",
  "drivers",
  "controllers",
  "sources",
];

const ROOM_BRANCHES = [
  "macro-list",
  "variable-list",
  "activities",
  "room-events",
  "controllers",
  "sources",
];

const EMPTY_CHOOSE = "Choose two .apex files.";
const EMPTY_READY = "Press Compare to build the change summary.";
const EMPTY_NONE = "No changes since last file.";
const EMPTY_FILTER = "Nothing matches the filter.";
const COMPARE_RUNNING = "Comparing…";
const COMPARE_STARTING = "Extracting A…";
const COMPARE_FAILED = "Change summary could not be computed.";
const EXPORT_FAILED = "Change summary could not be exported.";
const PDF_EXPORT_FAILED = "Breakdown could not be exported.";
const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Recycle the worker past this. Measured peak on the largest project is ~155 MB. */
const ENGINE_HEAP_LIMIT = 1536 * 1024 * 1024;
const CHART_EMPTY_HINT = "Compare two files to see change counts.";
const CHART_NONE = "No changes since last file.";
const CHART_FILTER_EMPTY = "Nothing matches the filter.";
const CHART_FAILED = "Change summary could not be computed.";
const CHART_RUNNING = "Comparing…";

/** Kind bar order for the breakdown chart (matches badge colors). */
const CHART_KIND_ORDER = ["added", "changed", "removed"];

const state = {
  fileA: null,
  fileB: null,
  /** idle | running | done | failed */
  compareStatus: "idle",
  /** Set only when compareStatus is failed. */
  compareError: null,
  result: null,
  /** Overlay on the tree: null | { type: "kind", kind } | { type: "subject", subject }. */
  chartFilter: null,
  /** Raw Keyword Search box text (Oracle Filter syntax). */
  keywordSearch: "",
  /** Last valid parse: { includes, excludes }. Empty lists = no keyword filter. */
  keywordFilter: { includes: [], excludes: [] },
  /** Highlight + Prev/Next within currently shown lines (does not hide). */
  find: { query: "", matches: [], index: -1 },
  /** entry -> { key, anyTemplateKey, subject }, built once per compare. */
  meta: null,
  /** Mirror of the filter tree: { leaves: Map, places: Map }. */
  filter: null,
  /** Lifetime Compare Count from the Feeny Power beacon, or null if unknown. */
  compareCount: null,
};

const LOG_TOOLS_DEBOUNCE_MS = 200;
let keywordSearchTimer = null;
let findQueryTimer = null;

const $ = (id) => document.getElementById(id);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

/** Render **bold** markers from the formatter as <strong>; leave (…) plain. */
function appendMarkedLine(parent, line) {
  const parts = String(line || "").split(/(\*\*[^*][\s\S]*?\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      parent.append(el("strong", "", part.slice(2, -2)));
    } else {
      parent.append(document.createTextNode(part));
    }
  }
}

/**
 * Path before the change suffix.
 * Prefer " : **" (formatter bold verb). Else last " : " outside (...), so
 * identities like “Room: TV Zone” and details like (fill: #333 → #222) do not
 * steal the split.
 */
function splitChangeLine(line) {
  const raw = String(line || "");
  const sep = " : ";
  const boldSep = `${sep}**`;
  const boldIdx = raw.lastIndexOf(boldSep);
  if (boldIdx >= 0) {
    // Keep leading ** on the suffix for verb parsing.
    return { path: raw.slice(0, boldIdx), suffix: raw.slice(boldIdx + sep.length) };
  }
  let depth = 0;
  let idx = -1;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && raw.startsWith(sep, i)) idx = i;
  }
  if (idx < 0) return { path: "", suffix: raw };
  return { path: raw.slice(0, idx), suffix: raw.slice(idx + sep.length) };
}

/** Strip a single leading/trailing ** pair left over from a failed bold parse. */
function stripBoldMarkers(text) {
  const raw = String(text || "").trim();
  if (raw.startsWith("**") && raw.endsWith("**") && raw.length > 4) {
    return raw.slice(2, -2);
  }
  return raw;
}

/**
 * Pull verb + trailing details from the suffix.
 * Formatter form: **Verb** (details). Use [\s\S] so newlines inside details
 * (e.g. button text=) do not leave literal ** on the verb. Also accept plain
 * Verb (details) so a missing bold marker cannot leave the parenthetical stuck open.
 */
function parseVerbSuffix(suffix) {
  const raw = String(suffix || "").trim();
  const bold = raw.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
  if (bold) {
    return { verb: bold[1], details: bold[2].trim() };
  }
  const open = raw.indexOf(" (");
  if (open >= 0 && raw.endsWith(")")) {
    return {
      verb: stripBoldMarkers(raw.slice(0, open)),
      details: raw.slice(open + 1).trim(),
    };
  }
  if (raw) return { verb: stripBoldMarkers(raw), details: "" };
  return { verb: "", details: "" };
}

/**
 * Glance = path + verb. When the suffix has details after **verb**, the verb
 * toggles them (UI only; CSV keeps the full formatter string).
 * Path segments carry template structure labels for hover titles.
 */
function appendChangelogLine(parent, line, segments) {
  const { path, suffix } = splitChangeLine(line);
  if (Array.isArray(segments) && segments.length) {
    segments.forEach((segment, index) => {
      if (index) parent.append(document.createTextNode(" / "));
      const span = el("span", "changelog-segment");
      const label = segment.label || "";
      span.title = label;
      span.dataset.label = label;
      appendMarkedLine(span, segment.text || "");
      parent.append(span);
    });
    parent.append(document.createTextNode(" : "));
  } else if (path) {
    appendMarkedLine(parent, path);
    parent.append(document.createTextNode(" : "));
  }

  const { verb, details } = parseVerbSuffix(suffix);
  if (!verb) {
    appendMarkedLine(parent, suffix);
    return;
  }
  if (!details) {
    const plain = el("strong", "changelog-verb-plain", verb);
    plain.title = "Change";
    plain.dataset.label = "Change";
    parent.append(plain);
    return;
  }

  const btn = el("span", "changelog-verb", verb);
  btn.title = "Show details";
  btn.dataset.label = "Show details";
  btn.tabIndex = 0;
  btn.setAttribute("role", "button");
  btn.setAttribute("aria-expanded", "false");
  const detail = el("span", "changelog-details is-collapsed", ` ${details}`);
  const setOpen = (open) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    detail.classList.toggle("is-collapsed", !open);
    btn.title = open ? "Hide details" : "Show details";
    btn.dataset.label = btn.title;
  };
  const toggle = () => setOpen(btn.getAttribute("aria-expanded") !== "true");
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  });
  btn.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  });
  parent.append(btn, detail);
}

function plainLine(line) {
  return String(line || "").replace(/\*\*(.+?)\*\*/g, "$1");
}

/**
 * Oracle Diagnostics keyword syntax: comma-separated terms; plain/+ = include
 * (AND); - = exclude (any hit drops the line). Case-insensitive substring.
 * Empty input → no keyword filter. Empty tokens / lone +/- → invalid.
 */
function tryParseKeywordFilter(input) {
  const raw = String(input || "").trim();
  if (!raw) return { ok: true, includes: [], excludes: [] };
  const includes = [];
  const excludes = [];
  for (const part of String(input || "").split(",")) {
    const trimmed = part.trim();
    if (!trimmed) return { ok: false, includes: [], excludes: [] };
    const sign = trimmed[0];
    if (sign === "+" || sign === "-") {
      const term = trimmed.slice(1).trim();
      if (!term) return { ok: false, includes: [], excludes: [] };
      if (sign === "-") excludes.push(term.toLowerCase());
      else includes.push(term.toLowerCase());
    } else {
      includes.push(trimmed.toLowerCase());
    }
  }
  return { ok: true, includes, excludes };
}

function lineMatchesKeywordFilter(lineText, includes, excludes) {
  const hay = String(lineText || "").toLowerCase();
  for (const term of includes) {
    if (!hay.includes(term)) return false;
  }
  for (const term of excludes) {
    if (hay.includes(term)) return false;
  }
  return true;
}

/**
 * Subject from the change verb for the secondary chart.
 * "Button Added" → "Button"; bare "Added" / "moved …" → null (no subject bar).
 * Does not invent Macro Step *type* counts — only the subject word(s).
 */
function subjectFromVerb(verb) {
  const plain = String(verb || "")
    .replace(/\*\*/g, "")
    .trim();
  if (!plain) return null;
  const match = plain.match(/^(.*?)\s+(Added|Removed|Changed)$/i);
  if (match) {
    const subject = match[1].trim();
    return subject || null;
  }
  return null;
}

function verbFromEntry(entry) {
  const { suffix } = splitChangeLine(entry && entry.line);
  return parseVerbSuffix(suffix).verb;
}

/** Tree-filter tallies — chart chip does not shrink these counts. */
function breakdownCounts(entries) {
  const kinds = { added: 0, changed: 0, removed: 0 };
  const subjects = new Map();
  for (const entry of entries || []) {
    if (entry.kind && kinds[entry.kind] != null) {
      kinds[entry.kind] += 1;
    }
    const meta = entryMeta(entry);
    const subject = meta ? meta.subject : null;
    if (!subject) continue;
    let counts = subjects.get(subject);
    if (!counts) {
      counts = { added: 0, changed: 0, removed: 0 };
      subjects.set(subject, counts);
    }
    if (entry.kind && counts[entry.kind] != null) {
      counts[entry.kind] += 1;
    }
  }
  const subjectRows = [...subjects.entries()]
    .map(([subject, counts]) => ({
      subject,
      counts,
      total: CHART_KIND_ORDER.reduce((sum, kind) => sum + (counts[kind] || 0), 0),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.subject.localeCompare(b.subject));
  return { kinds, subjectRows };
}

function appendChartRow(list, label, count, max, fillClass, countClass, options = {}) {
  const item = el("li", "chart-row");
  if (options.active) item.classList.add("is-active");
  if (options.onSelect) {
    item.classList.add("is-clickable");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.title = options.title || "Filter change summary";
    const activate = (event) => {
      event.preventDefault();
      options.onSelect();
    };
    item.addEventListener("click", activate);
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      activate(event);
    });
  }
  item.append(el("span", "chart-label", label));
  const track = el("div", "chart-track");
  const fill = el("span", `chart-fill ${fillClass}`);
  const pct = max > 0 ? Math.max(2, Math.round((count / max) * 100)) : 0;
  fill.style.width = `${pct}%`;
  track.append(fill);
  item.append(track);
  item.append(el("span", `chart-count ${countClass || ""}`.trim(), String(count)));
  list.append(item);
}

/** One subject bar: stacked added / changed / removed; width vs max total. */
function appendStackedSubjectRow(list, subject, counts, max, options = {}) {
  const total = CHART_KIND_ORDER.reduce((sum, kind) => sum + (counts[kind] || 0), 0);
  const item = el("li", "chart-row");
  if (options.active) item.classList.add("is-active");
  if (options.onSelect) {
    item.classList.add("is-clickable");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.title = options.title || "Filter change summary";
    const activate = (event) => {
      event.preventDefault();
      options.onSelect();
    };
    item.addEventListener("click", activate);
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      activate(event);
    });
  }
  item.append(el("span", "chart-label", subject));
  const track = el("div", "chart-track");
  const stack = el("div", "chart-stack");
  const barPct = max > 0 ? Math.max(2, Math.round((total / max) * 100)) : 0;
  stack.style.width = `${barPct}%`;
  for (const kind of CHART_KIND_ORDER) {
    const n = counts[kind] || 0;
    if (!n) continue;
    const seg = el("span", `chart-fill chart-fill-${kind}`);
    seg.style.flex = String(n);
    seg.title = `${KIND_LABELS[kind] || kind}: ${n}`;
    stack.append(seg);
  }
  track.append(stack);
  item.append(track);
  item.append(el("span", "chart-count", String(total)));
  list.append(item);
}

function chartFilterLabel(filter) {
  if (!filter) return "";
  if (filter.type === "kind") return `Kind: ${KIND_LABELS[filter.kind] || filter.kind}`;
  if (filter.type === "subject") return `Subject: ${filter.subject}`;
  return "";
}

function chartFilterActive(filter) {
  const current = state.chartFilter;
  if (!current || !filter) return false;
  if (current.type !== filter.type) return false;
  if (filter.type === "kind") return current.kind === filter.kind;
  if (filter.type === "subject") return current.subject === filter.subject;
  return false;
}

function setChartFilter(filter) {
  if (filter && chartFilterActive(filter)) {
    state.chartFilter = null;
  } else {
    state.chartFilter = filter;
  }
  renderChartChips();
  renderChart();
  renderChangelog();
}

function clearChartFilter() {
  if (!state.chartFilter) return;
  state.chartFilter = null;
  renderChartChips();
  renderChart();
  renderChangelog();
}

function renderChartChips() {
  const host = $("chartChips");
  if (!host) return;
  host.replaceChildren();
  const filter = state.chartFilter;
  if (!filter) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const chip = el("span", "chart-chip");
  chip.append(el("span", "chart-chip-label", chartFilterLabel(filter)));
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "chart-chip-clear";
  clear.setAttribute("aria-label", "Clear chart filter");
  clear.title = "Clear chart filter";
  clear.textContent = "×";
  clear.addEventListener("click", (event) => {
    event.preventDefault();
    clearChartFilter();
  });
  chip.append(clear);
  host.append(chip);
}

function renderChart() {
  const body = $("chartBody");
  if (!body) return;

  if (!bothLoaded()) {
    body.replaceChildren(el("p", "empty", CHART_EMPTY_HINT));
    renderChartChips();
    return;
  }
  if (state.compareStatus === "idle") {
    body.replaceChildren(el("p", "empty", CHART_EMPTY_HINT));
    renderChartChips();
    return;
  }
  if (state.compareStatus === "running") {
    body.replaceChildren(el("p", "empty", CHART_RUNNING));
    renderChartChips();
    return;
  }
  if (state.compareStatus === "failed" || !state.result) {
    body.replaceChildren(el("p", "empty", state.compareError || CHART_FAILED));
    renderChartChips();
    return;
  }
  const all = state.result.entries || [];
  if (!all.length) {
    body.replaceChildren(el("p", "empty", CHART_NONE));
    renderChartChips();
    return;
  }
  const entries = treeVisibleEntries();
  if (!entries.length) {
    body.replaceChildren(el("p", "empty", CHART_FILTER_EMPTY));
    renderChartChips();
    return;
  }

  const { kinds, subjectRows } = breakdownCounts(entries);
  const kindRows = CHART_KIND_ORDER.filter((kind) => (kinds[kind] || 0) > 0);
  body.replaceChildren();

  if (kindRows.length) {
    const section = el("div", "chart-section");
    section.append(el("h3", "chart-section-title", "By kind"));
    const list = el("ul", "chart-bars");
    const max = Math.max(...kindRows.map((kind) => kinds[kind]));
    for (const kind of kindRows) {
      const filter = { type: "kind", kind };
      appendChartRow(
        list,
        KIND_LABELS[kind] || kind,
        kinds[kind],
        max,
        `chart-fill-${kind}`,
        `chart-count-${kind}`,
        {
          active: chartFilterActive(filter),
          title: `Filter log to ${KIND_LABELS[kind] || kind}`,
          onSelect: () => setChartFilter(filter),
        },
      );
    }
    section.append(list);
    body.append(section);
  }

  if (subjectRows.length) {
    const section = el("div", "chart-section");
    section.append(el("h3", "chart-section-title", "By subject"));
    const list = el("ul", "chart-bars");
    const max = Math.max(...subjectRows.map((row) => row.total));
    for (const row of subjectRows) {
      const filter = { type: "subject", subject: row.subject };
      appendStackedSubjectRow(list, row.subject, row.counts, max, {
        active: chartFilterActive(filter),
        title: `Filter log to ${row.subject}`,
        onSelect: () => setChartFilter(filter),
      });
    }
    section.append(list);
    body.append(section);
  }

  if (!kindRows.length && !subjectRows.length) {
    body.replaceChildren(el("p", "empty", CHART_NONE));
  }
  renderChartChips();
}

function fileLabel(file) {
  return file ? file.name : "No file chosen";
}

function bothLoaded() {
  return Boolean(state.fileA && state.fileB);
}

function renderFiles() {
  const aName = $("fileAName");
  const bName = $("fileBName");
  aName.textContent = fileLabel(state.fileA);
  bName.textContent = fileLabel(state.fileB);
  aName.classList.toggle("is-empty", !state.fileA);
  bName.classList.toggle("is-empty", !state.fileB);
  $("compareBtn").disabled = !bothLoaded();
}

function setProgress(text) {
  $("progressLine").textContent = text || "";
  // The changelog body mirrors the progress line while a compare runs. Patch that
  // one paragraph instead of rebuilding the log on every extractor.
  if (state.compareStatus !== "running") return;
  const line = $("changelogBody").querySelector(".empty");
  if (line) line.textContent = text || COMPARE_RUNNING;
}

function exportPayload(entries) {
  const result = state.result;
  const filter = snapshotFilter();
  return {
    previousFile: result.previousFile || "",
    currentFile: result.currentFile || "",
    systemName: result.systemName || "",
    placeOrder: Array.isArray(result.placeOrder) ? result.placeOrder : [],
    totalCount: Array.isArray(result.entries) ? result.entries.length : 0,
    exportedAt: exportTimestamp(),
    chartChip: chartFilterLabel(state.chartFilter) || "none",
    filterExclusions: filter.exclusions,
    entries: entries.map((entry) => ({
      place: entry.place || "",
      branch: entry.branch || "",
      source: entry.source || "",
      driver: entry.driver || "",
      template: entry.template || "system",
      kind: entry.kind || "",
      line: entry.line || "",
      segments: Array.isArray(entry.segments) ? entry.segments : [],
    })),
  };
}

/** Directory this page was served from — the app also lives under a subpath. */
function assetBase() {
  return new URL("./", window.location.href).href;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function syncCloneFormState(sourceRoot, cloneRoot) {
  const srcInputs = sourceRoot.querySelectorAll("input");
  const dstInputs = cloneRoot.querySelectorAll("input");
  srcInputs.forEach((src, index) => {
    const dst = dstInputs[index];
    if (!dst) return;
    // outerHTML only keeps the attribute — property alone is lost in the PDF snapshot.
    if (src.checked) {
      dst.checked = true;
      dst.setAttribute("checked", "checked");
    } else {
      dst.checked = false;
      dst.removeAttribute("checked");
    }
    dst.indeterminate = !!src.indeterminate;
    if (src.indeterminate) dst.setAttribute("data-indeterminate", "1");
    else dst.removeAttribute("data-indeterminate");
  });
}

/** Drop unchecked filter nodes so the PDF shows only the active cut. */
/**
 * PDF Filter tree shape:
 * - keep checked / indeterminate nodes only
 * - rooms collapsed to the place heading (no branch children)
 * - Global expanded only through Macro List / Variable List / Drivers /
 *   Sources (and other Global branch headings) — nothing deeper
 */
function prunePdfFilterTree(filterRoot) {
  filterRoot.querySelectorAll(".filter-toggle").forEach((node) => node.remove());

  const boxes = [...filterRoot.querySelectorAll('input[type="checkbox"]')];
  boxes
    .map((box) => ({ box, depth: filterCheckboxDepth(box) }))
    .sort((a, b) => b.depth - a.depth)
    .forEach(({ box }) => {
      const kept =
        box.checked ||
        box.indeterminate ||
        box.getAttribute("data-indeterminate") === "1";
      if (kept) return;
      const host = filterCheckboxHost(box);
      if (!host || host === filterRoot || host.classList.contains("filter-panel")) {
        return;
      }
      host.remove();
    });

  filterRoot.querySelectorAll(".filter-group").forEach((group) => {
    const place = String(group.dataset.place || "");
    const children = group.querySelector(":scope > .filter-children");
    if (!children) return;
    if (place !== "Global") {
      children.remove();
      return;
    }
    // Global: keep branch headings only — strip nested lists under each branch.
    children.querySelectorAll(":scope > li").forEach((branchItem) => {
      branchItem
        .querySelectorAll(
          ":scope > .filter-kinds, :scope > .filter-grandchildren, :scope > .filter-templates, :scope > .filter-children, :scope > ul",
        )
        .forEach((nested) => nested.remove());
      branchItem.classList.remove("is-collapsed");
    });
    group.classList.remove("is-collapsed");
  });

  filterRoot.querySelectorAll(".filter-system").forEach((system) => {
    system.classList.remove("is-collapsed");
  });

  filterRoot
    .querySelectorAll(
      ".filter-kinds, .filter-templates, .filter-grandchildren, .filter-children, .filter-places",
    )
    .forEach((list) => {
      if (!list.children.length) list.remove();
    });
  filterRoot.querySelectorAll(".filter-group").forEach((group) => {
    if (!group.querySelector('input[type="checkbox"]')) group.remove();
  });
}

/**
 * Fit only the Filter tree into the Letter content box under the topbar.
 * Breakdown / chart / topbar are never scaled.
 */
function fitPdfWorkspaceToPage(doc) {
  if (typeof fitPdfFilterColumnToPage !== "function") {
    throw new Error("pdf_fit.js missing");
  }
  return fitPdfFilterColumnToPage(doc);
}

/** Live Filter + Breakdown panels → print HTML (Rubik + same CSS). */
function buildBreakdownPdfHtml() {
  const filterSource = $("filterPanel");
  const chartSource = $("chartPanel");
  if (!filterSource || !chartSource || !state.result) {
    throw new Error("pdf panels");
  }
  const filter = filterSource.cloneNode(true);
  const chart = chartSource.cloneNode(true);
  syncCloneFormState(filterSource, filter);
  prunePdfFilterTree(filter);
  filter.removeAttribute("id");
  chart.removeAttribute("id");

  // Drop pane explainer *text* on the PDF but keep the hint nodes so spacing
  // matches the live app (Animo Group / BY KIND stay on the same baseline).
  filter.querySelectorAll(".filter-hint").forEach((node) => {
    node.textContent = "";
  });
  chart.querySelectorAll(".chart-hint").forEach((node) => {
    node.textContent = "";
  });

  const chips = chart.querySelector(".chart-chips, #chartChips");
  if (chips) {
    chips.removeAttribute("id");
    if (!chips.hidden && chips.childElementCount > 0) {
      chips.removeAttribute("hidden");
    }
    // Chips stay at the bottom of the breakdown column.
    chart.appendChild(chips);
  }
  const chartBody = chart.querySelector(".chart-body, #chartBody");
  if (chartBody) chartBody.removeAttribute("id");

  const versionEl = $("appVersion");
  const version = versionEl ? String(versionEl.textContent || "").trim() : "";
  const prev = state.result.previousFile || "—";
  const curr = state.result.currentFile || "—";
  const changeTitle = `Change Summary (${prev} -> ${curr})`;
  const base = escapeHtml(assetBase());

  // Title drives the browser's default "Save as PDF" filename. Rubik is
  // self-hosted, so this document renders with no network at all.
  return `<!DOCTYPE html>
<html class="pdf-export" lang="en">
<head>
  <meta charset="utf-8" />
  <base href="${base}" />
  <link rel="stylesheet" href="${base}styles.css" />
  <link rel="stylesheet" href="${base}pdf_export.css" />
  <script src="${base}pdf_fit.js"></script>
  <title>breakdown</title>
</head>
<body class="pdf-export">
  <div class="pdf-sheet">
    <header class="pdf-topbar">
      <div class="brand">
        <img class="brand-logo" src="${base}assets/feeny-logo.png" alt="Feeny Power and Control" width="86" height="60" />
        <div class="brand-text">
          <h1>Sentinel Lite <span class="app-version">${escapeHtml(version)}</span></h1>
          <p>Local two-file Apex change summary</p>
        </div>
      </div>
      <h2 class="pdf-changelog-title">${escapeHtml(changeTitle)}</h2>
    </header>
    <div class="pdf-fit-slot">
      <div class="pdf-workspace">
        ${filter.outerHTML}
        ${chart.outerHTML}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function exportTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function filterCheckboxLabel(box) {
  const label = box.closest("label");
  if (!label) return "";
  const clone = label.cloneNode(true);
  clone.querySelectorAll("input, .filter-counts").forEach((node) => node.remove());
  return clone.textContent.replace(/\s+/g, " ").trim();
}

function filterCheckboxCounts(box) {
  const label = box.closest("label");
  if (!label) return null;
  const wrap = label.querySelector(".filter-counts");
  if (!wrap) return null;
  const counts = {};
  for (const kind of COUNT_KIND_ORDER) {
    const bit = wrap.querySelector(`.filter-count-${kind}`);
    if (!bit) continue;
    const n = Number.parseInt(bit.textContent || "", 10);
    if (n > 0) counts[kind] = n;
  }
  return Object.keys(counts).length ? counts : null;
}

function filterCheckboxDepth(box) {
  const role = box.dataset.role || "";
  if (role === "system") return 0;
  if (role === "parent") return 1;
  if (role === "child") return 2;
  if (role === "source" || role === "driver") return 3;
  if (role === "template") return 4;
  if (role === "kind") {
    if (box.dataset.template) return 5;
    if (box.dataset.source || box.dataset.driver) return 4;
    return 3;
  }
  return 0;
}

function filterCheckboxHost(box) {
  return (
    box.closest(".filter-kinds > li") ||
    box.closest(".filter-templates > li") ||
    box.closest(".filter-grandchildren > li") ||
    box.closest(".filter-children > li") ||
    box.closest(".filter-group") ||
    box.closest(".filter-system")
  );
}

/** True when a collapsed ancestor hides this checkbox's host. */
function filterNodeHidden(box) {
  const host = filterCheckboxHost(box);
  if (!host) return true;
  let node = host.parentElement;
  while (node && node.id !== "filterTree") {
    if (node.classList && node.classList.contains("is-collapsed")) return true;
    node = node.parentElement;
  }
  return false;
}

function parentFilterCheckbox(box) {
  const host = filterCheckboxHost(box);
  if (!host) return null;
  const outer =
    host.parentElement &&
    host.parentElement.closest(
      ".filter-templates > li, .filter-grandchildren > li, .filter-children > li, .filter-group, .filter-system",
    );
  if (!outer) return null;
  return outer.querySelector(
    ":scope > .filter-heading input[type=checkbox], :scope > label input[type=checkbox]",
  );
}

function checkboxPath(box) {
  const parts = [];
  let current = box;
  const seen = new Set();
  while (current && !seen.has(current)) {
    seen.add(current);
    const label = filterCheckboxLabel(current);
    if (label) parts.unshift(label);
    current = parentFilterCheckbox(current);
  }
  return parts.join(" / ");
}

/** Visible tree for PDF + unchecked cut-points for Excel Summary. */
function snapshotFilter() {
  const boxes = [...document.querySelectorAll("#filterTree input[type=checkbox]")];
  const nodes = [];
  for (const box of boxes) {
    if (filterNodeHidden(box)) continue;
    const label = filterCheckboxLabel(box);
    if (!label) continue;
    const host = filterCheckboxHost(box);
    const hasToggle = !!(host && host.querySelector(":scope > .filter-heading .filter-toggle"));
    let expanded = null;
    if (hasToggle) {
      expanded = !(host && host.classList.contains("is-collapsed"));
    }
    const node = {
      label,
      depth: filterCheckboxDepth(box),
      checked: !!box.checked,
      expanded,
    };
    const counts = filterCheckboxCounts(box);
    if (counts) node.counts = counts;
    nodes.push(node);
  }
  const exclusions = [];
  for (const box of boxes) {
    if (box.checked) continue;
    const parent = parentFilterCheckbox(box);
    if (parent && !parent.checked) continue;
    const path = checkboxPath(box);
    if (path) exclusions.push(path);
  }
  return { nodes, exclusions };
}

function syncExportButton() {
  const hasResult = !!(state.result && Array.isArray(state.result.entries));
  const treeCount = hasResult ? treeVisibleEntries().length : 0;
  const visibleCount = hasResult ? visibleEntries().length : 0;
  const xlsx = $("exportBtn");
  if (xlsx) xlsx.disabled = !(hasResult && visibleCount > 0);
  const pdf = $("exportPdfBtn");
  if (pdf) pdf.disabled = !(hasResult && treeCount > 0);
}

function placeOrder(entries) {
  const fromResult = state.result && Array.isArray(state.result.placeOrder) ? state.result.placeOrder : [];
  const present = new Set(entries.map((entry) => entry.place).filter(Boolean));
  const ordered = fromResult.filter((place) => present.has(place));
  for (const place of present) {
    if (!ordered.includes(place)) ordered.push(place);
  }
  if (ordered.includes("Global")) {
    return ["Global", ...ordered.filter((place) => place !== "Global")];
  }
  return ordered;
}

function kindsForScope(entries, place, scope) {
  const present = new Set();
  for (const entry of entries) {
    if (entry.place !== place || !entry.kind) continue;
    if (entry.branch !== scope.branch) continue;
    if (scope.source != null && entry.source !== scope.source) continue;
    if (scope.template != null && (entry.template || "system") !== scope.template) continue;
    if (scope.driver != null && entry.driver !== scope.driver) continue;
    present.add(entry.kind);
  }
  return KIND_ORDER.filter((kind) => present.has(kind));
}

function branchesFor(place, entries) {
  const order = place === "Global" ? GLOBAL_BRANCHES : ROOM_BRANCHES;
  const present = new Set(
    entries.filter((entry) => entry.place === place && entry.branch).map((entry) => entry.branch),
  );
  return order.filter((branch) => present.has(branch));
}

function sourcesFor(place, entries) {
  const fromResult =
    state.result && state.result.sourceOrder && Array.isArray(state.result.sourceOrder[place])
      ? state.result.sourceOrder[place]
      : [];
  const present = new Set();
  for (const entry of entries) {
    if (entry.place === place && entry.branch === "sources" && entry.source) present.add(entry.source);
  }
  const ordered = fromResult.filter((name) => present.has(name));
  for (const name of present) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

function driversFor(place, entries) {
  const fromResult = state.result && Array.isArray(state.result.driverOrder) ? state.result.driverOrder : [];
  const present = new Set();
  for (const entry of entries) {
    if (entry.place === place && entry.branch === "drivers" && entry.driver) present.add(entry.driver);
  }
  const ordered = fromResult.filter((name) => present.has(name));
  for (const name of present) {
    if (!ordered.includes(name)) ordered.push(name);
  }
  return ordered;
}

function templatesFor(place, sourceName, entries) {
  const present = new Set();
  for (const entry of entries) {
    if (
      entry.place === place &&
      entry.branch === "sources" &&
      entry.source === sourceName &&
      entry.template
    ) {
      present.add(entry.template);
    }
  }
  return TEMPLATE_ORDER.filter((name) => present.has(name));
}

/**
 * Address of the deepest checkbox that governs a line.
 *
 * Only the segments the tree actually nests take part: source and template
 * under Sources, driver under Drivers, nothing extra elsewhere. Built the same
 * way from a checkbox and from an entry so filtering is a map lookup instead of
 * a DOM scan per entry per toggle.
 */
function leafKey(place, branch, source, driver, template, kind) {
  const parts = [place || "", branch || ""];
  if (branch === "sources") parts.push(source || "", template || "");
  else if (branch === "drivers") parts.push(driver || "");
  parts.push(kind || "");
  return parts.join("\u0000");
}

/** Per-entry values that never change once a compare lands. */
function buildEntryMeta(entries) {
  const meta = new Map();
  for (const entry of entries || []) {
    meta.set(entry, {
      key: leafKey(
        entry.place,
        entry.branch,
        entry.source,
        entry.driver,
        entry.template || "system",
        entry.kind,
      ),
      // A Sources leaf without a template row matches any template.
      anyTemplateKey:
        entry.branch === "sources"
          ? leafKey(entry.place, entry.branch, entry.source, entry.driver, "", entry.kind)
          : null,
      subject: subjectFromVerb(verbFromEntry(entry)),
    });
  }
  return meta;
}

function entryMeta(entry) {
  const found = state.meta && state.meta.get(entry);
  if (found) return found;
  // Placeholder tree, or an entry rendered before the index was built.
  const built = buildEntryMeta([entry]);
  return built.get(entry);
}

/** Mirror of the tree's checked state. Rebuilt on change, never read from DOM. */
function refreshFilterState() {
  const tree = $("filterTree");
  if (!tree) {
    state.filter = null;
    return;
  }
  const leaves = new Map();
  for (const box of tree.querySelectorAll('input[data-role="kind"]')) {
    const group = box.closest(".filter-group");
    leaves.set(
      leafKey(
        group ? group.dataset.place : "",
        box.dataset.branch,
        box.dataset.source,
        box.dataset.driver,
        box.dataset.template,
        box.dataset.kind,
      ),
      box.checked,
    );
  }
  const places = new Map();
  for (const group of tree.querySelectorAll(".filter-group")) {
    const parent = group.querySelector('input[data-role="parent"]');
    places.set(group.dataset.place, parent ? parent.checked : true);
  }
  state.filter = { leaves, places };
}

function passesTreeFilter(entry) {
  const filter = state.filter;
  if (!filter || !filter.places.has(entry.place)) return true;
  const meta = entryMeta(entry);
  if (entry.branch && meta) {
    if (filter.leaves.has(meta.key)) return filter.leaves.get(meta.key);
    if (meta.anyTemplateKey && filter.leaves.has(meta.anyTemplateKey)) {
      return filter.leaves.get(meta.anyTemplateKey);
    }
  }
  return filter.places.get(entry.place);
}

function passesKeywordSearch(entry) {
  const filter = state.keywordFilter || { includes: [], excludes: [] };
  if (!filter.includes.length && !filter.excludes.length) return true;
  return lineMatchesKeywordFilter(plainLine(entry.line), filter.includes, filter.excludes);
}

function isLineVisible(entry) {
  return passesChartFilter(entry) && passesTreeFilter(entry) && passesKeywordSearch(entry);
}

function passesChartFilter(entry) {
  const filter = state.chartFilter;
  if (!filter) return true;
  if (filter.type === "kind") return entry.kind === filter.kind;
  if (filter.type === "subject") {
    const meta = entryMeta(entry);
    return (meta ? meta.subject : null) === filter.subject;
  }
  return true;
}

/** Tree + chart chip only — candidates before Keyword Search. */
function candidateEntries() {
  if (!state.result) return [];
  return state.result.entries.filter(
    (entry) => passesChartFilter(entry) && passesTreeFilter(entry),
  );
}

/** Entries matching the filter tree only (not the chart chip). */
function treeVisibleEntries() {
  if (!state.result) return [];
  return state.result.entries.filter(passesTreeFilter);
}

function visibleEntries() {
  if (!state.result) return [];
  return state.result.entries.filter(isLineVisible);
}

function clearLogToolTimers() {
  if (keywordSearchTimer) {
    clearTimeout(keywordSearchTimer);
    keywordSearchTimer = null;
  }
  if (findQueryTimer) {
    clearTimeout(findQueryTimer);
    findQueryTimer = null;
  }
}

function clearSearchAndFind() {
  clearLogToolTimers();
  state.keywordSearch = "";
  state.keywordFilter = { includes: [], excludes: [] };
  state.find = { query: "", matches: [], index: -1 };
  const keywordInput = $("keywordSearch");
  const findInput = $("findQuery");
  if (keywordInput) keywordInput.value = "";
  if (findInput) findInput.value = "";
  clearFindHighlights();
  syncLogTools();
}

function logToolsEnabled() {
  return state.compareStatus === "done" && !!state.result && candidateEntries().length > 0;
}

function syncLogTools() {
  const enabled = logToolsEnabled();
  const ids = [
    "keywordSearch",
    "keywordSearchClear",
    "findQuery",
    "findPrev",
    "findNext",
    "findClear",
  ];
  for (const id of ids) {
    const node = $(id);
    if (!node) continue;
    if (id === "findPrev" || id === "findNext") {
      node.disabled = !enabled || state.find.matches.length === 0;
    } else if (id === "keywordSearchClear") {
      node.disabled = !enabled || !String(state.keywordSearch || "").trim();
    } else if (id === "findClear") {
      node.disabled = !enabled || !String(state.find.query || "").trim();
    } else {
      node.disabled = !enabled;
    }
  }
  const count = $("keywordSearchCount");
  if (count) {
    count.textContent = `Count: ${enabled ? visibleEntries().length : 0}`;
  }
  syncFindMatchLabel();
}

function syncFindMatchLabel() {
  const label = $("findMatch");
  if (!label) return;
  const total = state.find.matches.length;
  if (!String(state.find.query || "").trim() || total === 0 || state.find.index < 0) {
    label.textContent = "Match: None";
    return;
  }
  label.textContent = `Match: ${state.find.index + 1}/${total}`;
}

function clearFindHighlights() {
  const body = $("changelogBody");
  if (!body) return;
  for (const hit of [...body.querySelectorAll(".find-hit")]) {
    const parent = hit.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(hit.textContent || ""), hit);
    parent.normalize();
  }
  state.find.matches = [];
}

function collectFindMatches(root, query) {
  const needle = String(query || "");
  if (!needle || !root) return [];
  const lowerNeedle = needle.toLowerCase();
  const matches = [];
  const lines = root.querySelectorAll(".changelog-line");
  for (const line of lines) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    for (const node of textNodes) {
      const text = node.nodeValue;
      if (!text) continue;
      const lower = text.toLowerCase();
      let start = 0;
      let idx = lower.indexOf(lowerNeedle, start);
      if (idx < 0) continue;
      const parent = node.parentNode;
      if (!parent) continue;
      const frag = document.createDocumentFragment();
      while (idx >= 0) {
        if (idx > start) frag.append(document.createTextNode(text.slice(start, idx)));
        const hit = el("span", "find-hit", text.slice(idx, idx + needle.length));
        frag.append(hit);
        matches.push(hit);
        start = idx + needle.length;
        idx = lower.indexOf(lowerNeedle, start);
      }
      if (start < text.length) frag.append(document.createTextNode(text.slice(start)));
      parent.replaceChild(frag, node);
    }
  }
  return matches;
}

function markCurrentFindHit() {
  for (const hit of state.find.matches) {
    hit.classList.toggle("is-current", false);
  }
  const current = state.find.matches[state.find.index];
  if (!current) return;
  current.classList.add("is-current");
  // Scroll only enough to reveal the hit; sticky actions bar stays put in .main.
  current.scrollIntoView({ block: "nearest", inline: "nearest" });
}

/**
 * Highlight Find matches in the currently shown changelog DOM.
 * @param {{ resetIndex?: boolean }} [opts]
 */
function runFind(opts = {}) {
  const resetIndex = !!opts.resetIndex;
  clearFindHighlights();
  const query = String(state.find.query || "").trim();
  const body = $("changelogBody");
  if (!query || !body || !logToolsEnabled()) {
    state.find.index = -1;
    syncLogTools();
    return;
  }
  const matches = collectFindMatches(body, query);
  state.find.matches = matches;
  if (!matches.length) {
    state.find.index = -1;
  } else if (resetIndex || state.find.index < 0) {
    state.find.index = 0;
  } else if (state.find.index >= matches.length) {
    state.find.index = matches.length - 1;
  }
  markCurrentFindHit();
  syncLogTools();
}

/** After renderChangelog: re-apply Find without forcing index 0 unless needed. */
function reapplyFindAfterRender(opts = {}) {
  if (!String(state.find.query || "").trim()) {
    state.find.matches = [];
    state.find.index = -1;
    syncLogTools();
    return;
  }
  runFind({ resetIndex: !!opts.resetIndex });
}

function moveFind(delta) {
  const total = state.find.matches.length;
  if (!total) return;
  state.find.index = (state.find.index + delta + total) % total;
  markCurrentFindHit();
  syncFindMatchLabel();
}

function applyKeywordSearch(raw) {
  state.keywordSearch = String(raw || "");
  const parsed = tryParseKeywordFilter(state.keywordSearch);
  // Oracle only applies valid parses; keep the last good filter while typing
  // through a transient invalid string (e.g. trailing comma).
  if (parsed.ok) {
    state.keywordFilter = {
      includes: parsed.includes,
      excludes: parsed.excludes,
    };
  }
  const prevHit =
    state.find.index >= 0 && state.find.matches[state.find.index]
      ? state.find.matches[state.find.index]
      : null;
  const prevLine = prevHit && prevHit.closest(".changelog-line");
  const prevAnchor = prevLine
    ? { line: prevLine.textContent || "", hit: prevHit.textContent || "" }
    : null;
  renderChangelog({
    resetIndex: false,
    afterFind: () => {
      if (!String(state.find.query || "").trim()) return;
      const matches = state.find.matches;
      if (!matches.length) return;
      if (!prevAnchor) return;
      const still = matches.findIndex((hit) => {
        const line = hit.closest(".changelog-line");
        return (
          line &&
          (line.textContent || "") === prevAnchor.line &&
          (hit.textContent || "") === prevAnchor.hit
        );
      });
      if (still < 0) runFind({ resetIndex: true });
      else if (still !== state.find.index) {
        state.find.index = still;
        markCurrentFindHit();
        syncFindMatchLabel();
      }
    },
  });
}

function kindCounts(entries, place, scope) {
  const counts = { added: 0, changed: 0, removed: 0 };
  for (const entry of entries) {
    if (entry.place !== place || !entry.kind) continue;
    if (scope) {
      if (scope.branch != null && entry.branch !== scope.branch) continue;
      if (scope.source != null && entry.source !== scope.source) continue;
      if (scope.driver != null && entry.driver !== scope.driver) continue;
    }
    counts[entry.kind] = (counts[entry.kind] || 0) + 1;
  }
  return counts;
}

function projectKindCounts(entries) {
  const counts = { added: 0, changed: 0, removed: 0 };
  for (const entry of entries || []) {
    if (entry.kind && counts[entry.kind] != null) {
      counts[entry.kind] += 1;
    }
  }
  return counts;
}

/** Colored [added, changed, removed] — omit any zero. */
function appendKindCountBadges(parent, counts) {
  const parts = COUNT_KIND_ORDER.filter((kind) => (counts[kind] || 0) > 0);
  if (!parts.length) return;
  parent.append(document.createTextNode(" "));
  const wrap = el("span", "filter-counts");
  wrap.append(document.createTextNode("["));
  parts.forEach((kind, index) => {
    if (index) wrap.append(document.createTextNode(", "));
    const bit = el("span", `filter-count filter-count-${kind}`, String(counts[kind]));
    wrap.append(bit);
  });
  wrap.append(document.createTextNode("]"));
  parent.append(wrap);
}

function makeFilterToggle(title) {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "filter-toggle";
  toggle.setAttribute("aria-label", `Toggle ${title}`);
  toggle.setAttribute("aria-expanded", "true");
  toggle.textContent = "▾";
  toggle.title = "Collapse";
  return toggle;
}

function makeFilterHeading(label, title) {
  const heading = el("div", "filter-heading");
  heading.append(makeFilterToggle(title), label);
  return heading;
}

function appendKindLeaves(parent, kinds, scope) {
  if (!kinds.length) return;
  const nested = el("ul", "filter-kinds");
  for (const kind of kinds) {
    const item = document.createElement("li");
    const label = el("label", "filter-kind");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.role = "kind";
    box.dataset.kind = kind;
    box.dataset.branch = scope.branch || "";
    if (scope.source) box.dataset.source = scope.source;
    if (scope.template) box.dataset.template = scope.template;
    if (scope.driver) box.dataset.driver = scope.driver;
    box.checked = true;
    label.append(box, document.createTextNode(` ${KIND_LABELS[kind] || kind}`));
    item.append(label);
    nested.append(item);
  }
  parent.append(nested);
}

function appendTemplateChildren(sourceItem, place, sourceName, templates, entries) {
  if (!templates.length) {
    // Source present but template missing — still expose kind leaves.
    appendKindLeaves(
      sourceItem,
      kindsForScope(entries, place, { branch: "sources", source: sourceName }),
      { branch: "sources", source: sourceName },
    );
    return;
  }
  const nested = el("ul", "filter-templates");
  for (const template of templates) {
    const item = document.createElement("li");
    const label = el("label", "filter-template");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.role = "template";
    box.dataset.branch = "sources";
    box.dataset.source = sourceName;
    box.dataset.template = template;
    box.checked = true;
    const title = TEMPLATE_LABELS[template] || template;
    label.append(box, document.createTextNode(` ${title}`));
    item.append(makeFilterHeading(label, title));
    appendKindLeaves(
      item,
      kindsForScope(entries, place, { branch: "sources", source: sourceName, template }),
      { branch: "sources", source: sourceName, template },
    );
    nested.append(item);
  }
  sourceItem.append(nested);
}

function appendSourceChildren(item, place, sourceNames, entries) {
  if (!sourceNames.length) return;
  const nested = el("ul", "filter-grandchildren");
  for (const name of sourceNames) {
    const nestedItem = document.createElement("li");
    const nestedLabel = el("label", "filter-source");
    const nestedBox = document.createElement("input");
    nestedBox.type = "checkbox";
    nestedBox.dataset.role = "source";
    nestedBox.dataset.branch = "sources";
    nestedBox.dataset.source = name;
    nestedBox.checked = true;
    nestedLabel.append(nestedBox);
    appendBranchLabel(
      nestedLabel,
      name,
      kindCounts(entries, place, { branch: "sources", source: name }),
    );
    nestedItem.append(makeFilterHeading(nestedLabel, name));
    appendTemplateChildren(nestedItem, place, name, templatesFor(place, name, entries), entries);
    nested.append(nestedItem);
  }
  item.append(nested);
}

function appendDriverChildren(item, place, driverNames, entries) {
  if (!driverNames.length) return;
  const nested = el("ul", "filter-grandchildren");
  for (const name of driverNames) {
    const nestedItem = document.createElement("li");
    const nestedLabel = el("label", "filter-source");
    const nestedBox = document.createElement("input");
    nestedBox.type = "checkbox";
    nestedBox.dataset.role = "driver";
    nestedBox.dataset.branch = "drivers";
    nestedBox.dataset.driver = name;
    nestedBox.checked = true;
    nestedLabel.append(nestedBox, document.createTextNode(` ${name}`));
    nestedItem.append(makeFilterHeading(nestedLabel, name));
    appendKindLeaves(
      nestedItem,
      kindsForScope(entries, place, { branch: "drivers", driver: name }),
      { branch: "drivers", driver: name },
    );
    nested.append(nestedItem);
  }
  item.append(nested);
}

function setCollapsed(host, collapsed, options = {}) {
  const panel = $("filterPanel");
  const panelTop = panel ? panel.getBoundingClientRect().top : 0;
  const hostTopBefore = host.getBoundingClientRect().top;
  host.classList.toggle("is-collapsed", collapsed);
  const toggle = host.querySelector(":scope > .filter-heading .filter-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggle.textContent = collapsed ? "▸" : "▾";
    toggle.title = collapsed ? "Expand" : "Collapse";
  }
  // Collapsing a tall place (Global) shrinks the pane; keep the header on screen.
  if (options.quiet || !collapsed || !panel) return;
  requestAnimationFrame(() => {
    const hostTop = host.getBoundingClientRect().top;
    if (hostTop < panelTop + 4) {
      panel.scrollTop += hostTop - panelTop - 4;
    } else if (hostTopBefore >= panelTop) {
      panel.scrollTop += hostTop - hostTopBefore;
    }
  });
}

function makePlaceHeading(place, counts) {
  const parentLabel = el("label", "filter-parent");
  const parentBox = document.createElement("input");
  parentBox.type = "checkbox";
  parentBox.dataset.role = "parent";
  parentBox.checked = true;
  parentLabel.append(parentBox, document.createTextNode(` ${place}`));
  if (counts) appendKindCountBadges(parentLabel, counts);
  return makeFilterHeading(parentLabel, place);
}

function makeSystemHeading(name, counts) {
  const label = el("label", "filter-parent");
  const box = document.createElement("input");
  box.type = "checkbox";
  box.dataset.role = "system";
  box.checked = true;
  label.append(box, document.createTextNode(` ${name}`));
  if (counts) appendKindCountBadges(label, counts);
  return makeFilterHeading(label, name);
}

function appendBranchLabel(label, title, counts) {
  label.append(document.createTextNode(` ${title}`));
  if (counts) appendKindCountBadges(label, counts);
}

function collapseFilterTree(tree) {
  // System + places stay open; branch rows collapse so counts stay glanceable.
  const system = tree.querySelector(".filter-system");
  if (system) setCollapsed(system, false, { quiet: true });
  for (const item of tree.querySelectorAll(".filter-children > li")) {
    setCollapsed(item, true, { quiet: true });
  }
}

function renderFilter(entries) {
  const tree = $("filterTree");
  tree.replaceChildren();
  if (!entries.length) return;

  const systemName =
    (state.result && String(state.result.systemName || "").trim()) || "System";
  const system = el("div", "filter-system");
  system.append(makeSystemHeading(systemName, projectKindCounts(entries)));
  const places = el("div", "filter-places");

  for (const place of placeOrder(entries)) {
    const group = el("div", "filter-group");
    group.dataset.place = place;
    group.append(makePlaceHeading(place, kindCounts(entries, place)));

    const list = el("ul", "filter-children");
    for (const branch of branchesFor(place, entries)) {
      const item = document.createElement("li");
      const label = el("label", "filter-child");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.dataset.role = "child";
      box.dataset.branch = branch;
      box.checked = true;
      const title = BRANCH_LABELS[branch] || branch;
      label.append(box);
      appendBranchLabel(label, title, kindCounts(entries, place, { branch }));
      item.append(makeFilterHeading(label, title));
      if (branch === "sources") {
        const names = sourcesFor(place, entries);
        if (names.length) {
          appendSourceChildren(item, place, names, entries);
        } else {
          // Branch has lines but no named source — kinds directly under Sources.
          appendKindLeaves(item, kindsForScope(entries, place, { branch }), { branch });
        }
      } else if (branch === "drivers") {
        const names = driversFor(place, entries);
        if (names.length) {
          appendDriverChildren(item, place, names, entries);
        } else {
          // Branch has lines but no named driver — kinds directly under Drivers.
          appendKindLeaves(item, kindsForScope(entries, place, { branch }), { branch });
        }
      } else {
        appendKindLeaves(item, kindsForScope(entries, place, { branch }), { branch });
      }
      list.append(item);
    }
    group.append(list);
    places.append(group);
    bindFilterGroup(group);
  }
  system.append(places);
  tree.append(system);
  bindSystemRoot(system);
  collapseFilterTree(tree);
  refreshFilterState();
}

function resetFilterPlaceholder() {
  const tree = $("filterTree");
  tree.replaceChildren();
  const system = el("div", "filter-system");
  system.append(makeSystemHeading("[System name]", null));
  const places = el("div", "filter-places");
  places.append(placeholderFilter("global", "Global", GLOBAL_BRANCHES));
  places.append(placeholderFilter("room", "[Room name]", ROOM_BRANCHES));
  system.append(places);
  tree.append(system);
  bindSystemRoot(system);
  bindFilters();
  refreshFilterState();
}

function placeholderFilter(placeKey, title, branches) {
  const group = el("div", "filter-group");
  group.dataset.place = placeKey;
  group.append(makePlaceHeading(title, null));
  const list = el("ul", "filter-children");
  const fakeEntries = [];
  for (const kind of KIND_ORDER) {
    for (const branch of branches) {
      if (branch === "sources") {
        for (const template of TEMPLATE_ORDER) {
          fakeEntries.push({
            place: title,
            branch: "sources",
            source: "[source name]",
            template,
            kind,
          });
        }
      } else if (branch === "drivers") {
        fakeEntries.push({ place: title, branch: "drivers", driver: "[driver name]", kind });
      } else {
        fakeEntries.push({ place: title, branch, kind });
      }
    }
  }
  for (const branch of branches) {
    const item = document.createElement("li");
    const label = el("label", "filter-child");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.dataset.role = "child";
    box.dataset.branch = branch;
    box.checked = true;
    const branchTitle = BRANCH_LABELS[branch];
    label.append(box, document.createTextNode(` ${branchTitle}`));
    item.append(makeFilterHeading(label, branchTitle));
    if (branch === "sources") {
      appendSourceChildren(item, title, ["[source name]"], fakeEntries);
    } else if (branch === "drivers") {
      appendDriverChildren(item, title, ["[driver name]"], fakeEntries);
    } else {
      appendKindLeaves(item, KIND_ORDER, { branch });
    }
    list.append(item);
  }
  group.append(list);
  return group;
}

function renderChangelog(findOpts = {}) {
  const heading = $("changelogHeading");
  const body = $("changelogBody");
  const a = state.fileA ? state.fileA.name : "A";
  const b = state.fileB ? state.fileB.name : "B";
  heading.textContent = `Change Summary (${a} -> ${b})`;

  try {
    if (!bothLoaded()) {
      body.replaceChildren(el("p", "empty", EMPTY_CHOOSE));
      return;
    }
    if (state.compareStatus === "idle") {
      body.replaceChildren(el("p", "empty", EMPTY_READY));
      return;
    }
    if (state.compareStatus === "running") {
      const progressLine = $("progressLine");
      const progress =
        (progressLine && progressLine.textContent.trim()) || COMPARE_RUNNING;
      body.replaceChildren(el("p", "empty", progress));
      return;
    }
    if (state.compareStatus === "failed") {
      body.replaceChildren(el("p", "empty", state.compareError || COMPARE_FAILED));
      return;
    }
    if (!state.result) {
      body.replaceChildren(el("p", "empty", COMPARE_FAILED));
      return;
    }
    const shown = visibleEntries();
    if (!state.result.entries.length) {
      body.replaceChildren(el("p", "empty", EMPTY_NONE));
      return;
    }
    if (!shown.length) {
      body.replaceChildren(el("p", "empty", EMPTY_FILTER));
      return;
    }

    // One grouping pass, not a scan of `shown` per place.
    const byPlace = new Map();
    for (const entry of shown) {
      let lines = byPlace.get(entry.place);
      if (!lines) byPlace.set(entry.place, (lines = []));
      lines.push(entry);
    }
    body.replaceChildren();
    for (const place of placeOrder(shown)) {
      const lines = byPlace.get(place);
      if (!lines || !lines.length) continue;
      body.append(el("h3", "changelog-place", place));
      const list = el("ul", "changelog-lines");
      for (const entry of lines) {
        const item = el("li", "changelog-line");
        appendChangelogLine(item, entry.line, entry.segments);
        list.append(item);
      }
      body.append(list);
    }
  } finally {
    syncExportButton();
    reapplyFindAfterRender({ resetIndex: !!findOpts.resetIndex });
    if (typeof findOpts.afterFind === "function") findOpts.afterFind();
  }
}

function setTriState(box, onCount, total) {
  if (!box || !total) return;
  box.checked = onCount === total;
  box.indeterminate = onCount > 0 && onCount < total;
}

function syncLeafHost(host) {
  const kinds = [...host.querySelectorAll(':scope > .filter-kinds input[data-role="kind"]')];
  if (!kinds.length) return null;
  return { onCount: kinds.filter((box) => box.checked).length, total: kinds.length };
}

function syncSourceFromTemplates(sourceItem) {
  const sourceBox = sourceItem.querySelector('input[data-role="source"]');
  const templates = [...sourceItem.querySelectorAll('input[data-role="template"]')];
  if (!sourceBox || !templates.length) return;
  let onCount = 0;
  let partial = false;
  for (const templateBox of templates) {
    const host = templateBox.closest("li");
    const leaf = syncLeafHost(host);
    if (leaf) setTriState(templateBox, leaf.onCount, leaf.total);
    if (templateBox.checked) onCount += 1;
    else if (templateBox.indeterminate) partial = true;
  }
  sourceBox.checked = onCount === templates.length && !partial;
  sourceBox.indeterminate = partial || (onCount > 0 && onCount < templates.length);
}

function syncParentFromChildren(group) {
  const parent = group.querySelector('input[data-role="parent"]');
  const list = group.querySelector(".filter-children");
  if (!parent || !list) return;

  for (const leafItem of list.querySelectorAll(".filter-grandchildren > li")) {
    const sourceBox = leafItem.querySelector('input[data-role="source"]');
    if (sourceBox) syncSourceFromTemplates(leafItem);
    const driverBox = leafItem.querySelector('input[data-role="driver"]');
    if (driverBox) {
      const leaf = syncLeafHost(leafItem);
      if (leaf) setTriState(driverBox, leaf.onCount, leaf.total);
    }
  }

  const branchBoxes = [...list.querySelectorAll(':scope > li > .filter-heading input[data-role="child"]')];
  let onCount = 0;
  let partial = false;
  const total = branchBoxes.length;

  for (const box of branchBoxes) {
    const li = box.closest("li");
    if (box.dataset.branch === "sources") {
      const sources = [...li.querySelectorAll('input[data-role="source"]')];
      if (sources.length) {
        const srcOn = sources.filter((source) => source.checked).length;
        const srcPartial = sources.some((source) => source.indeterminate);
        box.checked = srcOn === sources.length && !srcPartial;
        box.indeterminate = srcPartial || (srcOn > 0 && srcOn < sources.length);
        if (box.checked) onCount += 1;
        else if (box.indeterminate || srcOn > 0) partial = true;
        continue;
      }
    }
    if (box.dataset.branch === "drivers") {
      const drivers = [...li.querySelectorAll('input[data-role="driver"]')];
      if (drivers.length) {
        const drvOn = drivers.filter((driver) => driver.checked).length;
        const drvPartial = drivers.some((driver) => driver.indeterminate);
        box.checked = drvOn === drivers.length && !drvPartial;
        box.indeterminate = drvPartial || (drvOn > 0 && drvOn < drivers.length);
        if (box.checked) onCount += 1;
        else if (box.indeterminate || drvOn > 0) partial = true;
        continue;
      }
    }
    const leaf = syncLeafHost(li);
    if (leaf) {
      setTriState(box, leaf.onCount, leaf.total);
      if (box.checked) onCount += 1;
      else if (box.indeterminate) partial = true;
      continue;
    }
    if (box.checked) onCount += 1;
  }

  parent.checked = total > 0 && onCount === total && !partial;
  parent.indeterminate = (onCount > 0 && onCount < total) || partial;
}

function setSubtreeChecked(root, on) {
  for (const input of root.querySelectorAll("input[type=checkbox]")) {
    input.checked = on;
    input.indeterminate = false;
  }
}

function syncSystemFromPlaces(system) {
  const master = system.querySelector(':scope > .filter-heading input[data-role="system"]');
  const placeParents = [
    ...system.querySelectorAll(
      '.filter-places > .filter-group > .filter-heading input[data-role="parent"]',
    ),
  ];
  if (!master || !placeParents.length) return;
  const onCount = placeParents.filter((box) => box.checked).length;
  const partial = placeParents.some((box) => box.indeterminate);
  master.checked = onCount === placeParents.length && !partial;
  master.indeterminate = partial || (onCount > 0 && onCount < placeParents.length);
}

function bindSystemRoot(system) {
  const heading = system.querySelector(":scope > .filter-heading");
  const master = heading && heading.querySelector('input[data-role="system"]');
  const places = system.querySelector(":scope > .filter-places");
  if (!heading || !master || !places) return;

  heading.addEventListener("click", (event) => {
    const toggle = event.target.closest(".filter-toggle");
    if (!toggle || !heading.contains(toggle)) return;
    event.preventDefault();
    event.stopPropagation();
    setCollapsed(system, !system.classList.contains("is-collapsed"));
  });

  master.addEventListener("change", () => {
    master.indeterminate = false;
    setSubtreeChecked(places, master.checked);
    for (const group of places.querySelectorAll(":scope > .filter-group")) {
      syncParentFromChildren(group);
    }
    refreshFilterState();
    renderChangelog();
    renderChart();
  });

  places.addEventListener("change", () => {
    syncSystemFromPlaces(system);
  });
}

function bindFilterGroup(group) {
  const parent = group.querySelector('input[data-role="parent"]');
  const list = group.querySelector(".filter-children");
  if (!parent) return;

  group.addEventListener("click", (event) => {
    const toggle = event.target.closest(".filter-toggle");
    if (!toggle || !group.contains(toggle)) return;
    event.preventDefault();
    event.stopPropagation();
    const host = toggle.closest("li, .filter-group");
    if (!host || !group.contains(host)) return;
    setCollapsed(host, !host.classList.contains("is-collapsed"));
  });

  parent.addEventListener("change", () => {
    parent.indeterminate = false;
    if (list) setSubtreeChecked(list, parent.checked);
    refreshFilterState();
    renderChangelog();
    renderChart();
  });

  if (!list) return;
  list.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    const role = event.target.dataset.role;
    if (role === "child" || role === "source" || role === "driver" || role === "template") {
      const li = event.target.closest("li");
      if (li) {
        for (const input of li.querySelectorAll("input[type=checkbox]")) {
          if (input === event.target) continue;
          input.checked = event.target.checked;
          input.indeterminate = false;
        }
      }
      event.target.indeterminate = false;
    }
    syncParentFromChildren(group);
    refreshFilterState();
    renderChangelog();
    renderChart();
  });
}

function bindFilters() {
  for (const group of document.querySelectorAll(".filter-group")) {
    bindFilterGroup(group);
  }
}

function disableExportButtons() {
  const xlsx = $("exportBtn");
  if (xlsx) xlsx.disabled = true;
  const pdf = $("exportPdfBtn");
  if (pdf) pdf.disabled = true;
}

function onFileChange(which, input) {
  const file = input.files && input.files[0] ? input.files[0] : null;
  state[which] = file;
  state.compareStatus = "idle";
  state.compareError = null;
  state.result = null;
  state.chartFilter = null;
  state.meta = null;
  clearSearchAndFind();
  disableExportButtons();
  setProgress("");
  resetFilterPlaceholder();
  renderFiles();
  renderChangelog();
  renderChart();
}

/**
 * The engine lives in a Worker under Pyodide. `.apex` files are handed over as
 * File handles and read block-by-block through WORKERFS, so the bytes never
 * leave the machine — there is no endpoint to send them to.
 *
 * Warm-up starts on page load and finishes behind file selection. Compare is
 * disabled until two files are picked, so there is nothing to block on.
 */
let engine = null;
let enginePending = null;

function engineWorker() {
  if (engine) return engine;
  const worker = new Worker("./worker.js", { type: "module" });
  let ready = null;
  const readyPromise = new Promise((resolve) => {
    ready = resolve;
  });
  worker.onmessage = (event) => {
    const message = event.data || {};
    if (message.type === "ready") {
      setAppVersion(message.version);
      ready(message.version);
      return;
    }
    if (message.type === "idle") {
      // Heap climbing across compares is the one way this can grow unbounded.
      if (message.heapBytes > ENGINE_HEAP_LIMIT) recycleEngine();
      return;
    }
    if (message.type === "progress") {
      if (enginePending) enginePending.onEvent(message);
      return;
    }
    const pending = enginePending;
    enginePending = null;
    if (!pending) return;
    pending.onEvent(message);
    pending.settle();
  };
  worker.onerror = () => {
    const pending = enginePending;
    enginePending = null;
    if (pending) {
      pending.onEvent({ type: "error", message: COMPARE_FAILED });
      pending.settle();
    }
  };
  worker.postMessage({ cmd: "init" });
  engine = { worker, readyPromise };
  return engine;
}

function recycleEngine() {
  if (!engine) return;
  engine.worker.terminate();
  engine = null;
  engineWorker();
}

/** Resolves once the worker has delivered its terminal event for this command. */
async function engineRequest(message, onEvent) {
  const current = engineWorker();
  await current.readyPromise;
  return new Promise((resolve) => {
    enginePending = { onEvent, settle: resolve };
    current.worker.postMessage(message);
  });
}

async function onCompare() {
  if (!bothLoaded()) {
    renderChangelog();
    renderChart();
    return;
  }
  // Count the Compare click as soon as the engine run starts. Fire-and-forget so
  // a slow beacon never stalls extract; the topbar updates when the POST returns.
  void noteCompareUsage();
  $("compareBtn").disabled = true;
  disableExportButtons();
  state.compareStatus = "running";
  state.compareError = null;
  state.result = null;
  state.chartFilter = null;
  clearSearchAndFind();
  setProgress(COMPARE_STARTING);
  renderChangelog();
  renderChart();

  const failCompare = (message) => {
    state.compareStatus = "failed";
    state.compareError = message || COMPARE_FAILED;
    state.result = null;
    setProgress("");
    renderChangelog();
    renderChart();
  };

  try {
    let failed = false;
    await engineRequest({ cmd: "compare", fileA: state.fileA, fileB: state.fileB }, (event) => {
      if (event.type === "progress") {
        setProgress(event.text || "");
        return;
      }
      if (event.type === "error") {
        failed = true;
        failCompare(event.message || COMPARE_FAILED);
        return;
      }
      if (event.type === "result") {
        state.compareStatus = "done";
        state.compareError = null;
        state.result = event;
        state.meta = buildEntryMeta(event.entries);
        renderFilter(event.entries);
        setProgress("");
        renderChangelog();
        renderChart();
      }
    });
    if (!failed && !state.result) {
      failCompare(COMPARE_FAILED);
    }
  } catch (_error) {
    failCompare(COMPARE_FAILED);
  } finally {
    $("compareBtn").disabled = !bothLoaded();
  }
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function onExport() {
  const shown = visibleEntries();
  if (!state.result || !shown.length) return;
  disableExportButtons();
  try {
    let failed = false;
    await engineRequest({ cmd: "exportXlsx", payload: exportPayload(shown) }, (event) => {
      if (event.type === "xlsx") {
        saveBlob(new Blob([event.bytes], { type: XLSX_TYPE }), "change_summary.xlsx");
        return;
      }
      failed = true;
    });
    if (failed) throw new Error("export failed");
  } catch (_error) {
    setProgress(EXPORT_FAILED);
  } finally {
    syncExportButton();
  }
}

/**
 * PDF through the browser's own print engine.
 *
 * Playwright drove a real Chromium and there is none here, and the breakdown
 * HTML carries room, source, and driver names, so it cannot be sent anywhere to
 * be rendered. Printing the same HTML in a same-origin iframe reuses the
 * browser's layout engine, which is the only mechanism with no fidelity loss.
 * The print dialog is the single accepted dialog in the app.
 */
async function onExportPdf() {
  if (!state.result || !treeVisibleEntries().length) return;
  disableExportButtons();
  let frame = null;
  try {
    frame = el("iframe", "pdf-print-frame");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("tabindex", "-1");
    document.body.append(frame);
    await new Promise((resolve, reject) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.addEventListener("error", reject, { once: true });
      frame.srcdoc = buildBreakdownPdfHtml();
    });
    const doc = frame.contentDocument;
    if (doc && doc.fonts) await doc.fonts.ready;
    // Two frames so font metrics + pruned tree finish layout before measure.
    await new Promise((resolve) => {
      const view = frame.contentWindow;
      if (!view) {
        resolve();
        return;
      }
      view.requestAnimationFrame(() => view.requestAnimationFrame(resolve));
    });
    fitPdfWorkspaceToPage(doc);
    const view = frame.contentWindow;
    // Keep the frame alive while the dialog is open; Safari returns immediately.
    view.addEventListener("afterprint", () => frame.remove(), { once: true });
    view.focus();
    view.print();
  } catch (_error) {
    if (frame) frame.remove();
    setProgress(PDF_EXPORT_FAILED);
  } finally {
    syncExportButton();
  }
}

const FILTER_WIDTH_KEY = "sentinel-lite-filter-width";
const FILTER_WIDTH_DEFAULT = 280;
const FILTER_WIDTH_MIN = 180;
const FILTER_WIDTH_MAX = 520;

const CHART_WIDTH_KEY = "sentinel-lite-chart-width";
const CHART_WIDTH_DEFAULT = 260;
const CHART_WIDTH_MIN = 180;
const CHART_WIDTH_MAX = 480;

function clampFilterWidth(width) {
  const workspace = document.querySelector(".workspace");
  const maxByView = workspace ? Math.floor(workspace.clientWidth * 0.45) : FILTER_WIDTH_MAX;
  const max = Math.max(FILTER_WIDTH_MIN, Math.min(FILTER_WIDTH_MAX, maxByView));
  return Math.round(Math.min(max, Math.max(FILTER_WIDTH_MIN, width)));
}

function setFilterWidth(width) {
  const panel = $("filterPanel");
  const next = clampFilterWidth(width);
  panel.style.setProperty("--filter-width", `${next}px`);
  $("filterResizer").setAttribute("aria-valuenow", String(next));
  return next;
}

function clampChartWidth(width) {
  const workspace = document.querySelector(".workspace");
  const maxByView = workspace ? Math.floor(workspace.clientWidth * 0.4) : CHART_WIDTH_MAX;
  const max = Math.max(CHART_WIDTH_MIN, Math.min(CHART_WIDTH_MAX, maxByView));
  return Math.round(Math.min(max, Math.max(CHART_WIDTH_MIN, width)));
}

function setChartWidth(width) {
  const panel = $("chartPanel");
  const next = clampChartWidth(width);
  panel.style.setProperty("--chart-width", `${next}px`);
  $("chartResizer").setAttribute("aria-valuenow", String(next));
  return next;
}

function bindFilterResize() {
  const workspace = document.querySelector(".workspace");
  const handle = $("filterResizer");
  handle.setAttribute("aria-valuemin", String(FILTER_WIDTH_MIN));
  handle.setAttribute("aria-valuemax", String(FILTER_WIDTH_MAX));

  const stored = Number.parseInt(localStorage.getItem(FILTER_WIDTH_KEY) || "", 10);
  setFilterWidth(Number.isFinite(stored) ? stored : FILTER_WIDTH_DEFAULT);

  let drag = null;

  const onMove = (event) => {
    if (!drag) return;
    const width = setFilterWidth(event.clientX - drag.originX + drag.startWidth);
    drag.currentWidth = width;
  };

  const onUp = () => {
    if (!drag) return;
    workspace.classList.remove("is-resizing-filter");
    localStorage.setItem(FILTER_WIDTH_KEY, String(drag.currentWidth));
    drag = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    const panel = $("filterPanel");
    drag = {
      originX: event.clientX,
      startWidth: panel.getBoundingClientRect().width,
      currentWidth: panel.getBoundingClientRect().width,
    };
    workspace.classList.add("is-resizing-filter");
    handle.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 32 : 16;
    let next = null;
    if (event.key === "ArrowLeft") next = $("filterPanel").getBoundingClientRect().width - step;
    if (event.key === "ArrowRight") next = $("filterPanel").getBoundingClientRect().width + step;
    if (event.key === "Home") next = FILTER_WIDTH_MIN;
    if (event.key === "End") next = FILTER_WIDTH_MAX;
    if (next == null) return;
    event.preventDefault();
    localStorage.setItem(FILTER_WIDTH_KEY, String(setFilterWidth(next)));
  });

  window.addEventListener("resize", () => {
    setFilterWidth($("filterPanel").getBoundingClientRect().width);
  });
}

function bindChartResize() {
  const workspace = document.querySelector(".workspace");
  const handle = $("chartResizer");
  handle.setAttribute("aria-valuemin", String(CHART_WIDTH_MIN));
  handle.setAttribute("aria-valuemax", String(CHART_WIDTH_MAX));

  const stored = Number.parseInt(localStorage.getItem(CHART_WIDTH_KEY) || "", 10);
  setChartWidth(Number.isFinite(stored) ? stored : CHART_WIDTH_DEFAULT);

  let drag = null;

  const onMove = (event) => {
    if (!drag) return;
    // Right pane: drag left widens, drag right narrows.
    const width = setChartWidth(drag.startWidth - (event.clientX - drag.originX));
    drag.currentWidth = width;
  };

  const onUp = () => {
    if (!drag) return;
    workspace.classList.remove("is-resizing-chart");
    localStorage.setItem(CHART_WIDTH_KEY, String(drag.currentWidth));
    drag = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    const panel = $("chartPanel");
    drag = {
      originX: event.clientX,
      startWidth: panel.getBoundingClientRect().width,
      currentWidth: panel.getBoundingClientRect().width,
    };
    workspace.classList.add("is-resizing-chart");
    handle.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  handle.addEventListener("keydown", (event) => {
    const step = event.shiftKey ? 32 : 16;
    let next = null;
    // Mirror filter keys relative to the pane edge facing the log.
    if (event.key === "ArrowLeft") next = $("chartPanel").getBoundingClientRect().width + step;
    if (event.key === "ArrowRight") next = $("chartPanel").getBoundingClientRect().width - step;
    if (event.key === "Home") next = CHART_WIDTH_MIN;
    if (event.key === "End") next = CHART_WIDTH_MAX;
    if (next == null) return;
    event.preventDefault();
    localStorage.setItem(CHART_WIDTH_KEY, String(setChartWidth(next)));
  });

  window.addEventListener("resize", () => {
    setChartWidth($("chartPanel").getBoundingClientRect().width);
  });
}

function setAppVersion(version) {
  const text = version ? String(version).trim() : "";
  const slot = $("appVersion");
  if (slot) slot.textContent = text;
  document.title = text ? `Sentinel Lite ${text}` : "Sentinel Lite";
}

function renderCompareCount() {
  const slot = $("compareCount");
  if (!slot) return;
  const count = state.compareCount;
  if (Number.isFinite(count) && count >= 0) {
    slot.textContent = `Compare Count: ${count}`;
    return;
  }
  slot.textContent = "Compare Count: —";
}

function parseCompareCount(payload) {
  const raw = payload && payload.count;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw || ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function refreshCompareCount() {
  try {
    const response = await fetch(COMPARE_COUNT_PATH, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return;
    const next = parseCompareCount(await response.json());
    if (next == null) return;
    state.compareCount = next;
    renderCompareCount();
  } catch (_error) {
    /* Local serve has no beacon — leave the dash. */
  }
}

async function noteCompareUsage() {
  try {
    const response = await fetch(COMPARE_COUNT_PATH, {
      method: "POST",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return;
    const next = parseCompareCount(await response.json());
    if (next == null) return;
    state.compareCount = next;
    renderCompareCount();
  } catch (_error) {
    /* Compare still runs; the topbar keeps the last known total. */
  }
}

function bindLogTools() {
  const keywordInput = $("keywordSearch");
  const findInput = $("findQuery");
  if (keywordInput) {
    keywordInput.addEventListener("input", () => {
      clearTimeout(keywordSearchTimer);
      keywordSearchTimer = setTimeout(() => {
        keywordSearchTimer = null;
        applyKeywordSearch(keywordInput.value);
      }, LOG_TOOLS_DEBOUNCE_MS);
    });
  }
  const keywordClear = $("keywordSearchClear");
  if (keywordClear) {
    keywordClear.addEventListener("click", () => {
      clearTimeout(keywordSearchTimer);
      keywordSearchTimer = null;
      if (keywordInput) keywordInput.value = "";
      applyKeywordSearch("");
    });
  }
  if (findInput) {
    findInput.addEventListener("input", () => {
      clearTimeout(findQueryTimer);
      findQueryTimer = setTimeout(() => {
        findQueryTimer = null;
        state.find.query = findInput.value;
        runFind({ resetIndex: true });
      }, LOG_TOOLS_DEBOUNCE_MS);
    });
    findInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      clearTimeout(findQueryTimer);
      findQueryTimer = null;
      const next = findInput.value;
      if (String(next) !== String(state.find.query)) {
        state.find.query = next;
        runFind({ resetIndex: true });
        return;
      }
      moveFind(1);
    });
  }
  const findPrev = $("findPrev");
  if (findPrev) findPrev.addEventListener("click", () => moveFind(-1));
  const findNext = $("findNext");
  if (findNext) findNext.addEventListener("click", () => moveFind(1));
  const findClear = $("findClear");
  if (findClear) {
    findClear.addEventListener("click", () => {
      clearTimeout(findQueryTimer);
      findQueryTimer = null;
      if (findInput) findInput.value = "";
      state.find.query = "";
      runFind({ resetIndex: true });
    });
  }
  syncLogTools();
}

function bind() {
  $("fileA").addEventListener("change", (event) => onFileChange("fileA", event.target));
  $("fileB").addEventListener("change", (event) => onFileChange("fileB", event.target));
  $("compareBtn").addEventListener("click", onCompare);
  $("exportBtn").addEventListener("click", onExport);
  const pdfBtn = $("exportPdfBtn");
  if (pdfBtn) pdfBtn.addEventListener("click", onExportPdf);
  resetFilterPlaceholder();
  bindFilterResize();
  bindChartResize();
  bindLogTools();
  renderFiles();
  renderCompareCount();
  refreshCompareCount();
  renderChangelog();
  renderChart();
  // Warm the engine now so it is ready by the time two files are picked. No
  // spinner: Compare is disabled until then, and the version lands in the topbar.
  engineWorker();
}

bind();
