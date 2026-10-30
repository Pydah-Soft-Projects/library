const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },
    book_title: {
      type: String,
      required: true,
      trim: true
    },
    book_barcode: {
      type: String,
      trim: true
    },
    accession: {
      type: String,
      trim: true
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
      required: true,
      trim: true
    },
    department: {
      type: String,
      default: 'General'
    },
    staff_id: {
      type: String,
      default: 'ADMIN'
    },
    issue_date: {
      type: Date,
      default: Date.now
    },
    due_date: {
      type: Date,
      required: true
    },
    return_date: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['Borrowed', 'Returned', 'Overdue'],
      default: 'Borrowed'
    },
    renewals_count: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

loanSchema.set('toJSON', { virtuals: true });
loanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Loan', loanSchema);
