export function emptyMappingOutputFormat(label, index) {
    return `(Empty ${label} Name [${index}])`;
  }

  export function finalDriverOutputFormatLighting(type, index, name, category, stateOrAction, systemType) {
    const resolvedName = name || `(⚠️  No Mapping Info Found)`;
    const indexText = index ? `${category} ${index}` : `${category}`;  // omit index if null
    return `Driver ${type}: ${indexText} - '${resolvedName}' ${stateOrAction} (${systemType})`;
  }
  
  export function finalDriverOutputFormatAV({
    inputIndex = null,
    inputName = null,
    outputIndex = null,
    outputName = null,
    category = "Zone",
    stateOrAction,
    driverName
  }) {
    const resolvedInput = inputName || `(⚠️  No Mapping Info Found)`;
    const resolvedOutput = outputName || `(⚠️  No Mapping Info Found)`;
  
    if (inputIndex !== null && outputIndex !== null) {
      // Driver Command: Source 4 - 'Sonos Port 1' selected in Zone 6 - 'Yard' (Vaux Lattis Matrix)
      return `Driver Command: Source ${inputIndex} - '${resolvedInput}' ${stateOrAction} Zone ${outputIndex} - '${resolvedOutput}' (${driverName})`;
    }
  
    // Driver Command: Zone - 'Living Room' Volume Up (AD-64)
    return `Driver Command: ${category} - '${resolvedOutput}' ${stateOrAction} (${driverName})`;
  }
  
  
  
  
  