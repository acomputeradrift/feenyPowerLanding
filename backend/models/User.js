import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  role: { type: String, default: 'admin' }, // optional for now
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
