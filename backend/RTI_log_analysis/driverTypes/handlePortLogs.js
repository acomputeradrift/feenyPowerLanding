const debug1On = false;
const debug2On = false;


export function handlePortLogTypes(text, portNames){
    //console.log('Handle Port Logs Called');
    switch (true) {
        case text.includes("RTI RCM-12 Relay Module"): // Relay IR Command
            return handleRCMCommands(text, portNames);
        case text.includes("IR - Port"): // Standard IR Command
            return handleStandardIRCommands(text);
        case text.includes('Relay/Trigger - Port'):
             return handleRelayTriggerCommands(text);
        case text.includes("Serial - Port"): // RS232 Command
            return handleRS232CommandTypes(text);
        default:
            return text; // Unhandled IR log type, return unchanged
    }
}

//--------------------------------------------RELAY/TRIGGER LOGS

// Handles Relay/Trigger log entries
function handleRelayTriggerCommands(text) {
    if (debug1On) {console.log(`📢 handleRelayTriggerCommands called: ${text}`);}
    let result = text.replace(/Relay\/Trigger - Port:'(.*?)','(.*?)' Action:(ON|OFF)/, (match, port, deviceName, action) => {
        let triggerState = action === "ON" ? "Trigger On" : "Trigger Off";
        return `Relay/Trigger Command: '${deviceName} ${triggerState} (${port}->Internal Ports)'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}
// Handles standard IR commands (Direct Mapping)
function handleStandardIRCommands(text) {
    if (debug1On) {console.log(`📢 handleStandardIRCommands called: ${text}`);}
    let result = text.replace(/IR - Port:'(.*?)','(.*?)' Command:'(.*?)' .*$/, (match, port, deviceName, command) => {
        let cleanedCommand = command.replace(/\s*\[\s*\/\s*\/\s*\]\s*/, ''); // Targeted removal of [ /  / ]
        return `IR Command: '${cleanedCommand} (${port}->${deviceName})'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleRCMCommands(text, portNames) {
    if (debug1On) { console.log(`📢 handleRCMCommands called: ${text}`); }
    let result = text.replace(/IR - Port:'(.*?)','RTI (RCM-\d+) Relay Module' Command:'RELAY (\d+) (OPEN|CLOSE).*?'\s*(Sustain:\w+)?/, 
    (match, moduleName, moduleType, portIndex, action) => {
        // Construct the lookup key for portMap
        let key = `${moduleName}_${moduleType}_${portIndex}`;

        // Look up the port name in portMap (no fallback needed)
        let portName = portNames[key];

        // Determine the relay state
        let triggerState = action === "OPEN" ? "Off" : "On"; // OPEN -> Off, CLOSE -> On

        // Format output based on whether we found a port name
        let formattedPortName = (portName === "(No Port Name Found)") 
            ? `RELAY ${portIndex} (⚠️No Port Name Found)` 
            : portName;
        return `IR Command: '${formattedPortName} ${triggerState} (${moduleName}->${moduleType})'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

// Handles RS232 Commands

function handleRS232CommandTypes(text){
    switch (true) {
        case text.includes("Baud:") || text.includes("Data:"): // Don't Need
            return null;
        case text.includes('Command:'):
             return handleRS232Commands(text);
        default:
            return text; // Unhandled log type, return unchanged
    }
}

function handleRS232Commands(text) {
    if (debug1On) {console.log(`📢 handleRS232Commands called: ${text}`);}
    let result = text.replace(/Serial - Port:'(.*?)','(?:\d+ - )?(.*?)' Command:'(.*?)'.*$/, 
    (match, moduleName, portName, command) => {
        // Format the final output
        return `Serial Command: '${portName} ${command} (${moduleName}->Internal Ports)'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}



