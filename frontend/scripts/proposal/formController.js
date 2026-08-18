export const ESTIMATE_DEBOUNCE_MS = 400;

export function parseCount(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() === '') return '';
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }
  return value;
}

export function fieldDomId(path) {
  return `proposal-field-${domToken(path)}`;
}

export function errorDomId(path) {
  return `proposal-error-${domToken(path)}`;
}

export function helpDomId(path) {
  return `proposal-help-${domToken(path)}`;
}

function domToken(path) {
  return String(path).replace(/\[(\d+)\]/g, '-$1').replace(/\./g, '-');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rootId(errorPath) {
  return errorPath.replace(/\[\d+\]/g, '').split('.')[0];
}

function allQuestions(schemaSteps) {
  return schemaSteps.flatMap((step) => step.questions);
}

function findQuestionInSteps(schemaSteps, id) {
  return allQuestions(schemaSteps).find((question) => question.id === id);
}

function errorsForStep(errors, step) {
  const ids = new Set(step.questions.map((question) => question.id));
  const filtered = {};
  for (const [errorPath, message] of Object.entries(errors)) {
    if (ids.has(rootId(errorPath))) filtered[errorPath] = message;
  }
  return filtered;
}

function stepIndexForErrors(schemaSteps, errors) {
  const roots = new Set(Object.keys(errors).map(rootId));
  return schemaSteps.findIndex((step) => (
    step.questions.some((question) => roots.has(question.id))
  ));
}

function firstErrorPath(errors) {
  return Object.keys(errors)[0] || null;
}

function omitError(errors, path) {
  if (!errors[path]) return errors;
  const next = { ...errors };
  delete next[path];
  return next;
}

export function createFormController(options) {
  const {
    steps,
    validate,
    syncRepeatGroups,
    isVisible,
    requestEstimate,
    submitProposal,
    debounceMs = ESTIMATE_DEBOUNCE_MS
  } = options;

  let answers = syncRepeatGroups(
    steps,
    Object.fromEntries(
      allQuestions(steps)
        .filter((question) => question.kind === 'count')
        .map((question) => [question.id, 0])
    )
  );
  let stepIndex = 0;
  let fieldErrors = {};
  let announcement = '';
  let focusTarget = null;
  let focusSelection = null;
  let estimate = { sectionHours: null, totalProjectHours: null };
  let estimateFailed = false;
  let estimatePending = false;
  let estimateSeq = 0;
  let estimateTimer = null;
  let estimateInFlight = null;
  let submitting = false;
  let submitResult = null;
  let submitError = '';

  const formListeners = new Set();
  const estimateListeners = new Set();

  function notifyForm() {
    const state = getState();
    for (const listener of formListeners) listener(state);
  }

  function notifyEstimate() {
    const state = getState();
    for (const listener of estimateListeners) listener(state);
  }

  function firstFieldPath(step) {
    for (const question of step.questions) {
      if (!isVisible(question, answers)) continue;
      if (question.kind === 'repeat') continue;
      return question.id;
    }
    return null;
  }

  function describeRepeatChange(question, fromCount, toCount) {
    if (fromCount === toCount) return '';
    if (toCount === 0) return `${question.label} hidden`;
    return `Showing ${toCount} ${question.label.toLowerCase()}`;
  }

  function answersForSubmit() {
    const payload = {};
    for (const question of allQuestions(steps)) {
      if (!isVisible(question, answers)) continue;
      const value = answers[question.id];
      if (question.kind === 'repeat') {
        if (Array.isArray(value) && value.length > 0) {
          payload[question.id] = value.map((item) => ({ ...item }));
        }
        continue;
      }
      if (value === undefined || value === null || value === '') continue;
      payload[question.id] = value;
    }
    return payload;
  }

  function queueEstimate() {
    if (typeof requestEstimate !== 'function') return;
    if (estimateTimer) clearTimeout(estimateTimer);
    estimateTimer = setTimeout(() => {
      estimateTimer = null;
      runEstimate();
    }, debounceMs);
  }

  function runEstimate() {
    if (typeof requestEstimate !== 'function') return Promise.resolve();
    const seq = ++estimateSeq;
    estimatePending = true;
    notifyEstimate();
    const payload = clone(answers);
    estimateInFlight = Promise.resolve()
      .then(() => requestEstimate(payload))
      .then((result) => {
        if (seq !== estimateSeq) return;
        if (result && typeof result === 'object') {
          estimate = {
            sectionHours: result.sectionHours ?? null,
            totalProjectHours: result.totalProjectHours
          };
          estimateFailed = false;
        }
      })
      .catch(() => {
        if (seq !== estimateSeq) return;
        estimateFailed = true;
      })
      .finally(() => {
        if (seq === estimateSeq) estimatePending = false;
        notifyEstimate();
      });
    return estimateInFlight;
  }

  async function flushEstimate() {
    if (typeof requestEstimate !== 'function') return;
    if (estimateTimer) {
      clearTimeout(estimateTimer);
      estimateTimer = null;
    }
    return runEstimate();
  }

  function getState() {
    const step = steps[stepIndex];
    return {
      answers,
      stepIndex,
      step,
      stepNumber: stepIndex + 1,
      stepCount: steps.length,
      isFirst: stepIndex === 0,
      isLast: stepIndex === steps.length - 1,
      progressText: `Step ${stepIndex + 1} of ${steps.length} — ${step.title}`,
      progress: steps.map((item, index) => ({
        index,
        stepNumber: index + 1,
        id: item.id,
        title: item.title,
        status: index === stepIndex ? 'current' : index < stepIndex ? 'complete' : 'upcoming'
      })),
      visibleQuestions: step.questions.filter((question) => isVisible(question, answers)),
      fieldErrors,
      announcement,
      focusTarget,
      focusSelection,
      estimate,
      estimateFailed,
      estimatePending,
      submitting,
      submitResult,
      submitError
    };
  }

  function setAnswer(id, value, selection = null) {
    const question = findQuestionInSteps(steps, id);
    const parsed = question?.kind === 'count' ? parseCount(value) : value;
    const previous = answers;
    let next = { ...answers, [id]: parsed };
    if (question?.kind === 'count') {
      next = syncRepeatGroups(steps, next);
    }
    answers = next;
    fieldErrors = omitError(fieldErrors, id);
    focusTarget = fieldDomId(id);
    focusSelection = selection;
    announcement = '';

    if (question?.kind === 'count') {
      const repeats = allQuestions(steps).filter((item) => (
        item.kind === 'repeat' && item.repeatFor === id
      ));
      for (const group of repeats) {
        const fromCount = Array.isArray(previous[group.id]) ? previous[group.id].length : 0;
        const toCount = Array.isArray(answers[group.id]) ? answers[group.id].length : 0;
        announcement = describeRepeatChange(group, fromCount, toCount);
        if (toCount > fromCount && group.fields[0]) {
          focusTarget = fieldDomId(`${group.id}[${fromCount}].${group.fields[0].id}`);
          focusSelection = null;
        }
      }
    }

    queueEstimate();
    notifyForm();
    return getState();
  }

  function setRepeatField(groupId, index, fieldId, value, selection = null) {
    const items = Array.isArray(answers[groupId])
      ? answers[groupId].map((item, itemIndex) => (
        itemIndex === index ? { ...item, [fieldId]: value } : item
      ))
      : [];
    answers = { ...answers, [groupId]: items };
    const path = `${groupId}[${index}].${fieldId}`;
    fieldErrors = omitError(fieldErrors, path);
    focusTarget = fieldDomId(path);
    focusSelection = selection;
    announcement = '';
    queueEstimate();
    notifyForm();
    return getState();
  }

  function next() {
    const errors = errorsForStep(validate(steps, answers), steps[stepIndex]);
    if (Object.keys(errors).length > 0) {
      fieldErrors = errors;
      announcement = '';
      const path = firstErrorPath(errors);
      focusTarget = path ? fieldDomId(path) : null;
      focusSelection = null;
      notifyForm();
      return { ok: false, ...getState() };
    }
    if (stepIndex < steps.length - 1) {
      stepIndex += 1;
    }
    fieldErrors = {};
    announcement = '';
    const first = firstFieldPath(steps[stepIndex]);
    focusTarget = first ? fieldDomId(first) : null;
    focusSelection = null;
    notifyForm();
    return { ok: true, ...getState() };
  }

  function back() {
    if (stepIndex > 0) stepIndex -= 1;
    fieldErrors = {};
    announcement = '';
    const first = firstFieldPath(steps[stepIndex]);
    focusTarget = first ? fieldDomId(first) : null;
    focusSelection = null;
    notifyForm();
    return getState();
  }

  function goToStep(index) {
    if (!Number.isInteger(index) || index < 0 || index >= steps.length) {
      return getState();
    }
    if (index >= stepIndex) return getState();
    stepIndex = index;
    fieldErrors = {};
    announcement = '';
    const first = firstFieldPath(steps[stepIndex]);
    focusTarget = first ? fieldDomId(first) : null;
    focusSelection = null;
    notifyForm();
    return getState();
  }

  async function submit(honeypot = '') {
    if (submitting) return getState();
    const payload = answersForSubmit();
    const errors = validate(steps, payload);
    if (Object.keys(errors).length > 0) {
      fieldErrors = errors;
      const errorStep = stepIndexForErrors(steps, errors);
      if (errorStep >= 0) stepIndex = errorStep;
      const path = firstErrorPath(errors);
      focusTarget = path ? fieldDomId(path) : null;
      focusSelection = null;
      submitError = 'Please fix the highlighted fields.';
      announcement = submitError;
      notifyForm();
      return getState();
    }

    if (typeof submitProposal !== 'function') {
      submitError = 'Could not submit the proposal. Please try again shortly.';
      notifyForm();
      return getState();
    }

    submitting = true;
    submitError = '';
    notifyForm();
    try {
      submitResult = await submitProposal({ answers: payload, honeypot });
    } catch (error) {
      if (error && error.fieldErrors) {
        fieldErrors = error.fieldErrors;
        const errorStep = stepIndexForErrors(steps, fieldErrors);
        if (errorStep >= 0) stepIndex = errorStep;
        const path = firstErrorPath(fieldErrors);
        focusTarget = path ? fieldDomId(path) : null;
        submitError = 'Please fix the highlighted fields.';
      } else {
        submitError = 'Could not submit the proposal. Please try again shortly.';
      }
    } finally {
      submitting = false;
      notifyForm();
    }
    return getState();
  }

  return {
    getState,
    setAnswer,
    setRepeatField,
    next,
    back,
    goToStep,
    submit,
    getSubmitPayload(honeypot = '') {
      return { answers: answersForSubmit(), honeypot };
    },
    flushEstimate,
    refreshEstimate() {
      queueEstimate();
    },
    subscribe(listener) {
      formListeners.add(listener);
      listener(getState());
      return () => formListeners.delete(listener);
    },
    subscribeEstimate(listener) {
      estimateListeners.add(listener);
      listener(getState());
      return () => estimateListeners.delete(listener);
    }
  };
}
