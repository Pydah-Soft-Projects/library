const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: 'blue'
    },
    permissions: [
      {
        type: String
      }
    ],
    is_system: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

roleSchema.set('toJSON', { virtuals: true });
roleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Role', roleSchema);
