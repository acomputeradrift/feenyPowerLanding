import { steps, isVisible } from '/scripts/proposal/shared/schema.js';
import { validate } from '/scripts/proposal/shared/validate.js';
import { syncRepeatGroups } from '/scripts/proposal/shared/repeatGroups.js';
import {
  createFormController,
  fieldDomId,
  errorDomId,
  helpDomId
} from './formController.js';

const els = {};

async function submitProposal(payload) {
  const response = await fetch('/api/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 400 && body.fieldErrors) {
    const error = new Error('validation_failed');
    error.fieldErrors = body.fieldErrors;
    throw error;
  }
  if (!response.ok) {
    throw new Error(body.error || 'submit_failed');
  }
  return body;
}

const controller = createFormController({
  steps,
  validate,
  syncRepeatGroups,
  isVisible,
  submitProposal
});

function selectionOf(element) {
  if (typeof element.selectionStart !== 'number') return null;
  return { start: element.selectionStart, end: element.selectionEnd };
}

function readValue(question, element) {
  if (question.kind === 'count') return element.value;
  return element.value;
}

function createInput(question, value, id, hintValue) {
  if (question.kind === 'paragraph') {
    const element = document.createElement('textarea');
    element.id = id;
    element.name = id;
    element.rows = 6;
    if (question.maxLength) element.maxLength = question.maxLength;
    element.value = value ?? '';
    applyDefaultHint(element, question, value, hintValue);
    return element;
  }

  if (question.kind === 'select') {
    const element = document.createElement('select');
    element.id = id;
    element.name = id;
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Select…';
    element.appendChild(blank);
    for (const option of question.options) {
      const item = document.createElement('option');
      item.value = option;
      item.textContent = option;
      element.appendChild(item);
    }
    element.value = value ?? '';
    return element;
  }

  const element = document.createElement('input');
  element.id = id;
  element.name = id;
  if (question.kind === 'email') {
    element.type = 'email';
    element.autocomplete = 'email';
  } else if (question.kind === 'date') {
    element.type = 'date';
  } else if (question.kind === 'count') {
    element.type = 'number';
    element.min = String(question.min ?? 0);
    if (question.max != null) element.max = String(question.max);
    element.step = '1';
    element.inputMode = 'numeric';
  } else {
    element.type = 'text';
    if (question.id === 'contractorName') element.autocomplete = 'name';
    if (question.maxLength) element.maxLength = question.maxLength;
  }
  element.value = value === undefined || value === null ? '' : String(value);
  applyDefaultHint(element, question, value, hintValue);
  return element;
}

function applyDefaultHint(element, question, value, hintValue) {
  if (question.kind === 'select' || question.kind === 'count' || question.kind === 'date') return;
  const hint = hintValue ?? question.default;
  if (hint == null || value == null || value === '') return;
  if (String(value) === String(hint)) {
    element.classList.add('proposal-value-default');
  }
}

function renderField(question, state, value, path, onChange, hintValue) {
  const wrapper = document.createElement('div');
  wrapper.className = 'proposal-field';
  const id = fieldDomId(path);

  const label = document.createElement('label');
  label.setAttribute('for', id);
  label.appendChild(document.createTextNode(question.label));
  if (question.required) {
    const mark = document.createElement('span');
    mark.className = 'proposal-required';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = ' *';
    label.appendChild(mark);
  }

  const input = createInput(question, value, id, hintValue);
  input.setAttribute('aria-required', question.required ? 'true' : 'false');
  const describedBy = [];
  if (question.help) describedBy.push(helpDomId(path));
  if (state.fieldErrors[path]) describedBy.push(errorDomId(path));
  if (describedBy.length) input.setAttribute('aria-describedby', describedBy.join(' '));
  if (state.fieldErrors[path]) input.setAttribute('aria-invalid', 'true');

  input.addEventListener('input', (event) => {
    onChange(readValue(question, event.target), selectionOf(event.target));
  });

  wrapper.append(label, input);

  if (question.help) {
    const help = document.createElement('p');
    help.id = helpDomId(path);
    help.className = 'proposal-help';
    help.textContent = question.help;
    wrapper.appendChild(help);
  }

  if (state.fieldErrors[path]) {
    const error = document.createElement('p');
    error.id = errorDomId(path);
    error.className = 'proposal-error';
    error.setAttribute('role', 'alert');
    error.textContent = state.fieldErrors[path];
    wrapper.appendChild(error);
  }

  return wrapper;
}

