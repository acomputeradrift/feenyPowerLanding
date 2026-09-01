function asCount(value) {
  return Number(value) || 0;
}

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
  const audioDiscreteSourceZones = audioSplit.discrete;
  const audioClonedSourceZones = audioSplit.cloned;
  const audioCustomSourceZones = audioSplit.custom;
  const videoZones = asCount(answers.videoZones);
  const videoSplit = resolveTypedPair(
    answers,
    'videoDiscreteSourceZones',
    'videoClonedSourceZones',
    'videoSourceDetails'
  );
  const videoDiscreteSourceZones = videoSplit.discrete;
  const videoClonedSourceZones = videoSplit.cloned;
  const videoCustomSourceZones = videoSplit.custom;
  const displaySplit = resolveTypedPair(
    answers,
    'displayDiscreteZones',
    'displayClonedZones',
    'displayDetails'
  );
  const displayDiscreteZones = displaySplit.discrete;
  const displayClonedZones = displaySplit.cloned;
  const avSplit = resolveUniformPair(
    answers,
    'avReceiverDiscreteZones',
    'avReceiverClonedZones'
  );
  const avReceiverDiscreteZones = avSplit.discrete;
  const avReceiverClonedZones = avSplit.cloned;
  const liftSplit = resolveUniformPair(
    answers,
    'motorizedLiftZones',
    'motorizedLiftClonedZones'
  );
  const motorizedLiftDiscreteZones = liftSplit.discrete;
  const motorizedLiftClonedZones = liftSplit.cloned;
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
  const globalTypeSplit = splitByType(answers.globalControllerDetails);
  const floorplanAddOnCount = asCount(answers.floorplanAddOnCount);
  const roomControllerCount = asCount(answers.roomControllerCount);

  const climateTimerZones = heaterZones + fanZones;
  const poolAndPumpsTimerZones = poolZones + pumpZones;
  const totalAudioSourceZones = audioDiscreteSourceZones + audioClonedSourceZones + audioCustomSourceZones;
  const totalVideoSourceZones = videoDiscreteSourceZones + videoClonedSourceZones + videoCustomSourceZones;
  const totalAvReceiverZones = avReceiverDiscreteZones + avReceiverClonedZones;
  const totalDisplayZones = displayDiscreteZones + displayClonedZones;
  const totalMotorizedLiftZones = motorizedLiftDiscreteZones + motorizedLiftClonedZones;

  const totalDiscreteDeviceZones = displayDiscreteZones
    + avReceiverDiscreteZones
    + audioDiscreteSourceZones
    + videoDiscreteSourceZones
    + motorizedLiftDiscreteZones;
  const totalClonedDeviceZones = displayClonedZones
    + avReceiverClonedZones
    + audioClonedSourceZones
    + videoClonedSourceZones
    + motorizedLiftClonedZones;
  const totalCustomDeviceZones = audioCustomSourceZones + videoCustomSourceZones;
  const totalDeviceZones = totalDiscreteDeviceZones + totalClonedDeviceZones + totalCustomDeviceZones;

  // Timer rollups and AV device counts are included alongside their rollups
  // (legacy double count). Devices are billed once on the AV line; the extra
  // copy in totalProjectZones only inflates controller hours so source-heavy
  // one-room theaters still price correctly.
  const totalProjectZones = [
    lightingZones,
    shadingZones,
    keypadZones,
    audioZones,
    audioDiscreteSourceZones,
    audioClonedSourceZones,
    audioCustomSourceZones,
    videoZones,
    videoDiscreteSourceZones,
    videoClonedSourceZones,
    videoCustomSourceZones,
    avReceiverDiscreteZones,
    avReceiverClonedZones,
    displayDiscreteZones,
    displayClonedZones,
    motorizedLiftDiscreteZones,
    motorizedLiftClonedZones,
    totalDeviceZones,
    thermostatZones,
    heaterZones,
    fanZones,
    climateTimerZones,
    alarmZones,
    accessZones,
    cameraZones,
    poolZones,
    pumpZones,
    poolAndPumpsTimerZones,
    outputRelayZones,
    inputSenseZones
  ]
    .filter((n) => n > 0)
    .reduce((sum, n) => sum + n, 0);

  const totalProjectRooms = rooms + exteriorZones;

  const rawProcessorCount = (totalProjectZones + totalProjectRooms) / 100;
  const mainProcessorCount = (totalProjectZones + totalProjectRooms) > 350 ? 2 : 1;
  const auxProcessorCount = Math.max(Math.ceil(rawProcessorCount) - 1, 0);
  const expansionModuleCount = Math.ceil(rawProcessorCount);

  const systemData = {
    rooms,
    floors,
    exteriorZones,
    lightingZones,
    shadingZones,
    keypadZones,
    audioZones,
    audioDiscreteSourceZones,
    audioClonedSourceZones,
    audioCustomSourceZones,
    totalAudioSourceZones,
    videoZones,
    videoDiscreteSourceZones,
    videoClonedSourceZones,
    videoCustomSourceZones,
    totalVideoSourceZones,
    displayDiscreteZones,
    displayClonedZones,
    totalDisplayZones,
    avReceiverDiscreteZones,
    avReceiverClonedZones,
    totalAvReceiverZones,
    motorizedLiftDiscreteZones,
    motorizedLiftClonedZones,
    totalMotorizedLiftZones,
    totalDiscreteDeviceZones,
    totalClonedDeviceZones,
    totalCustomDeviceZones,
    totalDeviceZones,
    thermostatZones,
    heaterZones,
    fanZones,
    climateTimerZones,
    alarmZones,
    accessZones,
    cameraZones,
    poolZones,
    pumpZones,
    poolAndPumpsTimerZones,
    outputRelayZones,
    inputSenseZones,
    globalControllerCount,
    floorplanAddOnCount,
    roomControllerCount,
    totalProjectZones,
    totalProjectRooms,
    mainProcessorCount,
    auxProcessorCount,
    expansionModuleCount
  };

  if (globalTypeSplit.discrete + globalTypeSplit.cloned > 0) {
    systemData.globalControllerDiscreteCount = globalTypeSplit.discrete;
    systemData.globalControllerClonedCount = globalTypeSplit.cloned;
  }

  return systemData;
}
