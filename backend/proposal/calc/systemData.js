function asCount(value) {
  return Number(value) || 0;
}

export function calculateSystemData(answers = {}) {
  const rooms = asCount(answers.rooms);
  const floors = asCount(answers.floors);
  const exteriorZones = asCount(answers.exteriorZones);
  const lightingZones = asCount(answers.lightingZones);
  const shadingZones = asCount(answers.shadingZones);
  const keypadZones = asCount(answers.keypadZones);
  const audioZones = asCount(answers.audioZones);
  const audioDiscreteSourceZones = asCount(answers.audioDiscreteSourceZones);
  const audioClonedSourceZones = asCount(answers.audioClonedSourceZones);
  const videoZones = asCount(answers.videoZones);
  const videoDiscreteSourceZones = asCount(answers.videoDiscreteSourceZones);
  const videoClonedSourceZones = asCount(answers.videoClonedSourceZones);
  const displayDiscreteZones = asCount(answers.displayDiscreteZones);
  const displayClonedZones = asCount(answers.displayClonedZones);
  const avReceiverDiscreteZones = asCount(answers.avReceiverDiscreteZones);
  const avReceiverClonedZones = asCount(answers.avReceiverClonedZones);
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
  const floorplanAddOnCount = asCount(answers.floorplanAddOnCount);
  const roomControllerCount = asCount(answers.roomControllerCount);

  const climateTimerZones = heaterZones + fanZones;
  const poolAndPumpsTimerZones = poolZones + pumpZones;
  const totalAudioSourceZones = audioDiscreteSourceZones + audioClonedSourceZones;
  const totalVideoSourceZones = videoDiscreteSourceZones + videoClonedSourceZones;
  const totalAvReceiverZones = avReceiverDiscreteZones + avReceiverClonedZones;
  const totalDisplayZones = displayDiscreteZones + displayClonedZones;

  const totalDiscreteDeviceZones = displayDiscreteZones
    + avReceiverDiscreteZones
    + audioDiscreteSourceZones
    + videoDiscreteSourceZones;
  const totalClonedDeviceZones = displayClonedZones
    + avReceiverClonedZones
    + audioClonedSourceZones
    + videoClonedSourceZones;
  const totalDeviceZones = totalDiscreteDeviceZones + totalClonedDeviceZones;

  // Timer rollups are included alongside the individual counts (legacy double count).
  // The > 0 filter is decorative: zeros do not change the sum.
  const totalProjectZones = [
    lightingZones,
    shadingZones,
    keypadZones,
    audioZones,
    videoZones,
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

  return {
    rooms,
    floors,
    exteriorZones,
    lightingZones,
    shadingZones,
    keypadZones,
    audioZones,
    audioDiscreteSourceZones,
    audioClonedSourceZones,
    totalAudioSourceZones,
    videoZones,
    videoDiscreteSourceZones,
    videoClonedSourceZones,
    totalVideoSourceZones,
    displayDiscreteZones,
    displayClonedZones,
    totalDisplayZones,
    avReceiverDiscreteZones,
    avReceiverClonedZones,
    totalAvReceiverZones,
    totalDiscreteDeviceZones,
    totalClonedDeviceZones,
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
}
