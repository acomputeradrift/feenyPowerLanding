import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { sendProposalEmail } from './sendProposal.js';

const submission = {
  reference: 'RTI-20260817-K3M9QP',
  contractorEmail: 'john@example.com',
  totalProjectHours: 8.5
};

describe('FR-17 proposal email', () => {
  it('writes the outbox when sending is not enabled', async () => {
    const outboxDir = await mkdtemp(path.join(os.tmpdir(), 'proposal-outbox-'));
    const result = await sendProposalEmail(
      { submission, pdfBuffer: Buffer.from('pdf'), pdfFilename: 'proposal.pdf' },
      { env: { PROPOSAL_EMAIL_ENABLED: 'false' }, outboxDir }
    );
    assert.equal(result.delivered, false);
    assert.equal(result.method, 'outbox');
    const written = JSON.parse(await readFile(path.join(outboxDir, 'RTI-20260817-K3M9QP.json'), 'utf8'));
    assert.equal(written.to, 'john@example.com');
    assert.equal(written.subject, 'RTI Proposal RTI-20260817-K3M9QP (9 hours)');
    assert.equal(written.totalProjectHours, 8.5);
  });

  it('sends through Resend when enabled, with PDF, to dealer and BCC', async () => {
    const calls = [];
    const result = await sendProposalEmail(
      { submission, pdfBuffer: Buffer.from('pdf-bytes'), pdfFilename: 'proposal.pdf' },
      {
        env: {
          PROPOSAL_EMAIL_ENABLED: 'true',
          PROPOSAL_EMAIL_API_KEY: 're_test',
          PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com',
          PROPOSAL_EMAIL_BCC: 'Feeny.jamie@gmail.com'
        },
        async fetchImpl(url, init) {
          calls.push({ url, init });
          return {
            ok: true,
            status: 200,
            async json() {
              return { id: 'msg_1' };
            }
          };
        }
      }
    );

    assert.equal(result.delivered, true);
    assert.equal(result.method, 'resend');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    assert.equal(calls[0].init.headers.Authorization, 'Bearer re_test');
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, ['john@example.com']);
    assert.deepEqual(body.bcc, ['Feeny.jamie@gmail.com']);
    assert.equal(body.reply_to, 'Feeny.jamie@gmail.com');
    assert.equal(body.from, 'proposals@feenypowerandcontrol.com');
    assert.equal(body.attachments[0].filename, 'proposal.pdf');
    assert.equal(body.attachments[0].content, Buffer.from('pdf-bytes').toString('base64'));
    assert.equal(body.subject, 'RTI Proposal RTI-20260817-K3M9QP (9 hours)');
    assert.equal(
      body.text,
      'Your RTI programming budget is attached (9 hours). Reference RTI-20260817-K3M9QP.'
    );
    assert.equal(JSON.stringify(body).includes('8.5'), false);
    assert.equal(JSON.stringify(body).includes('26.4'), false);
    assert.equal(JSON.stringify(body).includes('minutesPerUnit'), false);
  });

  it('never puts the unrounded total in the subject or body', async () => {
    const cases = [
      { totalProjectHours: 5.3, billed: '6 hours' },
      { totalProjectHours: 8.5, billed: '9 hours' },
      { totalProjectHours: 1, billed: '1 hour' },
      { totalProjectHours: 0.1, billed: '1 hour' }
    ];
    for (const { totalProjectHours, billed } of cases) {
      const calls = [];
      await sendProposalEmail(
        { submission: { ...submission, totalProjectHours }, pdfBuffer: Buffer.from('pdf') },
        {
          env: {
            PROPOSAL_EMAIL_ENABLED: 'true',
            PROPOSAL_EMAIL_API_KEY: 're_test',
            PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com'
          },
          async fetchImpl(_url, init) {
            calls.push(JSON.parse(init.body));
            return { ok: true, status: 200, async json() { return { id: 'msg_1' }; } };
          }
        }
      );
      const body = calls[0];
      assert.equal(body.subject, `RTI Proposal RTI-20260817-K3M9QP (${billed})`);
      assert.equal(body.text.includes(`(${billed})`), true);
      assert.equal(body.subject.includes('5.3'), false);
      assert.equal(body.subject.includes('8.5'), false);
      assert.equal(body.subject.includes('0.1'), false);
      assert.equal(body.text.includes('5.3'), false);
      assert.equal(body.text.includes('8.5'), false);
      assert.equal(body.text.includes('0.1'), false);
    }
  });

  it('throws when enabled but the API key or from address is missing', async () => {
    await assert.rejects(
      () => sendProposalEmail(
        { submission, pdfBuffer: Buffer.from('pdf') },
        { env: { PROPOSAL_EMAIL_ENABLED: 'true', PROPOSAL_EMAIL_FROM: 'a@b.com' } }
      ),
      /PROPOSAL_EMAIL_API_KEY/
    );
    await assert.rejects(
      () => sendProposalEmail(
        { submission, pdfBuffer: Buffer.from('pdf') },
        { env: { PROPOSAL_EMAIL_ENABLED: 'true', PROPOSAL_EMAIL_API_KEY: 're_test' } }
      ),
      /PROPOSAL_EMAIL_FROM/
    );
  });
});
