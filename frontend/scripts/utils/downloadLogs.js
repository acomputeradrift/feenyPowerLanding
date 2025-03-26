// scripts/utils/downloadLogs.j

export function generatePaginatedPDF(logEntries, filters) {
  console.log('generatePaginatedPDF called');
  const jsPDF = window.jspdf.jsPDF;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const lineHeight = 14;
  const marginTop = 60;
  const marginLeft = 40;
  const marginRight = 40;
  const maxHeight = pdf.internal.pageSize.getHeight() - marginTop - 40;

  let cursorY = marginTop;

  // ✅ Optional Header
  pdf.setFont('Courier', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Processed Log - Feeny Power & Control Ltd', marginLeft, cursorY);
  cursorY += 20;

  pdf.setFontSize(10);
  pdf.setFont('Courier', 'normal');
  pdf.text(`Time Range: ${filters.startTime || 'Any'} → ${filters.endTime || 'Any'}`, marginLeft, cursorY);
  cursorY += 14;
  pdf.text(`Filter Keyword: ${filters.keyword || 'None'}`, marginLeft, cursorY);
  cursorY += 14;
  pdf.text(`Find Term: ${filters.findTerm || 'None'}`, marginLeft, cursorY);
  cursorY += 20;

  // ✅ Loop through logs
  logEntries.forEach((entry, index) => {
    const color = getColorForClass(entry.class);
    pdf.setTextColor(...color);
    const text = `[ID: ${entry.id}] [${entry.time}] ${entry.text}`;

    // Split long lines
    const lines = pdf.splitTextToSize(text, pdf.internal.pageSize.getWidth() - marginLeft - marginRight);
    lines.forEach(line => {
      if (cursorY + lineHeight > maxHeight) {
        pdf.addPage();
        cursorY = marginTop;
      }
      pdf.text(line, marginLeft, cursorY);
      cursorY += lineHeight;
    });
  });

  pdf.save('processed_log.pdf');
}

function getColorForClass(className) {
  switch (className) {
    case 'macro':        return [255, 165, 0];    // orange
    case 'systemMacro':  return [255, 255, 0];    // yellow
    case 'command':      return [255, 192, 203];  // pink
    case 'event':        return [255, 0, 255];    // magenta
    case 'connected':    return [50, 205, 50];    // limegreen
    case 'alert':        return [255, 0, 0];      // red
    default:             return [255, 255, 255];  // white
  }
}



// export function downloadLogsAsPDF(containerId = 'logContainer') {
//     const logContainer = document.getElementById(containerId);
  
//     const opt = {
//       margin:       0.5,
//       filename:     'processed_log.pdf',
//       image:        { type: 'jpeg', quality: 0.98 },
//       html2canvas:  { scale: 2 },
//       jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
//     };
  
//     html2pdf().set(opt).from(logContainer).save();
//   }
  