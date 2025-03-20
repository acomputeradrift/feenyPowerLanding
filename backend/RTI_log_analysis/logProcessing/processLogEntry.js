import { handleSystemManagerLogTypes } from "../driverTypes/handleSystemManagerLogs.js";
import { handleDiagnosticLogTypes } from "../driverTypes/handleDiagnosticLogs.js";
import { handlePortLogTypes } from "../driverTypes/handlePortLogs.js";
import { handleVauxLogTypes } from "../driverTypes/handleVauxLogs.js";
import { handleLutronCasetaLogTypes } from "../driverTypes/handleLutronCasetaLogs.js";
import { handleVantageLogTypes } from "../driverTypes/handleVantageLogs.js";
import { handleLayerSwitchLogs } from "../driverTypes/handleLayerSwitchLogs.js";
import { handleCBUSLogTypes } from "../driverTypes/handleCBUSLogs.js";
import { handleAD64LogTypes } from "../driverTypes/handleAD64Logs.js";
import { handleCoolMasterNetLogTypes } from "../driverTypes/handleCoolMasterNetLogs.js";

export function processLogEntry(text, mappings) {
    switch (true) {
        case text.includes('System Manager') || text.startsWith('Change to page'):
            return handleSystemManagerLogTypes(text, mappings.sourceNames, mappings.pageNames);
        case text.includes('Diagnostics'):
            return handleDiagnosticLogTypes(text);
        case text.includes('Layer Switch'):
            return handleLayerSwitchLogs(text);
        case text.includes('Clipsal C-Bus'):
            return handleCBUSLogTypes(text, mappings.loadNames);
        case text.includes('Lutron Caseta'):
            return handleLutronCasetaLogTypes(text);
        case text.includes('- Port'):
            return handlePortLogTypes(text, mappings.portNames);
        case text.includes('Vaux Lattis Matrix'):
            return handleVauxLogTypes(text, mappings.audioInputNames, mappings.audioOutputNames);
        case text.includes('Vantage InFusion'):
            return handleVantageLogTypes(text, mappings.loadNames, mappings.buttonNames, mappings.taskNames);
        case text.includes('AD-64'):
            return handleAD64LogTypes(text);
        case text.includes('CoolMasterNet'):
            return handleCoolMasterNetLogTypes(text);
        default:
            return text; // Return unhandled log types as is
    }
}
