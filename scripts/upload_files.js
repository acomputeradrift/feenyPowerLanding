
//---------------------------------------------JSON

// Attach to the upload button
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("uploadJsonBtn").addEventListener("click", function() {
        const fileInput = document.getElementById("jsonUpload");
        if (fileInput && fileInput.files.length > 0) {
            validateJsonLogFile(fileInput.files[0]);
        } else {
            document.getElementById("jsonError").textContent = "Error: No file selected!";
        }
    });
});

function validateJsonLogFile(file) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const textContent = event.target.result.trim(); // Read file content

        try {
            JSON.parse(textContent); // Attempt to parse as JSON
            document.getElementById("jsonError").textContent = ""; // Clear error if valid
            document.getElementById("jsonPreview").textContent = textContent; // Display content
        } catch (error) {
            document.getElementById("jsonError").textContent = "Error: File is not valid JSON!";
            console.log("Non json data detected.");
            document.getElementById("jsonPreview").textContent = ""; // Clear preview
        }
    };

    reader.readAsText(file);
}

//---------------------------------------------XLSX
document.addEventListener("DOMContentLoaded", function () {
    const sheetTabs = document.getElementById("sheetTabs");
    const xlsxTableContainer = document.getElementById("xlsxTableContainer");

    if (!sheetTabs || !xlsxTableContainer) {
        console.error("❌ Error: Missing `sheetTabs` or `xlsxTableContainer` in the DOM.");
        return;
    }

    // XLSX Upload Button Listener
    document.getElementById("uploadXlsxBtn").addEventListener("click", function () {
        const fileInput = document.getElementById("xlsxUpload");
        if (fileInput.files.length > 0) {
            validateXlsxFile(fileInput.files[0]);
        } else {
            document.getElementById("xlsxError").textContent = "Error: No file selected!";
        }
    });
});

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

        } catch (error) {
            document.getElementById("xlsxError").textContent = "Error: " + error.message;
            document.getElementById("xlsxTableContainer").innerHTML = "";
        }
    };

    reader.readAsArrayBuffer(file);
}

function displaySheet(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }); // ✅ Ensure raw values are preserved

        // 🔹 BEFORE: Reading the sheet into JSON
        console.log(`📜 Raw worksheet object for "${sheetName}":`, worksheet);

    if (!jsonData.length) {
        document.getElementById("xlsxTableContainer").innerHTML = "<p>No data in this sheet.</p>";
        return;
    }
    console.log(`Raw data from "${sheetName}":`, worksheet);
    console.log("First 5 rows of data:", jsonData.slice(0, 5));


    // 🔹 Trim leading blank rows (optional fix if needed later)
    // while (jsonData.length && jsonData[0].every(cell => cell === "" || cell === undefined)) {
    //     jsonData.shift();
    // }

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
//     document.getElementById("xlsxTableContainer").innerHTML = `
//     <div style="background: red; color: white; padding: 0px; text-align: center;">
//         DUMMY TEST CONTENT
//     </div>
// `;


    // 🔹 Update active tab styling
    document.querySelectorAll(".sheet-tab").forEach(tab => tab.classList.remove("active"));
    document.querySelectorAll(".sheet-tab").forEach(tab => {
        if (tab.textContent === sheetName) tab.classList.add("active");
    });

    // 🔹 Keep tabs inside the preview box, below the table
    // document.querySelector(".table-wrapper").appendChild(document.getElementById("sheetTabs"));
}

// function displaySheet(workbook, sheetName) {
//     const worksheet = workbook.Sheets[sheetName];
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//     // ✅ Ensure `#xlsxTableContainer` exists before modifying it
//     const tableContainer = document.getElementById("xlsxTableContainer");
//     if (!tableContainer) {
//         console.error("❌ Error: #xlsxTableContainer does not exist in the DOM.");
//         return;
//     }

//     if (!jsonData.length) {
//         tableContainer.innerHTML = "<p>No data in this sheet.</p>";
//         return;
//     }

//     let tableHtml = "<div class='table-wrapper'><table><thead><tr>";

//     // Add headers
//     jsonData[0].forEach(header => {
//         tableHtml += `<th>${header || "Column"}</th>`;
//     });
//     tableHtml += "</tr></thead><tbody>";

//     // Add first 5 rows
//     jsonData.slice(1, 6).forEach(row => {
//         tableHtml += "<tr>" + row.map(cell => `<td>${cell || ""}</td>`).join("") + "</tr>";
//     });

//     tableHtml += "</tbody></table></div>"; // Close table wrapper

//     // ✅ DEBUG: Log before modifying the container
//     console.log("✅ Updating #xlsxTableContainer with table HTML");

//     // ✅ Insert table content into `#xlsxTableContainer`
//     tableContainer.innerHTML = tableHtml;

//     // ✅ Ensure `#xlsxTableContainer` is visible
//     tableContainer.style.display = "block";

//     // ✅ Ensure sheet tabs are inside the upload box
//     document.getElementById("sheetTabs").style.marginTop = "5px";
// }

// Function to display the selected sheet
// function displaySheet(workbook, sheetName) {
//     const worksheet = workbook.Sheets[sheetName];
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

//     if (!jsonData.length) {
//         document.getElementById("xlsxTableContainer").innerHTML = "<p>No data in this sheet.</p>";
//         return;
//     }

//     let tableHtml = "<div class='table-wrapper'><table><thead><tr>";

//     // Add headers
//     jsonData[0].forEach(header => {
//         tableHtml += `<th>${header || "Column"}</th>`;
//     });
//     tableHtml += "</tr></thead><tbody>";

//     // Add first 5 rows
//     jsonData.slice(1, 6).forEach(row => {
//         tableHtml += "<tr>" + row.map(cell => `<td>${cell || ""}</td>`).join("") + "</tr>";
//     });

//     tableHtml += "</tbody></table></div>"; // Close table wrapper

//     document.getElementById("xlsxTableContainer").innerHTML = tableHtml;

//     // Update active tab styling
//     document.querySelectorAll(".sheet-tab").forEach(tab => tab.classList.remove("active"));
//     document.querySelectorAll(".sheet-tab").forEach(tab => {
//         if (tab.textContent === sheetName) tab.classList.add("active");
//     });

//     // Move the tabs inside the table wrapper (below the table)
//     document.querySelector(".table-wrapper").appendChild(document.getElementById("sheetTabs"));
// }

