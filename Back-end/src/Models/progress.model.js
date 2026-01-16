import mongoose, { mongo } from "mongoose";

const progressSchema = new mongoose.Schema({

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
  
  classID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Class"
  },

  materialID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Material"
  },

  watchedSeconds: { 
    type: Number, 
    default: 0 
  }, 

  watchedPercent: { 
    type: Number,
    default: 0
  },  

  completed: { 
    type: Boolean,
    default: false 
  },
  
  completedAt: {
    type: Date,
    default: null
  },

  videoUrl: { 
    type: String 
  }

}, { timestamps: true });

// Indexes for efficient querying
progressSchema.index({ courseID: 1, learnerID: 1, materialID: 1 });
progressSchema.index({ courseID: 1, learnerID: 1, classID: 1 });

export const Progress = mongoose.model("Progress",progressSchema)