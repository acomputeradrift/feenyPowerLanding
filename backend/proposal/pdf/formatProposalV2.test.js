import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHoursData } from '../calc/hoursData.js';
import { rates } from '../calc/rates.js';
import { calculateSystemData } from '../calc/systemData.js';
import { validAnswers } from '../fixtures/validAnswers.js';
import {
  buildProposalContentV2,
  formatCommissioningDate,
  joinList,
  qtyLine
} from './formatProposalV2.js';
import { buildDocDefinitionV2, layoutBand } from './proposalDocumentV2.js';

function highRdAnswers() {
  const answers = validAnswers({
    contractorName: 'Jamie Feeny',
    contractorEmail: 'jamie@example.com',
    projectPoName: 'HIGH RD',
    projectClientName: 'Private Client',
    projectAddress: 'Private Location',
    projectTimeline: '2026-09-15',
    rooms: 4,
    lightingZones: 4,
    shadingZones: 2,
    audioDiscreteSourceZones: 1,
    videoDiscreteSourceZones: 1,
    displayDiscreteZones: 1,
    globalControllerCount: 4,
    roomControllerCount: 1,
    inputSenseZones: 2,
    outputRelayZones: 1,
    additionalInfo: 'Owner wants scenes labelled by time of day.'
  });
  answers.globalControllerDetails = [
    { type: 'iPhone', name: 'Global Controller 1' },
    { type: 'iPhone', name: 'Global Controller 2' },
    { type: 'Touchscreen', name: 'Global Controller 3' },
    { type: 'Touchscreen', name: 'Global Controller 4' }
  ];
  answers.audioSourceDetails = [{ type: 'Streamer', name: 'Sonos Port' }];
  answers.videoSourceDetails = [{ type: 'Media Player', name: 'Apple TV' }];
  answers.displayDetails = [{ type: 'TV', name: 'Living Room' }];
  return answers;
}

