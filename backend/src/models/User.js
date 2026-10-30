const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true
    },
    full_name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      default: 'Student',
      trim: true
    },
    role_id: {
      type: Number,
      default: 4
    },
    patron_id: {
      type: String,
      trim: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    department: {
      type: String,
      default: 'General'
    },
    division: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Frozen'],
      default: 'Active'
    },
    permissions: [
      {
        type: String
      }
    ]
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
  }
);

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
