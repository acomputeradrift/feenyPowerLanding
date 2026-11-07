import mongoose from 'mongoose';

// First-party, cookieless page analytics. `visitor` is sha256(daily salt + IP + UA);
// the raw IP is never stored. Documents expire after ~400 days.
const AnalyticsEventSchema = new mongoose.Schema({
  ts:         { type: Date, required: true },
  name:       { type: String, required: true },
  sessionId:  { type: String, required: true },
  visitor:    { type: String },
  path:       { type: String, required: true },
  location:   { type: String, required: true },
  brand:      { type: String, required: true },
  referrer:   { type: String },
  refHost:    { type: String },
  channel:    { type: String },
  utm: {
    source:   { type: String },
    medium:   { type: String },
    campaign: { type: String },
    term:     { type: String },
    content:  { type: String }
  },
  device:     { type: String },
  engagedSec: { type: Number },
  scrollPct:  { type: Number },
  props:      { type: mongoose.Schema.Types.Mixed },
  seed:       { type: Boolean }
}, { versionKey: false });

AnalyticsEventSchema.index({ ts: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });
AnalyticsEventSchema.index({ location: 1, brand: 1, ts: 1 });
AnalyticsEventSchema.index({ sessionId: 1, ts: 1 });

export const AnalyticsEvent = mongoose.models.AnalyticsEvent
  || mongoose.model('AnalyticsEvent', AnalyticsEventSchema);

const AnalyticsSaltSchema = new mongoose.Schema({
  day:       { type: String, required: true, unique: true },
  salt:      { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 3 * 24 * 60 * 60 }
}, { versionKey: false });

export const AnalyticsSalt = mongoose.models.AnalyticsSalt
  || mongoose.model('AnalyticsSalt', AnalyticsSaltSchema);

const AnalyticsReportLogSchema = new mongoose.Schema({
  week:      { type: String, required: true, unique: true },
  status:    { type: String, required: true },
  claimedAt: { type: Date, required: true },
  sentAt:    { type: Date },
  to:        { type: String },
  messageId: { type: String }
}, { versionKey: false });

export const AnalyticsReportLog = mongoose.models.AnalyticsReportLog
  || mongoose.model('AnalyticsReportLog', AnalyticsReportLogSchema);
