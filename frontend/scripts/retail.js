document.addEventListener("DOMContentLoaded", function () {
    const messages = {
        propertyLocation: "Enter the city or neighbourhood. Use at least 2 characters.",
        propertyLocationLong: "Please shorten the property location.",
        projectType: "Choose new build, renovation, or existing system.",
        goals: "Tell us what you are planning, or what is not working. Use at least 10 characters.",
        goalsLong: "Please shorten the description.",
        name: "Enter your name.",
        nameLong: "Please shorten your name.",
        contact: "Enter an email address or a phone number so we can reply.",
        contactLong: "Please shorten the contact details.",
        area: "This enquiry did not come from a known project page.",
        sourcePath: "This enquiry did not come from a known project page.",
        unknown: "Unknown field",
        delivery_not_configured: "We could not send your enquiry because mail delivery is not configured on this server. Nothing was sent.",
        delivery_failed: "We could not send your enquiry. Nothing was delivered. Please try again later.",
        rate_limited: "Too many enquiries from this network. Please wait and try again.",
        payload_too_large: "Please shorten the enquiry and try again. Nothing was sent.",
        network: "We could not reach the server. Nothing was sent. Please try again.",
        success: "Your enquiry was sent.",
        sending: "Sending your enquiry…",
        validationIntro: "Some answers need another look. Nothing was sent."
    };

    document.querySelectorAll("[data-enquiry-open]").forEach(function (button) {
        button.addEventListener("click", function () {
            const field = document.getElementById("propertyLocation");
            if (field) field.focus();
        });
    });

    const form = document.getElementById("project-enquiry");
    if (!form) return;
    const status = document.getElementById("enquiry-status");
    const summary = document.getElementById("enquiry-errors");

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    function isPhone(value) {
        const digits = value.match(/\d/g);
        return !!digits && digits.length >= 7 && digits.length <= 15;
    }

    function control(name) {
        const item = form.elements.namedItem(name);
        if (!item) return null;
        if (typeof item.length === "number" && !item.tagName) return item[0];
        return item;
    }

    function setStatus(text, state) {
        status.textContent = text;
        if (state) status.setAttribute("data-state", state);
        else status.removeAttribute("data-state");
    }

    function clearField(name) {
        const slot = document.getElementById(name + "-error");
        if (slot) {
            slot.textContent = "";
            slot.hidden = true;
        }
        const item = form.elements.namedItem(name);
        if (name === "projectType") {
            const box = form.querySelector("fieldset");
            if (box) box.removeAttribute("aria-invalid");
        }
        const fields = item && typeof item.length === "number" && !item.tagName ? Array.from(item) : [item];
        fields.forEach(function (field) {
            if (field) field.removeAttribute("aria-invalid");
        });
    }

    function clearErrors() {
        ["propertyLocation", "projectType", "goals", "name", "contact", "area", "sourcePath"].forEach(clearField);
        summary.hidden = true;
        summary.textContent = "";
    }

    function showErrors(fieldErrors) {
        const names = Object.keys(fieldErrors);
        const list = document.createElement("ul");
        const intro = document.createElement("p");
        intro.textContent = messages.validationIntro;
        summary.textContent = "";
        summary.appendChild(intro);
        names.forEach(function (name) {
            const message = fieldErrors[name];
            const slot = document.getElementById(name + "-error");
            if (slot) {
                slot.textContent = message;
                slot.hidden = false;
            }
            if (name === "projectType") {
                const box = form.querySelector("fieldset");
                if (box) box.setAttribute("aria-invalid", "true");
            }
            const item = form.elements.namedItem(name);
            const fields = item && typeof item.length === "number" && !item.tagName ? Array.from(item) : [item];
            fields.forEach(function (field) {
                if (field) field.setAttribute("aria-invalid", "true");
            });
            const li = document.createElement("li");
            const link = document.createElement("a");
            const target = control(name);
            link.href = target && target.id ? "#" + target.id : "#project-enquiry";
            link.textContent = message;
            li.appendChild(link);
            list.appendChild(li);
        });
        summary.appendChild(list);
        summary.hidden = false;
        const first = control(names[0]);
        if (first) first.focus();
        else summary.focus();
    }

    function validate(payload) {
        const errors = {};
        const location = payload.propertyLocation.trim();
        if (location.length < 2) errors.propertyLocation = messages.propertyLocation;
        else if (location.length > 200) errors.propertyLocation = messages.propertyLocationLong;
        if (!payload.projectType) errors.projectType = messages.projectType;
        const goals = payload.goals.trim();
        if (goals.length < 10) errors.goals = messages.goals;
        else if (goals.length > 2000) errors.goals = messages.goalsLong;
        const name = payload.name.trim();
        if (name.length < 1 || !/\p{L}/u.test(name)) errors.name = messages.name;
        else if (name.length > 120) errors.name = messages.nameLong;
        const contact = payload.contact.trim();
        if (contact.length > 200) errors.contact = messages.contactLong;
        else if (!isEmail(contact) && !isPhone(contact)) errors.contact = messages.contact;
        return errors;
    }

    form.addEventListener("input", function (event) {
        const name = event.target && event.target.name;
        if (!name) return;
        clearField(name);
        if (summary.hidden === false && !summary.querySelector("[href]")) {
            summary.hidden = true;
        }
        if (status.getAttribute("data-state") === "error") setStatus("", null);
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        clearErrors();
        const data = new FormData(form);
        const payload = {
            area: String(data.get("area") || ""),
            sourcePath: String(data.get("sourcePath") || ""),
            propertyLocation: String(data.get("propertyLocation") || ""),
            projectType: String(data.get("projectType") || ""),
            goals: String(data.get("goals") || ""),
            name: String(data.get("name") || ""),
            contact: String(data.get("contact") || ""),
            honeypot: String(data.get("honeypot") || "")
        };
        const fieldErrors = validate(payload);
        if (Object.keys(fieldErrors).length > 0) {
            showErrors(fieldErrors);
            setStatus("", null);
            return;
        }

        const submit = form.querySelector("[type='submit']");
        submit.disabled = true;
        form.setAttribute("aria-busy", "true");
        setStatus(messages.sending, "pending");
        try {
            const response = await fetch(form.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const body = await response.json().catch(function () { return {}; });
            if (response.ok && body.delivered === true) {
                form.reset();
                setStatus(messages.success, "success");
                status.focus();
                return;
            }
            if (body.fieldErrors) {
                showErrors(body.fieldErrors);
                setStatus("", null);
                return;
            }
            setStatus(messages[body.error] || messages.delivery_failed, "error");
            status.focus();
        } catch (error) {
            setStatus(messages.network, "error");
            status.focus();
        } finally {
            submit.disabled = false;
            form.removeAttribute("aria-busy");
        }
    });
});
