import express from 'express';
import path from 'path';
import { analyzeRTILogs } from '../RTI_log_analysis/analyzeRTILog_v3.js';

const router = express.Router();

const uploadsDir = '/root/feenyPowerLanding/backend/uploads';

router.post('/api/process', async (req, res) => {
    console.log('Hit the api/process');
    const { logFileName, mapFileName } = req.body;

    if (!logFileName || !mapFileName) {
        return res.status(400).json({ error: "Both logFileName and mapFileName are required." });
    }

    const logPath = path.join(uploadsDir, logFileName);
    console.log(`logPath: ${logPath}`);
    const mapPath = path.join(uploadsDir, mapFileName);
    console.log(`mapPath: ${mapPath}`);


    try {
        analyzeRTILogs(logPath, mapPath);
        return res.json({ message: "Processing complete." });
    } catch (err) {
        console.error("❌ Error during processing:", err);
        return res.status(500).json({ error: "Failed to process log." });
    }
});

export default router;
