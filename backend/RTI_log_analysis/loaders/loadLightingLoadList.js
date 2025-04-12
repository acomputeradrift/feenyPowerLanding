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

    // sheets["Lighting Loads"].forEach(row => {
    //     const vantageIndex = row['Load Index']?.trim();
    //     const rtiIndex = row['RTI Index']?.trim(); // optional
    //     const loadRoom = row['Load Room']?.trim();
    //     const loadNameRaw = row['Load Name']?.trim();

    //     const loadName = loadNameRaw || `(Empty Load Name [${vantageIndex}])`;
    //     const mappedValue = loadRoom ? `${loadRoom} - ${loadName}` : loadName;

    //     if (vantageIndex) {
    //         loadMap[`v_${vantageIndex}`] = mappedValue;
    //     }
    //     if (rtiIndex) {
    //         loadMap[`r_${rtiIndex}`] = mappedValue;
    //     }
    // });

    console.log("✅ Lighting Loads loaded.");
    console.log(loadMap);
    return loadMap;
}


// export function loadLightingLoadList(sheets) {
//     console.log(`Loading data from sheet: Lighting Loads`);
//     if (!sheets["Lighting Loads"]) {
//         console.log("⚠️  Lighting Loads Sheet not Found");
//         return {};
//     }
//     const loadMap = {};
//     sheets["Lighting Loads"].forEach(row => {
//         let loadIndex = row['Load Index']?.trim();
//         let loadRoom = row['Load Room']?.trim();
//         let loadName = row['Load Name']?.trim() || `(Empty Load Name [${loadIndex}])`;

//         let mappedValue = loadRoom ? `${loadRoom} - ${loadName}` : loadName;
//         if (loadIndex) {
//             loadMap[loadIndex] = mappedValue;
//         }
//     });

//     console.log("✅ Lighting Loads loaded.");
//     //console.log(loadMap);
//     return loadMap;
// }
