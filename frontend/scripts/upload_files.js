const jsonInput = document.getElementById("jsonUpload");
const xlsxInput = document.getElementById("xlsxUpload");
const nextBtn = document.getElementById("nextStepBtn"); // ✅ updated ID

// Disable the "Next" button by default
nextBtn.disabled = true;
//---------------------------------------------JSON

function validateJsonLogFile(file) {
    console.log("Validating JSON...")
    const reader = new FileReader();

    reader.onload = function(event) {
        const textContent = event.target.result.trim(); // Read file content

        try {
            JSON.parse(textContent); // Attempt to parse as JSON
            document.getElementById("jsonError").textContent = ""; // Clear error if valid
            document.getElementById("jsonPreview").textContent = textContent; // Display content
            checkFilesReady();
            console.log('Successful preview of JSON');
        } catch (error) {
            document.getElementById("jsonError").textContent = "Error: File is not valid JSON!";
            console.log("Non json data detected.");
            document.getElementById("jsonPreview").textContent = ""; // Clear preview
        }
    };

    reader.readAsText(file);
}
// Attach to the upload button
document.addEventListener("DOMContentLoaded", function () {
    // ✅ Function to show JSON preview & hide "No Current File" message
    function showJsonPreview() {
        document.getElementById("jsonNoFileMessage").style.display = "none"; // ✅ Hide message
        document.getElementById("jsonPreview").style.display = "block"; // ✅ Show JSON preview
    }

    // ✅ Modify JSON Upload Button Event Listener
    document.getElementById("uploadJsonBtn").addEventListener("click", function () {
        const fileInput = document.getElementById("jsonUpload");
        if (fileInput.files.length > 0) {
            validateJsonLogFile(fileInput.files[0]); // ✅ Process the JSON file
            showJsonPreview(); // ✅ Reveal JSON preview when file is uploaded
        }
    });
});

//---------------------------------------------XLSX

function displaySheet(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }); // ✅ Ensure raw values are preserved

    if (!jsonData.length) {
        document.getElementById("xlsxTableContainer").innerHTML = "<p>No data in this sheet.</p>";
        return;
    }
    console.log(`Raw data from "${sheetName}":`, worksheet);
    console.log("First 5 rows of data:", jsonData.slice(0, 5));

    let tableHtml = "<div class='table-wrapper'><table><thead><tr>";

    // 🔹 Add headers dynamically
    jsonData[0].forEach(header => {
        tableHtml += `<th>${header !== undefined ? header : "Column"}</th>`;
    });
    tableHtml += "</tr></thead><tbody>";

    // 🔹 Add all rows (full data preview)
    jsonData.slice(1).forEach(row => {
        tableHtml += "<tr>" + row.map(cell => `<td>${cell !== undefined ? cell : ""}</td>`).join("") + "</tr>";
    });

    tableHtml += "</tbody></table></div>"; // Close table wrapper

    // 🔹 Inject HTML into the preview area
    document.getElementById("xlsxTableContainer").innerHTML = tableHtml;


    // 🔹 Update active tab styling
    document.querySelectorAll(".sheet-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".sheet-tab").forEach(tab => {
        if (tab.textContent === sheetName) tab.classList.add("active");
    });
}


function validateXlsxFile(file) {
    if (!file.name.endsWith(".xlsx")) {
        document.getElementById("xlsxError").textContent = "Error: Invalid file type.";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);

        try {
            const workbook = XLSX.read(data, { type: "array" });

            if (!workbook.SheetNames.length) {
                throw new Error("No sheets found in the file.");
            }

            document.getElementById("xlsxError").textContent = "";
            
            const sheetNames = workbook.SheetNames;
            const sheetTabs = document.getElementById("sheetTabs");
            sheetTabs.innerHTML = ""; // Clear previous buttons

            // Display the first sheet by default
            displaySheet(workbook, sheetNames[0]);

            // Create buttons for each sheet (tabs)
            sheetNames.forEach((sheetName, index) => {
                const button = document.createElement("button");
                button.textContent = sheetName;
                button.className = "sheet-tab";
                button.onclick = () => displaySheet(workbook, sheetName);

                // Set the first tab as active by default
                if (index === 0) button.classList.add("active");
                sheetTabs.appendChild(button);
            });
            checkFilesReady();

        } catch (error) {
            document.getElementById("xlsxError").textContent = "Error: " + error.message;
            document.getElementById("xlsxTableContainer").innerHTML = "";
        }
    };

    reader.readAsArrayBuffer(file);
}

