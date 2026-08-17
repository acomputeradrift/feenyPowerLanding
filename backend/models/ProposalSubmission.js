import mongoose from 'mongoose';

const LineItemSchema = new mongoose.Schema({
  section:        { type: String, required: true },
  id:             { type: String, required: true },
  label:          { type: String, required: true },
  count:          { type: Number, required: true },
  minutesPerUnit: { type: Number, required: true },
  rawHours:       { type: Number, required: true },
  hours:          { type: Number, required: true }
}, { _id: false });

const ProposalSubmissionSchema = new mongoose.Schema({
  reference:        { type: String, required: true, unique: true, index: true },
  submittedAt:      { type: Date, required: true, index: true },

  contractorName:   { type: String, required: true },
  contractorEmail:  { type: String, required: true },
  projectPoName:    { type: String, required: true },
  projectClientName:{ type: String },

  answers:          { type: mongoose.Schema.Types.Mixed, required: true },
  systemData:       { type: mongoose.Schema.Types.Mixed, required: true },

  rateCardVersion:  { type: String, required: true },
  lineItems:        { type: [LineItemSchema], required: true },
  sectionHours:     { type: mongoose.Schema.Types.Mixed, required: true },
  totalProjectHours:{ type: Number, required: true },

  pdfFilename:      { type: String },
  emailStatus:      {
                      type: String,
                      enum: ['pending', 'sent', 'failed'],
                      default: 'pending'
                    },
  emailError:       { type: String },
  emailedAt:        { type: Date },

  clientIpHash:     { type: String },
  userAgent:        { type: String },
  schemaVersion:    { type: String, required: true }
});

export const ProposalSubmission =
  mongoose.model('ProposalSubmission', ProposalSubmissionSchema);
