const debug1On = false;
const debug2On = false;

//-----------------------------------------------------VAUX

export function handleVauxLogTypes(text, audioInputNames, audioOutputNames) {
    switch (true) {
        case text.includes("Output Settings\\Source Select"):
            return handleVauxSourceSelectCommands(text, audioInputNames, audioOutputNames);
        case text.includes("Output Settings\\Output Mute") || text.includes("Output Settings\\Volume") : 
            return handleVauxVolumeCommands(text, audioOutputNames);
        default:
            return text; 
    }
}

function handleVauxVolumeCommands(text, audioZoneOutputMap) {
    if (debug1On) { console.log(`📢 handleVauxVolumeCommands called: ${text}`); }
    // Match command, optional extra text, and output index
    let match = text.match(/Output Settings\\(.+?)\(([^,\d]+)?,?\s*(\d+)\)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let command = match[1].trim(); // Extract command (e.g., "Volume Up")
    let extraText = match[2]?.trim(); // Extract extra text (e.g., "Toggle") or undefined
    let outputIndex = match[3].trim(); // Extract output index (e.g., "13")

    // Lookup output name using audioZoneOutputMap
    let outputName = audioZoneOutputMap[outputIndex];

    // Format the final output
    let result = `Driver Command: '${outputName} ${command}${extraText ? " " + extraText : ""} (Vaux Lattis Matrix)'`;
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleVauxSourceSelectCommands(text, audioInputNames, audioOutputNames) {
    if (debug1On) { console.log(`📢 handleVauxSourceSelectCommands called: ${text}`); }

    // Match Source Select command with input and output index
    let match = text.match(/Output Settings\\Source Select\(.*?, (\d+), (\d+)\)/);
    if (!match) {
        console.log(`❌ No match found for Source Select log: ${text}`);
        return text; // Return unchanged if no match
    }

    let outputIndex = match[1].trim(); // Extract Output Index (e.g., 12)
    let inputIndex = match[2].trim(); // Extract Input Index (e.g., 9)

    // Lookup names using mapping
    let inputName = audioInputNames[inputIndex];  // Maps Input Index → Input Name
    let outputName = audioOutputNames[outputIndex];  // Maps Output Index → Output Name

    // Format the final output
    let result = `Driver Command: '${inputName} selected in ${outputName} (Vaux Lattis Matrix)'`;
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}