document.addEventListener("DOMContentLoaded", function () {
    const sheetTabs = document.getElementById("sheetTabs");
    const xlsxTableContainer = document.getElementById("xlsxTableContainer");

    if (!sheetTabs || !xlsxTableContainer) {
        console.error("❌ Error: Missing `sheetTabs` or `xlsxTableContainer` in the DOM.");
        return;
    }
    // ✅ Function to show table & hide "No Current File" message
    function showTablePreview() {
        document.getElementById("xlsxNoFileMessage").style.display = "none"; // ✅ Hide message
        document.querySelector(".table-wrapper").style.display = "flex"; // ✅ Show table
        console.log('Successful preview of XLXS');
    }

    // ✅ Modify XLSX Upload Button Event Listener
    document.getElementById("uploadXlsxBtn").addEventListener("click", function () {
        const fileInput = document.getElementById("xlsxUpload");
        if (fileInput.files.length > 0) {
            validateXlsxFile(fileInput.files[0]); // ✅ Process the file
            showTablePreview(); // ✅ Reveal table when file is uploaded
        }
    });
});

//-------------------------------------------------Next Button

// ✅ Check if both files have been previewed
function checkFilesReady() {
    const jsonPreviewContent = document.getElementById("jsonPreview").textContent.trim();
    const tableWrapper = document.querySelector(".table-wrapper");
    const tableVisible = tableWrapper && tableWrapper.style.display !== "none";

    // console.log("🔍 checkFilesReady:");
    // console.log(" - JSON preview length:", jsonPreviewContent.length);
    // console.log(" - Table wrapper exists:", !!tableWrapper);
    // console.log(" - Table is visible:", tableVisible);

    const ready = jsonPreviewContent.length > 0 && tableVisible;
    document.getElementById("nextStepBtn").disabled = !ready;

    console.log(" - Next button enabled:", ready);
}

// --------------------------------------------------Acutal Upload
function uploadFile(file, fileType) {
    const formData = new FormData();
    formData.append('file', file); // ✅ The selected file (either log or map)
    formData.append('fileType', fileType); // ✅ Either "log" or "map"
    formData.append('userTimeZone', Intl.DateTimeFormat().resolvedOptions().timeZone); // ✅ User's local timezone

    console.log("📦 Sending form data:");
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    return fetch("/api/upload", {
        method: "POST",
        body: formData
    }).then(res => res.json());
}

// -----------------------------------------------------Next Button

nextBtn.addEventListener("click", () => {
    const jsonFile = jsonInput.files[0];
    const xlsxFile = xlsxInput.files[0];

    if (!jsonFile || !xlsxFile) {
        alert("Please upload both a log and a map before continuing.");
        return;
    }

    // ✅ Immediately go to the next page
    window.location.href = "/rti_diagnostics/process_files/";

    const uploadStatus = document.getElementById("logNoFileMessage");
    uploadStatus.innerHTML = "Uploading Log File...";

    uploadFile(jsonFile, "log").then(res => {
        if (res.error) {
            console.error("❌ Log upload failed:", res.error);
            uploadStatus.innerHTML += "\nLog upload failed.";
            return;
        }
        console.log("✅ Log uploaded.");
        uploadStatus.innerHTML += "<br>Uploading Map File...";

        uploadFile(xlsxFile, "map").then(res => {
            if (res.error) {
                console.error("❌ Map upload failed:", res.error);
                uploadStatus.innerHTML += "\nMap upload failed.";
                return;
            }
            console.log("✅ Map uploaded.");
            innerHTML += "<br>Done.";
        });
    });
});

// nextBtn.addEventListener("click", () => {
//     const jsonFile = jsonInput.files[0];
//     const xlsxFile = xlsxInput.files[0];

//     if (!jsonFile || !xlsxFile) {
//         alert("Please upload both a log and a map before continuing.");
//         return;
//     }

//     // ✅ Immediately go to the next page
//     window.location.href = "/rti_diagnostics/process_files/";

//     // ✅ Begin background uploads (will continue even after navigation)
//     document.getElementById("logNoFileMessage").textContent = "Uploading Log File...";
//     uploadFile(jsonFile, "log").then(res => {
//         if (res.error) console.error("❌ Log upload failed:", res.error);
//         else console.log("✅ Log uploaded.");
//     });

//     document.getElementById("logNoFileMessage").textContent = "Uploading Map File...";
//     uploadFile(xlsxFile, "map").then(res => {
//         if (res.error) console.error("❌ Map upload failed:", res.error);
//         else console.log("✅ Map uploaded.");
//     });
//     document.getElementById("logNoFileMessage").textContent = "Ready.";
// });


// ✅ Hook into preview events
    jsonInput.addEventListener("change", () => setTimeout(checkFilesReady, 200));
    xlsxInput.addEventListener("change", () => setTimeout(checkFilesReady, 500));




