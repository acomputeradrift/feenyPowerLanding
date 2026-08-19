import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { steps, isVisible, findQuestion } from './shared/schema.js';
import { validate } from './shared/validate.js';
import { syncRepeatGroups } from './shared/repeatGroups.js';
import {
  createFormController,
  parseCount,
  fieldDomId,
  errorDomId,
  helpDomId,
  ESTIMATE_DEBOUNCE_MS
} from '../../frontend/scripts/proposal/formController.js';

const repoRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

function controller(overrides = {}) {
  return createFormController({
    steps,
    validate,
    syncRepeatGroups,
    isVisible,
    debounceMs: 0,
    ...overrides
  });
}

function fillProjectDetails(form) {
  form.setAnswer('contractorName', 'John Smith');
  form.setAnswer('contractorEmail', 'john@example.com');
  form.setAnswer('projectPoName', 'LAKE HOUSE');
  form.setAnswer('projectAddress', '123 Main St');
  form.setAnswer('projectTimeline', '2026-08-18');
}

describe('FR-3 step navigation', () => {
  it('starts on step 1 of 10 and reports progress', () => {
    const form = controller();
    const state = form.getState();
    assert.equal(state.stepIndex, 0);
    assert.equal(state.stepNumber, 1);
    assert.equal(state.stepCount, 10);
    assert.equal(state.step.id, 'projectDetails');
    assert.equal(state.progressText, 'Step 1 of 10 — Project Details');
    assert.equal(state.progress[0].status, 'current');
    assert.equal(state.progress[1].status, 'upcoming');
    assert.equal(state.isFirst, true);
    assert.equal(state.isLast, false);
  });

  it('does not advance when the current step is invalid', () => {
    const form = controller();
    const result = form.next();
    assert.equal(result.ok, false);
    assert.equal(form.getState().stepIndex, 0);
    assert.equal(form.getState().fieldErrors.contractorName, 'Your Name is required');
    assert.equal(form.getState().fieldErrors.rooms, undefined);
  });

  it('advances after the current step is valid and never blocks Back', () => {
    const form = controller();
    fillProjectDetails(form);
    const advanced = form.next();
    assert.equal(advanced.ok, true);
    assert.equal(form.getState().stepIndex, 1);
    assert.equal(form.getState().step.id, 'siteDetails');
    assert.equal(form.getState().progress[0].status, 'complete');
    assert.equal(form.getState().progress[1].status, 'current');

    form.setAnswer('rooms', '');
    form.back();
    assert.equal(form.getState().stepIndex, 0);
    assert.equal(form.getState().fieldErrors.rooms, undefined);
  });

  it('does not skip forward to an unvalidated step', () => {
    const form = controller();
    form.goToStep(4);
    assert.equal(form.getState().stepIndex, 0);
  });
});

describe('FR-4 conditional visibility', () => {
  it('hides floorplan add-on until global controllers are greater than zero', () => {
    const question = findQuestion('floorplanAddOnCount');
    const form = controller();
    form.setAnswer('globalControllerCount', 0);
    assert.equal(isVisible(question, form.getState().answers), false);

    form.setAnswer('floorplanAddOnCount', 2);
    form.setAnswer('globalControllerCount', 0);
    assert.equal(form.getState().answers.floorplanAddOnCount, 2);
    assert.equal(Object.hasOwn(form.getSubmitPayload().answers, 'floorplanAddOnCount'), false);

    form.setAnswer('globalControllerCount', 3);
    assert.equal(form.getState().answers.floorplanAddOnCount, 2);
    assert.equal(form.getSubmitPayload().answers.floorplanAddOnCount, 2);
    assert.equal(isVisible(question, form.getState().answers), true);
  });
});

describe('default answers', () => {
  it('starts count fields at their minimum, with rooms at 1', () => {
    const form = controller();
    const { answers } = form.getState();
    assert.equal(answers.rooms, 1);
    assert.deepEqual(answers.roomDetails, [{ name: 'Room 1' }]);
    assert.equal(answers.floors, 1);
    assert.equal(answers.lightingZones, 0);
    assert.equal(answers.audioDiscreteSourceZones, 0);
    assert.equal(answers.cameraZones, 0);
    assert.equal(answers.globalControllerCount, 0);
    assert.equal(answers.roomControllerCount, 0);
    assert.equal(answers.projectClientName, 'Private Client');
    assert.equal(answers.projectAddress, 'Private Location');
  });
});

