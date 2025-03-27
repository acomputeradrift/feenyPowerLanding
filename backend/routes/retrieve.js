import express from 'express';
import { LogFile } from '../models/LogFile.js';
import { MapFile } from '../models/MapFile.js';


const router = express.Router();

router.post('/api/retrieve', async (req, res) => {
  try {
    const { logId } = req.body;

    let logDoc;

    if (logId) {
      logDoc = await LogFile.findById(logId);
    } else {
      logDoc = await LogFile.findOne().sort({ uploadTimeServer: -1 });
    }

    if (!logDoc || !logDoc.analysisResult) {
      return res.status(404).json({ error: 'No processed log found.' });
    }

    res.json({
      logs: logDoc.analysisResult,
      originalFilename: logDoc.originalFilename
    });

  } catch (err) {
    console.error('❌ Error in /api/retrieve:', err);
    res.status(500).json({ error: 'Failed to retrieve processed log.' });
  }
});

export default router;

// router.post('/api/retrieve', async (req, res) => {
//   try {
//     const { logId } = req.body;

//     let logDoc;

//     if (logId) {
//       logDoc = await LogFile.findById(logId);
//     } else {
//       logDoc = await LogFile.findOne().sort({ uploadTimeServer: -1 });
//     }

//     if (!logDoc || !logDoc.analysisResult) {
//       return res.status(404).json({ error: 'No processed log found.' });
//     }

//     res.json(logDoc.analysisResult);

//   } catch (err) {
//     console.error('❌ Error in /api/retrieve:', err);
//     res.status(500).json({ error: 'Failed to retrieve processed log.' });
//   }
// });

// export default router;
