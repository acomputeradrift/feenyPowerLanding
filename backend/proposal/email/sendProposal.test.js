import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import { PROPOSAL_NOTIFY_TO, sendProposalEmail } from './sendProposal.js';

const submission = {
  reference: 'RTI-20260817-K3M9QP',
  contractorName: 'John Smith',
  contractorEmail: 'john@example.com',
  projectPoName: 'LAKE HOUSE',
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
    assert.equal(written.to, PROPOSAL_NOTIFY_TO);
    assert.equal(written.from, null);
    assert.equal(written.subject, 'A new RTI proposal was created!');
    assert.equal(written.totalProjectHours, 8.5);
  });

  it('sends through Resend when enabled, with PDF, only to the owner', async () => {
    const calls = [];
    const result = await sendProposalEmail(
      { submission, pdfBuffer: Buffer.from('pdf-bytes'), pdfFilename: 'proposal.pdf' },
      {
        env: {
          PROPOSAL_EMAIL_ENABLED: 'true',
          PROPOSAL_EMAIL_API_KEY: 're_test',
          PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com',
          PROPOSAL_EMAIL_BCC: 'someone-else@example.com'
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
    assert.deepEqual(body.to, ['feeny.jamie@gmail.com']);
    assert.equal(body.bcc, undefined);
    assert.equal(body.reply_to, 'john@example.com');
    assert.equal(body.from, 'RTI Proposals <proposals@feenypowerandcontrol.com>');
    assert.equal(body.attachments[0].filename, 'proposal.pdf');
    assert.equal(body.attachments[0].content, Buffer.from('pdf-bytes').toString('base64'));
    assert.equal(body.subject, 'A new RTI proposal was created!');
    assert.equal(
      body.text,
      'John Smith (john@example.com) just submitted a new project (LAKE HOUSE).'
    );
    assert.equal(JSON.stringify(body.to).includes('john@example.com'), false);
    assert.equal(JSON.stringify(body).includes('8.5'), false);
    assert.equal(JSON.stringify(body).includes('26.4'), false);
    assert.equal(JSON.stringify(body).includes('minutesPerUnit'), false);
  });

  it('never puts hours or rates in the subject or body', async () => {
    const cases = [5.3, 8.5, 1, 0.1];
    for (const totalProjectHours of cases) {
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
      assert.equal(body.subject, 'A new RTI proposal was created!');
      assert.equal(
        body.text,
        'John Smith (john@example.com) just submitted a new project (LAKE HOUSE).'
      );
      assert.equal(body.subject.includes(String(totalProjectHours)), false);
      assert.equal(body.text.includes(String(totalProjectHours)), false);
      assert.equal(body.text.includes('hour'), false);
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
