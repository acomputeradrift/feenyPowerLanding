// Dealer page (/consultation): the project form, plus CTA, FAQ and sticky-button behaviour
// copied from homeowner_form.js so the two pages act the same.
// fpcTrack comes from /scripts/fpc_analytics.js and may be missing (DNT, blocked).
// Phone, WhatsApp, email and budget-form clicks are counted by fpc_analytics.js itself.
(function () {
    function track(name, props) {
        if (window.fpcTrack) window.fpcTrack(name, props);
    }

    function initStickyCta() {
        const sticky = document.querySelector(".ho-sticky-cta");
        if (!sticky || !("IntersectionObserver" in window)) return;
        const watched = [document.querySelector("[data-cta=hero]"), document.querySelector("[data-cta=mid]"), document.getElementById("inquiry")]
            .filter(Boolean);
        const inView = new Set();
        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) inView.add(entry.target);
                else inView.delete(entry.target);
            });
            const show = inView.size === 0;
            sticky.classList.toggle("is-visible", show);
            document.body.classList.toggle("ho-sticky-shown", show);
        });
        watched.forEach(function (el) { observer.observe(el); });
    }

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll('a[href="#inquiry"][data-cta]').forEach(function (el) {
            el.addEventListener("click", function () {
                track("cta_click", { id: el.getAttribute("data-cta") });
            });
        });

        document.querySelectorAll(".ho-faq-item").forEach(function (item) {
            item.addEventListener("toggle", function () {
                if (!item.open) return;
                const summary = item.querySelector("summary");
                track("faq_open", { q: summary ? summary.textContent.trim() : "" });
            });
        });

        initStickyCta();

        const form = document.getElementById("dealer-form");
        if (!form) return;

        const status = form.querySelector(".ho-form-status");
        const submit = form.querySelector("button[type=submit]");
        const submitLabel = submit.textContent;
        let started = false;

        form.addEventListener("focusin", function () {
            if (started) return;
            started = true;
            track("form_start");
        });

        function setStatus(message, kind) {
            status.textContent = message;
            status.classList.toggle("is-success", kind === "success");
            status.classList.toggle("is-error", kind === "error");
        }

        function value(name) {
            const field = form.elements[name];
            return field ? String(field.value || "").trim() : "";
        }

        function validate() {
            let firstInvalid = null;
            ["name", "email", "details"].forEach(function (name) {
                const field = form.elements[name];
                const ok = field.value.trim() !== "" && field.checkValidity();
                field.setAttribute("aria-invalid", ok ? "false" : "true");
                if (!ok && !firstInvalid) firstInvalid = field;
            });
            const boxes = form.querySelectorAll("input[name=platforms]");
            const anyPlatform = Array.prototype.some.call(boxes, function (b) { return b.checked; });
            if (!anyPlatform && !firstInvalid) firstInvalid = boxes[0];
            if (!form.querySelector("input[name=need]:checked") && !firstInvalid) {
                firstInvalid = form.querySelector("input[name=need]");
            }
            return firstInvalid;
        }

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            const invalid = validate();
            if (invalid) {
                setStatus("Please fill in your name, email, platform, what you need and a few lines about it.", "error");
                invalid.focus();
                return;
            }

            const need = form.querySelector("input[name=need]:checked");
            const body = {
                name: value("name"),
                company: value("company"),
                email: value("email"),
                phone: value("phone"),
                platforms: Array.prototype.map.call(
                    form.querySelectorAll("input[name=platforms]:checked"),
                    function (b) { return b.value; }
                ),
                need: need ? need.value : "",
                details: value("details"),
                sessionId: window.fpcSessionId || null,
                website: value("website"),
            };

            submit.disabled = true;
            submit.textContent = form.dataset.sending;
            setStatus("", null);

            fetch("/api/dealer-inquiry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            })
                .then(function (res) {
                    return res.json().catch(function () { return {}; }).then(function (data) {
                        if (!res.ok || !data.ok) {
                            const err = new Error(res.status === 400 && data.error ? data.error : form.dataset.error);
                            err.userFacing = true;
                            throw err;
                        }
                    });
                })
                .then(function () {
                    track("form_submit");
                    form.reset();
                    setStatus(form.dataset.success, "success");
                    submit.textContent = submitLabel;
                    submit.disabled = false;
                })
                .catch(function (err) {
                    setStatus(err && err.userFacing ? err.message : form.dataset.error, "error");
                    submit.textContent = submitLabel;
                    submit.disabled = false;
                });
        });
    });
})();
