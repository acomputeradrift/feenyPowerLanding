const debug1On = false;
const debug2On = false;

export function handleSystemManagerLogTypes(text, sourceNames, pageNames) {
    switch (true) {
        case text.includes("Clock") ||
            text.includes("Popup SysVarChange") ||
            text.includes("Variable Stats") ||
            text.includes("Route Command") ||
            text.includes("strView"):
            //console.log('Removed by filter');
            return null;
        case text.includes('Set Source By Room'):
            //console.log('Filtered by Set Source By Room');
            return handleSetSourceByRoomCommands(text, sourceNames);
        case text.includes('Set Source'):
            //console.log('Filtered by Set Source');
            return handleSetSourceCommands(text, sourceNames);
        case text.includes('Change to page'):
            return handleChangeToPageCommands(text, pageNames);
        case text.includes('Room Off'):
            //console.log('Filtered by Room Off');
            return handleRoomOffCommands(text);
        default:
            return text; // Unhandled log type
    }
}

function handleSetSourceCommands(text, sourceNames) {
    if (debug1On) { console.log(`📢 handleSetSourceCommands called: ${text}`); }
    let match = text.match(/Set Source\((\d+)\)/); // Fix regex: match only the index
    if (!match) return text; // If no match, return unchanged

    let [, sourceIndex] = match; // Only extract the index
    let sourceName = sourceNames[sourceIndex] || "[Unknown Source]"; // Lookup source name
    let result =  `Driver Command: 'Set Source to ${sourceName} (System Manager)'`; // Removed [Hide]
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleSetSourceByRoomCommands(text, sourceNames) {
    if (debug1On) { console.log(`📢 handleSetSourceByRoomCommands called: ${text}`); }
    let match = text.match(/Set Source By Room\((.+?), (\d+)\)/);
    if (!match) {
        //console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let room = match[1].trim(); // Ensure room name is properly extracted
    let sourceIndex = match[2].trim(); // Extract and trim source index
    let sourceName = sourceNames[sourceIndex] || "[Unknown Source]"; // Lookup source name

    let result = `Driver Command: 'Set Source to ${room} ${sourceName} (System Manager)'`; // Removed [Hide]
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleRoomOffCommands(text) {
    if (debug1On) { console.log(`📢 handleRoomOffCommands called: ${text}`); }
    let result = "Driver Command: 'Room Off (System Manager)'";
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleChangeToPageCommands(text, pageNames) {
    if (debug1On) { console.log(`📢 handleChangeToPageCommands called: ${text}`); }

    let result = text.replace(/Change to page (\d+) on device '(.+?)'/g, (match, pageIndex, deviceName) => {
        pageIndex = pageIndex.trim(); // Ensure pageIndex is a string for lookup

        if (pageNames[pageIndex]) {
            let pageName = pageNames[pageIndex]; // Extract the page name

            // If pageName contains a " > " format, adjust it
            if (pageName.includes(" > ")) {
                pageName = pageName.replace(/\(([^()>]+) > .*?\)$/, '($1)');
            }

            return `Change to page ${pageName} on device '${deviceName}' (System Manager)`;
        }
        return match; // If no match is found, return the original text unchanged
    });
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

