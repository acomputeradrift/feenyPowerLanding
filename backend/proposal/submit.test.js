import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { processSubmission } from './submit.js';
import { generateReference } from './reference.js';
import { hashClientIp } from './ipHash.js';
import { proposalPdfFilename } from './pdf/proposalDocument.js';
import { sendProposalEmail, isProposalEmailEnabled } from './email/sendProposal.js';
import { ProposalSubmission } from '../models/ProposalSubmission.js';
import { SCHEMA_VERSION } from './shared/schema.js';
import { RATE_CARD_VERSION } from './calc/rates.js';
import { validAnswers } from './fixtures/validAnswers.js';
import { calculateSystemData } from './calc/systemData.js';
import { calculateHoursData } from './calc/hoursData.js';
import { rates } from './calc/rates.js';

function memoryStore() {
  const docs = new Map();
  const events = [];
  return {
    docs,
    events,
    async saveSubmission(doc) {
      events.push('save');
      assert.equal(doc.emailStatus, 'pending');
      docs.set(doc.reference, { ...doc });
      return docs.get(doc.reference);
    },
    async updateDelivery(reference, fields) {
      events.push('update');
      const existing = docs.get(reference);
      docs.set(reference, { ...existing, ...fields });
    }
  };
}

function depsFor(store, extra = {}) {
  return {
    saveSubmission: store.saveSubmission,
    updateDelivery: store.updateDelivery,
    now: () => new Date('2026-08-17T18:00:00.000Z'),
    makeReference: () => 'RTI-20260817-K3M9QP',
    ipHashSalt: 'test-salt',
    ...extra
  };
}

describe('FR-11 FR-15 submit pipeline', () => {
  it('persists with emailStatus pending before PDF or email run', async () => {
    const store = memoryStore();
    const answers = validAnswers({ lightingZones: 10 });
    const result = await processSubmission(
      { answers, honeypot: '' },
      { ip: '203.0.113.8', userAgent: 'test-agent' },
      depsFor(store, {
        async generatePdf() {
          store.events.push('pdf');
          throw new Error('pdf boom');
        },
        async sendEmail() {
          store.events.push('email');
          return { delivered: true };
        }
      })
    );

    assert.deepEqual(store.events, ['save', 'pdf', 'update']);
    assert.equal(result.status, 201);
    assert.equal(result.body.reference, 'RTI-20260817-K3M9QP');
    assert.equal(result.body.emailedTo, 'john@example.com');
    assert.equal(result.body.delivery, 'pending');
    assert.equal(
      result.body.totalProjectHours,
      calculateHoursData(calculateSystemData(answers), rates).totalProjectHours
    );

    const saved = store.docs.get('RTI-20260817-K3M9QP');
    assert.equal(saved.emailStatus, 'failed');
    assert.equal(saved.emailError, 'pdf boom');
    assert.equal(saved.rateCardVersion, RATE_CARD_VERSION);
    assert.equal(saved.schemaVersion, SCHEMA_VERSION);
    assert.equal(saved.contractorName, 'John Smith');
    assert.equal(saved.answers.lightingZones, 10);
    assert.equal(Array.isArray(saved.lineItems), true);
    assert.equal(saved.lineItems.length > 0, true);
    assert.equal(saved.clientIpHash, hashClientIp('203.0.113.8', 'test-salt'));
    assert.notEqual(saved.clientIpHash, '203.0.113.8');
    assert.equal(JSON.stringify(result.body).includes('minutesPerUnit'), false);
    assert.equal(result.body.lineItems, undefined);
  });

  it('writes email to the outbox when PROPOSAL_EMAIL_ENABLED is not true', async () => {
    const store = memoryStore();
    const outboxDir = await mkdtemp(path.join(os.tmpdir(), 'proposal-outbox-'));
    const pdfBuffer = Buffer.from('pdf-bytes');
    const result = await processSubmission(
      { answers: validAnswers() },
      {},
      depsFor(store, {
        generatePdf: async () => pdfBuffer,
        sendEmail: (payload) => sendProposalEmail(payload, {
          env: { PROPOSAL_EMAIL_ENABLED: 'false' },
          outboxDir
        })
      })
    );

    assert.equal(result.status, 201);
    assert.equal(result.body.delivery, 'pending');
    const saved = store.docs.get('RTI-20260817-K3M9QP');
    assert.equal(saved.emailStatus, 'pending');
    const written = JSON.parse(await readFile(path.join(outboxDir, 'RTI-20260817-K3M9QP.json'), 'utf8'));
    assert.equal(written.to, 'feeny.jamie@gmail.com');
    assert.match(written.note, /not sent/i);
    assert.equal(written.note.includes('26.4'), false);
  });

  it('does not persist a honeypot submission and still returns 201', async () => {
    const store = memoryStore();
    const result = await processSubmission(
      { answers: validAnswers(), honeypot: 'http://spam.test' },
      {},
      depsFor(store)
    );
    assert.equal(result.status, 201);
    assert.equal(result.discarded, true);
    assert.equal(store.docs.size, 0);
    assert.match(result.body.reference, /^RTI-\d{8}-[A-Z0-9]{6}$/);
  });

  it('returns 400 with per-field errors for invalid or unknown keys', async () => {
    const store = memoryStore();
    const invalid = await processSubmission(
      { answers: validAnswers({ contractorEmail: 'not-an-email' }) },
      {},
      depsFor(store)
    );
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error, 'validation_failed');
    assert.equal(invalid.body.fieldErrors.contractorEmail, 'A valid email address is required');
    assert.equal(store.docs.size, 0);

    const unknown = await processSubmission(
      { answers: validAnswers({ extraField: 1 }) },
      {},
      depsFor(store)
    );
    assert.equal(unknown.status, 400);
    assert.equal(unknown.body.fieldErrors.extraField, 'Unknown field');

    const topLevel = await processSubmission(
      { answers: validAnswers(), bonus: true },
      {},
      depsFor(store)
    );
    assert.equal(topLevel.status, 400);
    assert.equal(topLevel.body.fieldErrors.bonus, 'Unknown field');
  });

  it('returns persist_failed rather than 201 when save throws', async () => {
    const result = await processSubmission(
      { answers: validAnswers() },
      {},
      depsFor(memoryStore(), {
        saveSubmission: async () => {
          throw new Error('mongo down');
        }
      })
    );
    assert.equal(result.status, 500);
    assert.equal(result.body.error, 'persist_failed');
  });
});

