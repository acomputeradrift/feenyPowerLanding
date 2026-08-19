import { steps } from './shared/schema.js';
import { validate } from './shared/validate.js';
import { SCHEMA_VERSION } from './shared/schema.js';
import { calculateSystemData } from './calc/systemData.js';
import { calculateHoursData } from './calc/hoursData.js';
import { rates, RATE_CARD_VERSION } from './calc/rates.js';
import { generateReference } from './reference.js';
import { hashClientIp } from './ipHash.js';
import { generateProposalPdfV2 } from './pdf/proposalDocumentV2.js';
import { proposalPdfFilename } from './pdf/proposalDocument.js';
import { sendProposalEmail } from './email/sendProposal.js';
import { ProposalSubmission } from '../models/ProposalSubmission.js';

const TOP_LEVEL_KEYS = new Set(['answers', 'honeypot']);

function isFilledHoneypot(value) {
  return value != null && String(value).trim() !== '';
}

function unknownTopLevelKeys(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    errors.answers = 'Answers are required';
    return errors;
  }
  for (const key of Object.keys(body)) {
    if (!TOP_LEVEL_KEYS.has(key)) errors[key] = 'Unknown field';
  }
  return errors;
}

function plausibleHoneypotBody(answers, reference) {
  const email = typeof answers?.contractorEmail === 'string' && answers.contractorEmail.includes('@')
    ? answers.contractorEmail
    : 'dealer@example.com';
  return {
    reference,
    totalProjectHours: 0,
    emailedTo: email
  };
}

function pendingBody(document) {
  return {
    reference: document.reference,
    totalProjectHours: document.totalProjectHours,
    emailedTo: document.contractorEmail,
    delivery: 'pending'
  };
}

function sentBody(document) {
  return {
    reference: document.reference,
    totalProjectHours: document.totalProjectHours,
    emailedTo: document.contractorEmail
  };
}

export async function saveSubmissionToMongo(document) {
  const created = await ProposalSubmission.create(document);
  return created.toObject();
}

export async function updateSubmissionDelivery(reference, fields) {
  await ProposalSubmission.updateOne({ reference }, { $set: fields });
}

export async function processSubmission(body, meta = {}, deps = {}) {
  const {
    now = () => new Date(),
    makeReference = generateReference,
    saveSubmission = saveSubmissionToMongo,
    updateDelivery = updateSubmissionDelivery,
    generatePdf = generateProposalPdfV2,
    sendEmail = sendProposalEmail,
    ipHashSalt = process.env.PROPOSAL_IP_HASH_SALT
  } = deps;

  const topLevelErrors = unknownTopLevelKeys(body);
  if (Object.keys(topLevelErrors).length > 0) {
    return {
      status: 400,
      body: { error: 'validation_failed', fieldErrors: topLevelErrors }
    };
  }

  const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers)
    ? body.answers
    : {};

  if (isFilledHoneypot(body.honeypot)) {
    return {
      status: 201,
      discarded: true,
      body: plausibleHoneypotBody(answers, makeReference(now()))
    };
  }

  const fieldErrors = validate(steps, answers);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 400,
      body: { error: 'validation_failed', fieldErrors }
    };
  }

  const submittedAt = now();
  const systemData = calculateSystemData(answers);
  const hoursData = calculateHoursData(systemData, rates);
  const document = {
    reference: makeReference(submittedAt),
    submittedAt,
    contractorName: answers.contractorName,
    contractorEmail: answers.contractorEmail,
    projectPoName: answers.projectPoName,
    projectClientName: answers.projectClientName || undefined,
    answers,
    systemData,
    rateCardVersion: RATE_CARD_VERSION,
    lineItems: hoursData.lineItems,
    sectionHours: hoursData.sectionHours,
    totalProjectHours: hoursData.totalProjectHours,
    emailStatus: 'pending',
    clientIpHash: hashClientIp(meta.ip, ipHashSalt),
    userAgent: meta.userAgent,
    schemaVersion: SCHEMA_VERSION
  };

  try {
    await saveSubmission(document);
  } catch {
    return { status: 500, body: { error: 'persist_failed' } };
  }

  let pdfBuffer;
  let pdfFilename;
  try {
    pdfFilename = proposalPdfFilename(document);
    pdfBuffer = await generatePdf(document, systemData, hoursData);
    await updateDelivery(document.reference, { pdfFilename });
  } catch (error) {
    await updateDelivery(document.reference, {
      emailStatus: 'failed',
      emailError: error.message || 'PDF generation failed'
    });
    return { status: 201, body: pendingBody(document) };
  }

  try {
    const result = await sendEmail({
      submission: { ...document, pdfFilename },
      pdfBuffer,
      pdfFilename
    });
    if (result && result.delivered) {
      await updateDelivery(document.reference, {
        emailStatus: 'sent',
        emailedAt: now(),
        pdfFilename
      });
      return { status: 201, body: sentBody(document) };
    }
    await updateDelivery(document.reference, {
      emailStatus: 'pending',
      pdfFilename,
      emailError: result?.note || 'Email written to outbox; not sent'
    });
    return { status: 201, body: pendingBody(document) };
  } catch (error) {
    await updateDelivery(document.reference, {
      emailStatus: 'failed',
      emailError: error.message || 'Email delivery failed',
      pdfFilename
    });
    return { status: 201, body: pendingBody(document) };
  }
}
