import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateHoursData, clientSummaryHours } from '../calc/hoursData.js';
import { rates } from '../calc/rates.js';
import { calculateSystemData } from '../calc/systemData.js';
import { validAnswers } from '../fixtures/validAnswers.js';
import pdfMake from 'pdfmake';

import {
  buildProposalContentV2,
  formatCommissioningDate,
  joinList,
  qtyLine
} from './formatProposalV2.js';
import { buildDocDefinitionV2, layoutBand, TITLED_BAND_MIN_Y, bandOriginY } from './proposalDocumentV2.js';

function fullBleedBands(pdfBuffer) {
  return [...pdfBuffer.toString('latin1').matchAll(/0(?:\.0+)? ([\d.]+) 612(?:\.0+)? ([\d.]+) re/g)]
    .map((match) => ({ y: Number(match[1]), height: Number(match[2]) }))
    .filter((band) => band.height > 20 && band.height < 780);
}

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
    { type: 'Phone', name: 'Global Controller 1' },
    { type: 'Phone', name: 'Global Controller 2' },
    { type: 'Large Touchscreen', name: 'Global Controller 3' },
    { type: 'Large Touchscreen', name: 'Global Controller 4' }
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

    assert.equal(
      content.overview.roomsAndSystems,
      'Your project covers 4 rooms (Room 1, Room 2, Room 3, Room 4) and includes integration with lighting, shading and audio/video systems.'
    );
    assert.equal(
      content.overview.controllers,
      'For controllers, there are 2 phones that control every room / system, 2 large touchscreens that control every room / system and a handheld controller that controls a single room.'
    );
    assert.equal(
      content.overview.additional,
      'Owner wants scenes labelled by time of day.'
    );
    assert.equal(
      content.overview.commissioning,
      'The date of commissioning for this project is TBD.'
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
      '1 x Streamer (Sonos Port)',
      '1 x Media Player (Apple TV)',
      '1 x Display (TV)'
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
      '2 x Global Controller (Phone)',
      '2 x Global Controller (Large Touchscreen)',
      '1 x Room Controller'
    ]);
    assert.equal(content.controllers.intro, undefined);

    const client = clientSummaryHours(hoursData.breakdownHours);
    assert.equal(content.totals.title, 'Project Summary');
    assert.deepEqual(content.totals.lines, [
      `System: ${client.system}`,
      `Programming: ${client.programming}`,
      `Graphics: ${client.graphics}`,
      `Commissioning: ${client.commissioning}`
    ]);
    assert.equal(content.totals.hoursLine, `Total Hours: ${client.total}`);
    assert.equal(
      client.system + client.programming + client.graphics + client.commissioning,
      client.total
    );
    assert.equal(
      content.totals.acceptance,
      'I approve this budget and understand that work will commence when Feeny Power and Control Ltd has received a\u00A050% deposit.'
    );
    assert.equal(JSON.stringify(content).includes('minutesPerUnit'), false);
  });

  it('labels audio and video zone counts as Distributed', () => {
    const answers = validAnswers({
      audioZones: 3,
      videoZones: 1,
      roomControllerCount: 1
    });
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContentV2({ answers }, systemData, hoursData);
    const av = content.systems.sections.find((section) => section.title === 'Audio/Video');
    assert.deepEqual(av.lines, [
      '3 x Distributed Audio Zones',
      '1 x Distributed Video Zone'
    ]);
    assert.equal(JSON.stringify(av.lines).includes('3 x Audio Zones'), false);
    assert.equal(JSON.stringify(av.lines).includes('1 x Video Zone'), false);
  });

  it('omits additional info when blank', async () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      additionalInfo: ''
    });
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContentV2({ answers }, systemData, hoursData);
    assert.match(content.overview.roomsAndSystems, /Your project covers 1 room \(Room 1\)\./);
    assert.equal(content.overview.roomsAndSystems.includes('lighting'), false);
    assert.equal(content.overview.additional, undefined);
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
    const def = JSON.stringify(await buildDocDefinitionV2(
      { answers },
      systemData,
      hoursData
    ));
    assert.equal(def.includes('Additional Info:'), false);
    assert.equal(def.includes('No additional information'), false);
  });

  it('lists repeated displays as N x type with each name', () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      displayDiscreteZones: 3
    });
    answers.displayDetails = [
      { type: 'TV', name: 'Living Room' },
      { type: 'TV', name: 'Bedroom' },
      { type: 'Projector', name: 'Theater' }
    ];
    const content = buildProposalContentV2(
      { answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates)
    );
    assert.deepEqual(content.systems.sections[1].lines, [
      '2 x TV (Living Room, Bedroom)',
      '1 x Display (Projector)'
    ]);
  });

  it('collapses repeated source names onto one counted line', () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      audioDiscreteSourceZones: 2,
      videoDiscreteSourceZones: 5
    });
    answers.audioSourceDetails = [
      { type: 'Streamer', name: 'Sonos' },
      { type: 'Streamer', name: 'Sonos 2' }
    ];
    answers.videoSourceDetails = [
      { type: 'Media Player', name: 'Roku' },
      { type: 'Media Player', name: 'Roku 2' },
      { type: 'Media Player', name: 'Apple TV' },
      { type: 'Media Player', name: 'Roku 3' },
      { type: 'Media Player', name: 'Roku 4' }
    ];
    const content = buildProposalContentV2(
      { answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates)
    );
    assert.deepEqual(content.systems.sections[1].lines, [
      '2 x Sonos (Sonos, Sonos 2)',
      '4 x Roku (Roku, Roku 2, Roku 3, Roku 4)',
      '1 x Media Player (Apple TV)'
    ]);
  });

  it('formats the Deer Park submission', () => {
    const answers = validAnswers({
      contractorName: 'Fernando Callender',
      contractorEmail: 'fcallender@havenandwire.com',
      projectClientName: 'Private Client',
      projectPoName: 'DEER PARK',
      projectAddress: 'California',
      projectTimeline: '2026-12-08',
      rooms: 19,
      floors: 2,
      exteriorZones: 4,
      lightingZones: 100,
      audioZones: 11,
      audioDiscreteSourceZones: 2,
      videoDiscreteSourceZones: 4,
      avReceiverDiscreteZones: 4,
      displayDiscreteZones: 5,
      globalControllerCount: 5,
      roomControllerCount: 4,
      additionalInfo: ''
    });
    answers.roomDetails = [
      'Main Entrance', 'Main Floor Hall', 'Main Floor Guest Bath', 'Office',
      'Dining Room', 'Kitchen', 'Family Room', 'Play Room', 'Guest Suite Hall',
      'Guest Suite', 'Upstairs Hall', 'Upstairs Primary Bedroom',
      'Upstairs Primary Bath', 'Upstairs Front Guest Bedroom',
      'Upstairs Back Guest Bedroom', 'Garage', 'Gym', 'Theater', 'Spa'
    ].map((name) => ({ name }));
    answers.exteriorZoneDetails = ['Front Patio', 'Back Patio', 'Exterior', 'Landscape']
      .map((name) => ({ name }));
    answers.audioSourceDetails = [
      { type: 'Streamer', name: 'Streamer 1' },
      { type: 'Streamer', name: 'Streamer 2' }
    ];
    answers.videoSourceDetails = [1, 2, 3, 4].map((n) => ({
      type: 'Media Player',
      name: `Roku ${n}`
    }));
    answers.displayDetails = Array.from({ length: 5 }, () => ({ type: 'TV', name: '' }));
    answers.globalControllerDetails = [
      { type: 'Phone' },
      { type: 'Large Touchscreen' },
      { type: 'Large Touchscreen' },
      { type: 'Large Touchscreen' },
      { type: 'Large Touchscreen' }
    ];
    const systemData = calculateSystemData(answers);
    const hoursData = calculateHoursData(systemData, rates);
    const content = buildProposalContentV2({ answers }, systemData, hoursData);
    assert.equal(content.cover.poLine, 'Project PO: DEER PARK');
    assert.equal(content.cover.clientLine, 'Project Client Name: Private Client');
    assert.equal(content.cover.locationLine, 'Project Location: California');
    assert.match(content.overview.roomsAndSystems, /19 interior spaces \(Main Entrance,.*Spa\)/);
    assert.match(content.overview.roomsAndSystems, /4 exterior spaces \(Front Patio, Back Patio, Exterior, Landscape\)/);
    assert.equal(content.overview.additional, undefined);
    assert.equal(content.overview.commissioning, 'The date of commissioning for this project is TBD.');
    assert.deepEqual(content.systems.sections[0].lines, ['100 x Lighting Zones']);
    assert.deepEqual(content.systems.sections[1].lines, [
      '11 x Distributed Audio Zones',
      '2 x Streamer (Streamer 1, Streamer 2)',
      '4 x Roku (Roku 1, Roku 2, Roku 3, Roku 4)',
      '4 x AV Receivers',
      '5 x Display (TV)'
    ]);
    assert.deepEqual(content.controllers.lines, [
      '1 x Global Controller (Phone)',
      '4 x Global Controller (Large Touchscreen)',
      '4 x Room Controller'
    ]);
    assert.deepEqual(content.totals.lines, [
      'System: 12',
      'Programming: 14',
      'Graphics: 16',
      'Commissioning: 10'
    ]);
    assert.equal(content.totals.hoursLine, 'Total Hours: 52');
  });

  it('lists motorized lifts as a count-only AV row', () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      displayDiscreteZones: 1,
      motorizedLiftZones: 2
    });
    answers.displayDetails = [{ type: 'TV', name: 'Living Room' }];
    const content = buildProposalContentV2(
      { answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates)
    );
    assert.deepEqual(content.systems.sections[1].lines, [
      '1 x Display (TV)',
      '2 x Motorized Lifts or Mounts'
    ]);
  });

  it('does not include v1 page titles', async () => {
    const answers = highRdAnswers();
    const def = JSON.stringify(await buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    ));
    assert.match(def, /Project Overview/);
    assert.match(def, /Controlled Systems Overview/);
    assert.match(def, /Controller Overview/);
    assert.match(def, /Project Summary/);
    assert.equal(def.includes('Project Time Budget'), false);
    assert.match(def, /"text":"Project Overview"[^}]*"fontSize":22/);
    assert.match(def, /"text":"Controlled Systems Overview"[^}]*"fontSize":22/);
    assert.match(def, /"text":"Controller Overview"[^}]*"fontSize":22/);
    assert.match(def, /"text":"Project Summary"[^}]*"fontSize":22/);
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
    assert.match(def, /Your project covers 4 rooms \(Room 1, Room 2, Room 3, Room 4\)[\s\S]{0,160}"alignment":"left"/);
    assert.match(def, /"text":"Additional Info:"/);
    assert.match(def, /Project PO: HIGH RD[\s\S]{0,160}"alignment":"center"/);
    assert.match(def, /"text":"Lighting\/Shading"[^}]*"decoration":"underline"/);
    assert.match(def, /4 x Lighting Zones/);
    assert.match(def, /1 x Streamer \(Sonos Port\)/);
    assert.match(def, /2 x Global Controller \(Phone\)/);
    assert.match(def, /1 x Room Controller/);
    assert.equal(def.includes('ISR-4'), false);
    assert.match(def, /None Included/);
    assert.match(def, /"decoration":"underline"/);
  });

  it('sizes each band to its copy and keeps signatures out of the hours band', async () => {
    const hours = layoutBand([{ text: 'Total Hours: 50', margin: [0, 4, 0, 4] }]);
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
    const doc = await buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    );
    const def = JSON.stringify(doc.content);
    const hoursToAccept = def.slice(
      def.indexOf('Total Hours'),
      def.indexOf('I approve this budget')
    );
    assert.match(def, /Project PO: HIGH RD/);
    assert.match(def, /Project Client Name: Private Client/);
    assert.match(def, /Project Location: Private Location/);
    assert.match(def, /Total Hours/);
    assert.equal(def.includes('Total Programming Hours'), false);
    assert.equal(hoursToAccept.includes('Client signature'), false);
    assert.match(def, /Client signature/);
    assert.equal(JSON.stringify(doc).includes('"background"'), false);

    const hoursNode = doc.content.find((node) => (
      node.table && JSON.stringify(node).includes('Total Hours')
    ));
    const sigNode = doc.content.find((node) => (
      node.absolutePosition && JSON.stringify(node).includes('I approve this budget')
    ));
    assert.ok(sigNode.absolutePosition.y > hoursNode.absolutePosition.y);
    assert.ok(sigNode.absolutePosition.y + 130 < 792 - 56);
    assert.equal(sigNode.columns[1].width, 516);
    const sigTable = sigNode.columns[1].stack.find((node) => node.table);
    assert.deepEqual(sigTable.table.widths, [130, 386]);
    assert.equal(sigTable.table.body.length, 3);
    for (const row of sigTable.table.body) {
      assert.equal(JSON.stringify(row[0]).includes('"alignment":"left"'), true);
      assert.equal(JSON.stringify(row[1]).includes('decoration'), false);
      assert.equal(JSON.stringify(row[1]).includes('"type":"line"'), true);
    }

    const coverBand = doc.content.find((node) => (
      node.table && JSON.stringify(node).includes('Project PO: HIGH RD')
    ));
    const rtiNode = doc.content.find((node) => (
      node.absolutePosition && JSON.stringify(node).includes('"fit":[480,76]')
    ));
    assert.equal(Boolean(rtiNode), true);
    assert.ok(rtiNode.absolutePosition.y > coverBand.absolutePosition.y);
    const rtiDef = JSON.stringify(rtiNode);
    assert.match(rtiDef, /"text":"An"/);
    assert.match(rtiDef, /"text":"Proposal"/);
    assert.equal(rtiDef.includes('Unlock Seamless'), false);
    assert.ok(rtiNode.absolutePosition.y + 140 < 792 - 56);
    const inFlowImages = doc.content.filter((node) => node.image && !node.absolutePosition);
    assert.equal(inFlowImages.length, 1);
    assert.deepEqual(inFlowImages[0].fit, [200, 150]);
  });

  it('cover drops the tagline and captions the RTI logo in light grey', async () => {
    const answers = highRdAnswers();
    const doc = await buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    );
    const def = JSON.stringify(doc);
    assert.equal(def.includes('Unlock Seamless'), false);
    assert.equal(def.includes('Remote System Programming'), false);
    assert.equal(def.includes('Smart Home Integration'), false);

    const feeny = doc.content.find((node) => node.image && !node.absolutePosition);
    assert.deepEqual(feeny.fit, [200, 150]);

    const rtiNode = doc.content.find((node) => (
      node.absolutePosition && JSON.stringify(node).includes('"fit":[480,76]')
    ));
    const nameNode = doc.content.find((node) => node.text === 'Jamie Feeny');
    assert.equal(nameNode.fontSize, 16);
    const preparedFor = doc.content.find((node) => node.text === 'Prepared for:');
    assert.equal(rtiNode.stack[0].text, 'An');
    assert.equal(rtiNode.stack[0].color, '#a7a9ac');
    assert.equal(rtiNode.stack[0].fontSize, preparedFor.fontSize);
    assert.equal(rtiNode.stack[2].text, 'Proposal');
    assert.equal(rtiNode.stack[2].color, '#a7a9ac');
    assert.equal(rtiNode.stack[2].fontSize, preparedFor.fontSize);
    assert.deepEqual(
      rtiNode.stack[1].columns[1].fit,
      [480, 76]
    );
  });

  it('centers every full-bleed band on the page', async () => {
    const answers = highRdAnswers();
    const doc = await buildDocDefinitionV2(
      { answers, ...answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates),
      { year: 2026 }
    );
    doc.compress = false;
    const pdf = await pdfMake.createPdf(doc).getBuffer();
    const bands = fullBleedBands(pdf);
    assert.equal(bands.length, 5);
    for (const band of bands) {
      assert.ok(
        Math.abs(band.y + band.height / 2 - 396) < 0.75,
        `band at y=${band.y} h=${band.height} center=${band.y + band.height / 2}`
      );
    }
  });

  it('names exterior zones in the project overview', () => {
    const answers = validAnswers({
      rooms: 2,
      exteriorZones: 2,
      roomControllerCount: 1,
      lightingZones: 1
    });
    answers.exteriorZoneDetails = [{ name: 'Front Patio' }, { name: 'Back Patio' }];
    const content = buildProposalContentV2(
      { answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates)
    );
    assert.equal(
      content.overview.roomsAndSystems,
      'Your project covers 2 interior spaces (Room 1, Room 2) and 2 exterior spaces (Front Patio, Back Patio), and includes integration with lighting systems.'
    );
  });

  it('puts heater, fan and pump timers under climate and leaves the pool without a timer line', () => {
    const answers = validAnswers({
      rooms: 1,
      roomControllerCount: 1,
      heaterZones: 1,
      fanZones: 1,
      pumpZones: 2,
      poolZones: 1
    });
    const content = buildProposalContentV2(
      { answers },
      calculateSystemData(answers),
      calculateHoursData(calculateSystemData(answers), rates)
    );
    const climate = content.systems.sections.find((section) => section.title === 'Climate');
    const pool = content.systems.sections.find((section) => section.title === 'Pool/Pumps');
    assert.equal(climate.lines.includes('4 timers have been added'), true);
    assert.equal(JSON.stringify(pool.lines).includes('timer'), false);
  });

  it('keeps a long controlled-systems band below the page title', () => {
    const tall = 700;
    const shifted = bandOriginY(tall, true);
    assert.ok(shifted >= TITLED_BAND_MIN_Y);
    assert.ok(shifted > (792 - tall) / 2);
    const short = bandOriginY(240, true);
    assert.equal(short, (792 - 240) / 2);
    assert.ok(short >= TITLED_BAND_MIN_Y);
  });
});
