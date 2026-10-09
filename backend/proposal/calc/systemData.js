function asCount(value) {
  return Number(value) || 0;
}

const KNOWN_GLOBAL_TYPES = ['Phone', 'Tablet', 'Large Touchscreen', 'Small Touchscreen'];
const LEGACY_GLOBAL_TYPES = {
  iPhone: 'Phone',
  iPad: 'Tablet'
};

export function splitByType(items) {
  const seen = new Set();
  let discrete = 0;
  let cloned = 0;
  let custom = 0;
  if (!Array.isArray(items)) return { discrete, cloned, custom };
  for (const item of items) {
    const type = item && typeof item.type === 'string' ? item.type.trim() : '';
    if (!type) continue;
    if (type === 'Custom') {
      custom += 1;
      continue;
    }
    if (seen.has(type)) cloned += 1;
    else {
      seen.add(type);
      discrete += 1;
    }
  }
  return { discrete, cloned, custom };
}

export function splitUniformCount(total) {
  const n = asCount(total);
  if (n <= 0) return { discrete: 0, cloned: 0 };
  return { discrete: 1, cloned: n - 1 };
}

function resolveTypedPair(answers, countKey, clonedKey, detailsKey) {
  if (Object.hasOwn(answers, clonedKey)) {
    return {
      discrete: asCount(answers[countKey]),
      cloned: asCount(answers[clonedKey]),
      custom: 0
    };
  }
  const split = splitByType(answers[detailsKey]);
  if (split.discrete + split.cloned + split.custom > 0) return split;
  return { discrete: asCount(answers[countKey]), cloned: 0, custom: 0 };
}

function resolveUniformPair(answers, countKey, clonedKey) {
  if (Object.hasOwn(answers, clonedKey)) {
    return {
      discrete: asCount(answers[countKey]),
      cloned: asCount(answers[clonedKey])
    };
  }
  return splitUniformCount(answers[countKey]);
}

function resolveDisplays(answers) {
  const split = resolveTypedPair(
    answers,
    'displayDiscreteZones',
    'displayClonedZones',
    'displayDetails'
  );
  return {
    discrete: split.discrete + split.cloned + split.custom,
    cloned: 0
  };
}

function eachLegacyUnitIsDiscrete(type) {
  return type === '' || type === 'Touchscreen' || !KNOWN_GLOBAL_TYPES.includes(type);
}

export function classifyGlobalControllers(details, count) {
  const total = asCount(count);
  const items = Array.isArray(details) ? details.slice(0, total) : [];
  const types = items.map((item) => {
    const raw = item && typeof item.type === 'string' ? item.type.trim() : '';
    return LEGACY_GLOBAL_TYPES[raw] || raw;
  });
  const missing = total - types.length;
  for (let i = 0; i < missing; i += 1) types.push('');

  const seen = new Set();
  let firstDiscreteGlobal = 0;
  let additionalDiscreteGlobals = 0;
  let clonedGlobals = 0;

  for (const type of types) {
    if (eachLegacyUnitIsDiscrete(type)) {
      if (firstDiscreteGlobal === 0) firstDiscreteGlobal = 1;
      else additionalDiscreteGlobals += 1;
      continue;
    }
    if (seen.has(type)) {
      clonedGlobals += 1;
      continue;
    }
    seen.add(type);
    if (firstDiscreteGlobal === 0) firstDiscreteGlobal = 1;
    else additionalDiscreteGlobals += 1;
  }

  return { firstDiscreteGlobal, additionalDiscreteGlobals, clonedGlobals };
}

