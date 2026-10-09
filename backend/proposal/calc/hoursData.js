const CATEGORY_LINES = [
  { section: 'lightingShading', id: 'lightingZones', label: 'Lighting Zones', countKey: 'lightingZones', rateKey: 'lighting' },
  { section: 'lightingShading', id: 'shadingZones', label: 'Shading Zones', countKey: 'shadingZones', rateKey: 'shading' },
  { section: 'keypads', id: 'keypadZones', label: 'Keypad Zones', countKey: 'keypadZones', rateKey: 'keypad' },
  { section: 'audioVideo', id: 'audioZones', label: 'Distributed Audio Zones', countKey: 'audioZones', rateKey: 'audioZone' },
  { section: 'audioVideo', id: 'videoZones', label: 'Distributed Video Zones', countKey: 'videoZones', rateKey: 'videoZone' },
  { section: 'audioVideo', id: 'totalDiscreteDeviceZones', label: 'Discrete Device Zones', countKey: 'totalDiscreteDeviceZones', rateKey: 'discreteDevice' },
  { section: 'audioVideo', id: 'totalClonedDeviceZones', label: 'Cloned Device Zones', countKey: 'totalClonedDeviceZones', rateKey: 'clonedDevice' },
  { section: 'audioVideo', id: 'totalCustomDeviceZones', label: 'Custom Device Zones', countKey: 'totalCustomDeviceZones', rateKey: 'customDevice' },
  { section: 'climate', id: 'thermostatZones', label: 'Thermostat Zones', countKey: 'thermostatZones', rateKey: 'thermostat' },
  { section: 'climate', id: 'heaterZones', label: 'Heater Zones', countKey: 'heaterZones', rateKey: 'heater' },
  { section: 'climate', id: 'fanZones', label: 'Fan Zones', countKey: 'fanZones', rateKey: 'fan' },
  { section: 'climate', id: 'timerZones', label: 'Timers', countKey: 'timerZones', rateKey: 'timer' },
  { section: 'security', id: 'alarmZones', label: 'Alarm Zones', countKey: 'alarmZones', rateKey: 'alarmZone' },
  { section: 'security', id: 'alarmPanel', label: 'Alarm Panel', countKey: 'alarmPanel', rateKey: 'alarmPanel' },
  { section: 'security', id: 'accessZones', label: 'Access Zones', countKey: 'accessZones', rateKey: 'access' },
  { section: 'security', id: 'cameraZones', label: 'Camera Zones', countKey: 'cameraZones', rateKey: 'camera' },
  { section: 'poolAndPumps', id: 'poolZones', label: 'Pool Zones', countKey: 'poolZones', rateKey: 'pool' },
  { section: 'poolAndPumps', id: 'pumpZones', label: 'Pump Zones', countKey: 'pumpZones', rateKey: 'pump' },
  { section: 'inputOutput', id: 'outputRelayZones', label: 'Output Zones (Relays)', countKey: 'outputRelayZones', rateKey: 'relay' },
  { section: 'inputOutput', id: 'inputSenseZones', label: 'Input Zones (Sense)', countKey: 'inputSenseZones', rateKey: 'sense' }
];

const SECTION_ORDER = [
  'overhead',
  'lightingShading',
  'keypads',
  'audioVideo',
  'climate',
  'security',
  'poolAndPumps',
  'inputOutput',
  'floorplan'
];

function pricingContext(systemData) {
  const roomControllers = Number(systemData.roomControllerCount) || 0;
  const first = Number(systemData.firstDiscreteGlobal) || 0;
  const additional = Number(systemData.additionalDiscreteGlobals) || 0;
  const rooms = Number(systemData.overheadRooms) > 0 ? Number(systemData.overheadRooms) : 1;
  if (first === 0 && additional === 0 && roomControllers === 0) {
    return {
      progFirst: 0,
      gfxFirst: 0,
      additional: 0,
      progRoomShare: 0,
      gfxRoomShare: 0
    };
  }
  if (first === 0 && roomControllers > 0) {
    return {
      progFirst: 1,
      gfxFirst: 0,
      additional: 0,
      progRoomShare: (roomControllers - 1) / rooms,
      gfxRoomShare: roomControllers / rooms
    };
  }
  return {
    progFirst: first,
    gfxFirst: first,
    additional,
    progRoomShare: roomControllers / rooms,
    gfxRoomShare: roomControllers / rooms
  };
}

function applyLine(count, rate, ctx) {
  const n = Number(count) || 0;
  const programming = n * (
    rate.progFirst * ctx.progFirst
    + rate.progAdditional * ctx.additional
    + rate.progRoom * ctx.progRoomShare
  );
  const graphics = n * (
    rate.gfxFirst * ctx.gfxFirst
    + rate.gfxAdditional * ctx.additional
    + rate.gfxRoom * ctx.gfxRoomShare
  );
  return { programming, graphics, minutes: programming + graphics };
}

function overheadMinutes(systemData, rateCard, ctx) {
  const rooms = Number(systemData.overheadRooms) || 0;
  if (rooms <= 0 && ctx.progFirst === 0 && ctx.gfxFirst === 0) {
    return { programming: 0, graphics: 0, minutes: 0 };
  }
  const R = Math.max(rooms, 1);
  const A = ctx.additional;
  const C = Number(systemData.roomControllerCount) || 0;
  const overhead = rateCard.overhead;
  const programming = overhead.fixedProg
    + overhead.firstRoomProg
    + (R - 1) * overhead.additionalRoomProg;
  const graphics = overhead.fixedGfx
    + overhead.fixedGfxAdditional * A
    + overhead.firstRoomGfx
    + overhead.firstRoomGfxAdditional * A
    + (R - 1) * (overhead.additionalRoomGfx + overhead.additionalRoomGfxAdditional * A)
    + overhead.roomControllerGfx * C;
  return { programming, graphics, minutes: programming + graphics };
}

