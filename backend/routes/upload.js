import express from 'express';
import multer from 'multer';
import path from 'path';
import { FileUpload } from '../models/FileUpload.js';

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

  if (!req.file || !fileType || !['log', 'map'].includes(fileType)) {
    return res.status(400).json({ error: 'Invalid upload' });
  }

  try {
    const newUpload = new FileUpload({
      userId: DEFAULT_USER_ID,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      fileType,
    });

    await newUpload.save();
    res.status(200).json({ message: 'File uploaded', file: newUpload });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

export default router;
