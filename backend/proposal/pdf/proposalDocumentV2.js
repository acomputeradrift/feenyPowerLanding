import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import pdfMake from 'pdfmake';

import { buildProposalContentV2 } from './formatProposalV2.js';

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
  orange: '#fcb040',
  charcoal: '#575759',
  green: '#39b54a',
  steel: '#a7a9ac',
  white: '#ffffff',
  black: '#000000',
  label: '#a7a9ac'
};

const BAND_FONT_SIZE = 16;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN_TOP = 48;
const PAGE_MARGIN_BOTTOM = 56;
const BAND_PAD_X = 48;
const BAND_PAD_Y = 24;
const LINE_HEIGHT = 18;
const CONTENT_WIDTH = PAGE_WIDTH - BAND_PAD_X * 2;
const CHARS_PER_LINE = Math.floor(CONTENT_WIDTH / (BAND_FONT_SIZE * 0.52));

function imageDataUrl(filename) {
  const bytes = readFileSync(path.join(frontendImages, filename));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

const feenyLogo = imageDataUrl('feeny-logo-white.png');
const rtiLogo = imageDataUrl('rti-logo-bigger.png');

function bandInk(fillColor) {
  return fillColor === COLORS.charcoal ? COLORS.white : COLORS.black;
}

function withBandStyle(children, fillColor, alignment) {
  const ink = bandInk(fillColor);
  return children.map((child) => ({
    ...child,
    fontSize: BAND_FONT_SIZE,
    color: ink,
    alignment
  }));
}

function marginPart(node, index) {
  return Array.isArray(node?.margin) ? Number(node.margin[index]) || 0 : 0;
}

function wrappedLineCount(text) {
  const paragraphs = String(text || '').split('\n');
  let lines = 0;
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines += 1;
      continue;
    }
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length <= CHARS_PER_LINE) {
        current = next;
      } else {
        if (current) lines += 1;
        current = word;
      }
    }
    if (current) lines += 1;
  }
  return Math.max(1, lines);
}

function estimateContentHeight(children) {
  let height = 0;
  for (const child of children) {
    height += marginPart(child, 1) + marginPart(child, 3);
    if (child.columns) {
      height += LINE_HEIGHT + 16;
      continue;
    }
    height += wrappedLineCount(child.text) * LINE_HEIGHT;
  }
  return height;
}

export function layoutBand(children) {
  const contentHeight = estimateContentHeight(children);
  const height = contentHeight + BAND_PAD_Y * 2;
  const y = (PAGE_HEIGHT - height) / 2;
  return { contentHeight, height, y, padY: BAND_PAD_Y };
}

