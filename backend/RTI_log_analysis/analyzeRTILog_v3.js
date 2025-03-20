import fs from 'fs';
import { loadSpreadsheet } from './loaders/loadSpreadsheet.js';
import { loadAllMappings } from './loaders/loadAllMappings.js';
import { displayFilteredLog } from './logProcessing/displayFilteredLog.js';
import { logFilePath } from './config/paths.js';

// Load spreadsheet once and map lists
const sheets = loadSpreadsheet();
const mappings = loadAllMappings(sheets);

// Read log file
fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    try {
        const logJson = JSON.parse(data);
        if (!logJson.systemLog || !Array.isArray(logJson.systemLog)) {
            console.error('Invalid log format: Expected "systemLog" to be an array');
            return;
        }
        displayFilteredLog(logJson.systemLog, mappings);
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
});
