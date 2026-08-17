import { getQuestions } from './schema.js';

function asCount(value) {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function cappedCount(question, answers) {
  const raw = asCount(answers[question.repeatFor]);
  if (question.max == null) return raw;
  return Math.min(raw, question.max);
}

/**
 * Aligns every repeat-group array to its driving count.
 * Reducing the count truncates from the end and leaves surviving instances
 * untouched (FR-6). Increasing the count appends empty objects.
 */
export function syncRepeatGroups(schema, answers) {
  const next = { ...answers };
  for (const question of getQuestions(schema)) {
    if (question.kind !== 'repeat') continue;
    const count = cappedCount(question, next);
    const existing = Array.isArray(next[question.id]) ? next[question.id] : [];
    if (count === 0) {
      next[question.id] = [];
      continue;
    }
    if (existing.length > count) {
      next[question.id] = existing.slice(0, count);
    } else if (existing.length < count) {
      next[question.id] = [
        ...existing,
        ...Array.from({ length: count - existing.length }, () => ({}))
      ];
    } else {
      next[question.id] = existing;
    }
  }
  return next;
}
