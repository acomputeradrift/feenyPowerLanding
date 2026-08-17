import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatHoursSuffix,
  formatCountLine,
  sectionLines,
  projectSiteSummary,
  additionalInfoText,
  buildProposalContent
} from './formatProposal.js';
import { generateProposalPdf, proposalPdfFilename, buildDocDefinition } from './proposalDocument.js';
import { calculateSystemData } from '../calc/systemData.js';
import { calculateHoursData } from '../calc/hoursData.js';
import { rates } from '../calc/rates.js';
import { validAnswers } from '../fixtures/validAnswers.js';

describe('proposal wording (legacy formatters)', () => {
  it('hides a zero-hour suffix and singularises one hour', () => {
    assert.equal(formatHoursSuffix(0), '');
    assert.equal(formatHoursSuffix(0.1), ' (1 hr)');
    assert.equal(formatHoursSuffix(1), ' (1 hr)');
    assert.equal(formatHoursSuffix(1.1), ' (2 hrs)');
    assert.equal(formatHoursSuffix(6), ' (6 hrs)');
  });

  it('omits zero counts and singularises labels', () => {
    assert.equal(formatCountLine(0, 'Lighting Zone', 'Lighting Zones'), null);
    assert.equal(formatCountLine(1, 'Lighting Zone', 'Lighting Zones'), '1 Lighting Zone');
    assert.equal(formatCountLine(6, 'Lighting Zone', 'Lighting Zones'), '6 Lighting Zones');
  });

  it('renders None Included. when a section has no lines', () => {
    assert.deepEqual(sectionLines([
      { count: 0, singular: 'Alarm Zone', plural: 'Alarm Zones' }
    ]), ['None Included.']);
  });

  it('lists supplied names instead of a bare count and keeps leftovers', () => {
    assert.deepEqual(
      sectionLines([{
        count: 3,
        singular: 'Audio Source',
        plural: 'Audio Sources',
        names: ['Sonos Port', 'Rega Planar']
      }]),
      ['Sonos Port', 'Rega Planar', '1 Audio Source']
    );
  });

  it('builds the site summary and punctuates empty additional info', () => {
    assert.equal(
      projectSiteSummary({ rooms: 6, floors: 2, exteriorZones: 2 }),
      'This project covers 6 integrated areas across 2 floors. 2 exterior zones are included.'
    );
    assert.equal(
      projectSiteSummary({ rooms: 1, floors: 1, exteriorZones: 0 }),
      'This project covers 1 integrated area across a single floor. No exterior areas are included.'
    );
    assert.equal(additionalInfoText({}), 'No additional info.');
    assert.equal(additionalInfoText({ additionalInfo: '  Bring ladder.  ' }), 'Bring ladder.');
  });

  it('matches the Dave Marshall sample counts and never includes rates', () => {
    const answers = validAnswers({
      contractorName: 'Dave Marshall',
      contractorEmail: 'sedonaorchards@hotmail.com',
      projectClientName: 'Wanda Marshall',
      projectPoName: 'OFFICE',
      projectAddress: 'Kelowna, BC',
      projectTimeline: '2026-08-27',
      rooms: 6,
      floors: 2,
      exteriorZones: 2,
      lightingZones: 6,
      shadingZones: 6,
      keypadZones: 2,
      avReceiverDiscreteZones: 1,
      displayDiscreteZones: 1,
      thermostatZones: 1,
      globalControllerCount: 1,
      roomControllerCount: 1,
      inputSenseZones: 2,
      outputRelayZones: 6
    });
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContent(
      { ...answers, answers },
      systemData,
      hoursData,
      { year: 2026 }
    );

    assert.equal(content.cover.totalHoursLine, `Total Programming Hours: ${Math.ceil(hoursData.totalProjectHours)}`);
    assert.equal(content.systems.sections[0].title, 'Lighting/Shading (6 hrs)');
    assert.deepEqual(content.systems.sections[0].lines, [
      '6 Lighting Zones',
      '6 Shading Zones',
      '2 Keypad Zones'
    ]);
    assert.deepEqual(content.systems.sections[1].lines, [
      '1 AV Receiver Zone',
      '1 Display Zone'
    ]);
    assert.deepEqual(content.systems.sections[2].lines, ['1 Thermostat Zone']);
    assert.deepEqual(content.systems.sections[3].lines, ['None Included.']);
    assert.deepEqual(content.systems.sections[4].lines, ['None Included.']);
    assert.equal(content.equipment.sections[0].title, 'Controllers (6 hrs)');
    assert.deepEqual(content.equipment.sections[0].lines, [
      '1 Global Controller',
      '1 Room Controller'
    ]);
    assert.equal(content.equipment.sections[1].title, 'Inputs/Outputs (3 hrs)');
    assert.deepEqual(content.equipment.sections[1].lines, [
      '2 Input Zones (Sense)',
      '6 Output Zones (Relays)'
    ]);
    assert.equal(
      content.additional.siteSummary,
      'This project covers 6 integrated areas across 2 floors. 2 exterior zones are included.'
    );
    assert.equal(content.copyright, '© 2026 Feeny Power and Control Ltd. All Rights Reserved.');

    const serialized = JSON.stringify(content);
    assert.equal(serialized.includes('minutesPerUnit'), false);
    assert.equal(serialized.includes('26.4'), false);
    assert.equal(serialized.includes('lineItems'), false);
  });

  it('FR-16 generates a PDF buffer without rates', async () => {
    const answers = validAnswers({ lightingZones: 6, shadingZones: 6, keypadZones: 2 });
    const submission = {
      reference: 'RTI-20260817-K3M9QP',
      contractorName: 'Dave Marshall',
      contractorEmail: 'dave@example.com',
      projectPoName: 'OFFICE',
      answers
    };
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const buffer = await generateProposalPdf(submission, systemData, hoursData, { year: 2026 });
    assert.equal(Buffer.isBuffer(buffer), true);
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    const def = JSON.stringify(buildDocDefinition(submission, systemData, hoursData, { year: 2026 }));
    assert.equal(def.includes('minutesPerUnit'), false);
    assert.equal(def.includes('26.4'), false);
    assert.match(def, /System Integration Scope/);
    assert.match(def, /RTI Equipment Scope/);
    assert.equal(proposalPdfFilename(submission), 'RTI_20260817_K3M9QP Dave_Marshall OFFICE RTI Proposal.pdf');
  });
});
