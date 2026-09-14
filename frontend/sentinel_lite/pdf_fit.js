/**
 * PDF Filter-column fit — shared by the app and the proof harness.
 *
 * Only the Filter tree may change size. Breakdown / chart / topbar stay natural.
 * Strategy: if the (already pruned) tree is taller than the Letter slot, shrink
 * its font until it fits. Never enlarge the font to fill leftover space.
 */
(function (global) {
  const PAGE_CONTENT_H_IN = 11 - 0.35 * 2;
  const PAGE_CONTENT_W_IN = 8.5 - 0.4 * 2;
  const CSS_PX_PER_IN = 96;
  // Step down only — never above the live tree's natural size.
  const FONT_STEPS = [13, 12, 11, 10, 9, 8, 7, 6];

  function pageContentSizePx() {
    return {
      width: PAGE_CONTENT_W_IN * CSS_PX_PER_IN,
      height: PAGE_CONTENT_H_IN * CSS_PX_PER_IN,
    };
  }

  function ensureFilterScaleHost(doc, filter) {
    const tree = filter.querySelector(".filter-tree");
    if (!tree) return null;
    let host = filter.querySelector(".pdf-filter-scale-host");
    if (host && host.contains(tree)) return { host, tree };
    host = doc.createElement("div");
    host.className = "pdf-filter-scale-host";
    tree.replaceWith(host);
    host.appendChild(tree);
    return { host, tree };
  }

  function resetFilterFit(host, tree) {
    host.classList.remove("is-scaled", "is-fitted");
    tree.classList.remove("is-filter-scaled", "is-filter-fitted");
    [
      "transform",
      "transform-origin",
      "position",
      "left",
      "top",
      "display",
      "width",
      "height",
      "margin-bottom",
      "font-size",
      "line-height",
      "column-count",
      "column-width",
      "column-gap",
      "column-fill",
      "overflow",
      "gap",
      "grid-template-columns",
      "grid-auto-flow",
    ].forEach((prop) => tree.style.removeProperty(prop));
    tree.querySelectorAll("[data-pdf-fit-font]").forEach((node) => {
      node.style.removeProperty("font-size");
      node.style.removeProperty("line-height");
      node.style.removeProperty("width");
      node.style.removeProperty("height");
      node.style.removeProperty("margin");
      node.style.removeProperty("gap");
      node.style.removeProperty("padding-left");
      node.style.removeProperty("padding-top");
      node.removeAttribute("data-pdf-fit-font");
    });
    ["height", "width", "max-width", "overflow", "position"].forEach((prop) =>
      host.style.removeProperty(prop),
    );
  }

  function treeScrollHeight(tree) {
    return Math.max(tree.scrollHeight, tree.getBoundingClientRect().height);
  }

  function prepareHost(host, available, hostWidth) {
    host.classList.add("is-fitted");
    host.style.position = "relative";
    host.style.width = `${hostWidth}px`;
    host.style.maxWidth = `${hostWidth}px`;
    host.style.height = `${available}px`;
    host.style.overflow = "hidden";
  }

  /**
   * Live CSS locks .filter-parent at 14px and kinds at 13px. Override those
   * (and checkbox chrome) so font shrink actually changes measured height.
   * Never called to enlarge — only when the natural tree overflows.
   */
  function applyFont(tree, fontPx) {
    tree.classList.add("is-filter-fitted");
    tree.style.display = "flex";
    tree.style.flexDirection = "column";
    tree.style.width = "100%";
    tree.style.fontSize = `${fontPx}px`;
    tree.style.lineHeight = "1.15";
    tree.style.gap = "1px";

    const sized = tree.querySelectorAll(
      ".filter-parent, .filter-child, .filter-source, .filter-template, .filter-kind, label, .filter-heading",
    );
    sized.forEach((node) => {
      node.setAttribute("data-pdf-fit-font", "1");
      node.style.fontSize = `${fontPx}px`;
      node.style.lineHeight = "1.15";
    });

    const boxPx = Math.max(8, Math.round(fontPx * 0.95));
    tree.querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.setAttribute("data-pdf-fit-font", "1");
      box.style.width = `${boxPx}px`;
      box.style.height = `${boxPx}px`;
      box.style.margin = "1px 0 0";
    });

    tree.querySelectorAll(".filter-system, .filter-places, .filter-group").forEach((node) => {
      node.setAttribute("data-pdf-fit-font", "1");
      node.style.gap = "1px";
    });
    tree.querySelectorAll(".filter-places").forEach((node) => {
      node.style.paddingLeft = "12px";
    });
    tree.querySelectorAll(
      ".filter-children, .filter-grandchildren, .filter-templates, .filter-kinds",
    ).forEach((node) => {
      node.setAttribute("data-pdf-fit-font", "1");
      node.style.gap = "0";
      node.style.paddingTop = "0";
      node.style.paddingLeft = "16px";
    });
  }

  function fitByFontShrink(host, tree, available, hostWidth) {
    prepareHost(host, available, hostWidth);

    let best = null;
    for (const fontPx of FONT_STEPS) {
      applyFont(tree, fontPx);
      void tree.offsetHeight;
      const height = treeScrollHeight(tree);
      if (height <= available + 1) {
        best = { fontPx, height };
        break;
      }
    }

    if (!best) {
      // Still too tall at the floor — use the smallest size anyway.
      const fontPx = FONT_STEPS[FONT_STEPS.length - 1];
      applyFont(tree, fontPx);
      void tree.offsetHeight;
      best = { fontPx, height: treeScrollHeight(tree) };
    }

    return {
      mode: "font",
      filterScale: 1,
      fitted: best.height <= available + 1,
      usedTransformScale: false,
      fontPx: best.fontPx,
      hostWidth,
    };
  }

  function fitPdfFilterColumnToPage(doc) {
    const sheet = doc.querySelector(".pdf-sheet");
    const topbar = doc.querySelector(".pdf-topbar");
    const slot = doc.querySelector(".pdf-fit-slot");
    const workspace = doc.querySelector(".pdf-workspace");
    const filter = doc.querySelector(".pdf-workspace .filter-panel");
    const chart = doc.querySelector(".pdf-workspace .chart-panel");
    const empty = {
      mode: "none",
      filterScale: 1,
      available: 0,
      naturalNeeded: 0,
      filterVisualHeight: 0,
      filterVisualWidth: 0,
      filterTreeWidthRatio: 0,
      chartHasTransform: false,
      chartTitleFontSize: 0,
      workspaceHasScaleClass: false,
      usedTransformScale: false,
      fitted: true,
    };
    if (!sheet || !slot || !workspace || !filter) return empty;

    const page = pageContentSizePx();
    sheet.style.width = `${page.width}px`;
    sheet.style.maxHeight = `${page.height}px`;
    sheet.style.overflow = "hidden";

    const topbarH = topbar ? topbar.getBoundingClientRect().height : 0;
    const slotH = Math.max(120, page.height - topbarH);
    slot.style.height = `${slotH}px`;
    slot.style.overflow = "hidden";

    workspace.classList.remove("is-scaled");
    workspace.style.removeProperty("transform");
    if (chart) {
      chart.classList.remove("is-scaled", "is-filter-scaled", "is-filter-fitted");
      chart.style.removeProperty("transform");
      chart.style.removeProperty("font-size");
    }

    const wrapped = ensureFilterScaleHost(doc, filter);
    if (!wrapped) return empty;
    const { host, tree } = wrapped;
    resetFilterFit(host, tree);

    const view = doc.defaultView;
    const filterStyle = view.getComputedStyle(filter);
    const padY =
      (parseFloat(filterStyle.paddingTop) || 0) +
      (parseFloat(filterStyle.paddingBottom) || 0);
    const padX =
      (parseFloat(filterStyle.paddingLeft) || 0) +
      (parseFloat(filterStyle.paddingRight) || 0);
    let chromeH = 0;
    for (const child of filter.children) {
      if (child === host) continue;
      chromeH += child.getBoundingClientRect().height;
    }
    const available = Math.max(80, slotH - chromeH - padY);
    const hostWidth = Math.max(80, filter.getBoundingClientRect().width - padX);

    void tree.offsetHeight;
    const naturalNeeded = treeScrollHeight(tree);
    let fit = {
      mode: "none",
      filterScale: 1,
      fitted: true,
      usedTransformScale: false,
      hostWidth,
    };
    if (naturalNeeded > available + 1) {
      fit = fitByFontShrink(host, tree, available, hostWidth);
    } else {
      host.style.height = `${available}px`;
      host.style.width = `${hostWidth}px`;
      host.style.overflow = "hidden";
    }

    void tree.offsetHeight;
    const treeRect = tree.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const chartTitle = chart && chart.querySelector("h2");
    const chartTitleFontSize = chartTitle
      ? parseFloat(view.getComputedStyle(chartTitle).fontSize) || 0
      : 0;
    const chartTransform = chart ? view.getComputedStyle(chart).transform : "none";

    return {
      mode: fit.mode,
      filterScale: fit.filterScale,
      available,
      naturalNeeded,
      filterVisualHeight: treeRect.height,
      filterVisualWidth: treeRect.width,
      hostWidth: hostRect.width,
      filterTreeWidthRatio: hostRect.width > 0 ? treeRect.width / hostRect.width : 0,
      chartHasTransform: !!(chartTransform && chartTransform !== "none"),
      chartTitleFontSize,
      workspaceHasScaleClass: workspace.classList.contains("is-scaled"),
      usedTransformScale: !!fit.usedTransformScale,
      fitted: !!fit.fitted,
      fontPx: fit.fontPx || null,
    };
  }

  global.fitPdfFilterColumnToPage = fitPdfFilterColumnToPage;
  global.SentinelPdfFit = {
    fitPdfFilterColumnToPage,
    pageContentSizePx,
  };
})(typeof window !== "undefined" ? window : globalThis);
