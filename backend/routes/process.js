import express from 'express';
import path from 'path';
import { analyzeRTILogsForAPI } from '../RTI_log_analysis/analyzeRTILogsForAPI.js';
import { LogFile } from '../models/LogFile.js';
import { MapFile } from '../models/MapFile.js';


const router = express.Router();
const uploadsDir = '/root/feenyPowerLanding/backend/uploads';

router.post('/api/process', async (req, res) => {
    console.log('Hit the api/process');
    const { logFileName, mapFileName } = req.body;

    if (!logFileName || !mapFileName) {
        return res.status(400).json({ error: "Both logFileName and mapFileName are required." });
    }

    const logPath = path.join(uploadsDir, logFileName);
    const mapPath = path.join(uploadsDir, mapFileName);

    try {
        const processed = await analyzeRTILogsForAPI(logPath, mapPath);

        const logDoc = await LogFile.findOne({ storedFilename: logFileName });
        const mapDoc = await MapFile.findOne({ storedFilename: mapFileName });

        if (!logDoc || !mapDoc) {
            return res.status(404).json({ error: "Matching log or map file not found in database." });
        }

        logDoc.analysisResult = processed;
        logDoc.mapUsed = mapDoc._id;
        await logDoc.save();

        return res.json({ message: "Processing complete.", logId: logDoc._id });

    } catch (err) {
        console.error("❌ Error during processing:", err);
        return res.status(500).json({ error: "Failed to process log." });
    }
});

export default router;


