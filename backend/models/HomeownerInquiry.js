import mongoose from 'mongoose';

export const HOMEOWNER_BRANDS = ['lutron', 'vantage', 'rti', 'clipsal-c-bus'];
export const HOMEOWNER_LOCATIONS = ['vancouver', 'kelowna', 'los-gatos'];

const HomeownerInquirySchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true },
  phone:        { type: String, required: true },
  city:         { type: String, required: true },
  brands:       {
                  type: [{ type: String, enum: HOMEOWNER_BRANDS }],
                  required: true
                },
  problem:      { type: String, required: true },
  hasFile:      { type: String, enum: ['yes', 'no'], required: true },
  pageLocation: { type: String, enum: HOMEOWNER_LOCATIONS, required: true },
  pageBrand:    { type: String, enum: HOMEOWNER_BRANDS, required: true },
  sessionId:    { type: String, default: null },

  emailStatus:  {
                  type: String,
                  enum: ['pending', 'sent', 'logged', 'failed'],
                  default: 'pending'
                },
  emailError:   { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

HomeownerInquirySchema.index({ createdAt: -1 });
HomeownerInquirySchema.index({ pageLocation: 1, pageBrand: 1, createdAt: -1 });
HomeownerInquirySchema.index({ sessionId: 1 });

export const HomeownerInquiry =
  mongoose.models.HomeownerInquiry ||
  mongoose.model('HomeownerInquiry', HomeownerInquirySchema);
