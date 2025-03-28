// // processedLogEntryJSON.js

import { processLogEntry } from './processLogEntry.js';

export function processedLogEntryJSON(logEntries, mappings) {
  const result = [];

  logEntries.forEach(entry => {
    const processedText = processLogEntry(entry.text, mappings);
    if (!processedText) return;

    let htmlClass = '';

    switch (true) {
      case processedText.includes('Macro - Start') || entry.text.includes('Macro - End'):
        htmlClass = 'macro';
        break;
      case processedText.includes('System macro'):
        htmlClass = 'systemMacro';
        break;
      case processedText.includes('Command:'):
        htmlClass = 'command';
        break;
      case processedText.includes('Driver Event'):
        htmlClass = 'event';
        break;
      case processedText.includes('disconnected') || processedText.includes('Failed') || processedText.includes('Offline'):
        htmlClass = 'alert';
        break;
      case processedText.includes('connected') || processedText.includes('Online'):
        htmlClass = 'connected';
        break;
    }

    // Format timestamp
    const rawTime = entry.fullTimestamp || entry.time;
    let formattedTime = rawTime;
    if (entry.fullTimestamp) {
      const date = new Date(entry.fullTimestamp);
      const pad = (n) => n.toString().padStart(2, '0');
      formattedTime = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    result.push({
      time: formattedTime,
      class: htmlClass,
      text: processedText
    });
  });

  return result;
}


// import { processLogEntry } from './processLogEntry.js';

// export function processedLogEntryJSON(logEntries, mappings) {
//   const result = [];

//   logEntries.forEach(entry => {
//     const processedText = processLogEntry(entry.text, mappings);
//     if (!processedText) return;

//     let htmlClass = '';

//     switch (true) {
//       case processedText.includes('Macro - Start') || entry.text.includes('Macro - End'):
//         htmlClass = 'macro';
//         break;
//       case processedText.includes('System macro'):
//         htmlClass = 'systemMacro';
//         break;
//       case processedText.includes('Command:'):
//         htmlClass = 'command';
//         break;
//       case processedText.includes('Driver Event'):
//         htmlClass = 'event';
//         break;
//       case processedText.includes('disconnected') || processedText.includes('Failed') || processedText.includes('Offline'):
//         htmlClass = 'alert';
//         break;
//       case processedText.includes('connected') || processedText.includes('Online'):
//         htmlClass = 'connected';
//         break;
//     }

//     result.push({
//       id: entry.id,
//       time: entry.time,
//       class: htmlClass,
//       text: processedText
//     });
//   });

//   return result;
// }
 