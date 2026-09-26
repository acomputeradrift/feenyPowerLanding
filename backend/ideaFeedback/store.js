import mongoose from 'mongoose';

const ideaFeedbackSchema = new mongoose.Schema({
  business: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, default: '' },
  vote: { type: String, enum: ['up', 'down'], required: true },
  reason: { type: String, default: '' },
  note: { type: String, default: '' },
  comment: { type: String, default: '' },
  category: { type: String, default: '' },
  saved: { type: Boolean, default: false },
  done: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'ideaFeedback' });

ideaFeedbackSchema.index({ business: 1, date: 1 }, { unique: true });

export function ideaFeedbackModel(connection = mongoose) {
  return connection.models.IdeaFeedback
    || connection.model('IdeaFeedback', ideaFeedbackSchema);
}

export async function upsertFeedback(doc, { model } = {}) {
  const IdeaFeedback = model || ideaFeedbackModel();
  const note = doc.note || doc.comment || '';
  return IdeaFeedback.findOneAndUpdate(
    { business: doc.business, date: doc.date },
    {
      $set: {
        title: doc.title,
        vote: doc.vote,
        reason: doc.reason || '',
        note,
        comment: note,
        category: doc.category || '',
        saved: Boolean(doc.saved),
        done: Boolean(doc.done),
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}

export async function listFeedback(business, { model } = {}) {
  const IdeaFeedback = model || ideaFeedbackModel();
  return IdeaFeedback.find({ business }).sort({ date: 1 }).lean();
}
