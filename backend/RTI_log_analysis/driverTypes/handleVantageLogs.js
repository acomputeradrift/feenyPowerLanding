const debug1On = true;
const debug2On = true;

export function handleVantageLogTypes(text, loadNames, buttonNames, taskNames) {
    switch (true) {
        case text.includes("RX: R:GETCOUNT"):
            //Example: Vantage InFusion - RX: R:GETCOUNT 10
            return null;
        case text.includes("RX: S:LED"):
            // Example: Vantage InFusion - RX: S:LED 178 0 0 0 0 0 0 0 OFF
            //return text;
            return null;
        case text.includes("LOAD"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:LOAD 368 100.000
                return handleVantageLoadInfo(text, loadNames);
                //return null;
            } else {
                //Example: Vantage InFusion - LOAD10ON
                return handleVantageLoadCommands(text, loadNames);
            }
        case text.includes("BTN"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:BTN 178 PRESS
                return handleVantageButtonInfo(text, buttonNames);
                //return null;
            } else {
                //Example: Vantage InFusion -  BTN178PRESS
                return handleVantageButtonCommands(text, buttonNames);
            }
        case text.includes("Driver event"):
            // Example: Driver event 'When 'Button 44 - SE (Right) Lamp (VID 178) On' 
            // happens on 'Vantage InFusion\Button LEDs (1-100)''
            return handleVantageDriverEvents(text);
        case text.includes("TASK"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:TASK 1030 
                return handleVantageTaskInfo(text, taskNames);
                //return null;
            } else {
                //Example: Vantage InFusion - TASK43
                return handleVantageTaskCommands(text, taskNames);
            }
        default:
            return text; // Unhandled log type
    }
}
function handleVantageLoadInfo(text, loadNames) {
    //Example: Vantage InFusion - RX: S:LOAD 368 100.000
    if (debug1On) { console.log(`📢 handleVantageLoadInfo called: ${text}`); }

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
        loadName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Load ${loadIndex}`);
    }

    // Convert state value to whole number percentage
    let statePercentage = Math.round(stateValue) + "%";

    // Format final output
    let result = `Driver Info: 'Load ${loadIndex} - ${loadName} set to ${statePercentage} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

function handleVantageLoadCommands(text, loadNames) {
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
        loadName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Load ${rtiIndex}`);
    }

    // Format final output
    let result = `Driver Command: 'Load ${rtiIndex} - ${loadName} set to ${state} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

function handleVantageButtonInfo(text, buttonNames) {
    if (debug1On) { console.log(`📢 handleVantageButtonInfo called: ${text}`); }

    let match = text.match(/(\d+)\s+(PRESS|RELEASE)/i);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let buttonIndex = match[1].trim(); // Extract Button Index (Vantage)
    let action = match[2].trim().toLowerCase(); // "press" or "release"

    // Convert action for proper grammar
    let formattedAction = action === "press" ? "Pressed" : "Released";

    // Use 'v_' prefix for Vantage-based lookup
    let buttonName = buttonNames[`v_${buttonIndex}`];
    if (!buttonName) {
        buttonName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Button ${buttonIndex}`);
    }

    // Format final output
    let result = `Driver Info: 'Button ${buttonIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

// function handleVantageButtonInfo(text, buttonNames) {
//     if (debug1On) { console.log(`📢 handleVantageButtonInfo called: ${text}`); }
//     let match = text.match(/(\d+)\s+(PRESS|RELEASE)/i);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text; // If no match, return unchanged
//     }

//     let buttonIndex = match[1].trim(); // Extract Button Index
//     let action = match[2].trim().toLowerCase(); // Extract Action, ensure lowercase
//     // Convert action for proper grammar
//     let formattedAction = action === "press" ? "Pressed" : "Released";
//     // Lookup Button Name using buttonNames
//     let buttonName = buttonNames[buttonIndex];
//     if (!buttonName) {
//         buttonName = `(⚠️  No Mapping Info Found)`;
//         console.log(`⚠️  No Mapping Info Found For Button ${buttonIndex}`);
//     }

//     // Format final output
//     let result = `Driver Info: 'Button ${buttonIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;
//     if (debug2On) { console.log(`✅ ${result}`); }
//     return result;
// }

function handleVantageButtonCommands(text, buttonNames) {
    // This is the log when RTI sees the Vantage event
    if (debug1On) { console.log(`📢 handleVantageButtonCommands called: ${text}`); }

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

    // Lookup Button Name using r_ prefix for RTI
    let buttonName = buttonNames[`r_${rtiIndex}`];
    if (!buttonName) {
        buttonName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Button ${rtiIndex}`);
    }

    // Format final output (with index)
    let result = `Driver Command: 'Button ${rtiIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

// function handleVantageButtonCommands(text, buttonNames) {
//     //This is the log when RTI sees the Vantage event
//     if (debug1On) { console.log(`📢 handleVantageButtonCommands called: ${text}`); }

//     // Match BTN followed by index and ON/OFF/PRESS/RELEASE
//     let match = text.match(/BTN(\d+)(ON|OFF|PRESS|RELEASE)/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text; // If no match, return unchanged
//     }

//     let rtiIndex = match[1].trim(); // e.g., "31"
//     let rawState = match[2]; // "ON", "OFF", "PRESS", or "RELEASE"

//     // Convert action/state to final label
//     let formattedAction;
//     if (rawState === "ON") {
//         formattedAction = "LED On";
//     } else if (rawState === "OFF") {
//         formattedAction = "LED Off";
//     } else if (rawState === "PRESS") {
//         formattedAction = "Pressed";
//     } else if (rawState === "RELEASE") {
//         formattedAction = "Released";
//     }

//     // Ensure buttonIndex is a string for lookup
//     rtiIndex = String(rtiIndex);

//     // Lookup Button Name
//     let buttonName = buttonNames[rtiIndex];
//     if (!buttonName) {
//         buttonName = `(⚠️  No Mapping Info Found)`;
//         console.log(`⚠️  No Mapping Info Found For Button ${rtiIndex}`);
//     }

//     // Format final output (with index)
//     let result = `Driver Command: 'Button ${rtiIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }

function handleVantageDriverEvents(text) {
    if (debug1On) { console.log(`📢 handleVantageDriverEvent called: ${text}`); }

    const match = text.match(/When '(.*?)' happens on '.*?\\(.*?) \(\d+-\d+\)'{1,2}/);

    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text;
    }

    const label = match[1].trim();      // e.g., "POWER - Primary Bed LED State ON (VID 1381)"
    const category = match[2].trim();   // e.g., "Task executed" or "Button LEDs"

    let result;

    switch (category) {
        case "Button LEDs": {
            const stateMatch = label.match(/(.*) (On|Off)$/i);
            if (stateMatch) {
                const baseLabel = stateMatch[1].trim();
                const state = stateMatch[2];
                result = `Driver Event: 'When ${baseLabel} LED ${state} happens (Vantage InFusion)'`;
            } else {
                result = `Driver Event: 'When ${label} (⚠️ Unparsed Button LED) (Vantage InFusion)'`;
            }
            break;
        }

        case "Task executed": {
            result = `Driver Event: 'When ${label} is executed'`;
            break;
        }

        default: {
            result = `Driver Event: 'When ${label} happens on ${category}'`;
            break;
        }
    }

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}


// function handleVantageButtonEvents(text) {
//     if (debug1On) { console.log(`📢 handleVantageWhenButtonEvent called: ${text}`); }

//     // Match content inside: When '...STATE' happens
//     let match = text.match(/When '(.*?) (On|Off)' happens/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text;
//     }

//     let fullText = match[1].trim(); // e.g., "Button 44 - SE (Right) Lamp (VID 178)"
//     let state = match[2]; // "On" or "Off"

//     // Format final output
//     let result = `Driver Event: 'When ${fullText} LED ${state} happens (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }

function handleVantageTaskInfo(text, taskNames) {
    if (debug1On) { console.log(`📢 handleVantageTaskInfo called: ${text}`); }

    let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text;
    }

    let taskIndex = match[1].trim(); // Vantage index
    let state = match[2].trim(); // 0 or 1
    let stateText = state === "1" ? "On" : "Off";

    let taskName = taskNames[`v_${taskIndex}`];
    if (!taskName) {
        taskName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
    }

    let result = `Driver Info: 'Task ${taskIndex} - ${taskName} set to ${stateText} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}



function handleVantageTaskCommands(text, taskNames) {
    if (debug1On) { console.log(`📢 handleVantageTaskCommands called: ${text}`); }

    let match = text.match(/TASK(\d+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text;
    }

    let rtiIndex = match[1].trim(); // RTI index

    let taskName = taskNames[`r_${rtiIndex}`];
    if (!taskName) {
        taskName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Task ${rtiIndex}`);
    }

    let result = `Driver Command: 'Task ${rtiIndex} - ${taskName} executed (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;
}

// function handleVantageTaskCommands(text, taskNames) {
//     if (debug1On) { console.log(`📢 handleVantageTaskCommands called: ${text}`); }

//     // Match TASK followed by index (no state value)
//     let match = text.match(/TASK(\d+)/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text;
//     }

//     let rtiIndex = match[1].trim();

//     // Lookup Task Name using taskNames
//     let taskName = taskNames[rtiIndex];
//     if (!taskName) {
//         taskName = `(⚠️  No Mapping Info Found)`;
//         console.log(`⚠️  No Mapping Info Found For Task ${rtiIndex}`);
//     }

//     // Format final output
//     let result = `Driver Command: 'Task ${rtiIndex} - ${taskName} executed (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }

// function handleVantageTaskInfo(text, taskNames) {
//     // Example: Vantage InFusion -  RX: S:TASK 1382 1
//     if (debug1On) { console.log(`📢 handleVantageTaskInfo called: ${text}`); }
    
//     // Extract Task Index and State
//     let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text; // If no match, return unchanged
//     }

//     let taskIndex = match[1].trim(); // Extract Task Index
//     let state = match[2].trim(); // Extract State (0 or 1)

//     // Map state to "On" or "Off"
//     let stateText = state === "1" ? "On" : "Off";

//     // Lookup Task Name using taskNames
//     let taskName = taskNames[taskIndex];
//         // If the load index does not exist in the mapping, format output to indicate missing name
//         if (!taskName) {
//             taskName = `(⚠️  No Mapping Info Found)`;
//             console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
//         }

//     // Format final output
//     let result = `Driver Info: 'Task ${taskIndex} - ${taskName} set to ${stateText} (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }