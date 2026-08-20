function asCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function joinList(items) {
  const parts = (items || []).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function qtyLine(count, label) {
  const n = asCount(count);
  if (n <= 0 || !label) return null;
  return `${n} x ${label}`;
}

export function formatCommissioningDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'not provided';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const month = months[Number(match[2]) - 1];
  if (!month) return raw;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

function trimmed(value) {
  return value == null ? '' : String(value).trim();
}

function namedItems(items) {
  return Array.isArray(items) ? items : [];
}

function deviceLine(item, fallbackType) {
  const name = trimmed(item?.name);
  const type = trimmed(item?.type) || fallbackType;
  if (type && name) return qtyLine(1, `${type} (${name})`);
  if (type) return qtyLine(1, type);
  if (name) return qtyLine(1, name);
  return null;
}

function leftoverCountLine(count, items, singular, plural) {
  const named = namedItems(items).filter((item) => trimmed(item?.name) || trimmed(item?.type)).length;
  const leftover = asCount(count) - named;
  if (leftover <= 0) return null;
  const label = leftover === 1 ? singular : (plural || `${singular}s`);
  return qtyLine(leftover, label);
}

function pushCount(lines, count, singular, plural) {
  const n = asCount(count);
  if (n <= 0) return;
  lines.push(qtyLine(n, n === 1 ? singular : (plural || `${singular}s`)));
}

function includedSystems(systemData) {
  const systems = [];
  if (asCount(systemData.lightingZones) > 0 || asCount(systemData.keypadZones) > 0) {
    systems.push('lighting');
  }
  if (asCount(systemData.shadingZones) > 0) systems.push('shading');
  const hasAv = asCount(systemData.audioZones)
    + asCount(systemData.totalAudioSourceZones)
    + asCount(systemData.videoZones)
    + asCount(systemData.totalVideoSourceZones)
    + asCount(systemData.totalAvReceiverZones)
    + asCount(systemData.totalDisplayZones);
  if (hasAv > 0) systems.push('audio/video');
  if (
    asCount(systemData.thermostatZones)
    + asCount(systemData.heaterZones)
    + asCount(systemData.fanZones) > 0
  ) {
    systems.push('climate');
  }
  if (
    asCount(systemData.alarmZones)
    + asCount(systemData.accessZones)
    + asCount(systemData.cameraZones) > 0
  ) {
    systems.push('security');
  }
  if (asCount(systemData.poolZones) + asCount(systemData.pumpZones) > 0) {
    systems.push('pool/pumps');
  }
  return systems;
}

function commaList(items) {
  return (items || []).filter(Boolean).join(', ');
}

function roomsAndSystemsSentence(answers, systemData) {
  const rooms = asCount(systemData.rooms);
  const roomWord = rooms === 1 ? 'room' : 'rooms';
  const names = namedItems(answers.roomDetails)
    .map((item) => trimmed(item.name))
    .filter(Boolean);
  const labelled = names.length > 0 ? ` (${commaList(names)})` : '';
  const systems = includedSystems(systemData);
  const integration = systems.length > 0
    ? ` and includes integration with ${joinList(systems)} systems`
    : '';
  return `Your project covers ${rooms} ${roomWord}${labelled}${integration}.`;
}

function globalTypePhrase(type, count) {
  const n = asCount(count);
  const nouns = {
    iPhone: n === 1 ? 'iPhone' : 'iPhones',
    iPad: n === 1 ? 'iPad' : 'iPads',
    Touchscreen: n === 1 ? 'touchscreen' : 'touchscreens'
  };
  const noun = nouns[type] || (n === 1 ? type : `${type}s`);
  const verb = n === 1 ? 'controls' : 'control';
  return `${n} ${noun} that ${verb} every room / system`;
}

function handheldPhrase(count) {
  const n = asCount(count);
  if (n <= 0) return '';
  if (n === 1) return 'a handheld controller that controls a single room';
  return `${n} handheld controllers that each control a single room`;
}

function countGlobalTypes(details) {
  const counts = { iPhone: 0, iPad: 0, Touchscreen: 0 };
  for (const item of namedItems(details)) {
    const type = trimmed(item.type);
    if (Object.hasOwn(counts, type)) counts[type] += 1;
  }
  return counts;
}

function controllersSentence(answers, systemData) {
  const typeCounts = countGlobalTypes(answers.globalControllerDetails);
  const phrases = [];
  for (const type of ['iPhone', 'iPad', 'Touchscreen']) {
    if (typeCounts[type] > 0) phrases.push(globalTypePhrase(type, typeCounts[type]));
  }
  const untypedGlobals = asCount(systemData.globalControllerCount)
    - typeCounts.iPhone - typeCounts.iPad - typeCounts.Touchscreen;
  if (untypedGlobals > 0) {
    phrases.push(globalTypePhrase('global controller', untypedGlobals));
  }
  const handheld = handheldPhrase(systemData.roomControllerCount);
  if (handheld) phrases.push(handheld);
  if (phrases.length === 0) return '';
  const joined = joinList(phrases);
  const firstIsA = phrases[0].startsWith('a ');
  const opener = firstIsA || phrases[0].startsWith('1 ') ? 'there is' : 'there are';
  return `For controllers, ${opener} ${joined}.`;
}

function additionalInfo(answers) {
  const value = trimmed(answers?.additionalInfo);
  return value || undefined;
}

function commissioningSentence(answers) {
  return `The date of commissioning for this project is ${formatCommissioningDate(answers?.projectTimeline)}.`;
}

function collectLines(builders) {
  const lines = [];
  for (const builder of builders) {
    builder(lines);
  }
  return lines.length > 0 ? lines : ['None Included'];
}

function namedDeviceLines(lines, items, fallbackType) {
  for (const item of namedItems(items)) {
    const line = deviceLine(item, fallbackType);
    if (line) lines.push(line);
  }
}

function categoryByTypeLines(lines, items, category, typeOrder = []) {
  const counts = new Map();
  for (const item of namedItems(items)) {
    const type = trimmed(item.type);
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const seen = new Set();
  for (const type of typeOrder) {
    if (!counts.has(type)) continue;
    const line = qtyLine(counts.get(type), `${category} (${type})`);
    if (line) lines.push(line);
    seen.add(type);
  }
  for (const [type, n] of counts) {
    if (seen.has(type)) continue;
    const line = qtyLine(n, `${category} (${type})`);
    if (line) lines.push(line);
  }
}

function systemSections(answers, systemData) {
  return [
    {
      title: 'Lighting/Shading',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.lightingZones, 'Lighting Zone'),
        (lines) => pushCount(lines, systemData.shadingZones, 'Shading Zone'),
        (lines) => pushCount(lines, systemData.keypadZones, 'Keypad Zone')
      ])
    },
    {
      title: 'Audio/Video',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.audioZones, 'Audio Zone'),
        (lines) => namedDeviceLines(lines, answers.audioSourceDetails, 'Audio Source'),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalAudioSourceZones,
            answers.audioSourceDetails,
            'Audio Source'
          );
          if (extra) lines.push(extra);
        },
        (lines) => pushCount(lines, systemData.videoZones, 'Video Zone'),
        (lines) => namedDeviceLines(lines, answers.videoSourceDetails, 'Video Source'),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalVideoSourceZones,
            answers.videoSourceDetails,
            'Video Source'
          );
          if (extra) lines.push(extra);
        },
        (lines) => pushCount(lines, systemData.totalAvReceiverZones, 'AV Receiver'),
        (lines) => categoryByTypeLines(lines, answers.displayDetails, 'Display', ['TV', 'Projector']),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalDisplayZones,
            answers.displayDetails,
            'Display'
          );
          if (extra) lines.push(extra);
        }
      ])
    },
    {
      title: 'Climate',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.thermostatZones, 'Thermostat Zone'),
        (lines) => pushCount(lines, systemData.heaterZones, 'Heater Zone'),
        (lines) => pushCount(lines, systemData.fanZones, 'Fan Zone')
      ])
    },
    {
      title: 'Security',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.alarmZones, 'Alarm Zone'),
        (lines) => pushCount(lines, systemData.accessZones, 'Access Zone'),
        (lines) => namedDeviceLines(lines, answers.cameraDetails, 'Camera'),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.cameraZones,
            answers.cameraDetails,
            'Camera Zone',
            'Camera Zones'
          );
          if (extra) lines.push(extra);
        }
      ])
    },
    {
      title: 'Pool/Pumps',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.poolZones, 'Pool Zone'),
        (lines) => pushCount(lines, systemData.pumpZones, 'Pump Zone')
      ])
    },
    {
      title: 'Inputs/Outputs',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.inputSenseZones, 'Input Zone (Sense)', 'Input Zones (Sense)'),
        (lines) => pushCount(lines, systemData.outputRelayZones, 'Output Zone (Relay)', 'Output Zones (Relay)')
      ])
    }
  ];
}

