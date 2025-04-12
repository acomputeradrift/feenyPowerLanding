import { emptyMappingOutputFormat } from '../../utils/logOutputFormats.js';

export function loadButtonList(sheets) {
    console.log(`Loading data from sheet: Button List`);
    if (!sheets["Button List"]) {
        console.log("⚠️  Button List Sheet not Found");
        return {};
    }

    const buttonMap = {};

    sheets["Button List"].forEach(row => {
        const buttonIndex = row['Button Index']?.trim();         // universal
        const vantageIndex = row['Vantage Index']?.trim();       // Vantage-specific
        let buttonName = row['Button Name']?.trim();

        if (!buttonName) {
            buttonName = emptyMappingOutputFormat("Button", buttonIndex);
        }

        // Always map plain Button Index for cross-driver use
        if (buttonIndex) {
            buttonMap[buttonIndex] = buttonName;
        }

        // Map prefixed Vantage key only if it exists
        if (vantageIndex) {
            buttonMap[`v_${vantageIndex}`] = buttonName;
        }
    });

    // sheets["Button List"].forEach(row => {
    //     let vantageIndex = row['Button Index'];
    //     let rtiIndex = row['RTI Index'];
    //     let buttonName = row['Button Name']?.trim();

    //     if (!buttonName) {
    //         buttonName = `(Empty Button Name ${vantageIndex || rtiIndex})`;
    //     }

    //     if (vantageIndex) {
    //         vantageIndex = `v_${vantageIndex.trim()}`;
    //         buttonMap[vantageIndex] = buttonName;
    //     }

    //     if (rtiIndex) {
    //         rtiIndex = `r_${rtiIndex.trim()}`;
    //         buttonMap[rtiIndex] = buttonName;
    //     }
    // });

    console.log("✅ Button List loaded.");
    //console.log(buttonMap);
    return buttonMap;
}

