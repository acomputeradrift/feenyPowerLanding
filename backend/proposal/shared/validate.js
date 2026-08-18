import { getQuestions, isVisible } from './schema.js';

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function allowedTopLevelIds(questions) {
  return new Set(questions.map((question) => question.id));
}

function validateField(field, value, path, errors) {
  if (field.required && isEmpty(value)) {
    errors[path] = `${field.label} is required`;
    return;
  }
  if (isEmpty(value)) return;

  if ((field.kind === 'text' || field.kind === 'paragraph' || field.kind === 'email')
    && typeof value === 'string'
    && field.maxLength != null
    && value.length > field.maxLength) {
    errors[path] = `${field.label} must be ${field.maxLength} characters or fewer`;
    return;
  }

  if (field.kind === 'email' && !isValidEmail(value)) {
    errors[path] = 'A valid email address is required';
    return;
  }

  if (field.kind === 'date' && !isIsoDate(value)) {
    errors[path] = `${field.label} must be a valid date`;
    return;
  }

  if (field.kind === 'select' && !field.options.includes(value)) {
    errors[path] = `${field.label} must be one of: ${field.options.join(', ')}`;
  }

  if ((field.kind === 'text' || field.kind === 'paragraph') && typeof value !== 'string') {
    errors[path] = `${field.label} must be text`;
  }
}

function validateCount(question, value, answers, errors) {
  const { id, label } = question;
  if (question.required && isEmpty(value)) {
    errors[id] = `${label} is required`;
    return;
  }
  if (isEmpty(value)) return;

  if (!Number.isInteger(value)) {
    errors[id] = `${label} must be a whole number`;
    return;
  }

  const min = question.min ?? 0;
  if (value < min) {
    errors[id] = `${label} must be at least ${min}`;
    return;
  }

  if (question.max != null && value > question.max) {
    errors[id] = `${label} must be at most ${question.max}`;
    return;
  }

  if (id === 'floorplanAddOnCount') {
    const globalCount = Number.isInteger(answers.globalControllerCount)
      ? answers.globalControllerCount
      : 0;
    if (value > globalCount) {
      errors[id] = 'Floorplan add-ons cannot exceed the number of global controllers';
    }
  }
}

function validateControllerPair(answers, errors) {
  const global = answers.globalControllerCount;
  const room = answers.roomControllerCount;
  if (!Number.isInteger(global) || !Number.isInteger(room)) return;
  if (global < 0 || room < 0) return;
  if (global + room >= 1) return;
  const message = 'Enter at least one global controller or one room controller';
  if (!errors.globalControllerCount) errors.globalControllerCount = message;
  if (!errors.roomControllerCount) errors.roomControllerCount = message;
}

function validateRepeat(question, answers, errors) {
  const count = answers[question.repeatFor];
  if (!Number.isInteger(count) || count <= 0) return;

  if (question.max != null && count > question.max) return;

  const items = answers[question.id];
  if (!Array.isArray(items) || items.length !== count) {
    errors[question.id] = `${question.label} must have exactly ${count} ${count === 1 ? 'entry' : 'entries'}`;
    return;
  }

  const allowedFields = new Set(question.fields.map((field) => field.id));
  items.forEach((item, index) => {
    const path = `${question.id}[${index}]`;
    if (item == null || typeof item !== 'object' || Array.isArray(item)) {
      errors[path] = `${question.itemLabel(index)} must be an object`;
      return;
    }
    for (const key of Object.keys(item)) {
      if (!allowedFields.has(key)) {
        errors[`${path}.${key}`] = 'Unknown field';
      }
    }
    for (const field of question.fields) {
      validateField(field, item[field.id], `${path}.${field.id}`, errors);
    }
  });
}

export function validate(schema, answers) {
  const questions = getQuestions(schema);
  const payload = answers && typeof answers === 'object' && !Array.isArray(answers)
    ? answers
    : {};
  const errors = {};
  const allowed = allowedTopLevelIds(questions);

  for (const key of Object.keys(payload)) {
    if (!allowed.has(key)) {
      errors[key] = 'Unknown field';
    }
  }

  for (const question of questions) {
    if (!isVisible(question, payload)) continue;

    if (question.kind === 'count') {
      validateCount(question, payload[question.id], payload, errors);
      continue;
    }

    if (question.kind === 'repeat') {
      validateRepeat(question, payload, errors);
      continue;
    }

    validateField(question, payload[question.id], question.id, errors);
  }

  validateControllerPair(payload, errors);
  return errors;
}