describe('proposal v2 wording', () => {
  it('joins lists with commas and and', () => {
    assert.equal(joinList(['lighting']), 'lighting');
    assert.equal(joinList(['lighting', 'shading']), 'lighting and shading');
    assert.equal(joinList(['lighting', 'shading', 'audio/video']), 'lighting, shading and audio/video');
  });

  it('formats commissioning dates', () => {
    assert.equal(formatCommissioningDate('2026-09-15'), 'September 15, 2026');
    assert.equal(formatCommissioningDate(''), 'not provided');
  });

  it('prints quantity lines as 1 x Label', () => {
    assert.equal(qtyLine(1, 'iPhone Global Controller'), '1 x iPhone Global Controller');
    assert.equal(qtyLine(2, 'Touchscreen Global Controller'), '2 x Touchscreen Global Controller');
    assert.equal(qtyLine(0, 'Lighting Zone'), null);
  });

  it('builds the HIGH RD overview, cover, devices, controllers and totals', () => {
    const answers = highRdAnswers();
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContentV2(
      { ...answers, answers },
      systemData,
      hoursData,
      { year: 2026 }
    );

    assert.equal(content.cover.poLine, 'Project PO: HIGH RD');
    assert.equal(content.cover.clientLine, 'Project Client Name: Private Client');
    assert.equal(content.cover.locationLine, 'Project Location: Private Location');
    assert.equal(content.cover.timelineLine, undefined);
    assert.equal(content.cover.totalHoursLine, undefined);

    assert.match(
      content.overview.roomsAndSystems,
      /This project has 4 rooms, currently labelled as Room 1, Room 2, Room 3 and Room 4 and includes integration with lighting, shading and audio\/video systems\./
    );
    assert.match(
      content.overview.controllers,
      /For controllers, there are 2 iPhones that control every system, 2 touchscreens that control every system and a handheld controller that controls a single room\./
    );
    assert.equal(
      content.overview.additional,
      'There is some additional info provided here: “Owner wants scenes labelled by time of day.”'
    );
    assert.equal(
      content.overview.commissioning,
      'The date of commissioning for this project is September 15, 2026.'
    );

    assert.deepEqual(
      content.systems.sections.map((section) => section.title),
      ['Lighting/Shading', 'Audio/Video', 'Climate', 'Security', 'Pool/Pumps', 'Inputs/Outputs']
    );
    assert.deepEqual(content.systems.sections[0].lines, [
      '4 x Lighting Zones',
      '2 x Shading Zones'
    ]);
    assert.deepEqual(content.systems.sections[1].lines, [
      '1 x Sonos Port Streamer',
      '1 x Apple TV Media Player',
      '1 x Living Room TV'
    ]);
    assert.deepEqual(content.systems.sections[2].lines, ['None Included']);
    assert.deepEqual(content.systems.sections[3].lines, ['None Included']);
    assert.deepEqual(content.systems.sections[4].lines, ['None Included']);
    assert.deepEqual(content.systems.sections[5].lines, [
      '2 x Input Zones (Sense)',
      '1 x Output Zone (Relay)'
    ]);
    assert.equal(content.systems.intro, undefined);

    assert.deepEqual(content.controllers.lines, [
      '2 x iPhone Global Controller',
      '2 x Touchscreen Global Controller',
      '1 x ISR-4 Room Controller'
    ]);
    assert.equal(content.controllers.intro, undefined);

    assert.equal(content.totals.title, 'Project Time Budget');
    assert.equal(
      content.totals.hoursLine,
      `Total Programming Hours: ${Math.ceil(hoursData.totalProjectHours)}`
    );
    assert.equal(content.totals.acceptance, 'I accept this RTI programming budget.');
    assert.equal(JSON.stringify(content).includes('minutesPerUnit'), false);
  });

  it('uses the empty additional-info fallback and omits unused systems', () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      additionalInfo: ''
    });
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContentV2({ answers }, systemData, hoursData);
    assert.match(content.overview.roomsAndSystems, /This project has 1 room, currently labelled as Room 1\./);
    assert.equal(content.overview.roomsAndSystems.includes('lighting'), false);
    assert.equal(
      content.overview.additional,
      'No additional information was provided.'
    );
    assert.equal(
      content.overview.controllers,
      'For controllers, there is a handheld controller that controls a single room.'
    );
    assert.deepEqual(
      content.systems.sections.map((section) => section.lines),
      [
        ['None Included'],
        ['None Included'],
        ['None Included'],
        ['None Included'],
        ['None Included'],
        ['None Included']
      ]
    );
  });

  it('does not include v1 page titles', () => {
    const answers = highRdAnswers();
    const def = JSON.stringify(buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    ));
    assert.match(def, /Project Overview/);
    assert.match(def, /Controlled Systems Overview/);
    assert.match(def, /Controller Overview/);
    assert.match(def, /Project Time Budget/);
    assert.equal(def.includes('System Integration Scope'), false);
    assert.equal(def.includes('RTI Equipment Scope'), false);
    assert.equal(def.includes('Project Timeline'), false);
    assert.equal(def.includes('This is a breakdown'), false);
    assert.equal(def.includes('Project Total'), false);
    assert.match(def, /#fcb040/);
    assert.match(def, /#575759/);
    assert.match(def, /#39b54a/);
    assert.match(def, /#a7a9ac/);
    assert.equal(def.includes('#f1b353'), false);
    assert.equal(def.includes('absolutePosition'), true);
    assert.match(def, /"absolutePosition":\{"x":0,"y":/);
    assert.equal(def.includes('"h":280'), false);
    assert.match(def, /"fillColor":"#fcb040"/);
    assert.match(def, /currently labelled as Room 1[\s\S]{0,160}"alignment":"left"/);
    assert.match(def, /Project PO: HIGH RD[\s\S]{0,160}"alignment":"center"/);
    assert.match(def, /"text":"Lighting\/Shading"[^}]*"decoration":"underline"/);
    assert.match(def, /4 x Lighting Zones/);
    assert.match(def, /None Included/);
    assert.match(def, /"decoration":"underline"/);
  });

  it('sizes each band to its copy and keeps signatures out of the hours band', () => {
    const hours = layoutBand([{ text: 'Total Programming Hours: 12', margin: [0, 4, 0, 4] }]);
    const threeLines = layoutBand([
      { text: '1 x A', margin: [0, 6, 0, 6] },
      { text: '1 x B', margin: [0, 6, 0, 6] },
      { text: '1 x C', margin: [0, 6, 0, 6] }
    ]);
    assert.ok(hours.height < threeLines.height);
    assert.equal(hours.height, hours.contentHeight + hours.padY * 2);
    assert.equal(hours.y, (792 - hours.height) / 2);
    assert.equal(layoutBand([{ text: 'x' }]).y, (792 - layoutBand([{ text: 'x' }]).height) / 2);

    const answers = highRdAnswers();
    const doc = buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    );
    const def = JSON.stringify(doc.content);
    const hoursToAccept = def.slice(
      def.indexOf('Total Programming Hours'),
      def.indexOf('I accept this RTI programming budget.')
    );
    assert.match(def, /Project PO: HIGH RD/);
    assert.match(def, /Project Client Name: Private Client/);
    assert.match(def, /Project Location: Private Location/);
    assert.match(def, /Total Programming Hours/);
    assert.equal(hoursToAccept.includes('Client signature'), false);
    assert.match(def, /Client signature/);
    assert.equal(JSON.stringify(doc).includes('"background"'), false);

    const hoursBox = layoutBand([{
      text: `Total Programming Hours: ${Math.ceil(calculateHoursData(calculateSystemData(answers), rates).totalProjectHours)}`,
      margin: [0, 4, 0, 4]
    }]);
    const sigNode = doc.content.find((node) => (
      node.stack && JSON.stringify(node).includes('I accept this RTI programming budget.')
    ));
    const sigHeight = 18 + 4 + 3 * (14 + 16);
    const whiteTop = hoursBox.y + hoursBox.height;
    const leftover = 792 - 56 - whiteTop;
    assert.equal(sigNode.absolutePosition.y, whiteTop + (leftover - sigHeight) / 2);
    assert.ok(sigNode.absolutePosition.y > whiteTop);
    assert.ok(sigNode.absolutePosition.y + sigHeight < 792 - 56);
  });
});
