import xlsx from 'xlsx';
import { spreadsheetPath } from '../config/paths.js';

export function loadSpreadsheet() {
    console.log(`Reading spreadsheet: ${spreadsheetPath}`);
    
    try {
        const workbook = xlsx.readFile(spreadsheetPath);
        const sheets = {};
        
        // Store all sheets in memory
        Object.keys(workbook.Sheets).forEach(sheetName => {
            sheets[sheetName] = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false });
        });

        console.log("✅ Spreadsheet loaded into memory.");
        return sheets;
    } catch (error) {
        console.error("❌ Error loading spreadsheet:", error);
        return;
    }
}
