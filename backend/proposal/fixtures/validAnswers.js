import { steps } from '../shared/schema.js';
import { syncRepeatGroups } from '../shared/repeatGroups.js';

const COUNT_IDS = [
  'rooms', 'floors', 'exteriorZones', 'lightingZones', 'shadingZones', 'keypadZones',
  'audioZones', 'audioDiscreteSourceZones', 'audioClonedSourceZones', 'videoZones',
  'videoDiscreteSourceZones', 'videoClonedSourceZones', 'avReceiverDiscreteZones',
  'avReceiverClonedZones', 'displayDiscreteZones', 'displayClonedZones',
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
    projectClientName: 'Lake House'
  };
  for (const id of COUNT_IDS) answers[id] = 0;
  answers.floors = 1;
  answers.rooms = 1;
  answers.roomControllerCount = 1;
  return syncRepeatGroups(steps, { ...answers, ...overrides });
}
