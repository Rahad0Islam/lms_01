import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema({

  courseID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Course",
    required: true
  },

  learnerID: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  averageScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },

  requestedAt: {
    type: Date,
    default: Date.now
  },

  issuedAt: {
    type: Date
  },

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  rejectionReason: {
    type: String
  },

  certificateCode: {
    type: String, 
    unique: true,
    required: true
  }
}, { timestamps: true });

// Compound unique index to ensure one certificate per learner per course
certificateSchema.index({ learnerID: 1, courseID: 1 }, { unique: true });

export const Certificate = mongoose.model("Certificate", certificateSchema)