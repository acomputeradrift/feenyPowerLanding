import cron from 'node-cron';

import { runWeeklyReport } from './report.js';
import { analyticsTz } from './time.js';

export const DEFAULT_REPORT_CRON = '0 7 * * 1';

/** In-process weekly report: Monday 07:00 America/Vancouver unless overridden by env. */
export function startWeeklyReportScheduler({ env = process.env, logger = console } = {}) {
  if (env.ANALYTICS_REPORT_ENABLED === 'false') {
    logger.log('[analytics] weekly report scheduler off (ANALYTICS_REPORT_ENABLED=false)');
    return null;
  }
  const expression = env.ANALYTICS_REPORT_CRON || DEFAULT_REPORT_CRON;
  const timezone = env.ANALYTICS_REPORT_TZ || analyticsTz(env);
  if (!cron.validate(expression)) {
    logger.error(`[analytics] invalid ANALYTICS_REPORT_CRON "${expression}"; weekly report not scheduled`);
    return null;
  }
  let task;
  try {
    task = cron.schedule(expression, () => {
      Promise.resolve()
        .then(() => runWeeklyReport({ env, logger }))
        .catch((error) => logger.error('[analytics] weekly report failed:', error?.message || error));
    }, { timezone });
  } catch (error) {
    logger.error('[analytics] weekly report not scheduled:', error?.message || error);
    return null;
  }
  logger.log(`[analytics] weekly report scheduled "${expression}" (${timezone})`);
  return task;
}
