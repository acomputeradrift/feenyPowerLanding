import mongoose from 'mongoose';

const DOC_ID = 'global';

const compareCountSchema = new mongoose.Schema(
  {
    _id: { type: String, default: DOC_ID },
    count: { type: Number, default: 0, min: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sentinelLiteCompareCount' },
);

export function compareCountModel(connection = mongoose) {
  return (
    connection.models.SentinelLiteCompareCount ||
    connection.model('SentinelLiteCompareCount', compareCountSchema)
  );
}

/** Read the lifetime compare total. Missing doc → 0. */
export async function readCompareCount({ model } = {}) {
  const CompareCount = model || compareCountModel();
  const doc = await CompareCount.findById(DOC_ID).lean();
  const count = doc?.count;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

/** Atomically add one compare. Survives deploys; never stores file metadata. */
export async function incrementCompareCount({ model } = {}) {
  const CompareCount = model || compareCountModel();
  const doc = await CompareCount.findByIdAndUpdate(
    DOC_ID,
    {
      $inc: { count: 1 },
      $set: { updatedAt: new Date() },
      $setOnInsert: { _id: DOC_ID },
    },
    { upsert: true, new: true },
  );
  return doc.count;
}
