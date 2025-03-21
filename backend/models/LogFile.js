import mongoose from 'mongoose';

const LogFileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalFilename: { type: String, required: true },
  storedFilename: { type: String, required: true },
  mapUsed: { type: mongoose.Schema.Types.ObjectId, ref: 'MapFile' },
  analysisResult: { type: mongoose.Schema.Types.Mixed }, // optional
  uploadedAt: { type: Date, default: Date.now }
});

export const LogFile = mongoose.model('LogFile', LogFileSchema);
