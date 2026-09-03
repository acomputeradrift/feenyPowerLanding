import mongoose from 'mongoose';

const ideaFeedbackSchema = new mongoose.Schema({
  business: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, default: '' },
  vote: { type: String, enum: ['up', 'down'], required: true },
  comment: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'ideaFeedback' });

ideaFeedbackSchema.index({ business: 1, date: 1 }, { unique: true });

export function ideaFeedbackModel(connection = mongoose) {
  return connection.models.IdeaFeedback
    || connection.model('IdeaFeedback', ideaFeedbackSchema);
}

export async function upsertFeedback(doc, { model } = {}) {
  const IdeaFeedback = model || ideaFeedbackModel();
  return IdeaFeedback.findOneAndUpdate(
    { business: doc.business, date: doc.date },
    {
      $set: {
        title: doc.title,
        vote: doc.vote,
        comment: doc.comment,
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true }
  );
}
