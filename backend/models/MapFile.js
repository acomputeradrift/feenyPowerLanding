import mongoose from 'mongoose';

const MapFileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalFilename: { type: String, required: true },
  storedFilename: { type: String, required: true },
  description: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

export const MapFile = mongoose.model('MapFile', MapFileSchema);
