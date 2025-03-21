import mongoose from 'mongoose';

const FileUploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Optional for now
  },
  originalFilename: String,
  storedFilename: String,
  fileType: {
    type: String,
    enum: ['log', 'map'],
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  }
});

export const FileUpload = mongoose.model('FileUpload', FileUploadSchema);