describe('reference, filename, email guard, model', () => {
  it('generates RTI-yyyymmdd-XXXXXX references', () => {
    const reference = generateReference(new Date('2026-08-17T23:00:00.000Z'));
    assert.match(reference, /^RTI-20260817-[A-Z0-9]{6}$/);
  });

  it('sanitises PDF filename components', () => {
    assert.equal(
      proposalPdfFilename({
        reference: 'RTI-20260817-K3M9QP',
        contractorName: 'John Smith',
        projectPoName: 'LAKE HOUSE'
      }),
      'RTI_20260817_K3M9QP John_Smith LAKE_HOUSE RTI Proposal.pdf'
    );
  });

  it('treats only the string true as email-enabled', () => {
    assert.equal(isProposalEmailEnabled({ PROPOSAL_EMAIL_ENABLED: 'true' }), true);
    assert.equal(isProposalEmailEnabled({ PROPOSAL_EMAIL_ENABLED: 'TRUE' }), false);
    assert.equal(isProposalEmailEnabled({ PROPOSAL_EMAIL_ENABLED: '1' }), false);
    assert.equal(isProposalEmailEnabled({ NODE_ENV: 'production' }), false);
    assert.equal(isProposalEmailEnabled({}), false);
  });

  it('omits the IP hash when no salt is configured', async () => {
    const store = memoryStore();
    await processSubmission(
      { answers: validAnswers() },
      { ip: '203.0.113.8' },
      depsFor(store, {
        ipHashSalt: '',
        generatePdf: async () => {
          throw new Error('skip');
        }
      })
    );
    assert.equal(store.docs.get('RTI-20260817-K3M9QP').clientIpHash, undefined);
  });

  it('matches the documented Mongoose field set', () => {
    const paths = Object.keys(ProposalSubmission.schema.paths);
    for (const required of [
      'reference', 'submittedAt', 'contractorName', 'contractorEmail', 'projectPoName',
      'answers', 'systemData', 'rateCardVersion', 'lineItems', 'sectionHours',
      'totalProjectHours', 'emailStatus', 'schemaVersion'
    ]) {
      assert.equal(paths.includes(required), true, required);
    }
    assert.equal(ProposalSubmission.schema.path('reference').options.unique, true);
    assert.deepEqual(ProposalSubmission.schema.path('emailStatus').enumValues, [
      'pending', 'sent', 'failed'
    ]);
  });
});
