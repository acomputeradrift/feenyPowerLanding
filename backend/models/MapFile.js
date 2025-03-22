import mongoose from 'mongoose';

const MapFileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalFilename: String,
  storedFilename: String,
  uploadTimeServer: { type: Date, required: true },
  userTimeZone: { type: String, required: true }
});


export const MapFile = mongoose.model('MapFile', MapFileSchema);
