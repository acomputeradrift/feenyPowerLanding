document.addEventListener("DOMContentLoaded", function () {
    const areas = {
        "greater-vancouver": "/homeowners/greater-vancouver#project-enquiry",
        "kelowna": "/homeowners/kelowna#project-enquiry",
        "los-gatos": "/homeowners/los-gatos#project-enquiry"
    };
    const from = new URLSearchParams(window.location.search).get("from");
    const target = areas[from];
    if (!target) return;
    document.querySelectorAll(".retail-faq-cta").forEach(function (link) {
        link.href = target;
    });
    document.querySelectorAll("[data-area]").forEach(function (link) {
        if (link.getAttribute("data-area") === from) link.setAttribute("aria-current", "page");
    });
});
