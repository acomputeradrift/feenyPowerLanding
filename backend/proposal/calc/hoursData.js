const SIMPLE_LINES = [
  { section: 'lightingShading', id: 'lightingZones', label: 'Lighting Zones', rateKey: 'lightingZone' },
  { section: 'lightingShading', id: 'shadingZones', label: 'Shading Zones', rateKey: 'shadingZone' },
  { section: 'lightingShading', id: 'keypadZones', label: 'Keypad Zones', rateKey: 'keypadZone' },
  { section: 'audioVideo', id: 'audioZones', label: 'Distributed Audio Zones', rateKey: 'audioZone' },
  { section: 'audioVideo', id: 'videoZones', label: 'Distributed Video Zones', rateKey: 'videoZone' },
  { section: 'audioVideo', id: 'totalDiscreteDeviceZones', label: 'Discrete Device Zones', rateKey: 'deviceDiscreteZone' },
  { section: 'audioVideo', id: 'totalClonedDeviceZones', label: 'Cloned Device Zones', rateKey: 'deviceClonedZone' },
  { section: 'climate', id: 'thermostatZones', label: 'Thermostat Zones', rateKey: 'thermostatZone' },
  { section: 'climate', id: 'heaterZones', label: 'Heater Zones', rateKey: 'heaterZone' },
  { section: 'climate', id: 'fanZones', label: 'Fan Zones', rateKey: 'fanZone' },
  { section: 'climate', id: 'climateTimerZones', label: 'Climate Timer Zones', rateKey: 'timerZone' },
  { section: 'security', id: 'alarmZones', label: 'Alarm Zones', rateKey: 'alarmZone' },
  { section: 'security', id: 'accessZones', label: 'Access Zones', rateKey: 'accessZone' },
  { section: 'security', id: 'cameraZones', label: 'Camera Zones', rateKey: 'cameraZone' },
  { section: 'poolAndPumps', id: 'poolZones', label: 'Pool Zones', rateKey: 'poolZone' },
  { section: 'poolAndPumps', id: 'pumpZones', label: 'Pump Zones', rateKey: 'pumpZone' },
  { section: 'poolAndPumps', id: 'poolAndPumpsTimerZones', label: 'Pool and Pump Timer Zones', rateKey: 'timerZone' },
  { section: 'inputOutput', id: 'outputRelayZones', label: 'Output Zones (Relays)', rateKey: 'outputRelayZone' },
  { section: 'inputOutput', id: 'inputSenseZones', label: 'Input Zones (Sense)', rateKey: 'inputSenseZone' }
];

const SECTION_ORDER = [
  'lightingShading',
  'audioVideo',
  'climate',
  'security',
  'poolAndPumps',
  'inputOutput',
  'controllers'
];

function guardedCount(value) {
  return Number(value) || 0;
}

function simpleLine(systemData, rates, spec) {
  const count = guardedCount(systemData[spec.id]);
  const minutesPerUnit = rates[spec.rateKey];
  const rawHours = (count * minutesPerUnit) / 60;
  const hours = Math.ceil((count * minutesPerUnit) / 60 * 10) / 10;
  return {
    section: spec.section,
    id: spec.id,
    label: spec.label,
    count,
    minutesPerUnit,
    rawHours,
    hours
  };
}

function controllerLines(systemData, rates) {
  const safeTotalProjectZones = Number(systemData.totalProjectZones) || 0;
  const safeRooms = Number(systemData.rooms) > 0 ? Number(systemData.rooms) : 1;
  const totalProjectRooms = Number(systemData.totalProjectRooms) || 0;
  const floors = Number(systemData.floors) || 0;
  const globalControllerCount = Object.hasOwn(systemData, 'globalControllerDiscreteCount')
    ? Number(systemData.globalControllerDiscreteCount) || 0
    : Number(systemData.globalControllerCount) || 0;
  const floorplanAddOnCount = systemData.floorplanAddOnCount;
  const roomControllerCount = systemData.roomControllerCount;

  const globalProduct = safeTotalProjectZones * rates.globalController * globalControllerCount;
  const floorplanCount = safeTotalProjectZones + totalProjectRooms + floors;
  const floorplanProduct = floorplanCount * rates.floorplanAddOn * floorplanAddOnCount;
  const roomProduct = (safeTotalProjectZones / safeRooms) * rates.roomController * roomControllerCount;

  return [
    {
      section: 'controllers',
      id: 'globalController',
      label: `Global Controllers (${safeTotalProjectZones} zones × ${globalControllerCount} controllers)`,
      count: safeTotalProjectZones,
      minutesPerUnit: rates.globalController,
      rawHours: globalProduct / 60,
      hours: Math.ceil(globalProduct / 60 * 10) / 10
    },
    {
      section: 'controllers',
      id: 'floorplanAddOn',
      label: `Floorplan Add-On ((zones + rooms + floors) × ${floorplanAddOnCount} add-ons)`,
      count: floorplanCount,
      minutesPerUnit: rates.floorplanAddOn,
      rawHours: floorplanProduct / 60,
      hours: Math.ceil(floorplanProduct / 60 * 10) / 10
    },
    {
      section: 'controllers',
      id: 'roomController',
      label: `Room Controllers ((zones / rooms) × ${roomControllerCount} controllers)`,
      count: safeTotalProjectZones,
      minutesPerUnit: rates.roomController,
      rawHours: roomProduct / 60,
      hours: Math.ceil(roomProduct / 60 * 10) / 10
    }
  ];
}

function sumHours(lines) {
  return lines.reduce((total, line) => total + line.hours, 0);
}

export function calculateHoursData(systemData, rates) {
  const lineItems = [
    ...SIMPLE_LINES.map((spec) => simpleLine(systemData, rates, spec)),
    ...controllerLines(systemData, rates)
  ];

  const sectionHours = {};
  for (const section of SECTION_ORDER) {
    sectionHours[section] = sumHours(lineItems.filter((line) => line.section === section));
  }

  const totalProjectHours = SECTION_ORDER.reduce(
    (total, section) => total + sectionHours[section],
    0
  );

  return { lineItems, sectionHours, totalProjectHours };
}
