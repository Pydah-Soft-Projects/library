const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: true, 
      trim: true 
    },
    author: { 
      type: String, 
      required: true, 
      trim: true 
    },
    isbn: { 
      type: String, 
      trim: true, 
      default: '' 
    },
    category: { 
      type: String, 
      default: 'General' 
    },
    accession: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true 
    },
    barcode: { 
      type: String, 
      required: true, 
      trim: true 
    },
    shelf: { 
      type: String, 
      default: 'Central Stack' 
    },
    total: { 
      type: Number, 
      default: 5 
    },
    available: { 
      type: Number, 
      default: 5 
    },
    publisher: { 
      type: String, 
      default: 'Institutional Press' 
    },
    edition: { 
      type: String, 
      default: 'Standard Edition' 
    },
    category_code: {
      type: String,
      default: 'GEN'
    },
    // Sequential copies with unique serial number and barcode for every copy
    copies_detail: [
      {
        copy_number: { type: Number },
        serial_no: { type: String, trim: true },
        barcode: { type: String, trim: true },
        accession: { type: String, trim: true },
        status: { type: String, default: 'Available' }
      }
    ]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);
