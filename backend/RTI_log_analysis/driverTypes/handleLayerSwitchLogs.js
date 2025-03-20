const debug1On = false;
const debug2On = false;

export function handleLayerSwitchLogs(text) {
    if (debug1On) { console.log(`📢 handleLayerSwitchLogs called: ${text}`); }
    // Match everything before the last `(` as Group Name, and the last `()` content as Layer Name
    let match = text.match(/Ex\. Group: (.+)\(([^()]+)\)\s*'?/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }
    let groupName = match[1].trim(); // Extract Group Name (keeps everything before last `(`)
    let layerName = match[2].trim(); // Extract Layer Name (last parentheses content)
    let result = `Driver Command: 'Set selected Layer to ${groupName} -> ${layerName} (Layer Switch)'`;
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}