function renderRepeat(question, state) {
  const items = Array.isArray(state.answers[question.id]) ? state.answers[question.id] : [];
  if (items.length === 0) return null;

  const group = document.createElement('fieldset');
  group.className = 'proposal-repeat';
  const groupLegend = document.createElement('legend');
  groupLegend.textContent = question.label;
  group.appendChild(groupLegend);

  items.forEach((item, index) => {
    const card = document.createElement('fieldset');
    card.className = 'proposal-card';
    const legend = document.createElement('legend');
    legend.textContent = question.itemLabel(index);
    card.appendChild(legend);

    for (const field of question.fields) {
      const path = `${question.id}[${index}].${field.id}`;
      card.appendChild(renderField(
        field,
        state,
        item ? item[field.id] : '',
        path,
        (value, selection) => {
          controller.setRepeatField(question.id, index, field.id, value, selection);
        },
        field.id === 'name' && typeof question.itemLabel === 'function'
          ? question.itemLabel(index)
          : undefined
      ));
    }
    group.appendChild(card);
  });

  return group;
}

function restoreFocus(state) {
  if (!state.focusTarget) return;
  const element = document.getElementById(state.focusTarget);
  if (!element) return;
  element.focus();
  if (state.focusSelection && typeof element.setSelectionRange === 'function') {
    try {
      element.setSelectionRange(state.focusSelection.start, state.focusSelection.end);
    } catch {
      // number and date inputs may reject setSelectionRange
    }
  }
}

function renderProgress(state) {
  els.progressText.textContent = state.progressText;
  els.progressList.replaceChildren();
  for (const item of state.progress) {
    const entry = document.createElement('li');
    entry.className = `proposal-progress-step proposal-progress-step-${item.status}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = String(item.stepNumber);
    const statusLabel = item.status === 'current'
      ? 'current step'
      : item.status === 'complete'
        ? 'completed'
        : 'not yet completed';
    button.setAttribute('aria-label', `${item.title}, ${statusLabel}`);
    if (item.status === 'current') button.setAttribute('aria-current', 'step');
    button.disabled = item.status === 'upcoming';
    button.addEventListener('click', () => {
      if (item.status === 'complete') controller.goToStep(item.index);
    });
    entry.appendChild(button);
    els.progressList.appendChild(entry);
  }
}

function renderSuccess(state) {
  els.form.hidden = true;
  els.success.hidden = false;
  els.intro.hidden = true;
  const result = state.submitResult;
  const heading = document.createElement('h2');
  heading.id = 'proposal-success-title';
  heading.tabIndex = -1;
  heading.textContent = 'Proposal submitted';
  const reference = document.createElement('p');
  reference.textContent = `Reference ${result.reference}.`;
  const email = document.createElement('p');
  email.textContent = result.delivery === 'pending'
    ? 'Your proposal has been received. Delivery is pending.'
    : 'Your proposal has been received.';
  els.success.replaceChildren(heading, reference, email);
  heading.focus();
}

function render(state) {
  if (state.submitResult) {
    renderSuccess(state);
    return;
  }

  els.form.hidden = false;
  els.success.hidden = true;
  els.intro.hidden = state.stepIndex !== 0;

  renderProgress(state);

  const heading = document.createElement('h2');
  heading.id = 'proposal-step-title';
  heading.textContent = state.step.title;

  const fields = document.createElement('div');
  fields.className = 'proposal-fields';
  for (const question of state.visibleQuestions) {
    if (question.kind === 'repeat') {
      const group = renderRepeat(question, state);
      if (group) fields.appendChild(group);
    } else {
      fields.appendChild(renderField(
        question,
        state,
        state.answers[question.id],
        question.id,
        (value, selection) => {
          controller.setAnswer(question.id, value, selection);
        }
      ));
    }
  }

  els.step.replaceChildren(heading, fields);
  els.step.setAttribute('aria-labelledby', 'proposal-step-title');

  els.back.disabled = state.isFirst;
  els.primary.textContent = state.submitting ? 'Submitting…' : (state.isLast ? 'Submit' : 'Next');
  els.primary.disabled = state.submitting;
  els.status.textContent = state.submitError || (state.submitting ? 'Generating your proposal…' : '');

  if (state.announcement) {
    els.live.textContent = state.announcement;
  }

  restoreFocus(state);
}

function mount() {
  els.intro = document.getElementById('proposal-intro');
  els.progressText = document.getElementById('proposal-progress-text');
  els.progressList = document.getElementById('proposal-progress-list');
  els.live = document.getElementById('proposal-live');
  els.form = document.getElementById('proposal-form');
  els.step = document.getElementById('proposal-step');
  els.status = document.getElementById('proposal-status');
  els.back = document.getElementById('proposal-back');
  els.primary = document.getElementById('proposal-primary');
  els.success = document.getElementById('proposal-success');
  els.honeypot = document.getElementById('proposal-honeypot');

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const state = controller.getState();
    if (state.submitting) return;
    if (state.isLast) {
      controller.submit(els.honeypot.value);
    } else {
      controller.next();
    }
  });

  els.back.addEventListener('click', () => {
    controller.back();
  });

  controller.subscribe(render);
}

mount();
