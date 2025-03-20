export function loadAudioZoneList(sheets) {
    console.log(`Loading data from sheet: Audio Zones`);
    if (!sheets["Audio Zones"]) {
        console.log("⚠️  Audio Zones Sheet not Found");
        return { inputMap: {}, outputMap: {} };  // ✅ Ensures a valid return structure
    }

    const audioZoneInputMap = {};  // Maps Input Index -> Input Name
    const audioZoneOutputMap = {}; // Maps Output Index -> Output Name

    sheets["Audio Zones"].forEach(row => {
        const inputIndex = row['Audio Zone Input Index']?.trim();
        const inputName = row['Audio Zone Input Name']?.trim()  || `(Empty Audio Input Name [${inputIndex}])`;
        const outputIndex = row['Audio Zone Output Index']?.trim();
        const outputName = row['Audio Zone Output Name']?.trim() || `(Emprty Audio Output Name [${outputIndex}])`;

        // Store Input Name
        if (inputIndex) {
            audioZoneInputMap[inputIndex] = inputName;
        }

        // Store Output Name
        if (outputIndex) {
            audioZoneOutputMap[outputIndex] = outputName;
        }
    });
    console.log("✅ Audio Zone List loaded.");
    return { inputMap: audioZoneInputMap, outputMap: audioZoneOutputMap };
}
