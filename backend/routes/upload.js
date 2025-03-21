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
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// POST /api/upload
router.post('/', upload.single('file'), async (req, res) => {
  const { fileType } = req.body;
  const DEFAULT_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

  if (!req.file || !['log', 'map'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid upload' });
  }

  try {
    const fileData = {
      userId: DEFAULT_USER_ID,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      uploadedAt: new Date()
    };

    let savedFile;
    if (fileType === 'map') {
      savedFile = await MapFile.create(fileData);
    } else if (fileType === 'log') {
      savedFile = await LogFile.create(fileData);
    }

    console.log(`✅ Stored ${fileType} file:`, savedFile.originalFilename);
    res.status(200).json({ message: 'File uploaded', file: savedFile });
  } catch (err) {
    console.error("❌ Upload failed:", err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});



export default router;
