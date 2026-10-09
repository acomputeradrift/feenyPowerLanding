import { clientSummaryHours } from '../calc/hoursData.js';

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

function nameStem(name) {
  return name.replace(/\s+\d+$/, '').trim();
}

function collapsedDeviceLines(items, fallbackType, { groupByType = false } = {}) {
  const groups = [];
  const indexByKey = new Map();
  for (const item of namedItems(items)) {
    const name = trimmed(item?.name);
    const type = trimmed(item?.type) || fallbackType;
    if (!name && !type) continue;
    const stem = name ? nameStem(name) : '';
    const key = groupByType
      ? `type:${type.toLowerCase()}`
      : (stem ? `stem:${stem.toLowerCase()}` : `type:${type.toLowerCase()}`);
    let group = indexByKey.get(key);
    if (!group) {
      group = { type, stem: stem || type, names: [], unnamed: 0 };
      indexByKey.set(key, group);
      groups.push(group);
    }
    if (name) group.names.push(name);
    else group.unnamed += 1;
  }

  if (groupByType) {
    const rank = (type) => {
      const index = ['TV', 'Projector'].indexOf(type);
      return index === -1 ? 2 : index;
    };
    groups.sort((a, b) => rank(a.type) - rank(b.type));
  }

  const lines = [];
  for (const group of groups) {
    const count = group.names.length + group.unnamed;
    if (groupByType) {
      if (count > 1 && group.names.length > 0) {
        lines.push(qtyLine(count, `${group.type} (${group.names.join(', ')})`));
      } else {
        const line = qtyLine(count, `Display (${group.type})`);
        if (line) lines.push(line);
      }
      continue;
    }
    if (count > 1 && group.names.length > 0) {
      lines.push(qtyLine(count, `${group.stem} (${group.names.join(', ')})`));
    } else if (group.names.length === 1 && group.unnamed === 0) {
      const line = qtyLine(1, `${group.type} (${group.names[0]})`);
      if (line) lines.push(line);
    } else {
      const line = qtyLine(count, group.type);
      if (line) lines.push(line);
    }
  }
  return lines;
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
    + asCount(systemData.totalDisplayZones)
    + asCount(systemData.totalMotorizedLiftZones);
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

function namedList(items) {
  return namedItems(items)
    .map((item) => trimmed(item.name))
    .filter(Boolean);
}

function placePhrase(count, singular, plural, names) {
  const n = asCount(count);
  if (n <= 0) return '';
  const word = n === 1 ? singular : plural;
  const labelled = names.length > 0 ? ` (${commaList(names)})` : '';
  return `${n} ${word}${labelled}`;
}

function roomsAndSystemsSentence(answers, systemData) {
  const hasExterior = asCount(systemData.exteriorZones) > 0;
  const rooms = placePhrase(
    systemData.rooms,
    hasExterior ? 'interior space' : 'room',
    hasExterior ? 'interior spaces' : 'rooms',
    namedList(answers.roomDetails)
  );
  const exterior = placePhrase(
    systemData.exteriorZones,
    'exterior space',
    'exterior spaces',
    namedList(answers.exteriorZoneDetails)
  );
  const places = [rooms, exterior].filter(Boolean).join(' and ');
  const systems = includedSystems(systemData);
  if (systems.length === 0) return `Your project covers ${places}.`;
  const bridge = exterior ? ', and includes' : ' and includes';
  return `Your project covers ${places}${bridge} integration with ${joinList(systems)} systems.`;
}

const GLOBAL_TYPE_ORDER = [
  'Phone',
  'Tablet',
  'Large Touchscreen',
  'Small Touchscreen',
  'iPhone',
  'iPad',
  'Touchscreen'
];

function globalNoun(type, count) {
  const n = asCount(count);
  const nouns = {
    Phone: n === 1 ? 'phone' : 'phones',
    Tablet: n === 1 ? 'tablet' : 'tablets',
    'Large Touchscreen': n === 1 ? 'large touchscreen' : 'large touchscreens',
    'Small Touchscreen': n === 1 ? 'small touchscreen' : 'small touchscreens',
    iPhone: n === 1 ? 'iPhone' : 'iPhones',
    iPad: n === 1 ? 'iPad' : 'iPads',
    Touchscreen: n === 1 ? 'touchscreen' : 'touchscreens'
  };
  return nouns[type] || (n === 1 ? type : `${type}s`);
}

function globalTypePhrase(type, count) {
  const n = asCount(count);
  const verb = n === 1 ? 'controls' : 'control';
  return `${n} ${globalNoun(type, n)} that ${verb} every room / system`;
}

function handheldPhrase(count) {
  const n = asCount(count);
  if (n <= 0) return '';
  if (n === 1) return 'a handheld controller that controls a single room';
  return `${n} handheld controllers that each control a single room`;
}

function countGlobalTypes(details) {
  const counts = new Map();
  for (const item of namedItems(details)) {
    const type = trimmed(item.type);
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return counts;
}

function orderedGlobalTypes(counts) {
  const ordered = [];
  const seen = new Set();
  for (const type of GLOBAL_TYPE_ORDER) {
    if ((counts.get(type) || 0) > 0) {
      ordered.push(type);
      seen.add(type);
    }
  }
  for (const type of counts.keys()) {
    if (!seen.has(type)) ordered.push(type);
  }
  return ordered;
}

function controllersSentence(answers, systemData) {
  const typeCounts = countGlobalTypes(answers.globalControllerDetails);
  const phrases = [];
  let typed = 0;
  for (const type of orderedGlobalTypes(typeCounts)) {
    const count = typeCounts.get(type);
    typed += count;
    phrases.push(globalTypePhrase(type, count));
  }
  const untypedGlobals = asCount(systemData.globalControllerCount) - typed;
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

function commissioningSentence() {
  return 'The date of commissioning for this project is TBD.';
}

function collectLines(builders) {
  const lines = [];
  for (const builder of builders) {
    builder(lines);
  }
  return lines.length > 0 ? lines : ['None Included'];
}

function pushDeviceLines(lines, items, fallbackType, options) {
  lines.push(...collapsedDeviceLines(items, fallbackType, options));
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
        (lines) => pushCount(lines, systemData.audioZones, 'Distributed Audio Zone', 'Distributed Audio Zones'),
        (lines) => pushDeviceLines(lines, answers.audioSourceDetails, 'Audio Source'),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalAudioSourceZones,
            answers.audioSourceDetails,
            'Audio Source'
          );
          if (extra) lines.push(extra);
        },
        (lines) => pushCount(lines, systemData.videoZones, 'Distributed Video Zone', 'Distributed Video Zones'),
        (lines) => pushDeviceLines(lines, answers.videoSourceDetails, 'Video Source'),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalVideoSourceZones,
            answers.videoSourceDetails,
            'Video Source'
          );
          if (extra) lines.push(extra);
        },
        (lines) => pushCount(lines, systemData.totalAvReceiverZones, 'AV Receiver'),
        (lines) => pushDeviceLines(lines, answers.displayDetails, 'Display', { groupByType: true }),
        (lines) => {
          const extra = leftoverCountLine(
            systemData.totalDisplayZones,
            answers.displayDetails,
            'Display'
          );
          if (extra) lines.push(extra);
        },
        (lines) => pushCount(lines, systemData.totalMotorizedLiftZones, 'Motorized Lift or Mount', 'Motorized Lifts or Mounts')
      ])
    },
    {
      title: 'Climate',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.thermostatZones, 'Thermostat Zone'),
        (lines) => pushCount(lines, systemData.heaterZones, 'Heater Zone'),
        (lines) => pushCount(lines, systemData.fanZones, 'Fan Zone'),
        (lines) => {
          const timers = asCount(systemData.timerZones);
          if (timers === 1) lines.push('1 timer has been added');
          else if (timers > 1) lines.push(`${timers} timers have been added`);
        }
      ])
    },
    {
      title: 'Security',
      lines: collectLines([
        (lines) => pushCount(lines, systemData.alarmZones, 'Alarm Zone'),
        (lines) => pushCount(lines, systemData.accessZones, 'Access Zone'),
        (lines) => pushDeviceLines(lines, answers.cameraDetails, 'Camera'),
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
  let typed = 0;
  for (const type of orderedGlobalTypes(typeCounts)) {
    const count = typeCounts.get(type);
    typed += count;
    const line = qtyLine(count, `Global Controller (${type})`);
    if (line) lines.push(line);
  }
  const untypedLine = qtyLine(asCount(systemData.globalControllerCount) - typed, 'Global Controller');
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
  const summary = clientSummaryHours(hoursData.breakdownHours);

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
      commissioning: commissioningSentence()
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
      lines: Array.isArray(options.summaryLines) && options.summaryLines.length > 0
        ? options.summaryLines
        : [
          `System: ${summary.system}`,
          `Programming: ${summary.programming}`,
          `Graphics: ${summary.graphics}`,
          `Commissioning: ${summary.commissioning}`
        ],
      hoursLine: `Total Hours: ${summary.total}`,
      acceptance: 'I approve this budget and understand that work will commence when Feeny Power and Control Ltd has received a\u00A050% deposit.',
      signatureLabel: 'Client signature',
      printNameLabel: 'Print name',
      dateLabel: 'Date'
    }
  };
}
