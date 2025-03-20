const debug1On = false;
const debug2On = false;

export function handleCoolMasterNetLogTypes(text) {
    switch (true) {
        case text.includes("Current Temp"):
            return handleCoolMasterCurrentTempEvents(text);    
        case text.includes("Demand"):
            return handleCoolMasterDemandEvents(text);  
        default:
            if (debug1On) { console.log(`⚠️ Undefined Cool Master Net Log Type: ${text}`); }
            return text; // Unhandled log type
    }
}

function handleCoolMasterCurrentTempEvents(text) {
    if (debug1On) { console.log(`📢 handleCoolMasterCurrentTempEvents called: ${text}`); }

    // Extract Room Name, Type, and Current Temperature
    let match = text.match(/Current Temp for (.*?) \((.*?)\) changed to (\d+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let roomName = match[1].trim(); // Extract Room Name
    let type = match[2].trim(); // Extract Type (e.g., HVAC, In Floor Heat)
    let currentTemp = match[3].trim(); // Extract Temperature

    // Format final output
    let result = `Driver Event: '${roomName} (${type}) Current Temp changed to ${currentTemp} degrees' (CoolMasterNet)`;

    if (debug2On) { console.log(`✅  ${result}`); }

    return result;
}

function handleCoolMasterDemandEvents(text) {
    if (debug1On) { console.log(`📢 handleCoolMasterDemandEvents called: ${text}`); }

    // Extract Room Name, Type, and Demand State
    let match = text.match(/Demand for (.*?) \((.*?)\) changed to (.+)/);
    if (!match) {
        console.log(`❌ No match found for regex: ${text}`);
        return text; // If no match, return unchanged
    }

    let roomName = match[1].trim(); // Extract Room Name
    let type = match[2].trim(); // Extract Type (e.g., HVAC, In Floor Heat)
    let demandState = match[3].trim(); // Extract Demand State (e.g., Off, On)

    // Format final output
    let result = `Driver Event: '${roomName} (${type}) demand changed to ${demandState}' (CoolMasterNet)`;

    if (debug2On) { console.log(`✅  ${result}`); }

    return result;
}
