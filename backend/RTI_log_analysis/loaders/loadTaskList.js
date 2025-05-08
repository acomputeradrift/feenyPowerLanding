import { emptyMappingOutputFormat } from '../../utils/logOutputFormats.js';

export function loadTaskList(sheets) {
    console.log(`Loading data from sheet: Task List`);
    if (!sheets["Task List"]) {
        console.log("⚠️  Task List Sheet not Found");
        return {};
    }

    const taskMap = {};

    sheets["Task List"].forEach(row => {
        const taskIndex = row['Task Index']?.trim();            // universal
        const vantageIndex = row['Vantage Index']?.trim();      // optional, Vantage-specific
        let taskName = row['Task Name']?.trim();

        if (!taskName) {
            taskName = emptyMappingOutputFormat("Task", taskIndex);
        }

        // Always map plain task index
        if (taskIndex) {
            taskMap[taskIndex] = taskName;
        }

        // Optionally map Vantage-prefixed key
        if (vantageIndex) {
            taskMap[`v_${vantageIndex}`] = taskName;
        }
    });

    console.log("✅ Task List loaded.");
    //console.log(taskMap);
    return taskMap;
}