describe('FR-5 FR-6 count-driven repeats', () => {
  it('renders N instances for a count and none at zero', () => {
    const form = controller();
    form.setAnswer('audioDiscreteSourceZones', 2);
    assert.deepEqual(form.getState().answers.audioSourceDetails, [
      { name: 'Audio Source 1' },
      { name: 'Audio Source 2' }
    ]);
    form.setAnswer('audioDiscreteSourceZones', 0);
    assert.deepEqual(form.getState().answers.audioSourceDetails, []);
  });

  it('fills new room names immediately as Room 1, Room 2, Room 3', () => {
    const form = controller();
    form.setAnswer('rooms', 3);
    assert.deepEqual(form.getState().answers.roomDetails, [
      { name: 'Room 1' },
      { name: 'Room 2' },
      { name: 'Room 3' }
    ]);
  });

  it('fills exterior zone names immediately below the exterior count', () => {
    const form = controller();
    form.setAnswer('exteriorZones', 2);
    assert.deepEqual(form.getState().answers.exteriorZoneDetails, [
      { name: 'Exterior Zone 1' },
      { name: 'Exterior Zone 2' }
    ]);
  });

  it('truncates from the end and preserves surviving instances', () => {
    const form = controller();
    form.setAnswer('rooms', 5);
    form.setRepeatField('roomDetails', 0, 'name', 'Kitchen');
    form.setRepeatField('roomDetails', 1, 'name', 'Lounge');
    form.setRepeatField('roomDetails', 2, 'name', 'Office');
    form.setRepeatField('roomDetails', 3, 'name', 'Gym');
    form.setRepeatField('roomDetails', 4, 'name', 'Theatre');
    form.setAnswer('rooms', 3);
    assert.deepEqual(form.getState().answers.roomDetails, [
      { name: 'Kitchen' },
      { name: 'Lounge' },
      { name: 'Office' }
    ]);
  });

  it('caps instances at the schema max so a mistyped count cannot explode the page', () => {
    const form = controller();
    form.setAnswer('rooms', 9999);
    assert.equal(form.getState().answers.roomDetails.length, 40);
  });

  it('announces repeat changes and focuses the first new instance when growing', () => {
    const form = controller();
    form.setAnswer('rooms', 1);
    form.setAnswer('rooms', 2);
    const state = form.getState();
    assert.match(state.announcement, /2/);
    assert.equal(state.focusTarget, fieldDomId('roomDetails[1].name'));
  });
});

describe('FR-7 count parsing', () => {
  it('stores non-negative integers and leaves invalid input for validation', () => {
    assert.equal(parseCount(''), '');
    assert.equal(parseCount('12'), 12);
    assert.equal(parseCount(0), 0);
    assert.equal(parseCount('1.5'), '1.5');
    const form = controller();
    form.setAnswer('lightingZones', '8');
    assert.equal(form.getState().answers.lightingZones, 8);
  });
});

describe('FR-8 payload and honeypot', () => {
  it('keeps hidden values in answers but omits them from the submit payload', () => {
    const form = controller();
    fillProjectDetails(form);
    form.setAnswer('globalControllerCount', 1);
    form.setAnswer('floorplanAddOnCount', 1);
    form.setAnswer('globalControllerCount', 0);
    const payload = form.getSubmitPayload('http://spam.test');
    assert.equal(payload.honeypot, 'http://spam.test');
    assert.equal(payload.answers.floorplanAddOnCount, undefined);
    assert.equal(form.getState().answers.floorplanAddOnCount, 1);
    assert.equal(Object.hasOwn(payload.answers, 'honeypot'), false);
  });

  it('does not put unknown keys into answers or the payload', () => {
    const form = controller();
    form.setAnswer('contractorName', 'Jamie');
    const payload = form.getSubmitPayload('');
    assert.equal(payload.answers.contractorName, 'Jamie');
    assert.equal(payload.answers.notAField, undefined);
  });
});

