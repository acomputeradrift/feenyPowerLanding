import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pdfMake from 'pdfmake';

import { buildProposalContent } from './formatProposal.js';

const require = createRequire(import.meta.url);
const Roboto = require('pdfmake/fonts/Roboto.js');

pdfMake.addFonts(Roboto);
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((filePath) => (
  typeof filePath === 'string'
  && filePath.includes(`${path.sep}pdfmake${path.sep}fonts${path.sep}Roboto${path.sep}`)
  && filePath.endsWith('.ttf')
));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendImages = path.join(__dirname, '../../../frontend/images');

const COLORS = {
  gold: '#f1b353',
  charcoal: '#575759',
  steel: '#a7a9ac',
  white: '#ffffff',
  black: '#000000',
  label: '#a7a9ac'
};

function imageDataUrl(filename) {
  const bytes = readFileSync(path.join(frontendImages, filename));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

const feenyLogo = imageDataUrl('feeny-logo-white.png');
const rtiLogo = imageDataUrl('rti-logo-bigger.png');

function safeComponent(value) {
  return String(value || '').replace(/[^A-Za-z0-9]/g, '_');
}

export function proposalPdfFilename(submission) {
  return [
    safeComponent(submission.reference),
    safeComponent(submission.contractorName),
    safeComponent(submission.projectPoName),
    'RTI',
    'Proposal.pdf'
  ].join(' ');
}

function sectionBlock(section) {
  return [
    {
      text: section.title,
      bold: true,
      decoration: 'underline',
      margin: [0, 14, 0, 6]
    },
    ...section.lines.map((line) => ({ text: line, margin: [0, 1, 0, 1] }))
  ];
}

function bandTable(fillColor, children, minHeight) {
  return {
    table: {
      widths: ['*'],
      body: [[{
        stack: children,
        fillColor,
        alignment: 'center',
        color: fillColor === COLORS.charcoal ? COLORS.white : COLORS.black,
        margin: [24, 28, 24, 28]
      }]]
    },
    layout: 'noBorders',
    margin: [-40, 16, -40, 0],
    minHeight
  };
}

export function buildDocDefinition(submission, systemData, hoursData, options = {}) {
  const content = buildProposalContent(submission, systemData, hoursData, options);
  const { cover } = content;

  return {
    pageSize: 'LETTER',
    pageMargins: [40, 48, 40, 56],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.25
    },
    footer: () => ({
      text: content.copyright,
      alignment: 'center',
      fontSize: 8,
      color: COLORS.label,
      margin: [0, 12, 0, 0]
    }),
    content: [
      { image: feenyLogo, fit: [160, 72], alignment: 'center', margin: [0, 0, 0, 24] },
      {
        text: [
          { text: 'Unlock ', color: COLORS.label },
          { text: 'Seamless Smart Home Integration', bold: true, color: COLORS.black },
          { text: ' With\n', color: COLORS.label },
          { text: 'Remote System Programming', bold: true, color: COLORS.black }
        ],
        alignment: 'center',
        fontSize: 16,
        margin: [12, 0, 12, 28]
      },
      { text: 'Prepared for:', alignment: 'center', color: COLORS.label, margin: [0, 0, 0, 4] },
      { text: cover.contractorName, alignment: 'center', bold: true, fontSize: 14, margin: [0, 0, 0, 2] },
      { text: cover.contractorEmail, alignment: 'center', color: COLORS.label, margin: [0, 0, 0, 20] },
      { image: rtiLogo, fit: [140, 56], alignment: 'center', margin: [0, 8, 0, 28] },
      bandTable(COLORS.charcoal, [
        { text: cover.clientLine, margin: [0, 4, 0, 4] },
        { text: cover.poLine, margin: [0, 4, 0, 4] },
        { text: cover.locationLine, margin: [0, 4, 0, 4] },
        { text: cover.timelineLine, margin: [0, 4, 0, 4] },
        { text: cover.totalHoursLine, bold: true, margin: [0, 12, 0, 4] }
      ], 220),

      { text: '', pageBreak: 'before' },
      { text: 'System Integration Scope', alignment: 'center', bold: true, fontSize: 20, margin: [0, 0, 0, 8] },
      { text: content.systems.intro, alignment: 'center', margin: [12, 0, 12, 16] },
      bandTable(COLORS.gold, content.systems.sections.flatMap(sectionBlock), 520),

      { text: '', pageBreak: 'before' },
      { text: 'RTI Equipment Scope', alignment: 'center', bold: true, fontSize: 20, margin: [0, 0, 0, 8] },
      { text: content.equipment.intro, alignment: 'center', margin: [12, 0, 12, 16] },
      bandTable(COLORS.steel, content.equipment.sections.flatMap(sectionBlock), 260),
      { text: 'Additional Info', alignment: 'center', bold: true, decoration: 'underline', margin: [0, 28, 0, 10] },
      { text: content.additional.siteSummary, alignment: 'center', margin: [12, 0, 12, 8] },
      ...content.additional.roomNames.map((name) => ({
        text: name,
        alignment: 'center',
        margin: [0, 1, 0, 1]
      })),
      ...(content.additional.exteriorNames || []).map((name) => ({
        text: name,
        alignment: 'center',
        margin: [0, 1, 0, 1]
      })),
      { text: content.additional.extra, alignment: 'center', margin: [12, 8, 12, 0] }
    ]
  };
}

export async function generateProposalPdf(submission, systemData, hoursData, options = {}) {
  const docDefinition = buildDocDefinition(submission, systemData, hoursData, options);
  const pdf = pdfMake.createPdf(docDefinition);
  return pdf.getBuffer();
}
