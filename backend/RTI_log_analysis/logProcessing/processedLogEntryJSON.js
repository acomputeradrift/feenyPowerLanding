// processedLogEntryJSON.js
import { processLogEntry } from '../processLogEntry.js';

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

    result.push({
      id: entry.id,
      time: entry.time,
      class: htmlClass,
      text: processedText
    });
  });

  return result;
}
 