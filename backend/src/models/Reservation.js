const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    book_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },
    book_title: {
      type: String,
      required: true
    },
    book_accession: {
      type: String,
      default: ''
    },
    student_id: {
      type: String,
      required: true
    },
    student_name: {
      type: String,
      required: true
    },
    shelf_location: {
      type: String,
      default: 'Central Stack'
    },
    expires_in: {
      type: String,
      default: '48 hours'
    },
    status: {
      type: String,
      enum: ['Active', 'Fulfilled', 'Cancelled', 'Expired'],
      default: 'Active'
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

reservationSchema.set('toJSON', { virtuals: true });
reservationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Reservation', reservationSchema);
