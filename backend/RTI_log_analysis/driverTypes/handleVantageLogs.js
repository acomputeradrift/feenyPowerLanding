const debug1On = true;
const debug2On = true;

export function handleVantageLogTypes(text, loadNames, buttonNames, taskNames) {
    switch (true) {
        case text.includes("RX: R:GETCOUNT"):
            //Example: Vantage InFusion - RX: R:GETCOUNT 10
            return null;
        case text.includes("RX: S:LED"):
            // Example: Vantage InFusion - RX: S:LED 178 0 0 0 0 0 0 0 OFF
            return text;
            //return null;
        case text.includes("LOAD"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:LOAD 368 100.000
                return handleVantageLoadCommands(text, loadNames);
            } else {
                //Example: Vantage InFusion - LOAD10ON
                return handleVantageLoadEvents(text, loadNames);
            }
        case text.includes("BTN"):
            if (text.includes("RX: S:")) {
                // Log format: RX: S:BTN 178 PRESS
                return handleVantageButtonCommands(text, buttonNames);
            } else {
                // Log format: BTN178PRESS
                return handleVantageButtonEvents(text, buttonNames);
            }
        case text.includes("TASK"):
            //Example: Vantage InFusion - RX: S:TASK 1030 1 
            return handleVantageTaskCommands(text, taskNames);
        default:
            return text; // Unhandled log type
    }
}
function handleVantageLoadCommands(text, loadNames) {
    if (debug1On) { console.log(`📢 handleVantageLoadCommands called: ${text}`); }

    // Extract Load Index and State Value
    let match = text.match(/S:LOAD\s+(\d+)\s+([\d.]+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let loadIndex = match[1].trim(); // Extract Load Index (e.g., "464")
    let stateValue = parseFloat(match[2]); // Convert state to a number (e.g., "100.000" → 100)

    // Ensure `loadIndex` is a string for correct lookup
    loadIndex = String(loadIndex);

    // Lookup Load Data using loadMap
    let loadName = loadNames[loadIndex];

    // If the load index does not exist in the mapping, format output to indicate missing name
    if (!loadName) {
        loadName = `${loadIndex} (⚠️ No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Load ${loadIndex}`);
    }

    // Convert state value to whole number percentage
    let statePercentage = Math.round(stateValue) + "%";

    // Format final output
    let result = `Driver Event: 'Load - ${loadName} set to ${statePercentage} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

function handleVantageLoadEvents(text, loadNames) {
 //This is the log when RTI sees the Vantage event
    if (debug1On) { console.log(`📢 handleVantageLoadOnOffLogs called: ${text}`); }

    // Match LOAD followed by index and ON/OFF
    let match = text.match(/LOAD(\d+)(ON|OFF)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // Return original if no match
    }

    let rtiIndex = match[1].trim(); // e.g., "31"
    let state = (match[2] === "ON") ? "On" : "Off";

    // Ensure loadIndex is a string for lookup
    rtiIndex = String(rtiIndex);

    // Lookup Load Name
    let loadName = loadNames[rtiIndex];
    if (!loadName) {
        loadName = `${rtiIndex} (⚠️ No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Load ${rtiIndex}`);
    }

    // Format final output
    let result = `Driver Event: 'Load - ${loadName} set to ${state} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}


function handleVantageButtonCommands(text, buttonNames) {
    if (debug1On) { console.log(`📢 handleVantageButtonCommands called: ${text}`); }
    let match = text.match(/(\d+)\s+(PRESS|RELEASE)/i);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let buttonIndex = match[1].trim(); // Extract Button Index
    let action = match[2].trim().toLowerCase(); // Extract Action, ensure lowercase
    // Convert action for proper grammar
    let formattedAction = action === "press" ? "Pressed" : "Released";
    // Lookup Button Name using buttonNames
    let buttonName = buttonNames[buttonIndex];
    if (!buttonName) {
        buttonName = `${buttonIndex} (⚠️ No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Button ${buttonIndex}`);
    }

    // Format final output
    let result = `Driver Command: 'Button ${buttonIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;
    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleVantageButtonEvents(text, buttonNames) {
    //This is the log when RTI sees the Vantage event
    if (debug1On) { console.log(`📢 handleVantageButtonEventss called: ${text}`); }

    // Match BTN followed by index and ON/OFF/PRESS/RELEASE
    let match = text.match(/BTN(\d+)(ON|OFF|PRESS|RELEASE)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let rtiIndex = match[1].trim(); // e.g., "31"
    let rawState = match[2]; // "ON", "OFF", "PRESS", or "RELEASE"

    // Convert action/state to final label
    let formattedAction;
    if (rawState === "ON") {
        formattedAction = "LED On";
    } else if (rawState === "OFF") {
        formattedAction = "LED Off";
    } else if (rawState === "PRESS") {
        formattedAction = "Pressed";
    } else if (rawState === "RELEASE") {
        formattedAction = "Released";
    }

    // Ensure buttonIndex is a string for lookup
    rtiIndex = String(rtiIndex);

    // Lookup Button Name
    let buttonName = buttonNames[rtiIndex];
    if (!buttonName) {
        buttonName = `${rtiIndex} (⚠️ No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Button ${rtiIndex}`);
    }

    // Format final output (with index)
    let result = `Driver Event: 'Button ${rtiIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}


function handleVantageTaskCommands(text, taskNames) {
    // Example: Vantage InFusion -  RX: S:TASK 1382 1
    if (debug1On) { console.log(`📢 handleVantageTaskCommands called: ${text}`); }
    
    // Extract Task Index and State
    let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let taskIndex = match[1].trim(); // Extract Task Index
    let state = match[2].trim(); // Extract State (0 or 1)

    // Map state to "On" or "Off"
    let stateText = state === "1" ? "On" : "Off";

    // Lookup Task Name using taskNames
    let taskName = taskNames[taskIndex];
        // If the load index does not exist in the mapping, format output to indicate missing name
        if (!taskName) {
            taskName = `${taskIndex} (⚠️ No Mapping Info Found)`;
            console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
        }

    // Format final output
    let result = `Driver Event: Task - '${taskName} set to ${stateText} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}
