import { emptyMappingOutputFormat } from '../../utils/logOutputFormats.js';

export function loadClimateZoneList(sheets) {
    console.log(`Loading data from sheet: Climate Zones`);
    if (!sheets["Climate Zones"]) {
        console.log("⚠️  Climate Zones Sheet not Found");
        return {};
    }

    const climateMap = {};

    sheets["Climate Zones"].forEach(row => {
        const climateIndex = row['Climate Index']?.trim();
        const vantageIndex = row['Vantage Index']?.trim();
        let climateNameRaw = row['Climate Name']?.trim();
        let climateRoom = row['Climate Room']?.trim();

        const climateName = climateNameRaw || emptyMappingOutputFormat("Climate", climateIndex);
        const mappedValue = climateRoom ? `${climateRoom} - ${climateName}` : climateName;

        if (climateIndex) {
            climateMap[climateIndex] = mappedValue;
        }

        if (vantageIndex) {
            climateMap[`v_${vantageIndex}`] = mappedValue;
        }
    });

    console.log("✅ Climate Zones loaded.");
    //console.log(climateMap);
    return climateMap;
}
