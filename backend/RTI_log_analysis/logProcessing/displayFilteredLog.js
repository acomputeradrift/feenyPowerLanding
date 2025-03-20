import fs from 'fs';
import { htmlOutputPath } from '../config/paths.js';
import { processLogEntry } from './processLogEntry.js';

export function displayFilteredLog(logEntries, mappings) {
    let htmlLogContent = `<html><head><style>
        body { font-family: monospace; background: #121212; color: #fff; padding: 10px; }
        .macro { color: orange; }
        .systemMacro { color: yellow; }
        .command { color: pink; }
        .event { color: magenta; }
        .connected { color: limegreen; }
        .alert { color: red; }
    </style></head><body><h2>Filtered Log Entries</h2><pre>`;

    logEntries.forEach(entry => {
        let processedText = processLogEntry(entry.text, mappings);
        if (!processedText) return;
        
        let htmlClass = "";
        let line = `[ID: ${entry.id}] [${entry.time}] ${processedText}`;

        switch (true) {
            case processedText.includes('Macro - Start') || entry.text.includes('Macro - End'):
                htmlClass = "macro";
                break;
            case processedText.includes('System macro'):
                htmlClass = "systemMacro";
                break;
            case processedText.includes('Command:'):
                htmlClass = "command";
                break;
            case processedText.includes('Driver Event'):
                htmlClass = "event";
                break;
            case processedText.includes('disconnected') || processedText.includes('Failed') || processedText.includes('Offline'):
                htmlClass = "alert";
                break;
            case processedText.includes('connected') || processedText.includes('Online'):
                htmlClass = "connected";
                break;
        }

        htmlLogContent += `<span class="${htmlClass}">${line}</span><br>`;
    });

    htmlLogContent += "</pre></body></html>";
    fs.writeFileSync(htmlOutputPath, htmlLogContent, 'utf8');
    console.log(`\n✅ Log saved to ${htmlOutputPath}`);
}
