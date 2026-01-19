import mongoose from "mongoose";
const materialSchema=new mongoose.Schema({
 
  courseID:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Course",
    required:true
  },
  
  classID:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Class",
    required:true
  },
  
  title:{
    type:String,
    required:true
  },
  
  description:{
    type:String,
    default: ""
  },
  
  order:{
    type:Number,
    required:true,
    min:0
  },
  
  materialType:{
     type:String,
     enum:['text','audio','mcq','video','image','pdf'],
     required:true  
  },
 
   //material
      text:{
         type:String
      },

       picture:
      [{
        url: { type: String },
        publicId: { type: String }
     }],

       video:
      [{
        url: { type: String },
        publicId: { type: String },
        duration: { type: Number }
     }],

      audio:[{
        url:{type:String},
        publicId:{type:String}
      }],

      pdf:[{
        url:{type:String},
        publicId:{type:String}
      }],
   
  
  questions: [  //mcq
      {
        question: { type: String },
        options: [{ type: String }],
        answer: { type: String }
      }
    ],
  
  mcqDuration: {  // Duration in minutes for MCQ exams
    type: Number,
    default: 5
  },
  
  isFinalExam: {
    type: Boolean,
    default: false
  },

uploadedBy:{
   type:mongoose.Schema.Types.ObjectId,
   ref:"User",
   required:true
}

},{timestamps:true})

// Ensure unique order within a class
materialSchema.index({ classID: 1, order: 1 }, { unique: true });

export const Material=mongoose.model("Material",materialSchema)