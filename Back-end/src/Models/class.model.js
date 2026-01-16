import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  courseID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    default: ""
  },
  
  order: {
    type: Number,
    required: true,
    min: 0
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
  
}, { timestamps: true });

// Ensure unique order within a course
classSchema.index({ courseID: 1, order: 1 }, { unique: true });

export const Class = mongoose.model("Class", classSchema);
