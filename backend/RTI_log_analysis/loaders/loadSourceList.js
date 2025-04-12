import { emptyMappingOutputFormat } from '../../utils/logOutputFormats.js';

export function loadSourceList(sheets) {
    console.log(`Loading data from sheet: Source List`);
    if (!sheets["Source List"]) {
        console.log("⚠️  Source List Sheet not Found");
        return {};
    }
    const sourceMap = {};
    sheets["Source List"].forEach(row => {
        const sourceIndex = row['Source Index']?.trim();
        let sourceName = row['Source Name']?.trim();
    
        if (!sourceName) {
            sourceName = emptyMappingOutputFormat("Source", sourceIndex);
        }
    
        if (sourceIndex) {
            sourceMap[sourceIndex] = sourceName;
        }
    });
    
    // sheets["Source List"].forEach(row => {
    //     const sourceIndex = row['Source Index']?.trim();
    //     let sourceName = row['Source Name']?.trim();
    //     if (!sourceName) sourceName = `(Empty Source Name [${sourceIndex}])`;
    //     if (sourceIndex) {
    //         sourceMap[sourceIndex] = sourceName;
    //     }
    // });
    console.log("✅ Source List loaded.");
    return sourceMap;
}