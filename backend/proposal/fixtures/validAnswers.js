import { steps } from '../shared/schema.js';
import { syncRepeatGroups } from '../shared/repeatGroups.js';

const COUNT_IDS = [
  'rooms', 'floors', 'exteriorZones', 'lightingZones', 'shadingZones', 'keypadZones',
  'audioZones', 'audioDiscreteSourceZones', 'videoZones',
  'videoDiscreteSourceZones', 'avReceiverDiscreteZones',
  'displayDiscreteZones',
  'thermostatZones', 'heaterZones', 'fanZones', 'alarmZones', 'accessZones',
  'cameraZones', 'poolZones', 'pumpZones', 'inputSenseZones', 'outputRelayZones',
  'globalControllerCount', 'roomControllerCount'
];

export function validAnswers(overrides = {}) {
  const answers = {
    contractorName: 'John Smith',
    contractorEmail: 'john@example.com',
    projectPoName: 'LAKE HOUSE',
    projectAddress: '123 Main St',
    projectClientName: 'Lake House',
    projectTimeline: '2026-08-18'
  };
  for (const id of COUNT_IDS) answers[id] = 0;
  answers.floors = 1;
  answers.rooms = 1;
  answers.roomControllerCount = 1;
  return syncRepeatGroups(steps, { ...answers, ...overrides });
}