function controllerLines(answers, systemData) {
  const lines = [];
  const typeCounts = countGlobalTypes(answers.globalControllerDetails);
  for (const type of ['iPhone', 'iPad', 'Touchscreen']) {
    const line = qtyLine(typeCounts[type], `Global Controller (${type})`);
    if (line) lines.push(line);
  }
  const untyped = asCount(systemData.globalControllerCount)
    - typeCounts.iPhone - typeCounts.iPad - typeCounts.Touchscreen;
  const untypedLine = qtyLine(untyped, 'Global Controller');
  if (untypedLine) lines.push(untypedLine);
  const floorplan = qtyLine(systemData.floorplanAddOnCount, 'Floorplan Add-On');
  if (floorplan) lines.push(floorplan);
  const rooms = qtyLine(systemData.roomControllerCount, 'Room Controller');
  if (rooms) lines.push(rooms);
  return lines;
}

export function buildProposalContentV2(submission, systemData, hoursData, options = {}) {
  const answers = submission.answers || {};
  const year = options.year ?? new Date().getUTCFullYear();
  const billedHours = Math.ceil(Number(hoursData.totalProjectHours) || 0);

  return {
    copyright: `© ${year} Feeny Power and Control Ltd. All Rights Reserved.`,
    cover: {
      contractorName: submission.contractorName || answers.contractorName || 'Not Provided',
      contractorEmail: submission.contractorEmail || answers.contractorEmail || 'Not Provided',
      poLine: `Project PO: ${answers.projectPoName || submission.projectPoName || ''}`,
      clientLine: `Project Client Name: ${answers.projectClientName || submission.projectClientName || 'Private Client'}`,
      locationLine: `Project Location: ${answers.projectAddress || ''}`
    },
    overview: {
      title: 'Project Overview',
      roomsAndSystems: roomsAndSystemsSentence(answers, systemData),
      controllers: controllersSentence(answers, systemData),
      additional: additionalInfo(answers),
      commissioning: commissioningSentence(answers)
    },
    systems: {
      title: 'Controlled Systems Overview',
      sections: systemSections(answers, systemData)
    },
    controllers: {
      title: 'Controller Overview',
      lines: controllerLines(answers, systemData)
    },
    totals: {
      title: 'Project Summary',
      hoursLine: `Total Programming Hours: ${billedHours}`,
      acceptance: 'I approve this budget and understand that work will commence when Feeny Power and Control Ltd has received a\u00A050% deposit.',
      signatureLabel: 'Client signature',
      printNameLabel: 'Print name',
      dateLabel: 'Date'
    }
  };
}
