const debug1On = false;
const debug2On = false;

export function handleAD64LogTypes(text) {
    switch (true) {
        case text.includes("Queue Device"):
            return null;    
        case text.includes("immediate TX"):
            return null;  
        case text.includes("Zone Commands\\Power"):
            return handleAD64ZonePowerCommands(text);
        case text.includes("Zone Commands\\Volume"):
            return handleAD64ZonePowerCommands(text);
        default:
            if (debug1On) { console.log(`⚠️ Undefined AD64 Log Type: ${text}`); }
            return text; // Unhandled log type
    }
}

function handleAD64ZoneVolumeCommands(text) {
    if (debug1On) { console.log(`📢 handleAD64ZoneVolumeCommands called: ${text}`); }

    let result = text.replace(/Driver - Command:'RTI AD-64\\Zone Commands\\(.*?)\((.*?)\)'.*$/, 
    (match, command, zoneName) => {
        return `Driver Command: '${zoneName} ${command} (AD-64)'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleAD64ZonePowerCommands(text) {
    if (debug1On) { console.log(`📢 handleAD64ZonePowerCommands called: ${text}`); }

    let result = text.replace(/Driver - Command:'RTI AD-64\\Zone Commands\\(.*?)\((.*?)\)'.*$/, 
    (match, command, zoneName) => {
        return `Driver Command: '${zoneName} ${command} (AD-64)'`;
    });

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

