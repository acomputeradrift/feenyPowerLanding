/**
 * Capture the legacy Apps Script calculators' output against the mock answer
 * set in testOnFormSubmit(), and write it as the golden-master fixture.
 *
 * Requires the sibling RTI AutoProposal repository. Override the path with
 * RTI_AUTOPROPOSAL_ROOT if needed. Does not send email or touch Google APIs.
 *
 * Usage (from this repository root):
 *   node backend/proposal/calc/capture-legacy-fixture.js
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const THIS_FILE = fileURLToPath(import.meta.url);
const CALC_DIR = path.dirname(THIS_FILE);
const THIS_REPO_ROOT = path.resolve(CALC_DIR, '../../..');
const FIXTURE_PATH = path.join(CALC_DIR, 'fixtures', 'legacy-golden-master.json');

const LEGACY_ROOT = process.env.RTI_AUTOPROPOSAL_ROOT
  || path.resolve(THIS_REPO_ROOT, '..', 'RTI AutoProposal');

const CALCULATOR_FILES = [
  'calculateTotalDeviceZones.js',
  'calculateTotalProjectRooms.js',
  'calculateProcessorCounts.js',
  'calculateSystemData.js',
  'calculateHoursData.js'
];

function readLegacy(filename) {
  const fullPath = path.join(LEGACY_ROOT, filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Legacy file not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function legacyGit(format) {
  try {
    return execFileSync('git', ['-C', LEGACY_ROOT, 'log', '-1', `--format=${format}`], {
      encoding: 'utf8'
    }).trim();
  } catch {
    return null;
  }
}

function loadLegacyCalculators() {
  const captured = {
    formData: null,
    systemData: null,
    hoursData: null
  };

  const context = vm.createContext({
    Logger: { log() {} },
    Math,
    Number,
    String,
    JSON,
    createProjectSpreadsheet(formData, systemData, hoursData) {
      captured.formData = formData;
      captured.systemData = systemData;
      captured.hoursData = hoursData;
    },
    generateAndSendEstimate() {}
  });

  for (const filename of CALCULATOR_FILES) {
    vm.runInContext(readLegacy(filename), context, { filename });
  }

  vm.runInContext(readLegacy('onFormSubmit.js'), context, { filename: 'onFormSubmit.js' });
  vm.runInContext('testOnFormSubmit()', context);

  if (!captured.systemData || !captured.hoursData) {
    throw new Error('Legacy testOnFormSubmit() did not produce systemData and hoursData.');
  }

  return captured;
}

const captured = loadLegacyCalculators();

const fixture = {
  meta: {
    source: 'RTI AutoProposal testOnFormSubmit() mock answers',
    legacyCommit: legacyGit('%H'),
    legacyCommitSubject: legacyGit('%s'),
    capturedAt: new Date().toISOString()
  },
  formData: captured.formData,
  systemData: captured.systemData,
  hoursData: captured.hoursData
};

fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
fs.writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');

const { systemData, hoursData } = captured;

process.stdout.write(`Wrote ${path.relative(THIS_REPO_ROOT, FIXTURE_PATH)}\n`);
process.stdout.write(`Legacy commit: ${fixture.meta.legacyCommit} ${fixture.meta.legacyCommitSubject}\n`);
process.stdout.write('\nSystem totals\n');
process.stdout.write(`  totalProjectZones:        ${systemData.totalProjectZones}\n`);
process.stdout.write(`  totalProjectRooms:        ${systemData.totalProjectRooms}\n`);
process.stdout.write(`  totalDeviceZones:         ${systemData.totalDeviceZones} (discrete ${systemData.totalDiscreteDeviceZones}, cloned ${systemData.totalClonedDeviceZones})\n`);
process.stdout.write(`  mainProcessorCount:       ${systemData.mainProcessorCount}\n`);
process.stdout.write(`  auxProcessorCount:        ${systemData.auxProcessorCount}\n`);
process.stdout.write(`  expansionModuleCount:     ${systemData.expansionModuleCount}\n`);
process.stdout.write('\nSection hours\n');
process.stdout.write(`  lighting/shading:         ${hoursData.totalLightingShadingHours}\n`);
process.stdout.write(`  audio/video:              ${hoursData.totalAudioVideoHours}\n`);
process.stdout.write(`  climate:                  ${hoursData.totalClimateHours}\n`);
process.stdout.write(`  security:                 ${hoursData.totalSecurityHours}\n`);
process.stdout.write(`  pool/pumps:               ${hoursData.totalPoolAndPumpsHours}\n`);
process.stdout.write(`  inputs/outputs:           ${hoursData.totalInputOutputHours}\n`);
process.stdout.write(`  controllers:              ${hoursData.totalControllerHours}\n`);
process.stdout.write(`  totalProjectHours:        ${hoursData.totalProjectHours}\n`);
