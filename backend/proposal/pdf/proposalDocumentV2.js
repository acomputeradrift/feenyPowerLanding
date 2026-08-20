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
const SIGNATURE_BLOCK_WIDTH = PAGE_WIDTH - BAND_PAD_X * 2;
const SIGNATURE_LABEL_WIDTH = 130;
const SIGNATURE_LINE_WIDTH = SIGNATURE_BLOCK_WIDTH - SIGNATURE_LABEL_WIDTH;
// Roboto Regular: font.lineHeight(16) === 18.75, times the band's lineHeight 1.25.
const LINE_HEIGHT = 18.75 * 1.25;
const MEASURE_SLOT = 800;
const CONTENT_WIDTH = PAGE_WIDTH - BAND_PAD_X * 2;
const CHARS_PER_LINE = Math.floor(CONTENT_WIDTH / (BAND_FONT_SIZE * 0.52));

function imageDataUrl(filename) {
  const bytes = readFileSync(path.join(frontendImages, filename));
  return `data:image/png;base64,${bytes.toString('base64')}`;
}

const feenyLogo = imageDataUrl('feeny-logo-white.png');
const rtiLogo = imageDataUrl('rti-logo-bigger.png');
const RTI_LOGO_FIT = [480, 76];
// Feeny is 4:3 and fills its box; the RTI PNG is padded, so the purple mark
// is ~152×69 inside 480×76. Size Feeny just larger than that visible mark.
const FEENY_LOGO_FIT = [200, 150];
const RTI_CAPTION_SIZE = 11;
const RTI_CAPTION_GAP = 8;
const RTI_CAPTION_LINE = RTI_CAPTION_SIZE * 1.25;

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

function bandTable(fillColor, children, alignment = 'center') {
  const ink = bandInk(fillColor);
  return {
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
  };
}

function parseFullBleedHeights(pdfBuffer, origins) {
  const rects = [...pdfBuffer.toString('latin1').matchAll(/0(?:\.0+)? ([\d.]+) 612(?:\.0+)? ([\d.]+) re/g)]
    .map((match) => ({ y: Number(match[1]), height: Number(match[2]) }))
    .filter((rect) => rect.height > 10 && rect.height < MEASURE_SLOT);
  return origins.map((origin) => {
    const rect = rects.find((item) => Math.abs(item.y - origin) < 0.5);
    if (!rect) {
      throw new Error(`Unable to measure proposal band height at y=${origin}`);
    }
    return rect.height;
  });
}

async function measureBandHeights(tables) {
  const origins = tables.map((_, index) => index * MEASURE_SLOT);
  const probe = {
    pageSize: { width: PAGE_WIDTH, height: MEASURE_SLOT * tables.length + 200 },
    pageMargins: 0,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 11,
      lineHeight: 1.25
    },
    compress: false,
    content: tables.map((table, index) => ({
      ...table,
      absolutePosition: { x: 0, y: origins[index] }
    }))
  };
  const pdf = await pdfMake.createPdf(probe).getBuffer();
  return parseFullBleedHeights(pdf, origins);
}

async function bleedBands(specs) {
  const tables = specs.map((spec) => bandTable(spec.fillColor, spec.children, spec.alignment));
  const heights = await measureBandHeights(tables);
  return tables.map((table, index) => {
    const height = heights[index];
    const y = (PAGE_HEIGHT - height) / 2;
    return {
      box: {
        contentHeight: height - BAND_PAD_Y * 2,
        height,
        y,
        padY: BAND_PAD_Y
      },
      node: {
        absolutePosition: { x: 0, y },
        ...table
      }
    };
  });
}

