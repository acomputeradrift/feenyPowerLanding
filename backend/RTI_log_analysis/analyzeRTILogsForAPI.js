// /RTI_log_analysis/analyzeRTILogsForAPI.js
import fs from 'fs/promises';
import { loadSpreadsheet } from './loaders/loadSpreadsheet.js';
import { loadAllMappings } from './loaders/loadAllMappings.js';
import { processedLogEntryJSON } from './logProcessing/processedLogEntryJSON.js';
import { reconstructFullTimestamps } from '../utils/reconstructFullTimestamps.js';

export async function analyzeRTILogsForAPI(logFilePath, mapFilePath) {
  try {
    // Step 1: Load spreadsheet and mappings
    const sheets = loadSpreadsheet(mapFilePath);
    const mappings = loadAllMappings(sheets);

    // Step 2: Read and parse log file
    const data = await fs.readFile(logFilePath, 'utf8');
    const logJson = JSON.parse(data);

    if (!logJson.systemLog || !Array.isArray(logJson.systemLog)) {
      throw new Error('Invalid log format: Expected "systemLog" to be an array');
    }

    // 🔧 Insert full timestamp logic
    const logsWithTimestamps = reconstructFullTimestamps(logJson.systemLog);

    // Step 3: Process logs
    const processed = processedLogEntryJSON(logsWithTimestamps, mappings);

    return processed;
  } catch (err) {
    console.error('❌ Error in analyzeRTILogsForAPI:', err);
    throw err;
  }
}

// export async function analyzeRTILogsForAPI(logFilePath, mapFilePath) {
//   try {
//     // Step 1: Load spreadsheet and mappings
//     const sheets = loadSpreadsheet(mapFilePath);
//     const mappings = loadAllMappings(sheets);

//     // Step 2: Read and parse log file
//     const data = await fs.readFile(logFilePath, 'utf8');
//     const logJson = JSON.parse(data);

//     if (!logJson.systemLog || !Array.isArray(logJson.systemLog)) {
//       throw new Error('Invalid log format: Expected "systemLog" to be an array');
//     }

//     // Step 3: Process logs using the same logic as displayFilteredLog (via processedLogEntryJSON)
//     const processed = processedLogEntryJSON(logJson.systemLog, mappings);

//     return processed;
//   } catch (err) {
//     console.error('❌ Error in analyzeRTILogsForAPI:', err);
//     throw err;
//   }
// }
