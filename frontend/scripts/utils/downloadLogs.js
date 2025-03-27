//import RubikNormal from '/fonts/Rubik-Regular-normal.js'; // You’ll create/export this using jsPDF font converter

export function generatePaginatedPDF(logEntries, filters, originalFilename) {
  const jsPDF = window.jspdf.jsPDF;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // Embed Rubik font
  // pdf.addFileToVFS('Rubik-Regular-normal.ttf', RubikNormal);
  // pdf.addFont('Rubik-Regular-normal.ttf', 'Rubik', 'normal');
  // pdf.setFont('Rubik');

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 40;
  const headerHeight = 160;
  const footerHeight = 40;
  const lineHeight = 14;
  const logBoxPadding = 12;

  let pageNumber = 1;

  // Draw logo (optional fallback if it fails)
  const logo = new Image();
  logo.src = '/images/feeny-logo-white.png';

  const drawHeader = () => {
    // Logo centered
    pdf.addImage(logo, 'PNG', pageWidth / 2 - 40, 40, 80, 80); // Keep aspect ratio manually
    let y = 130;

    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0); // black text

    pdf.text(`Generated: ${new Date().toLocaleString()}`, marginX, y); y += 14;
    pdf.text(`Filename: ${originalFilename || 'N/A'}`, marginX, y); y += 14;

    const timeRange = filters.startTime || filters.endTime
      ? `${filters.startTime || '...'} → ${filters.endTime || '...'}`
      : 'N/A';
    pdf.text(`Time Range: ${timeRange}`, marginX, y); y += 14;

    pdf.text(`Filter Keyword: ${filters.keyword || 'N/A'}`, marginX, y);
  };

  const drawFooter = (pageNum) => {
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(`Page ${pageNum}`, pageWidth - marginX - 50, pageHeight - 20);
  };

  const drawLogBoxBackground = (yStart, height) => {
    pdf.setFillColor(43, 43, 45); // #2b2b2d
    pdf.setDrawColor(119);        // #777
    pdf.rect(marginX, yStart, pageWidth - 2 * marginX, height, 'FD');
  };

  const renderLogs = (startY, maxY) => {
    let y = startY;

    for (let i = 0; i < logEntries.length; i++) {
      const entry = logEntries[i];
      const text = `[ID: ${entry.id}] [${entry.time}] ${entry.text}`;
      const color = getColorForClass(entry.class);

      const lines = pdf.splitTextToSize(text, pageWidth - 2 * marginX - 2 * logBoxPadding);

      for (const line of lines) {
        if (y + lineHeight > maxY) {
          drawFooter(pageNumber);
          pdf.addPage();
          pageNumber++;
          y = marginX + logBoxPadding;

          drawLogBoxBackground(marginX, pageHeight - marginX - footerHeight);
        }

        pdf.setTextColor(...color);
        pdf.setFontSize(10);
        pdf.text(line, marginX + logBoxPadding, y);
        y += lineHeight;
      }

      // Remove rendered entry
      logEntries.splice(i--, 1);
    }

    return y;
  };

  // First page
  drawHeader();
  const firstLogY = headerHeight + 20;
  const firstLogHeight = pageHeight - firstLogY - footerHeight;
  drawLogBoxBackground(firstLogY, firstLogHeight);
  renderLogs(firstLogY + logBoxPadding, pageHeight - footerHeight);

  drawFooter(pageNumber);
  pdf.save('processed_log.pdf');
}

function getColorForClass(className) {
  switch (className) {
    case 'macro':        return [255, 165, 0];     // orange
    case 'systemMacro':  return [255, 255, 0];     // yellow
    case 'command':      return [255, 192, 203];   // pink
    case 'event':        return [255, 0, 255];     // magenta
    case 'connected':    return [50, 205, 50];     // limegreen
    case 'alert':        return [255, 0, 0];       // red
    default:             return [255, 255, 255];   // white
  }
}


function addPageNumber(pdf, number, pageWidth, pageHeight, marginSides) {
  pdf.setFont('Courier', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80);
  pdf.text(`Page ${number}`, pageWidth - marginSides - 50, pageHeight - 20);
}
