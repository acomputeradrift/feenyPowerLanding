
//---------------------------------------------JSON

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
// Attach to the upload button
document.addEventListener("DOMContentLoaded", function () {
    // ✅ Function to show JSON preview & hide "No Current File" message
    function showJsonPreview() {
        document.getElementById("jsonNoFileMessage").style.display = "none"; // ✅ Hide message
        document.getElementById("jsonPreviewContent").style.display = "block"; // ✅ Show JSON preview
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

    // 🔹 Keep tabs inside the preview box, below the table
    // document.querySelector(".table-wrapper").appendChild(document.getElementById("sheetTabs"));
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






