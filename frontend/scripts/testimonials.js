document.addEventListener("DOMContentLoaded", function () {
    const root = document.querySelector(".testimonial-carousel");
    if (!root) return;

    const viewport = root.querySelector(".testimonial-viewport");
    const track = root.querySelector(".testimonial-track");
    const indicators = root.querySelector(".testimonial-indicators");
    const slides = Array.from(track.querySelectorAll(":scope > .testimonial"));
    if (slides.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const intervalMs = 8000;
    const durationMs = 450;
    let index = 0;
    let timer = null;
    let pointerStartX = null;

    slides.forEach(function (slide, i) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "testimonial-indicator";
        button.setAttribute("role", "tab");
        button.setAttribute("aria-label", "Show testimonial " + (i + 1));
        button.addEventListener("click", function () {
            go(i, true);
        });
        indicators.appendChild(button);
    });

    if (slides.length > 1) {
        const clone = slides[0].cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        track.appendChild(clone);
    }

    function logicalIndex() {
        return index % slides.length;
    }

    function paint(animate) {
        track.style.transition = animate && !reduceMotion ? "transform " + durationMs + "ms ease" : "none";
        track.style.transform = "translateX(-" + (index * viewport.clientWidth) + "px)";
        const current = logicalIndex();
        Array.from(indicators.children).forEach(function (dot, i) {
            const active = i === current;
            if (active) dot.setAttribute("aria-current", "true");
            else dot.removeAttribute("aria-current");
            dot.setAttribute("aria-selected", active ? "true" : "false");
        });
        slides.forEach(function (slide, i) {
            slide.setAttribute("aria-hidden", i === current ? "false" : "true");
        });
    }

    function go(next, animate) {
        index = ((next % slides.length) + slides.length) % slides.length;
        paint(animate);
        restart();
    }

    function advance() {
        if (slides.length < 2) return;
        if (reduceMotion) {
            go(logicalIndex() + 1, false);
            return;
        }
        index += 1;
        paint(true);
        if (index === slides.length) {
            window.setTimeout(function () {
                if (index !== slides.length) return;
                index = 0;
                paint(false);
            }, durationMs);
        }
    }

    window.addEventListener("resize", function () {
        paint(false);
    });

    function stop() {
        clearInterval(timer);
        timer = null;
    }

    function restart() {
        stop();
        if (reduceMotion || slides.length < 2) return;
        timer = setInterval(advance, intervalMs);
    }

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", restart);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", function (event) {
        if (!root.contains(event.relatedTarget)) restart();
    });

    root.addEventListener("keydown", function (event) {
        if (slides.length < 2) return;
        if (event.key === "ArrowRight") {
            event.preventDefault();
            advance();
            restart();
        } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(logicalIndex() - 1, true);
        }
    });

    root.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointerStartX = event.clientX;
    });

    root.addEventListener("pointerup", function (event) {
        if (pointerStartX === null || slides.length < 2) return;
        if (event.target.closest(".testimonial-indicator")) {
            pointerStartX = null;
            return;
        }
        const delta = event.clientX - pointerStartX;
        pointerStartX = null;
        if (Math.abs(delta) < 40) return;
        if (delta < 0) {
            advance();
            restart();
        } else {
            go(logicalIndex() - 1, true);
        }
    });

    root.addEventListener("pointercancel", function () {
        pointerStartX = null;
    });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) stop();
        else restart();
    });

    paint(false);
    restart();
});
