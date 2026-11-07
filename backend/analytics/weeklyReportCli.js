// Preview or send the weekly homeowner-pages report now.
//   npm run analytics:report -- --dry-run [--out /tmp/fpc_weekly_report.html] [--now 2026-11-09T15:00:00Z]
//   npm run analytics:report -- --send [--force]
// --dry-run never sends and never touches the sent-week guard.
// --send respects the guard (skips a week already sent) unless --force.
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { requireMongoUri } from '../requireMongoUri.js';
import { runWeeklyReport } from './report.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

function argValue(args, name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes('--send');
  const force = args.includes('--force');
  const nowArg = argValue(args, '--now');
  const now = nowArg ? new Date(nowArg) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error(`Invalid --now value: ${nowArg}`);
  const out = argValue(args, '--out')
    || path.join(existsSync('/tmp') ? '/tmp' : os.tmpdir(), 'fpc_weekly_report.html');

  await mongoose.connect(requireMongoUri(process.env.MONGO_URI));
  try {
    const result = await runWeeklyReport({ now, send, force });
    if (!send) {
      await writeFile(out, result.html, 'utf8');
      console.log(`Dry run for ${result.week}: ${result.subject}`);
      console.log(result.text);
      console.log(`\nHTML written to ${out}`);
    } else {
      console.log(`Weekly report ${result.week}: ${result.status}`);
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