function pageTitle(text) {
  return {
    text,
    alignment: 'center',
    bold: true,
    fontSize: 22,
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
  return 28 + 8 + 3 * (12 + 14 + 4);
}

function belowBandCenterY(box, blockHeight) {
  const whiteTop = box.y + box.height;
  const whiteBottom = PAGE_HEIGHT - PAGE_MARGIN_BOTTOM;
  const leftover = whiteBottom - whiteTop;
  if (leftover <= blockHeight) return whiteTop + 16;
  return whiteTop + (leftover - blockHeight) / 2;
}

function signatureTable(labels) {
  return {
    table: {
      widths: [SIGNATURE_LABEL_WIDTH, SIGNATURE_LINE_WIDTH],
      body: labels.map((label) => [
        {
          text: `${label}:`,
          border: [false, false, false, false],
          alignment: 'left'
        },
        {
          border: [false, false, false, false],
          canvas: [{
            type: 'line',
            x1: 0,
            y1: 12,
            x2: SIGNATURE_LINE_WIDTH,
            y2: 12,
            lineWidth: 0.75,
            lineColor: COLORS.black
          }]
        }
      ])
    },
    layout: {
      defaultBorder: false,
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 10,
      paddingBottom: () => 10
    }
  };
}

export async function buildDocDefinitionV2(submission, systemData, hoursData, options = {}) {
  const content = buildProposalContentV2(submission, systemData, hoursData, options);
  const { cover, overview, systems, controllers, totals } = content;
  const [
    coverBand,
    overviewBand,
    systemsBand,
    controllersBand,
    hoursBand
  ] = await bleedBands([
    {
      fillColor: COLORS.orange,
      children: [
        { text: cover.poLine, margin: [0, 8, 0, 8] },
        { text: cover.clientLine, margin: [0, 8, 0, 8] },
        { text: cover.locationLine, margin: [0, 8, 0, 8] }
      ],
      alignment: 'center'
    },
    {
      fillColor: COLORS.charcoal,
      children: [
        { text: overview.roomsAndSystems, margin: [8, 4, 8, 8] },
        { text: overview.controllers, margin: [8, 4, 8, 8] },
        ...(overview.additional
          ? [
            { text: 'Additional Info:', margin: [8, 4, 8, 2] },
            { text: overview.additional, margin: [8, 0, 8, 8] }
          ]
          : []),
        { text: overview.commissioning, margin: [8, 4, 8, 4] }
      ],
      alignment: 'left'
    },
    {
      fillColor: COLORS.green,
      children: systemSectionRows(systems.sections),
      alignment: 'center'
    },
    {
      fillColor: COLORS.steel,
      children: qtyRows(controllers.lines),
      alignment: 'center'
    },
    {
      fillColor: COLORS.orange,
      children: [{ text: totals.hoursLine, margin: [0, 4, 0, 4] }],
      alignment: 'center'
    }
  ]);

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
      { image: feenyLogo, fit: FEENY_LOGO_FIT, alignment: 'center', margin: [0, 0, 0, 16] },
      { text: 'Prepared for:', alignment: 'center', color: COLORS.label, fontSize: RTI_CAPTION_SIZE, margin: [0, 0, 0, 4] },
      { text: cover.contractorName, alignment: 'center', bold: true, fontSize: 16, margin: [0, 0, 0, 2] },
      { text: cover.contractorEmail, alignment: 'center', color: COLORS.label, margin: [0, 0, 0, 20] },
      coverBand.node,
      {
        absolutePosition: {
          x: 0,
          y: belowBandCenterY(coverBand.box, RTI_LOGO_FIT[1]) - RTI_CAPTION_LINE - RTI_CAPTION_GAP
        },
        stack: [
          {
            text: 'An',
            alignment: 'center',
            color: COLORS.label,
            fontSize: RTI_CAPTION_SIZE
          },
          {
            columns: [
              { width: '*', text: '' },
              {
                width: RTI_LOGO_FIT[0],
                image: rtiLogo,
                fit: RTI_LOGO_FIT
              },
              { width: '*', text: '' }
            ],
            margin: [0, RTI_CAPTION_GAP, 0, RTI_CAPTION_GAP]
          },
          {
            text: 'Proposal',
            alignment: 'center',
            color: COLORS.label,
            fontSize: RTI_CAPTION_SIZE
          }
        ]
      },

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
        columns: [
          { width: '*', text: '' },
          {
            width: SIGNATURE_BLOCK_WIDTH,
            stack: [
              {
                text: totals.acceptance,
                alignment: 'left',
                margin: [0, 0, 0, 8]
              },
              signatureTable([
                totals.signatureLabel,
                totals.printNameLabel,
                totals.dateLabel
              ])
            ]
          },
          { width: '*', text: '' }
        ]
      }
    ]
  };
}

export async function generateProposalPdfV2(submission, systemData, hoursData, options = {}) {
  const docDefinition = await buildDocDefinitionV2(submission, systemData, hoursData, options);
  const pdf = pdfMake.createPdf(docDefinition);
  return pdf.getBuffer();
}