function floorplanPart(count, firstProg, firstGfx, addProg, addGfx, controllers) {
  const extra = Math.max(controllers - 1, 0);
  const programming = count * (firstProg + extra * addProg);
  const graphics = count * (firstGfx + extra * addGfx);
  return { programming, graphics, minutes: programming + graphics };
}

function artworkMinutes(count, rateCard, controllers) {
  const extra = Math.max(controllers - 1, 0);
  const graphics = count * (
    rateCard.floorplan.artworkFirst
    + extra * rateCard.floorplan.artworkAdditional
  );
  return { programming: 0, graphics, minutes: graphics };
}

function floorplanLines(systemData, rateCard) {
  const controllers = Number(systemData.floorplanControllers) || 0;
  const floorplan = rateCard.floorplan;
  const zones = floorplanPart(
    systemData.floorplanZonesShown,
    floorplan.zoneProg,
    floorplan.zoneGfx,
    floorplan.zoneProgAdditional,
    floorplan.zoneGfxAdditional,
    controllers
  );
  const rooms = floorplanPart(
    systemData.overheadRooms,
    floorplan.roomProg,
    floorplan.roomGfx,
    floorplan.roomProgAdditional,
    floorplan.roomGfxAdditional,
    controllers
  );
  const floors = artworkMinutes(systemData.floors, rateCard, controllers);
  const roomArt = artworkMinutes(systemData.overheadRooms, rateCard, controllers);
  if (controllers <= 0) {
    zones.programming = 0;
    zones.graphics = 0;
    zones.minutes = 0;
    rooms.programming = 0;
    rooms.graphics = 0;
    rooms.minutes = 0;
    floors.programming = 0;
    floors.graphics = 0;
    floors.minutes = 0;
    roomArt.programming = 0;
    roomArt.graphics = 0;
    roomArt.minutes = 0;
  }
  return [
    { section: 'floorplan', id: 'floorplanZones', label: 'Floorplan Zones', count: systemData.floorplanZonesShown, ...zones },
    { section: 'floorplan', id: 'floorplanRooms', label: 'Floorplan Rooms', count: systemData.overheadRooms, ...rooms },
    { section: 'floorplan', id: 'floorplanFloorArtwork', label: 'Floorplan Floor Artwork', count: systemData.floors, ...floors },
    { section: 'floorplan', id: 'floorplanRoomArtwork', label: 'Floorplan Room Artwork', count: systemData.overheadRooms, ...roomArt }
  ];
}

function toLineItem(spec) {
  const minutes = spec.minutes;
  return {
    section: spec.section,
    id: spec.id,
    label: spec.label,
    count: Number(spec.count) || 0,
    programmingMinutes: spec.programming,
    graphicsMinutes: spec.graphics,
    minutes,
    hours: minutes / 60
  };
}

export function summaryHoursFromBreakdown(breakdownHours) {
  const keys = ['overhead', 'programming', 'graphics'];
  const hours = keys.map((key) => {
    const raw = Number(breakdownHours?.[key]) || 0;
    return Math.round(raw * 1000) / 1000;
  });
  const totalHours = Math.round(hours.reduce((sum, value) => sum + value, 0) * 1000) / 1000;
  const billed = Math.ceil(totalHours - 1e-9);
  const floors = hours.map((value) => Math.floor(value + 1e-9));
  let extra = billed - floors.reduce((sum, value) => sum + value, 0);
  const order = hours
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  const whole = [...floors];
  let cursor = 0;
  while (extra > 0 && order.length > 0) {
    whole[order[cursor % order.length].index] += 1;
    extra -= 1;
    cursor += 1;
  }
  return {
    overhead: whole[0],
    programming: whole[1],
    graphics: whole[2],
    total: billed
  };
}

export function calculateHoursData(systemData, rateCard) {
  const ctx = pricingContext(systemData);
  const overhead = overheadMinutes(systemData, rateCard, ctx);
  const category = CATEGORY_LINES.map((spec) => {
    const priced = applyLine(systemData[spec.countKey], rateCard[spec.rateKey], ctx);
    return {
      section: spec.section,
      id: spec.id,
      label: spec.label,
      count: systemData[spec.countKey],
      ...priced
    };
  });
  const rawLines = [
    {
      section: 'overhead',
      id: 'overhead',
      label: 'Overhead',
      count: systemData.overheadRooms,
      ...overhead
    },
    ...category,
    ...floorplanLines(systemData, rateCard)
  ];
  const lineItems = rawLines.map(toLineItem);

  const sectionMinutes = {};
  for (const section of SECTION_ORDER) sectionMinutes[section] = 0;
  let programmingMinutes = 0;
  let graphicsMinutes = 0;
  for (const line of lineItems) {
    sectionMinutes[line.section] += line.minutes;
    if (line.section === 'overhead') continue;
    programmingMinutes += line.programmingMinutes;
    graphicsMinutes += line.graphicsMinutes;
  }

  const sectionHours = {};
  for (const section of SECTION_ORDER) {
    sectionHours[section] = sectionMinutes[section] / 60;
  }
  const overheadLine = lineItems.find((line) => line.id === 'overhead');
  const breakdownHours = {
    overhead: (overheadLine?.minutes || 0) / 60,
    programming: programmingMinutes / 60,
    graphics: graphicsMinutes / 60
  };
  const totalMinutes = lineItems.reduce((sum, line) => sum + line.minutes, 0);

  return {
    lineItems,
    sectionHours,
    breakdownHours,
    totalProjectHours: totalMinutes / 60,
    summaryHours: summaryHoursFromBreakdown(breakdownHours)
  };
}
