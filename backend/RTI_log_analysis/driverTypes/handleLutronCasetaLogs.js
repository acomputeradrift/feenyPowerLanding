const debug1On = false;
const debug2On = false;

export function handleLutronCasetaLogTypes(text) {
    switch (true) {
        case text.includes("Dimmers\\Set Dimmer Level"):
            return handleCasetaDimmerCommands(text);
        case text.includes("Switches\\Switch Commands"):
            return handleCasetaSwitchCommands(text);
        default:
            return text; // Unhandled log type
    }
}

// Handles Lutron Caseta Dimmer commands
function handleCasetaDimmerCommands(text) {
    if (debug1On) { console.log(`📢 handleCasetaDimmerCommands called: ${text}`); }
    let result = text.replace(/Driver - Command:'.*Dimmers\\Set Dimmer Level\((.*?) \(ID \d+\), (\d+),.*?\)'.*$/, 
    (match, lightName, dimmerLevel) => {
        return `Driver Command: '${lightName} set to ${dimmerLevel}% (Lutron Caseta)'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleCasetaSwitchCommands(text) {
    if (debug1On) {console.log(`📢 handleCasetaSwitchCommands called: ${text}`);}
    let result = text.replace(/Driver - Command:'.*Switches\\Switch Commands\((.*?) \(ID \d+\), (On|Off|Toggle)\)'.*$/, (match, lightName, state) => {
        if (state === "Toggle") {
            return `Driver Command: '${lightName} was toggled (Lutron Caseta)'`;
        }
        return `Driver Command: '${lightName} switched ${state} (Lutron Caseta)'`;
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}