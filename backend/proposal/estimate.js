import { calculateSystemData } from './calc/systemData.js';
import { calculateHoursData } from './calc/hoursData.js';
import { rates } from './calc/rates.js';

/**
 * Live hours estimate for a partial answers object (FR-9, ADR-005).
 * Missing and unparseable values are treated as zero. Returns section
 * totals only — never line items or per-unit minutes.
 */
export function estimateHours(rawAnswers, rateCard = rates) {
  const answers = rawAnswers && typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)
    ? rawAnswers
    : {};
  const systemData = calculateSystemData(answers);
  const { sectionHours, totalProjectHours } = calculateHoursData(systemData, rateCard);
  return {
    sectionHours: { ...sectionHours },
    totalProjectHours
  };
}
