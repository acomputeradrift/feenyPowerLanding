import express from 'express';
import multer from 'multer';
import path from 'path';
import { MapFile } from '../models/MapFile.js';
import { LogFile } from '../models/LogFile.js';
import mongoose from 'mongoose';


const router = express.Router();

// Temporary default user ID (can be loaded from env if you like)
const DEFAULT_USER_ID = '000000000000000000000001';

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(path.resolve(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const ext = path.extname(file.originalname);
    const now = new Date();
    const timestamp = `${now.getFullYear()} ${String(now.getMonth() + 1).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    cb(null, `${originalName} (${timestamp})${ext}`);
  }
});
const upload = multer({ storage });

// POST /api/upload
router.post('/', upload.single('file'), async (req, res) => {
  // ✅ Extract values first
  const fileType = req.body.fileType;
  const userTimeZone = req.body.userTimeZone;


  // ✅ Log what was received from the client
  console.log("🛰️ Received from client:");
  console.log("→ fileType:", fileType);
  console.log("→ userTimeZone:", userTimeZone);

  const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

  if (!req.file || !['log', 'map'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid upload' });
  }

  try {
    const fileData = {
      userId: DEFAULT_USER_ID,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      uploadTimeServer: new Date(),
      userTimeZone, // ✅ correct and consistent
    };

    let savedFile;
    if (fileType === 'map') {
      savedFile = await MapFile.create(fileData);
    } else if (fileType === 'log') {
      savedFile = await LogFile.create(fileData);
    }

    const { formatTimestampsForDisplay } = await import('../utils/formatTimeZones.js');

    const { serverTime, userTime } = formatTimestampsForDisplay(
      fileData.uploadTimeServer,
      userTimeZone
    );

    console.log(`✅ Stored ${fileType} file:`, savedFile.originalFilename);
    console.log(`🕐 Server Time: ${serverTime}`);
    console.log(`👤 User Time (${userTimeZone}): ${userTime}`);

    res.status(200).json({ message: 'File uploaded', file: savedFile });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

export default router;