function bleedBand(fillColor, children, alignment = 'center') {
  const box = layoutBand(children);
  const ink = bandInk(fillColor);
  return {
    box,
    color: fillColor,
    node: {
      absolutePosition: { x: 0, y: box.y },
      table: {
        widths: ['*'],
        body: [[{
          border: [false, false, false, false],
          fillColor,
          margin: [BAND_PAD_X, BAND_PAD_Y, BAND_PAD_X, BAND_PAD_Y],
          alignment,
          color: ink,
          fontSize: BAND_FONT_SIZE,
          lineHeight: 1.25,
          stack: withBandStyle(children, fillColor, alignment)
        }]]
      },
      layout: {
        defaultBorder: false,
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    }
  };
}

function pageTitle(text) {
  return {
    text,
    alignment: 'center',
    bold: true,
    fontSize: 20,
    margin: [0, 0, 0, 8]
  };
}

function qtyRows(lines) {
  if (!lines.length) {
    return [{ text: 'None included.', margin: [0, 4, 0, 4] }];
  }
  return lines.map((line) => ({ text: line, margin: [0, 4, 0, 4] }));
}

function systemSectionRows(sections) {
  const rows = [];
  (sections || []).forEach((section, index) => {
    rows.push({
      text: section.title,
      bold: true,
      decoration: 'underline',
      margin: [0, index === 0 ? 0 : 12, 0, 4]
    });
    for (const line of section.lines) {
      rows.push({ text: line, margin: [0, 1, 0, 1] });
    }
  });
  return rows;
}

function signatureBlockHeight() {
  return 18 + 4 + 3 * (14 + 16);
}

function belowBandCenterY(box, blockHeight) {
  const whiteTop = box.y + box.height;
  const whiteBottom = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM;
  const leftover = whiteBottom - whiteTop;
  if (leftover <= blockHeight) return whiteTop + 16;
  return whiteTop + (leftover - blockHeight) / 2;
}

function signatureLine(label) {
  return {
    margin: [0, 14, 0, 0],
    columns: [
      { width: '*', text: '' },
      {
        width: 'auto',
        table: {
          widths: ['auto', 220],
          body: [[
            {
              text: `${label}:`,
              border: [false, false, false, false],
              margin: [0, 0, 8, 0]
            },
            {
              text: ' ',
              decoration: 'underline',
              border: [false, false, false, true],
              margin: [0, 0, 0, 0]
            }
          ]]
        },
        layout: {
          hLineWidth: (i) => (i === 1 ? 0.75 : 0),
          vLineWidth: () => 0,
          hLineColor: () => COLORS.black,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 1
        }
      },
      { width: '*', text: '' }
    ]
  };
}

export function buildDocDefinitionV2(submission, systemData, hoursData, options = {}) {
  const content = buildProposalContentV2(submission, systemData, hoursData, options);
  const { cover, overview, systems, controllers, totals } = content;
  const coverBand = bleedBand(COLORS.orange, [
    { text: cover.poLine, margin: [0, 8, 0, 8] },
    { text: cover.clientLine, margin: [0, 8, 0, 8] },
    { text: cover.locationLine, margin: [0, 8, 0, 8] }
  ], 'center');
  const overviewBand = bleedBand(COLORS.charcoal, [
    { text: overview.roomsAndSystems, margin: [8, 4, 8, 8] },
    { text: overview.controllers, margin: [8, 4, 8, 8] },
    { text: overview.additional, margin: [8, 4, 8, 8] },
    { text: overview.commissioning, margin: [8, 4, 8, 4] }
  ], 'left');
  const systemsBand = bleedBand(
    COLORS.green,
    systemSectionRows(systems.sections),
    'center'
  );
  const controllersBand = bleedBand(
    COLORS.steel,
    qtyRows(controllers.lines),
    'center'
  );
  const hoursBand = bleedBand(
    COLORS.orange,
    [{ text: totals.hoursLine, margin: [0, 4, 0, 4] }],
    'center'
  );

  return {
    pageSize: 'LETTER',
    pageMargins: [0, PAGE_MARGIN_TOP, 0, PAGE_MARGIN_BOTTOM],
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
      margin: [40, 12, 40, 0]
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
      { image: rtiLogo, fit: [140, 56], alignment: 'center', margin: [0, 8, 0, 16] },
      coverBand.node,

      { text: '', pageBreak: 'before' },
      pageTitle(overview.title),
      overviewBand.node,

      { text: '', pageBreak: 'before' },
      pageTitle(systems.title),
      systemsBand.node,

      { text: '', pageBreak: 'before' },
      pageTitle(controllers.title),
      controllersBand.node,

      { text: '', pageBreak: 'before' },
      pageTitle(totals.title),
      hoursBand.node,
      {
        absolutePosition: {
          x: 0,
          y: belowBandCenterY(hoursBand.box, signatureBlockHeight())
        },
        alignment: 'center',
        stack: [
          { text: totals.acceptance, alignment: 'center', margin: [0, 0, 0, 4] },
          signatureLine(totals.signatureLabel),
          signatureLine(totals.printNameLabel),
          signatureLine(totals.dateLabel)
        ]
      }
    ]
  };
}

export async function generateProposalPdfV2(submission, systemData, hoursData, options = {}) {
  const docDefinition = buildDocDefinitionV2(submission, systemData, hoursData, options);
  const pdf = pdfMake.createPdf(docDefinition);
  return pdf.getBuffer();
}
