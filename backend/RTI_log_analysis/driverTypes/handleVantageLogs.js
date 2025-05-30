import { finalDriverOutputFormatLighting } from '../../utils/logOutputFormats.js';

const debug1On = false;
const debug2On = false;

export function handleVantageLogTypes(text, loadNames, buttonNames, taskNames, climateZoneNames) {
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
                return handleRtiLoadInfo(text, loadNames);
            }
        case text.includes("BTN"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:BTN 178 PRESS
                return handleVantageButtonInfo(text, buttonNames);
                //return null;
            } else {
                //Example: Vantage InFusion -  BTN178PRESS
                return handleRtiButtonInfo(text, buttonNames);
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
                return handleRtiTaskInfo(text, taskNames);
            }
          case text.includes("TEMP"):
            if (text.includes("RX: S:")) {
                //Example: Vantage InFusion - RX: S:TEMP 295 19.500  
                return handleVantageTempInfo(text, climateZoneNames);
                //return null;
            } else {
                //Example: Vantage InFusion - TEMP6
                return handleRtiTempInfo(text, climateZoneNames);
            }
          case text.includes("THERMOP"):
            // Example: Vantage InFusion - RX: S:THERMOP 288 OFF  
            return handleVantageThermostatInfo(text, climateZoneNames);
          case text.includes("OP"):
            // Example: Vantage InFusion - OP1 
            return handleRtiThermostatInfo(text, climateZoneNames);
          // case text.includes("Execute Task"):
          //   // Example: Driver - Command:'Vantage InFusion\Tasks\Execute Task(AUDIO - Hallway Button LED ON, Press)' Sustain:NO  
          //   return handleVantageDriverCommand(text);
        default:
            return text; // Unhandled log type
    }
}

//------------------------------------------------------LOAD

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
    "3rd Party Info",
    loadIndex,               // ✅ no prefix in output
    loadName,
    "Load",
    `set to ${statePercentage}`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

function handleRtiLoadInfo(text, loadNames) {
  if (debug1On) { console.log(`📢 handleRtiLoadInfo called: ${text}`); }

  let match = text.match(/LOAD(\d+)(ON|OFF)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let loadIndex = match[1].trim();
  let state = (match[2] === "ON") ? "On" : "Off";

  const loadName = loadNames[loadIndex];
  if (!loadName) {
    console.log(`⚠️  No Mapping Info Found For Load ${loadIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Driver Info",
    loadIndex,            // ✅ no prefix in output
    loadName,
    "Load",
    `set to ${state}`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

//------------------------------------------------------BUTTON

function handleVantageButtonInfo(text, buttonNames) {
  if (debug1On) { console.log(`📢 handleVantageButtonInfo called: ${text}`); }

  let match = text.match(/(\d+)\s+(PRESS|RELEASE)/i);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let buttonIndex = match[1].trim();
  let action = match[2].trim().toLowerCase();
  let formattedAction = action === "press" ? "was Pressed" : "was Released";

  const v_buttonIndex = `v_${buttonIndex}`;
  const buttonName = buttonNames[v_buttonIndex];

  if (!buttonName) {
    console.log(`⚠️  No Mapping Info Found For Button ${v_buttonIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "3rd Party Info",
    buttonIndex, // ✅ display unprefixed index
    buttonName,
    "Button",
    formattedAction,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

function handleRtiButtonInfo(text, buttonNames) {
  if (debug1On) { console.log(`📢 handleRtiButtonInfo called: ${text}`); }

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

  const buttonName = buttonNames[buttonIndex];
  if (!buttonName) {
    console.log(`⚠️  No Mapping Info Found For Button ${buttonIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Driver Info",
    buttonIndex,
    buttonName,
    "Button",
    formattedAction,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

//------------------------------------------------------TASKS

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
    "3rd Party Info",
    taskIndex, // ✅ display unprefixed index
    taskName,
    "Task",
    `set to ${stateText}`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}
 
function handleRtiTaskInfo(text, taskNames) {
  if (debug1On) { console.log(`📢 handleRtiTaskInfo called: ${text}`); }

  let match = text.match(/TASK(\d+)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let taskIndex = match[1].trim();
  const taskName = taskNames[taskIndex];

  if (!taskName) {
    console.log(`⚠️  No Mapping Info Found For Task ${taskIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Driver Info",
    taskIndex,
    taskName,
    "Task",
    "was executed",
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}
  
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

//------------------------------------------------------CLIMATE

export function handleVantageTempInfo(text, climateZoneNames) {
  if (debug1On) { console.log(`📢 handleVantageTempInfo called: ${text}`); }

  let match = text.match(/S:TEMP\s+(\d+)\s+([\d.]+)/);
  if (!match) {
    console.log(`❌ No match found for TEMP regex: ${text}`);
    return text;
  }

  let climateIndex = match[1].trim();
  let temperature = match[2];
  let v_climateIndex = `v_${climateIndex}`;
  let climateName = climateZoneNames[v_climateIndex];

  if (!climateName) {
    console.log(`⚠️  No Mapping Info Found For Temperature Zone ${climateIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "3rd Party Info",
    climateIndex,
    climateName,
    "Climate",
    `temperature set to ${temperature}°C`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

export function handleRtiTempInfo(text, climateZoneNames) {
  if (debug1On) { console.log(`📢 handleRtiTempInfo called: ${text}`); }

  let match = text.match(/TEMP(\d+)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let climateIndex = match[1].trim();

  const climateName = climateZoneNames[climateIndex];
  if (!climateName) {
    console.log(`⚠️  No Mapping Info Found For Temperature Zone ${climateIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Driver Info",
    climateIndex,              // ✅ no prefix in output
    climateName,
    "Climate",
    `temperature adjusted`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

export function handleVantageThermostatInfo(text, climateZoneNames) {
  if (debug1On) { console.log(`📢 handleVantageThermostatInfo called: ${text}`); }

  let match = text.match(/THERMOP\s+(\d+)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let climateIndex = match[1].trim();


  let v_climateIndex = `v_${climateIndex}`;
  let climateName = climateZoneNames[v_climateIndex];

  // const climateName = climateZoneNames[climateIndex];
  if (!climateName) {
    console.log(`⚠️  No Mapping Info Found For Thermostat Zone ${climateIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "3rd Party Info",
    climateIndex,              // ✅ no prefix in output
    climateName,
    "Climate",
    `mode adjusted`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}

export function handleRtiThermostatInfo(text, climateZoneNames) {
  if (debug1On) { console.log(`📢 handleRtiThermostatInfo called: ${text}`); }

  let match = text.match(/-\s*OP(\d+)/);
  if (!match) {
    console.log(`❌ No match found for regex: ${text}`);
    return text;
  }

  let climateIndex = match[1].trim();
  let climateName = climateZoneNames[climateIndex];

  if (!climateName) {
    console.log(`⚠️  No Mapping Info Found For Thermostat Zone ${climateIndex}`);
  }

  let result = finalDriverOutputFormatLighting(
    "Driver Info",
    climateIndex,
    climateName,
    "Climate",
    `mode adjusted`,
    "Vantage InFusion"
  );

  if (debug2On) { console.log(`✅ ${result}`); }

  return result;
}




