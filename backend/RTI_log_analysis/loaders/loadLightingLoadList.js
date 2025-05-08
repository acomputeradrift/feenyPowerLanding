import { emptyMappingOutputFormat } from '../../utils/logOutputFormats.js';

export function loadLightingLoadList(sheets) {
    console.log(`Loading data from sheet: Lighting Loads`);
    if (!sheets["Lighting Loads"]) {
        console.log("⚠️  Lighting Loads Sheet not Found");
        return {};
    }

    const loadMap = {};

    sheets["Lighting Loads"].forEach(row => {
        const loadIndex = row['Load Index']?.trim();              // universal
        const vantageIndex = row['Vantage Index']?.trim();        // Vantage-specific
        const loadRoom = row['Load Room']?.trim();
        const loadNameRaw = row['Load Name']?.trim();

        const loadName = loadNameRaw || emptyMappingOutputFormat("Load", loadIndex);
        const mappedValue = loadRoom ? `${loadRoom} - ${loadName}` : loadName;

        if (loadIndex) {
            loadMap[loadIndex] = mappedValue; // universal key
        }

        if (vantageIndex) {
            loadMap[`v_${vantageIndex}`] = mappedValue; // Vantage-specific key
        }
    });

    console.log("✅ Lighting Loads loaded.");
    //console.log(loadMap);
    return loadMap;
}
