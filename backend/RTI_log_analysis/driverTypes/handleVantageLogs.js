import { finalDriverOutputFormatLighting } from '../../utils/logOutputFormats.js';

const debug1On = false;
const debug2On = false;

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
    if (debug1On) { console.log(`📢 handleVantageLoadInfo called: ${text}`); }

    let match = text.match(/S:LOAD\s+(\d+)\s+([\d.]+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text;
    }

    let loadIndex = match[1].trim();
    let stateValue = parseFloat(match[2]);

    const v_loadIndex = `v_${loadIndex}`;
    const loadName = loadNames[v_loadIndex];

    if (!loadName) {
      console.log(`⚠️  No Mapping Info Found For Load ${v_loadIndex}`);
    }

    let statePercentage = Math.round(stateValue) + "%";

    let result = finalDriverOutputFormatLighting(
      "Info",
      v_loadIndex, // ✅ display exactly what you use to look up
      loadName,
      "Load",
      `set to ${statePercentage}`,
      "Vantage InFusion"
    );

    if (debug2On) { console.log(`✅ ${result}`); }

    return result;

    // let loadIndex = match[1].trim();
    // let stateValue = parseFloat(match[2]);

    // const key = `v_${loadIndex}`;
    // const loadName = loadNames[key];

    // if (!loadName) {
    //   console.log(`⚠️  No Mapping Info Found For Load ${key}`);
    // }

    // let statePercentage = Math.round(stateValue) + "%";
    // let result = finalDriverOutputFormatLighting(
    //     "Info",
    //     loadIndex,
    //     loadName,
    //     "Load",
    //     `set to ${statePercentage}`,
    //     "Vantage InFusion"
    //   );      
    // //let result = `Driver Info: 'Load ${loadIndex} - ${loadName} set to ${statePercentage} (Vantage InFusion)'`;

    // if (debug2On) { console.log(`✅ ${result}`); }

    // return result;
}

function handleVantageLoadCommands(text, loadNames) {
    if (debug1On) { console.log(`📢 handleVantageLoadCommands called: ${text}`); }

    let match = text.match(/LOAD(\d+)(ON|OFF)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text;
    }

    let loadIndex = match[1].trim();
    let state = (match[2] === "ON") ? "On" : "Off";

    let loadName = loadNames[loadIndex];
    if (!loadName) {
        loadName = `(⚠️  No Mapping Info Found)`;
        console.log(`⚠️  No Mapping Info Found For Load ${loadIndex}`);
    }
    let result = finalDriverOutputFormatLighting(
        "Command",
        loadIndex,
        loadName,
        "Load",
        `set to ${state}`,
        "Vantage InFusion"
      );
      
    //let result = `Driver Command: 'Load ${loadIndex} - ${loadName} set to ${state} (Vantage InFusion)'`;

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
    let formattedAction = action === "press" ? "was Pressed" : "was Released";

    // Use 'v_' prefix for Vantage-based lookup
    const v_buttonIdex = `v_${buttonIndex}`;
    const buttonName = buttonNames[v_buttonIdex];

    if (!buttonName) {
      console.log(`⚠️  No Mapping Info Found For Button ${v_buttonIdex}`);
    }

    let result = finalDriverOutputFormatLighting(
        "Info",
        v_buttonIdex,
        buttonName,
        "Button",
        formattedAction,
        "Vantage InFusion"
      );
      
    // Format final output
    //let result = `Driver Info: 'Button ${buttonIndex} - ${buttonName} ${formattedAction} (Vantage InFusion)'`;

    if (debug2On) { console.log(`✅ ${result}`); }
    return result;
}

function handleVantageButtonCommands(text, buttonNames) {
    if (debug1On) { console.log(`📢 handleVantageButtonCommands called: ${text}`); }
  
    // Match BTN followed by index and ON/OFF/PRESS/RELEASE
    let match = text.match(/BTN(\d+)(ON|OFF|PRESS|RELEASE)/);
    if (!match) {
      console.log(`❌ No match found for regex: ${text}`);
      return text;
    }
  
    let buttonIndex = match[1].trim();
    let rawState = match[2];
  
    let formattedAction;
    if (rawState === "ON") {
      formattedAction = "LED set to On";
    } else if (rawState === "OFF") {
      formattedAction = "LED set to Off";
    } else if (rawState === "PRESS") {
      formattedAction = "was Pressed";
    } else if (rawState === "RELEASE") {
      formattedAction = "was Released";
    }
  
    let buttonName = buttonNames[buttonIndex];
    if (!buttonName) {
      console.log(`⚠️  No Mapping Info Found For Button ${buttonIndex}`);
    }
  
    let result = finalDriverOutputFormatLighting(
      "Command",
      buttonIndex,
      buttonName,
      "Button",
      formattedAction,
      "Vantage InFusion"
    );
  
    if (debug2On) { console.log(`✅ ${result}`); }
  
    return result;
  }
  
