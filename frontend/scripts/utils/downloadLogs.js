

export function generatePaginatedPDF(logEntries, filters, originalFileName) {
  console.log(`Original FileName in generatePDF: ${originalFileName}`);
  const jsPDF = window.jspdf.jsPDF;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  //Embed Rubik font


  pdf.setFont('ariel', 'normal'); // Monospace, clean

  

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
    // pdf.addImage(logo, 'PNG', pageWidth / 2 - 40, 40, 80, 80); // Keep aspect ratio manually
    let y = 130;
    const logoWidth = 100;
    const logoAspect = logo.height / logo.width;
    const logoHeight = logoWidth * logoAspect;
    const logoX = (pageWidth - logoWidth) / 2;

    pdf.addImage(logo, 'PNG', logoX, 40, logoWidth, logoHeight);


    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0); // black text

    pdf.text(`Generated: ${formatDateTimeLocal(new Date())}`, marginX, y); y += 14;
    pdf.text(`Filename: ${originalFileName || 'N/A'}`, marginX, y); y += 14;

    let timeRange;
    if (filters.startTime && filters.endTime) {
      timeRange = `${formatDateTimeLocal(filters.startTime)} to ${formatDateTimeLocal(filters.endTime)}`;
    } else if (filters.startTime) {
      timeRange = `${formatDateTimeLocal(filters.startTime)} onward`;
    } else if (filters.endTime) {
      timeRange = `until ${formatDateTimeLocal(filters.endTime)}`;
    } else {
      timeRange = 'N/A';
    }

    pdf.text(`Time Range: ${timeRange}`, marginX, y); y += 14;

    pdf.text(`Filter Keyword: ${filters.keyword || 'N/A'}`, marginX, y);
    // pdf.text(`Generated: ${formatDateTimeLocal(new Date())}`, marginX, y); y += 14;

    // pdf.text(`Filename: ${originalFileName || 'N/A'}`, marginX, y); y += 14;

    // let timeRange;
    // if (filters.startTime && filters.endTime) {
    //   timeRange = `${filters.startTime} to ${filters.endTime}`;
    // } else if (filters.startTime) {
    //   timeRange = `${filters.startTime} onward`;
    // } else if (filters.endTime) {
    //   timeRange = `until ${filters.endTime}`;
    // } else {
    //   timeRange = 'N/A';
    // }

    // pdf.text(`Time Range: ${timeRange}`, marginX, y);
    // y += 14;


    // pdf.text(`Filter Keyword: ${filters.keyword || 'N/A'}`, marginX, y);
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
      const text = `[${entry.time}] ${entry.text}`;
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

function formatDateTimeLocal(value) {
  const date = new Date(value);
  const pad = (n) => n.toString().padStart(2, '0');

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  let hour = date.getHours();
  const minutes = pad(date.getMinutes());
  const isAM = hour < 12;
  const period = isAM ? 'a.m.' : 'p.m.';

  hour = hour % 12;
  hour = hour === 0 ? 12 : hour;

  return `${year}-${month}-${day}, ${hour}:${minutes} ${period}`;
}

