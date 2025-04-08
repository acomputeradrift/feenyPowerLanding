export function loadButtonList(sheets) {
    console.log(`Loading data from sheet: Button List`);
    if (!sheets["Button List"]) {
        console.log("⚠️  Button List Sheet not Found");
        return {};
    }

    const buttonMap = {};

    sheets["Button List"].forEach(row => {
        let vantageIndex = row['Button Index'];
        let rtiIndex = row['RTI Index'];
        let buttonName = row['Button Name']?.trim();

        if (!buttonName) {
            buttonName = `(Empty Button Name ${vantageIndex || rtiIndex})`;
        }

        if (vantageIndex) {
            vantageIndex = `v_${vantageIndex.trim()}`;
            buttonMap[vantageIndex] = buttonName;
        }

        if (rtiIndex) {
            rtiIndex = `r_${rtiIndex.trim()}`;
            buttonMap[rtiIndex] = buttonName;
        }
    });

    console.log("✅ Button List loaded.");
    console.log(buttonMap);
    return buttonMap;
}


// export function loadButtonList(sheets) {
//     console.log(`Loading data from sheet: Button List`);
//     if (!sheets["Button List"]) {
//         console.log("⚠️  Button List Sheet not Found");
//         return {};
//     }
//     const buttonMap = {};
//     sheets["Button List"].forEach(row => {
//         let vantageIndex = row['Button Index']?.trim();
//         let buttonName = row['Button Name']?.trim();
//         let rtiIndex = row['RTI Index']?.trim();

//         // Ensure required fields have default values if missing
//         if (!buttonName) buttonName = `(Empty Button Name ${vantageIndex})`;

//         if (vantageIndex) {
//             buttonMap[vantageIndex] = buttonName;
//         }
//         if (rtiIndex) {
//             buttonMap[rtiIndex] = buttonName;
//         }
//     });
//     console.log("✅ Button List loaded.");
//     return buttonMap;
// }
