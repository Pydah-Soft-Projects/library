const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema(
  {
    loan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan'
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    patron_id: {
      type: String,
      required: true,
      trim: true
    },
    patron_name: {
      type: String,
      default: ''
    },
    book_title: {
      type: String,
      default: ''
    },
    amount: {
      type: Number,
      required: true,
      default: 0
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Paid', 'Waived'],
      default: 'Unpaid'
    },
    payment_method: {
      type: String,
      default: null
    },
    receipt_no: {
      type: String,
      default: null
    },
    paid_at: {
      type: Date,
      default: null
    },
    collected_by: {
      type: String,
      default: null
    },
    waiver_reason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

fineSchema.set('toJSON', { virtuals: true });
fineSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Fine', fineSchema);