export function calculateSystemData(answers = {}) {
  const rooms = asCount(answers.rooms);
  const floors = asCount(answers.floors);
  const exteriorZones = asCount(answers.exteriorZones);
  const lightingZones = asCount(answers.lightingZones);
  const shadingZones = asCount(answers.shadingZones);
  const keypadZones = asCount(answers.keypadZones);
  const audioZones = asCount(answers.audioZones);
  const audioSplit = resolveTypedPair(
    answers,
    'audioDiscreteSourceZones',
    'audioClonedSourceZones',
    'audioSourceDetails'
  );
  const videoZones = asCount(answers.videoZones);
  const videoSplit = resolveTypedPair(
    answers,
    'videoDiscreteSourceZones',
    'videoClonedSourceZones',
    'videoSourceDetails'
  );
  const displaySplit = resolveDisplays(answers);
  const avSplit = resolveUniformPair(
    answers,
    'avReceiverDiscreteZones',
    'avReceiverClonedZones'
  );
  const liftSplit = resolveUniformPair(
    answers,
    'motorizedLiftZones',
    'motorizedLiftClonedZones'
  );
  const thermostatZones = asCount(answers.thermostatZones);
  const heaterZones = asCount(answers.heaterZones);
  const fanZones = asCount(answers.fanZones);
  const alarmZones = asCount(answers.alarmZones);
  const accessZones = asCount(answers.accessZones);
  const cameraZones = asCount(answers.cameraZones);
  const poolZones = asCount(answers.poolZones);
  const pumpZones = asCount(answers.pumpZones);
  const outputRelayZones = asCount(answers.outputRelayZones);
  const inputSenseZones = asCount(answers.inputSenseZones);
  const globalControllerCount = asCount(answers.globalControllerCount);
  const globals = classifyGlobalControllers(answers.globalControllerDetails, globalControllerCount);
  const floorplanAddOnCount = asCount(answers.floorplanAddOnCount);
  const roomControllerCount = asCount(answers.roomControllerCount);

  const timerZones = heaterZones + fanZones + pumpZones;
  const alarmPanel = alarmZones > 0 ? 1 : 0;
  const discreteGlobals = globals.firstDiscreteGlobal + globals.additionalDiscreteGlobals;
  const floorplanControllers = Math.min(floorplanAddOnCount, discreteGlobals);

  const totalAudioSourceZones = audioSplit.discrete + audioSplit.cloned + audioSplit.custom;
  const totalVideoSourceZones = videoSplit.discrete + videoSplit.cloned + videoSplit.custom;
  const totalAvReceiverZones = avSplit.discrete + avSplit.cloned;
  const totalDisplayZones = displaySplit.discrete;
  const totalMotorizedLiftZones = liftSplit.discrete + liftSplit.cloned;
  const totalDiscreteDeviceZones = displaySplit.discrete
    + avSplit.discrete
    + audioSplit.discrete
    + videoSplit.discrete
    + liftSplit.discrete;
  const totalClonedDeviceZones = avSplit.cloned
    + audioSplit.cloned
    + videoSplit.cloned
    + liftSplit.cloned;
  const totalCustomDeviceZones = audioSplit.custom + videoSplit.custom;

  const countedRooms = rooms + exteriorZones;
  const controlledSignal = [
    lightingZones, shadingZones, keypadZones, audioZones, videoZones,
    totalAudioSourceZones, totalVideoSourceZones, totalAvReceiverZones,
    totalDisplayZones, totalMotorizedLiftZones, thermostatZones, heaterZones,
    fanZones, alarmZones, accessZones, cameraZones, poolZones, pumpZones,
    outputRelayZones, inputSenseZones, globalControllerCount, roomControllerCount,
    floorplanAddOnCount
  ].reduce((sum, n) => sum + n, 0);
  const overheadRooms = countedRooms > 0 ? countedRooms : (controlledSignal > 0 ? 1 : 0);
  const roomControllerShare = overheadRooms > 0 ? roomControllerCount / overheadRooms : 0;
  const floorplanZonesShown = lightingZones + shadingZones + thermostatZones
    + heaterZones + fanZones + alarmZones + accessZones + poolZones + pumpZones;

  return {
    rooms,
    floors,
    exteriorZones,
    overheadRooms,
    lightingZones,
    shadingZones,
    keypadZones,
    audioZones,
    audioDiscreteSourceZones: audioSplit.discrete,
    audioClonedSourceZones: audioSplit.cloned,
    audioCustomSourceZones: audioSplit.custom,
    totalAudioSourceZones,
    videoZones,
    videoDiscreteSourceZones: videoSplit.discrete,
    videoClonedSourceZones: videoSplit.cloned,
    videoCustomSourceZones: videoSplit.custom,
    totalVideoSourceZones,
    displayDiscreteZones: displaySplit.discrete,
    displayClonedZones: 0,
    totalDisplayZones,
    avReceiverDiscreteZones: avSplit.discrete,
    avReceiverClonedZones: avSplit.cloned,
    totalAvReceiverZones,
    motorizedLiftDiscreteZones: liftSplit.discrete,
    motorizedLiftClonedZones: liftSplit.cloned,
    totalMotorizedLiftZones,
    totalDiscreteDeviceZones,
    totalClonedDeviceZones,
    totalCustomDeviceZones,
    totalDeviceZones: totalDiscreteDeviceZones + totalClonedDeviceZones + totalCustomDeviceZones,
    thermostatZones,
    heaterZones,
    fanZones,
    timerZones,
    alarmZones,
    alarmPanel,
    accessZones,
    cameraZones,
    poolZones,
    pumpZones,
    outputRelayZones,
    inputSenseZones,
    globalControllerCount,
    firstDiscreteGlobal: globals.firstDiscreteGlobal,
    additionalDiscreteGlobals: globals.additionalDiscreteGlobals,
    clonedGlobals: globals.clonedGlobals,
    floorplanAddOnCount,
    floorplanControllers,
    floorplanZonesShown,
    roomControllerCount,
    roomControllerShare
  };
}
