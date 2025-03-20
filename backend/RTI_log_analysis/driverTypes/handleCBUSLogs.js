const debug1On = false;
const debug2On = false;

export function handleCBUSLogTypes(text, loadNames) {
    switch (true) {
        case text.includes("Driver event"):
            return handleCBUSDriverEvent(text, loadNames);
        case text.includes("Driver - Command"):
            return handleCBUSDriverCommand(text, loadNames);
        default:
            return text; // Unhandled log type
    }
}

function handleCBUSDriverEvent(text, loadNames) {
    if (debug1On) { console.log(`📢 handleCBUSDriverEvent called: ${text}`); }
    let match = text.match(/App (\d+), Group (\d+) (\w+)/);
    if (!match) return text; // If no match, return unchanged

    let [, appNum, loadIndex, state] = match;

    switch (appNum) {
        case "56": // Lighting
            let loadName = loadNames[loadIndex] || `Group ${loadIndex}`;
            let result = `Driver Event: 'When ${loadName} ${state} happens (Clipsal C-Bus)'`;
            if (debug2On) { console.log(`✅ ${result}`); }
            return result;
        default:
            if (debug2On) { console.log(`⚠️  App Mismatch: ${text}`); };
            return text; // Unhandled App category
    }
}

function handleCBUSDriverCommand(text, loadNames) {
    if (debug1On) { console.log(`📢 handleCBUSDriverCommand called: ${text}`); }
    let match = text.match(/Immediate Switch\((\d+), (\d+), (\d+)\)/);
    if (!match) return text; // If no match, return unchanged

    let [, stateNum, groupId, category] = match;

    switch (category) {
        case "56": // Lighting
            let state = stateNum === "1" ? "Off" : "On";
            let groupName = loadNames[groupId] || `Group ${groupId}`;
            let result = `Driver Command: '${groupName} ${state} (Clipsal C-Bus)'`;
            if (debug2On) { console.log(`✅ ${result}`); };
            return result;
        default:
            if (debug2On) { console.log(`⚠️  App Mismatch: ${text}`); };
            return text; // Unhandled category
    }
}