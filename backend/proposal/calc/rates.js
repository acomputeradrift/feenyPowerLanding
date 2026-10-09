export const RATE_CARD_VERSION = '2026.3';

function line(progFirst, gfxFirst, progAdditional, gfxAdditional, progRoom, gfxRoom) {
  return { progFirst, gfxFirst, progAdditional, gfxAdditional, progRoom, gfxRoom };
}

// Minutes from docs/rti_proposal/09-effort-model.md. Do not change a number here
// without changing that document.
export const rates = {
  lighting: line(2.26, 1.80, 0.45, 1.62, 0.45, 3.6),
  shading: line(2.26, 1.80, 0.45, 1.62, 0.45, 3.6),
  keypad: line(5.43, 3.60, 1.09, 3.24, 1.09, 7.2),
  audioZone: line(20.9, 7.5, 4.17, 6.75, 4.17, 15.0),
  videoZone: line(17.4, 7.5, 3.48, 6.75, 3.48, 15.0),
  discreteDevice: line(17.4, 15.0, 3.48, 13.5, 3.48, 30.0),
  clonedDevice: line(8.7, 7.5, 1.74, 6.75, 1.74, 15.0),
  customDevice: line(26.1, 15.0, 5.22, 13.5, 5.22, 30.0),
  thermostat: line(9.04, 9.00, 1.81, 8.10, 1.81, 18.0),
  heater: line(1.36, 1.80, 0.27, 1.62, 0.27, 3.6),
  fan: line(1.36, 1.80, 0.27, 1.62, 0.27, 3.6),
  pump: line(1.36, 1.80, 0.27, 1.62, 0.27, 3.6),
  timer: line(3.62, 2.40, 0.72, 2.16, 0.72, 4.8),
  alarmZone: line(0.90, 1.20, 0.18, 1.08, 0, 0),
  alarmPanel: line(10.8, 9.0, 2.16, 8.1, 0, 0),
  access: line(5.85, 4.8, 1.17, 4.32, 1.17, 9.6),
  camera: line(7.7, 7.2, 1.5, 6.5, 0, 0),
  pool: line(13.5, 24.0, 2.7, 21.6, 2.7, 48.0),
  relay: line(0.90, 1.20, 0.18, 1.08, 0.18, 2.4),
  sense: line(0.90, 1.20, 0.18, 1.08, 0.18, 2.4),
  overhead: {
    fixedProg: 49,
    fixedGfx: 24,
    fixedGfxAdditional: 22,
    firstRoomProg: 30,
    firstRoomGfx: 30,
    firstRoomGfxAdditional: 27,
    additionalRoomProg: 15,
    additionalRoomGfx: 15,
    additionalRoomGfxAdditional: 13.5,
    roomControllerGfx: 36.8
  },
  floorplan: {
    zoneProg: 0.45,
    zoneGfx: 1.8,
    zoneProgAdditional: 0.09,
    zoneGfxAdditional: 1.62,
    roomProg: 9.0,
    roomGfx: 13.2,
    roomProgAdditional: 1.8,
    roomGfxAdditional: 11.9,
    artworkFirst: 120,
    artworkAdditional: 108
  }
};
