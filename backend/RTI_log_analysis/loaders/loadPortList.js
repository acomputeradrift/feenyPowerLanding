export function loadPortList(sheets) {
    console.log(`Loading data from sheet: Ports List`);
    if (!sheets["Ports List"]) {
        console.log("⚠️  Ports List Sheet not Found");
        return {};
    }
    const portMap = {};
    sheets["Ports List"].forEach(row => {
        const moduleName = row['Module Name']?.trim() || `(Empty Module Name)`;
        const moduleType = row['Module Type']?.trim() || `(Empty Module Type)`;
        const portIndex = row['Port Index']?.trim();
        const portName = row['Port Name']?.trim() || `(Empty Port Name [${portIndex}])`;

        if (portIndex) {
            const key = `${moduleName}_${moduleType}_${portIndex}`;
            portMap[key] = portName;
        }
    });
    console.log("✅ Port List loaded.");
    return portMap;
}