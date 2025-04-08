export function loadTaskList(sheets) {
    console.log(`Loading data from sheet: Task List`);
    if (!sheets["Task List"]) {
        console.log("⚠️  Task List Sheet not Found");
        return {};
    }

    const taskMap = {};

    sheets["Task List"].forEach(row => {
        let taskIndex = row['Task Index'];
        let rtiIndex = row['RTI Index'];
        let taskName = row['Task Name']?.trim();

        if (!taskName) {
            taskName = `(Empty Task Name [${taskIndex || rtiIndex}])`;
        }

        if (taskIndex) {
            taskIndex = `v_${taskIndex.trim()}`;
            taskMap[taskIndex] = taskName;
        }

        if (rtiIndex) {
            rtiIndex = `r_${rtiIndex.trim()}`;
            taskMap[rtiIndex] = taskName;
        }
    });

    console.log("✅ Task List loaded.");
    console.log(taskMap);
    return taskMap;
}


// export function loadTaskList(sheets) {
//     console.log(`Loading data from sheet: Task List`);
//     if (!sheets["Task List"]) {
//         console.log("⚠️  Task List Sheet not Found");
//         return {};
//     }
//     const taskMap = {};
//     sheets["Task List"].forEach(row => {
//         let taskIndex = row['Task Index']?.trim();
//         let taskName = row['Task Name']?.trim();
//         let rtiIndex = row['RTI Index']?.trim();
//         // Ensure required fields have default values if missing
//         if (!taskName) taskName = `(Empty Task Name [${taskIndex}])`;
//         if (taskIndex) {
//             taskMap[taskIndex] = taskName;
//         }
//         if (rtiIndex) {
//             taskMap[rtiIndex] = taskName;
//         }
//     });
//     console.log("✅ Task List loaded.");
//     return taskMap;
// }