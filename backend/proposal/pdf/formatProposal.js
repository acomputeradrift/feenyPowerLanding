function asCount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatHoursSuffix(hours) {
  const n = Math.ceil(Number(hours) || 0);
  if (n === 0) return '';
  if (n === 1) return ' (1 hr)';
  return ` (${n} hrs)`;
}

export function formatCountLine(count, singular, plural) {
  const n = asCount(count);
  if (n === 0) return null;
  return `${n} ${n === 1 ? singular : plural}`;
}

function trimmedNames(items, field = 'name') {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (item && item[field] != null ? String(item[field]).trim() : ''))
    .filter(Boolean);
}

export function sectionLines(items) {
  const lines = [];
  for (const item of items) {
    if (!item) continue;
    if (item.sentence) {
      lines.push(item.sentence);
      continue;
    }
    const names = item.names || [];
    if (names.length > 0) {
      lines.push(...names);
      const remaining = asCount(item.count) - names.length;
      if (remaining > 0) {
        const extra = formatCountLine(remaining, item.singular, item.plural);
        if (extra) lines.push(extra);
      }
      continue;
    }
    const line = formatCountLine(item.count, item.singular, item.plural);
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : ['None Included.'];
}

export function projectSiteSummary(systemData) {
  const rooms = asCount(systemData.rooms);
  const floors = asCount(systemData.floors);
  const exterior = asCount(systemData.exteriorZones);
  const areaPhrase = rooms === 1 ? '1 integrated area' : `${rooms} integrated areas`;
  const floorPhrase = floors === 1 ? 'a single floor' : `${floors} floors`;
  let summary = `This project covers ${areaPhrase} across ${floorPhrase}.`;
  if (exterior === 0) {
    summary += ' No exterior areas are included.';
  } else if (exterior === 1) {
    summary += ' 1 exterior zone is included.';
  } else {
    summary += ` ${exterior} exterior zones are included.`;
  }
  return summary;
}

export function additionalInfoText(answers) {
  const value = answers?.additionalInfo;
  if (value == null || String(value).trim() === '') return 'No additional info.';
  return String(value).trim();
}

function timerSentence(count, singular, plural) {
  const n = asCount(count);
  if (n <= 0) return null;
  if (n === 1) return `${n} ${singular} has been added`;
  return `${n} ${plural} have been added`;
}

function heading(label, hours) {
  return `${label}${formatHoursSuffix(hours)}`;
}

export function buildProposalContent(submission, systemData, hoursData, options = {}) {
  const answers = submission.answers || {};
  const sectionHours = hoursData.sectionHours || {};
  const year = options.year ?? new Date().getUTCFullYear();

  return {
    copyright: `© ${year} Feeny Power and Control Ltd. All Rights Reserved.`,
    cover: {
      contractorName: submission.contractorName || answers.contractorName || 'Not Provided',
      contractorEmail: submission.contractorEmail || answers.contractorEmail || 'Not Provided',
      clientLine: `Project Client Name: ${answers.projectClientName || submission.projectClientName || 'Private'}`,
      poLine: `Project PO: ${answers.projectPoName || submission.projectPoName || ''}`,
      locationLine: `Project Location: ${answers.projectAddress || ''}`,
      timelineLine: `Project Timeline: ${answers.projectTimeline || 'Not Provided'}`,
      totalHoursLine: `Total Programming Hours: ${Math.ceil(Number(hoursData.totalProjectHours) || 0)}`
    },
    systems: {
      intro: 'The following is a summary of the electronic systems that will be controlled by RTI.',
      sections: [
        {
          title: heading('Lighting/Shading', sectionHours.lightingShading),
          lines: sectionLines([
            { count: systemData.lightingZones, singular: 'Lighting Zone', plural: 'Lighting Zones' },
            { count: systemData.shadingZones, singular: 'Shading Zone', plural: 'Shading Zones' },
            { count: systemData.keypadZones, singular: 'Keypad Zone', plural: 'Keypad Zones' }
          ])
        },
        {
          title: heading('Audio/Video', sectionHours.audioVideo),
          lines: sectionLines([
            { count: systemData.audioZones, singular: 'Audio Zone', plural: 'Audio Zones' },
            {
              count: systemData.totalAudioSourceZones,
              singular: 'Audio Source',
              plural: 'Audio Sources',
              names: trimmedNames(answers.audioSourceDetails)
            },
            {
              count: systemData.totalAvReceiverZones,
              singular: 'AV Receiver Zone',
              plural: 'AV Receiver Zones'
            },
            { count: systemData.videoZones, singular: 'Video Zone', plural: 'Video Zones' },
            {
              count: systemData.totalVideoSourceZones,
              singular: 'Video Source',
              plural: 'Video Sources',
              names: trimmedNames(answers.videoSourceDetails)
            },
            {
              count: systemData.totalDisplayZones,
              singular: 'Display Zone',
              plural: 'Display Zones',
              names: trimmedNames(answers.displayDetails)
            }
          ])
        },
        {
          title: heading('Climate', sectionHours.climate),
          lines: sectionLines([
            { count: systemData.thermostatZones, singular: 'Thermostat Zone', plural: 'Thermostat Zones' },
            { count: systemData.heaterZones, singular: 'Heater Zone', plural: 'Heater Zones' },
            { count: systemData.fanZones, singular: 'Fan Zone', plural: 'Fan Zones' },
            timerSentence(systemData.climateTimerZones, 'climate timer', 'climate timers')
              ? { sentence: timerSentence(systemData.climateTimerZones, 'climate timer', 'climate timers') }
              : null
          ])
        },
        {
          title: heading('Security', sectionHours.security),
          lines: sectionLines([
            { count: systemData.alarmZones, singular: 'Alarm Zone', plural: 'Alarm Zones' },
            { count: systemData.accessZones, singular: 'Access Zone', plural: 'Access Zones' },
            {
              count: systemData.cameraZones,
              singular: 'Camera Zone',
              plural: 'Camera Zones',
              names: trimmedNames(answers.cameraDetails)
            }
          ])
        },
        {
          title: heading('Pool/Pumps', sectionHours.poolAndPumps),
          lines: sectionLines([
            { count: systemData.poolZones, singular: 'Pool Zone', plural: 'Pool Zones' },
            { count: systemData.pumpZones, singular: 'Pump Zone', plural: 'Pump Zones' },
            timerSentence(systemData.poolAndPumpsTimerZones, 'pool and pump timer', 'pool and pump timers')
              ? { sentence: timerSentence(systemData.poolAndPumpsTimerZones, 'pool and pump timer', 'pool and pump timers') }
              : null
          ])
        }
      ]
    },
    equipment: {
      intro: 'The following is a summary of the RTI controllers that have been specified for the job, plus any inputs or outputs.',
      sections: [
        {
          title: heading('Controllers', sectionHours.controllers),
          lines: sectionLines([
            {
              count: systemData.globalControllerCount,
              singular: 'Global Controller',
              plural: 'Global Controllers',
              names: trimmedNames(answers.globalControllerDetails, 'type')
            },
            { count: systemData.floorplanAddOnCount, singular: 'Floorplan Add-On', plural: 'Floorplan Add-Ons' },
            { count: systemData.roomControllerCount, singular: 'Room Controller', plural: 'Room Controllers' }
          ])
        },
        {
          title: heading('Inputs/Outputs', sectionHours.inputOutput),
          lines: sectionLines([
            { count: systemData.inputSenseZones, singular: 'Input Zone (Sense)', plural: 'Input Zones (Sense)' },
            { count: systemData.outputRelayZones, singular: 'Output Zone (Relay)', plural: 'Output Zones (Relays)' }
          ])
        }
      ]
    },
    additional: {
      siteSummary: projectSiteSummary(systemData),
      roomNames: trimmedNames(answers.roomDetails),
      exteriorNames: trimmedNames(answers.exteriorZoneDetails),
      extra: additionalInfoText(answers)
    }
  };
}
