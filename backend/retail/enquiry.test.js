import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { PROPOSAL_NOTIFY_TO } from '../proposal/email/sendProposal.js';
import { createAllowSubmit } from '../routes/retailEnquiry.js';
import { processRetailEnquiry } from './enquiry.js';
import { DELIVERY_MESSAGES, ENQUIRY_MESSAGES, PAID_NOTICE } from './messages.js';
import { RETAIL_ENQUIRY_TO, sendRetailEnquiryEmail } from './sendEnquiry.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function enquiry(overrides = {}) {
  return {
    area: 'greater-vancouver',
    sourcePath: '/homeowners/greater-vancouver',
    propertyLocation: 'North Vancouver',
    projectType: 'renovation',
    goals: 'The keypads do not match how we use the main floor.',
    name: 'Alex Morgan',
    contact: 'alex@example.com',
    honeypot: '',
    ...overrides,
  };
}

const disabledEnv = { PROPOSAL_EMAIL_ENABLED: 'false' };

describe('retail enquiry validation and delivery', () => {
  it('does not call the network when mail is disabled', async () => {
    let called = false;
    const result = await processRetailEnquiry(enquiry(), {
      env: disabledEnv,
      fetchImpl() {
        called = true;
        throw new Error('network');
      },
    });
    assert.equal(called, false);
    assert.equal(result.status, 503);
    assert.equal(result.body.delivered, false);
    assert.equal(result.body.error, 'delivery_not_configured');
  });

  it('rejects a short form and an unknown area', async () => {
    const result = await processRetailEnquiry(enquiry({
      propertyLocation: ' ',
      projectType: 'quote',
      goals: 'short',
      name: '123',
      contact: 'call me',
      area: 'el-gato',
      sourcePath: '/homeowners/el-gato',
    }), { env: disabledEnv });
    assert.equal(result.status, 400);
    assert.equal(result.body.fieldErrors.area, ENQUIRY_MESSAGES.area);
    assert.equal(result.body.fieldErrors.propertyLocation, ENQUIRY_MESSAGES.propertyLocation);
    assert.equal(result.body.fieldErrors.projectType, ENQUIRY_MESSAGES.projectType);
    assert.equal(result.body.fieldErrors.goals, ENQUIRY_MESSAGES.goals);
    assert.equal(result.body.fieldErrors.name, ENQUIRY_MESSAGES.name);
    assert.equal(result.body.fieldErrors.contact, ENQUIRY_MESSAGES.contact);
  });

  it('rejects a page path that does not match the area', async () => {
    const result = await processRetailEnquiry(enquiry({
      area: 'kelowna',
      sourcePath: '/homeowners/greater-vancouver',
    }), { env: disabledEnv });
    assert.equal(result.status, 400);
    assert.equal(result.body.fieldErrors.sourcePath, ENQUIRY_MESSAGES.sourcePath);
  });

  it('drops a filled honeypot without sending', async () => {
    let called = false;
    const result = await processRetailEnquiry(enquiry({ honeypot: 'https://spam.example' }), {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 're_test',
        PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com',
      },
      fetchImpl() {
        called = true;
        throw new Error('should not send');
      },
    });
    assert.equal(called, false);
    assert.equal(result.discarded, true);
    assert.equal(result.body.delivered, true);
  });

  it('sends through Resend only to the existing owner inbox', async () => {
    const calls = [];
    const result = await sendRetailEnquiryEmail({
      area: 'los-gatos',
      areaLabel: 'Los Gatos, California',
      sourcePath: '/homeowners/los-gatos',
      propertyLocation: 'Los Gatos',
      projectType: 'existing_system',
      projectTypeLabel: 'Existing system',
      goals: 'The scenes do nothing useful.\n<script>alert(1)</script>',
      name: 'Jamie\r\nBcc: evil@example.com',
      contact: 'homeowner@example.com',
    }, {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 're_test_key',
        PROPOSAL_EMAIL_FROM: 'RTI Proposals <proposals@feenypowerandcontrol.com>',
      },
      async fetchImpl(url, init) {
        calls.push({ url, init });
        return { ok: true, status: 200, async json() { return { id: 'msg_retail_1' }; } };
      },
    });

    assert.equal(result.delivered, true);
    assert.equal(result.method, 'resend');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.resend.com/emails');
    const body = JSON.parse(calls[0].init.body);
    assert.deepEqual(body.to, [PROPOSAL_NOTIFY_TO]);
    assert.equal(RETAIL_ENQUIRY_TO, PROPOSAL_NOTIFY_TO);
    assert.equal(body.bcc, undefined);
    assert.equal(body.reply_to, 'homeowner@example.com');
    assert.equal(body.from, 'Feeny Power and Control <proposals@feenypowerandcontrol.com>');
    assert.equal(body.subject.includes('\n'), false);
    assert.equal(body.subject.includes('\r'), false);
    assert.match(body.text, /Name: Jamie Bcc: evil@example.com/);
    assert.match(body.text, /Los Gatos, California/);
    assert.match(body.text, /\/homeowners\/los-gatos/);
    assert.match(body.text, /Existing system/);
    assert.match(body.text, /<script>alert\(1\)<\/script>/);
    assert.match(body.text, /not an installation quote/);
    assert.equal(JSON.stringify(body).includes('re_test_key'), false);
  });

  it('does not set reply-to for a phone number, and hides provider errors', async () => {
    const failed = await sendRetailEnquiryEmail({
      areaLabel: 'Kelowna, BC',
      sourcePath: '/homeowners/kelowna',
      propertyLocation: 'Kelowna',
      projectTypeLabel: 'New build',
      goals: 'We are framing a new house and need a control plan.',
      name: 'Sam Lee',
      contact: '250-555-0199',
    }, {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 're_test_key',
        PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com',
      },
      async fetchImpl() {
        return { ok: false, status: 422, async json() { return { message: 'bad from secret' }; } };
      },
    });
    assert.equal(failed.delivered, false);
    assert.equal(failed.method, 'resend_error');
    assert.equal(JSON.stringify(failed).includes('secret'), false);

    const calls = [];
    await sendRetailEnquiryEmail({
      areaLabel: 'Kelowna, BC',
      sourcePath: '/homeowners/kelowna',
      propertyLocation: 'Kelowna',
      projectTypeLabel: 'New build',
      goals: 'We are framing a new house and need a control plan.',
      name: 'Sam Lee',
      contact: '250-555-0199',
    }, {
      env: {
        PROPOSAL_EMAIL_ENABLED: 'true',
        PROPOSAL_EMAIL_API_KEY: 're_test_key',
        PROPOSAL_EMAIL_FROM: 'proposals@feenypowerandcontrol.com',
      },
      async fetchImpl(url, init) {
        calls.push(JSON.parse(init.body));
        return { ok: true, status: 200, async json() { return { id: 'msg_2' }; } };
      },
    });
    assert.equal(calls[0].reply_to, undefined);
    assert.match(calls[0].text, /250-555-0199/);
  });

  it('keeps the browser copy aligned with the server messages', async () => {
    const js = await readFile(path.join(root, 'frontend/scripts/retail.js'), 'utf8');
    for (const value of [...Object.values(ENQUIRY_MESSAGES), ...Object.values(DELIVERY_MESSAGES)]) {
      assert.equal(js.includes(value), true, value);
    }
    const html = await readFile(path.join(root, 'frontend/homeowners-kelowna.html'), 'utf8');
    assert.equal(html.includes(PAID_NOTICE), true);
  });

  it('limits repeat posts per address', () => {
    const allow = createAllowSubmit({ windowMs: 60_000, max: 2 });
    assert.equal(allow('203.0.113.5'), true);
    assert.equal(allow('203.0.113.5'), true);
    assert.equal(allow('203.0.113.5'), false);
    assert.equal(allow('203.0.113.6'), true);
  });
});
