import { calculateHoursData } from '../calc/hoursData.js';
import { rates } from '../calc/rates.js';
import { calculateSystemData } from '../calc/systemData.js';
import { validAnswers } from '../fixtures/validAnswers.js';
import { generateProposalPdf, proposalPdfFilename } from './proposalDocument.js';
import { generateProposalPdfV2 } from './proposalDocumentV2.js';

export function isLocalPreviewHost(req) {
  const host = String(req.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function previewAnswers() {
  const answers = validAnswers({
    contractorName: 'Jamie Feeny',
    contractorEmail: 'jamie@example.com',
    projectClientName: 'Private Client',
    projectPoName: 'HIGH RD',
    projectAddress: 'Private Location',
    projectTimeline: '2026-09-15',
    rooms: 4,
    lightingZones: 4,
    shadingZones: 2,
    audioDiscreteSourceZones: 1,
    videoDiscreteSourceZones: 1,
    displayDiscreteZones: 1,
    globalControllerCount: 4,
    roomControllerCount: 1,
    inputSenseZones: 2,
    outputRelayZones: 1,
    additionalInfo: 'Owner wants scenes labelled by time of day.'
  });
  answers.globalControllerDetails = [
    { type: 'iPhone', name: 'Global Controller 1' },
    { type: 'iPhone', name: 'Global Controller 2' },
    { type: 'Touchscreen', name: 'Global Controller 3' },
    { type: 'Touchscreen', name: 'Global Controller 4' }
  ];
  answers.audioSourceDetails = [{ type: 'Streamer', name: 'Sonos Port' }];
  answers.videoSourceDetails = [{ type: 'Media Player', name: 'Apple TV' }];
  answers.displayDetails = [{ type: 'TV', name: 'Living Room' }];
  return answers;
}

export async function handleProposalPdfPreview(req, res) {
  if (!isLocalPreviewHost(req)) {
    res.status(404).end();
    return;
  }

  const answers = previewAnswers();
  const systemData = calculateSystemData(answers);
  const hoursData = calculateHoursData(systemData, rates);
  const submission = {
    reference: 'RTI-20260817-PREVIEW',
    contractorName: answers.contractorName,
    contractorEmail: answers.contractorEmail,
    projectPoName: answers.projectPoName,
    projectClientName: answers.projectClientName,
    answers
  };

  const useV1 = String(req.query?.v || '') === '1';
  const generate = useV1 ? generateProposalPdf : generateProposalPdfV2;

  try {
    const filename = proposalPdfFilename(submission);
    const buffer = await generate(submission, systemData, hoursData);
    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch {
    res.status(500).end();
  }
}