describe('FR-9 live estimate', () => {
  it('debounces estimate requests and stores section totals only', async () => {
    const seen = [];
    const form = controller({
      debounceMs: 0,
      requestEstimate: async (answers) => {
        seen.push(answers);
        return {
          sectionHours: { lightingShading: 4.4, audioVideo: 0, climate: 0, security: 0, poolAndPumps: 0, inputOutput: 0, controllers: 0 },
          totalProjectHours: 4.4
        };
      }
    });
    form.setAnswer('lightingZones', 10);
    await form.flushEstimate();
    assert.equal(form.getState().estimate.totalProjectHours, 4.4);
    assert.equal(form.getState().estimate.sectionHours.lightingShading, 4.4);
    assert.equal(form.getState().estimate.lineItems, undefined);
    assert.equal(ESTIMATE_DEBOUNCE_MS, 400);
    assert.equal(seen.length > 0, true);
  });

  it('keeps the last known estimate when a request fails', async () => {
    let calls = 0;
    const form = controller({
      debounceMs: 0,
      requestEstimate: async () => {
        calls += 1;
        if (calls === 1) {
          return { sectionHours: { lightingShading: 4.4 }, totalProjectHours: 4.4 };
        }
        throw new Error('network');
      }
    });
    form.setAnswer('lightingZones', 10);
    await form.flushEstimate();
    form.setAnswer('lightingZones', 11);
    await form.flushEstimate();
    assert.equal(form.getState().estimate.totalProjectHours, 4.4);
    assert.equal(form.getState().estimateFailed, true);
  });

  it('ignores stale estimate responses', async () => {
    let resolveFirst;
    let calls = 0;
    const form = controller({
      debounceMs: 0,
      requestEstimate: () => {
        calls += 1;
        if (calls === 1) {
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return Promise.resolve({ sectionHours: {}, totalProjectHours: 2 });
      }
    });
    form.setAnswer('lightingZones', 1);
    const first = form.flushEstimate();
    form.setAnswer('lightingZones', 2);
    await form.flushEstimate();
    resolveFirst({ sectionHours: {}, totalProjectHours: 99 });
    await first;
    assert.equal(form.getState().estimate.totalProjectHours, 2);
  });
});

describe('submission client flow', () => {
  it('stays on the last step until submit, then records the server result', async () => {
    const form = controller({
      submitProposal: async (payload) => {
        assert.equal(payload.honeypot, '');
        assert.equal(payload.answers.contractorEmail, 'john@example.com');
        return { reference: 'RTI-20260817-K3M9QP', totalProjectHours: 0, emailedTo: 'john@example.com' };
      }
    });
    fillProjectDetails(form);
    form.setAnswer('roomControllerCount', 1);
    const zeroCounts = [
      'rooms', 'floors', 'exteriorZones', 'lightingZones', 'shadingZones', 'keypadZones',
      'audioZones', 'audioDiscreteSourceZones', 'videoZones',
      'videoDiscreteSourceZones', 'avReceiverDiscreteZones',
      'displayDiscreteZones',
      'thermostatZones', 'heaterZones', 'fanZones', 'alarmZones', 'accessZones',
      'cameraZones', 'poolZones', 'pumpZones', 'inputSenseZones', 'outputRelayZones',
      'globalControllerCount', 'roomControllerCount'
    ];
    for (let i = 0; i < 9; i += 1) {
      if (i >= 1) {
        for (const id of zeroCounts) {
          if (form.getState().answers[id] === undefined) form.setAnswer(id, 0);
        }
      }
      const result = form.next();
      assert.equal(result.ok, true, `expected to leave step ${i}: ${JSON.stringify(form.getState().fieldErrors)}`);
    }
    assert.equal(form.getState().isLast, true);
    await form.submit('');
    assert.equal(form.getState().submitResult.reference, 'RTI-20260817-K3M9QP');
    assert.equal(form.getState().submitResult.emailedTo, 'john@example.com');
  });

  it('on validation failure jumps to the first offending step', async () => {
    const form = controller();
    fillProjectDetails(form);
    form.next();
    form.setAnswer('rooms', 0);
    form.setAnswer('floors', 1);
    form.setAnswer('exteriorZones', 0);
    form.setAnswer('contractorEmail', 'not-an-email');
    await form.submit('');
    assert.equal(form.getState().stepIndex, 0);
    assert.equal(form.getState().fieldErrors.contractorEmail, 'A valid email address is required');
    assert.equal(form.getState().focusTarget, fieldDomId('contractorEmail'));
  });
});

describe('DOM id helpers', () => {
  it('turn validate.js paths into stable element ids', () => {
    assert.equal(fieldDomId('contractorName'), 'proposal-field-contractorName');
    assert.equal(fieldDomId('audioSourceDetails[1].name'), 'proposal-field-audioSourceDetails-1-name');
    assert.equal(errorDomId('audioSourceDetails[1].name'), 'proposal-error-audioSourceDetails-1-name');
    assert.equal(helpDomId('rooms'), 'proposal-help-rooms');
  });
});

describe('FR-1 page contract', () => {
  const html = readFileSync(path.join(repoRoot, 'frontend/rti_proposal.html'), 'utf8');
  const css = readFileSync(path.join(repoRoot, 'frontend/styles/rti_proposal.css'), 'utf8');
  const renderer = readFileSync(path.join(repoRoot, 'frontend/scripts/proposal/rti_proposal.js'), 'utf8');
  const controllerSrc = readFileSync(path.join(repoRoot, 'frontend/scripts/proposal/formController.js'), 'utf8');
  const serverSrc = readFileSync(path.join(repoRoot, 'backend/fpc_server.js'), 'utf8');

  it('loads stylesheets in the faq.html order and a page-scoped file', () => {
    const order = [
      html.indexOf('href="/styles/global.css"'),
      html.indexOf('href="/styles/consultation.css"'),
      html.indexOf('href="/styles/rti_proposal.css"')
    ];
    assert.equal(order.every((index) => index >= 0), true);
    assert.equal(order[0] < order[1] && order[1] < order[2], true);
  });

  it('imports shared schema modules, not calculators', () => {
    assert.match(html, /type="module"/);
    assert.match(renderer, /\/scripts\/proposal\/shared\/schema\.js/);
    assert.match(renderer, /\/scripts\/proposal\/shared\/validate\.js/);
    assert.match(renderer, /\/scripts\/proposal\/shared\/repeatGroups\.js/);
    for (const source of [html, renderer, controllerSrc, css]) {
      assert.equal(source.includes('proposal/calc'), false);
      assert.equal(source.includes('minutesPerUnit'), false);
      assert.equal(source.includes('26.4'), false);
    }
  });

  it('registers GET /rti_proposal/ and a redirect from /rti_proposal', () => {
    assert.match(serverSrc, /app\.get\('\/rti_proposal\/'/);
    assert.match(serverSrc, /app\.get\('\/rti_proposal'/);
    assert.match(serverSrc, /frontend\/rti_proposal\.html/);
    assert.match(serverSrc, /\/rti_proposal\/preview\.pdf/);
  });

  it('preserves the legacy intro text and uses label-contrast tokens', () => {
    assert.match(
      html,
      /This form is meant to capture the necessary project information to calculate a programming budget for RTI control systems/
    );
    assert.match(css, /--proposal-label:\s*#e8e8e8/);
    assert.match(css, /--proposal-action:\s*#fcb040/);
  });

  it('fades unedited default names, not Type selects', () => {
    assert.match(css, /\.proposal-field input\.proposal-value-default/);
    assert.match(renderer, /function applyDefaultHint/);
    assert.match(renderer, /question\.kind === 'select' \|\| question\.kind === 'count'/);
  });

  it('does not show a live hours estimate on the public form', () => {
    assert.equal(html.includes('Estimated hours'), false);
    assert.equal(html.includes('proposal-hours-value'), false);
    assert.equal(renderer.includes('renderEstimate'), false);
  });
});
