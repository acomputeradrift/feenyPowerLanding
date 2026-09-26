(function () {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('t') || 'This idea';
    const date = params.get('d') || '';
    const vote = params.get('v') === 'down' ? 'down' : 'up';
    const form = document.getElementById('feedback-form');
    const noteRow = document.getElementById('note-row');
    const note = document.getElementById('note');
    const NOTE_CHOICES = { 'save-for-later': true, sparked: true };

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

    const topic = document.getElementById('field-c');
    const topicRow = document.getElementById('topic-row');
    const incoming = params.get('c') || '';
    const known = topic && Array.from(topic.options).some(function (option) {
        return option.value === incoming;
    });
    if (known) {
        topic.value = incoming;
        topic.required = false;
        if (topicRow) topicRow.hidden = true;
    }

    function selectedReason() {
        const picked = form && form.querySelector('input[name="reason"]:checked:not(:disabled)');
        return picked ? picked.value : '';
    }

    function showNote() {
        const open = Boolean(NOTE_CHOICES[selectedReason()]);
        if (noteRow) noteRow.hidden = !open;
        if (note) {
            note.disabled = !open;
            note.required = open;
            if (!open) note.value = '';
        }
    }

    function showReasons(side) {
        ['up', 'down'].forEach(function (name) {
            const box = document.getElementById('reasons-' + name);
            if (!box) return;
            const on = name === side;
            box.hidden = !on;
            box.querySelectorAll('input').forEach(function (input) {
                input.disabled = !on;
                if (!on) input.checked = false;
            });
        });
        showNote();
    }

    function selectVote(side) {
        const selected = document.querySelector('input[name="v"][value="' + side + '"]');
        if (selected) selected.checked = true;
        showReasons(side);
    }

    document.querySelectorAll('input[name="v"]').forEach(function (input) {
        input.addEventListener('change', function () {
            showReasons(input.value);
        });
    });
    document.querySelectorAll('input[name="reason"]').forEach(function (input) {
        input.addEventListener('change', showNote);
    });
    selectVote(vote);

    if (!form) return;
    form.addEventListener('submit', function () {
        form.querySelectorAll('input[name="reason"]').forEach(function (input) {
            input.required = !input.disabled;
        });
    });
}());
