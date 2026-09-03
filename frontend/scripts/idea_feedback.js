(function () {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('t') || 'This idea';
    const date = params.get('d') || '';
    const vote = params.get('v') === 'down' ? 'down' : 'up';

    const titleEl = document.getElementById('idea-title');
    const dateEl = document.getElementById('idea-date');
    if (titleEl) titleEl.textContent = title;
    if (dateEl) dateEl.textContent = date;

    const fields = {
        b: params.get('b') || '',
        d: date,
        t: title,
        s: params.get('s') || ''
    };
    Object.keys(fields).forEach(function (name) {
        const el = document.getElementById('field-' + name);
        if (el) el.value = fields[name];
    });

    const selected = document.querySelector('input[name="v"][value="' + vote + '"]');
    if (selected) selected.checked = true;
}());