// function handleVantageButtonCommands(text, buttonNames) {
//     // This is the log when RTI sees the Vantage event
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

//     // Lookup Button Name using r_ prefix for RTI
//     let buttonName = buttonNames[`r_${rtiIndex}`];
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

function handleVantageTaskInfo(text, taskNames) {
  if (debug1On) { console.log(`📢 handleVantageTaskInfo called: ${text}`); }

  let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let taskIndex = match[1].trim();
  let state = match[2].trim();
  let stateText = state === "1" ? "On" : "Off";

  const v_taskIndex = `v_${taskIndex}`;
  const taskName = taskNames[v_taskIndex];

  if (!taskName) {
    console.log(`⚠️  No Mapping Info Found For Task ${v_taskIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Info",
    v_taskIndex,
    taskName,
    "Task",
    `set to ${stateText}`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

// function handleVantageTaskInfo(text, taskNames) {
//     if (debug1On) { console.log(`📢 handleVantageTaskInfo called: ${text}`); }
  
//     let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
//     if (!match) {
//       console.log(`❌ No match found for regex: ${text}`);
//       return text;
//     }
  
//     let taskIndex = match[1].trim();
//     let state = match[2].trim();
//     let stateText = state === "1" ? "On" : "Off";
  
//     let taskName = taskNames[`v_${taskIndex}`];
//     if (!taskName) {
//       console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
//     }
  
//     let result = finalDriverOutputFormatLighting(
//       "Info",
//       taskIndex,
//       taskName,
//       "Task",
//       `set to ${stateText}`,
//       "Vantage InFusion"
//     );
  
//     if (debug2On) { console.log(`✅ ${result}`); }
  
//     return result;
//   }
  
// function handleVantageTaskInfo(text, taskNames) {
//     if (debug1On) { console.log(`📢 handleVantageTaskInfo called: ${text}`); }

//     let match = text.match(/TASK\s+(\d+)\s+(\d+)/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text;
//     }

//     let taskIndex = match[1].trim(); // Vantage index
//     let state = match[2].trim(); // 0 or 1
//     let stateText = state === "1" ? "On" : "Off";

//     let taskName = taskNames[`v_${taskIndex}`];
//     if (!taskName) {
//         taskName = `(⚠️  No Mapping Info Found)`;
//         console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
//     }

//     let result = `Driver Info: 'Task ${taskIndex} - ${taskName} set to ${stateText} (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }
 
function handleVantageTaskCommands(text, taskNames) {
    if (debug1On) { console.log(`📢 handleVantageTaskCommands called: ${text}`); }
  
    let match = text.match(/TASK(\d+)/);
    if (!match) {
      console.log(`❌ No match found for regex: ${text}`);
      return text;
    }
  
    let taskIndex = match[1].trim();
  
    let taskName = taskNames[taskIndex];
    if (!taskName) {
      console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
    }
  
    let result = finalDriverOutputFormatLighting(
      "Command",
      taskIndex,
      taskName,
      "Task",
      "was executed",
      "Vantage InFusion"
    );
  
    if (debug2On) { console.log(`✅ ${result}`); }
  
    return result;
  }
  
// function handleVantageTaskCommands(text, taskNames) {
//     if (debug1On) { console.log(`📢 handleVantageTaskCommands called: ${text}`); }

//     let match = text.match(/TASK(\d+)/);
//     if (!match) {
//         console.log(`❌ No match found for regex: ${text}`);
//         return text;
//     }

//     let rtiIndex = match[1].trim(); // RTI index

//     let taskName = taskNames[`r_${rtiIndex}`];
//     if (!taskName) {
//         taskName = `(⚠️  No Mapping Info Found)`;
//         console.log(`⚠️  No Mapping Info Found For Task ${rtiIndex}`);
//     }

//     let result = `Driver Command: 'Task ${rtiIndex} - ${taskName} executed (Vantage InFusion)'`;

//     if (debug2On) { console.log(`✅ ${result}`); }

//     return result;
// }
