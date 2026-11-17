import mongoose from 'mongoose';

// Leads from the dealer page (/consultation). Mirrors HomeownerInquiry.
export const DEALER_PLATFORMS = ['rti', 'lutron', 'vantage', 'clipsal-c-bus'];
export const DEALER_NEEDS = ['stuck', 'new', 'other'];

const DealerInquirySchema = new mongoose.Schema({
  name:         { type: String, required: true },
  company:      { type: String, default: '' },
  email:        { type: String, required: true },
  phone:        { type: String, default: '' },
  platforms:    {
                  type: [{ type: String, enum: DEALER_PLATFORMS }],
                  required: true
                },
  need:         { type: String, enum: DEALER_NEEDS, required: true },
  details:      { type: String, required: true },
  sessionId:    { type: String, default: null },
  // Sent from a device holding the owner marker; left out of analytics.
  test:         { type: Boolean, default: false },

  emailStatus:  {
                  type: String,
                  enum: ['pending', 'sent', 'logged', 'failed'],
                  default: 'pending'
                },
  emailError:   { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

DealerInquirySchema.index({ createdAt: -1 });
DealerInquirySchema.index({ sessionId: 1 });

export const DealerInquiry =
  mongoose.models.DealerInquiry ||
  mongoose.model('DealerInquiry', DealerInquirySchema);
