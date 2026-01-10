import { Course } from "../Models/Course.model.js";
import { User } from "../Models/User.Model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";
import { FileDelete, FileUpload } from "../Utils/Cloudinary.js";
import jwt from 'jsonwebtoken';
import { Material } from "../Models/material.model.js"; 
import { transaction } from "../Utils/transaction.js";
import { Enroll } from "../Models/enroll.model.js";
import { adminID } from "../constant.js";

const addMaterial=AsynHandler(async(req,res)=>{
      const {title,description,courseID,materialType,text,mcq,mcqDuration} =req.body;
      
      console.log(materialType);
      
      if( !courseID || !materialType){
        throw new ApiError(401,"all Feilds are required! ");
      }
    

      const user=await User.findById(req.user?._id);
      if(!user){
        throw new ApiError(401,"User id are not valid");
      }

      if(user.Role!=="admin" && user.Role!=="instructor"){
        throw new ApiError(401,"only admin and instructor can upload a material");
     }
    
    const course=await Course.findById(courseID);
    if(!course){
        throw new ApiError(401,"Course ID is invalid ")
    }
    const pictureLocalPath=[];
    const pictureFiles = Array.isArray(req.files?.picture) ? req.files.picture : [];
    for (const pic of pictureFiles) {
        try {
            const LocalPath = await FileUpload(pic.path);
            if(LocalPath){
                pictureLocalPath.push({ url: LocalPath.url, publicId: LocalPath.public_id });
            }
        } catch (e) {
            console.error('Picture upload failed:', e?.message || e);
        }
    }

    const videoLocalPath=[];
    const videoFiles = Array.isArray(req.files?.video) ? req.files.video : [];
    for (const vid of videoFiles) {
        try {
            const LocalPath = await FileUpload(vid.path);
            if(LocalPath){
                videoLocalPath.push({ url: LocalPath.url, publicId: LocalPath.public_id,duration:LocalPath.duration });
            }
        } catch (e) {
            console.error('Video upload failed:', e?.message || e);
        }
    }

     const audioLocalPath=[];
    const audioFiles = Array.isArray(req.files?.audio) ? req.files.audio: [];
    for (const aid of audioFiles) {
        try {
            const LocalPath = await FileUpload(aid.path);
            if(LocalPath){
                audioLocalPath.push({ url: LocalPath.url, publicId: LocalPath.public_id });
            }
        } catch (e) {
            console.error('audio upload failed:', e?.message || e);
        }
    }

      if ((!text || text.trim() === "") &&
        pictureLocalPath.length === 0 &&
        videoLocalPath.length === 0 &&
        audioLocalPath.length===0 &&
        mcq.length===0
      ) {
     throw new ApiError(400, "upload must contain at least one of: text or  picture or audio or video or mcq");
  }

    let questions = [];
  if (mcq) {
    try {
      const parsed = JSON.parse(mcq);
      if (Array.isArray(parsed)) {
        questions = parsed.map(q => ({
          question: q.question,
          options: q.options,
          answer: q.answer
        }));
      }
    } catch (err) {
      throw new ApiError(400, "Invalid MCQ format, must be valid JSON");
    }
  }
   const material=await Material.create({
     courseID,
     title,
     description,
     materialType,
     text:text||null,
     picture:pictureLocalPath,
     video:videoLocalPath,
     audio:audioLocalPath,
     questions,
     mcqDuration: mcqDuration || questions.length || 5,
     uploadedBy:req.user?._id
     
   })
  

   console.log("content uploaded succesfully");
   //finding who create course  if admin then 

   const admin=await User.findById(course.owner);
   if(admin.Role==="admin" && user.Role!=="admin"){
        const payment=100;
        
        // Check if admin has sufficient balance
        if(admin.balance < payment){
          throw new ApiError(401,"Admin has insufficient balance to pay instructor");
        }
        
        const bank=new transaction(admin._id,req.user?._id,payment,`salary for content upload : ${course.title} `)
        const txn=await bank.tnx();
        
        // Deduct from admin's balance
        admin.balance=Number(admin.balance)-Number(payment);
        await admin.save({validateBeforeSave:false});
        
        // Add to teacher's balance
        user.balance=Number(user.balance)+payment;
        await user.save({validateBeforeSave:false});
        console.log("teacher payment for content upload succesfully");


   }
   
   // Return material with updated user data for balance refresh
   const updatedUser=await User.findById(req.user?._id).select("-Password -RefreshToken -secretKey");
   return res
   .status(201)
   .json(
    new ApiResponse(201,{material,user:updatedUser},"content uploaded succesfully")
   )
})

const updateMaterial = AsynHandler(async (req, res) => {
  const { materialId } = req.params;
  const { title, description, text, mcq, mcqDuration } = req.body;
  const user = await User.findById(req.user?._id);

  if (!user) throw new ApiError(401, "User not valid");
  if (user.Role !== "admin" && user.Role !== "instructor") {
    throw new ApiError(403, "Only admin or instructor can update material");
  }

  const material = await Material.findById(materialId);
  if (!material) throw new ApiError(404, "Material not found");

 
  if (user.Role !== "admin" && material.uploadedBy.toString() !== user._id.toString()) {
    throw new ApiError(403, "You cannot update another instructor's material");
  }

  
  if (title) material.title = title;
  if (description) material.description = description;
  if (text) material.text = text;
  if (mcqDuration) material.mcqDuration = parseInt(mcqDuration);

  if (mcq) {
    try {
      const parsed = JSON.parse(mcq);
      if (Array.isArray(parsed)) {
        material.questions = parsed.map(q => ({
          question: q.question,
          options: q.options,
          answer: q.answer
        }));
      }
    } catch (err) {
      throw new ApiError(400, "Invalid MCQ format, must be valid JSON");
    }
  }

 
  if (req.files?.picture) {
    for (const pic of material.picture) {
      await FileDelete(pic.publicId, "image");
    }
    material.picture = [];
    for (const pic of req.files.picture) {
      const LocalPath = await FileUpload(pic.path);
      if (LocalPath) {
        material.picture.push({ url: LocalPath.url, publicId: LocalPath.public_id });
      }
    }
  }

  if (req.files?.video) {
    for (const vid of material.video) {
      await FileDelete(vid.publicId, "video");
    }
    material.video = [];
    for (const vid of req.files.video) {
      const LocalPath = await FileUpload(vid.path);
      if (LocalPath) {
        material.video.push({
          url: LocalPath.url,
          publicId: LocalPath.public_id,
          duration: LocalPath.duration
        });
      }
    }
  }

  if (req.files?.audio) {
    for (const aud of material.audio) {
      await FileDelete(aud.publicId, "video"); 
    }
    material.audio = [];
    for (const aud of req.files.audio) {
      const LocalPath = await FileUpload(aud.path);
      if (LocalPath) {
        material.audio.push({ url: LocalPath.url, publicId: LocalPath.public_id });
      }
    }
  }

  await material.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, material, "Material updated successfully (Cloudinary files replaced)")
  );
});


const getAllmaterialList=AsynHandler(async(req,res)=>{
     const {courseID}= req.body;
    
     const course=await Course.findById(courseID);
     if(!course){
      throw new ApiError(401,"course are not found ");
     }

     const user=await User.findById(req.user?._id);
     if(!user){
      throw new ApiError(401,"User id needed ");
     }

     if(user.Role==="learner"){
         const checkEnrollMent=await Enroll.findOne({
            courseID,
            learnerID:user._id
         })

         if(!checkEnrollMent || checkEnrollMent.paymentStatus!=="paid"){
          throw new ApiError(401,"You can not enrolled this course")
         }
     }
     
     console.log(user._id);
     console.log(course.owner);
     
     if(course.owner.toString()!==adminID){
     if(user.Role==='instructor'){
        if(user._id.toString() !== course.owner.toString()){
          throw new ApiError(401,"can not access material different instructor")
        }
     }
    }


    const fetchAlldata=await Material.find({courseID}).sort({ createdAt: -1 });;
    console.log("fetched all material succesfully ");
    return res
    .status(201)
    .json(
      new ApiResponse(201,fetchAlldata,"fetched all material succesfully ")
    )

})

const deleteMaterial = AsynHandler(async (req, res) => {
  const { materialId } = req.params;

  const material = await Material.findById(materialId);
  if (!material) {
    throw new ApiError(404, "Material not found");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "User not authenticated");
  }

  const course = await Course.findById(material.courseID);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  // Check if user is admin or the course owner
  if (user.Role !== "admin" && course.owner.toString() !== user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this material");
  }

  // Delete files from Cloudinary
  if (material.picture?.length > 0) {
    for (const pic of material.picture) {
      await FileDelete(pic.publicId, "image");
    }
  }

  if (material.video?.length > 0) {
    for (const vid of material.video) {
      await FileDelete(vid.publicId, "video");
    }
  }

  if (material.audio?.length > 0) {
    for (const aud of material.audio) {
      await FileDelete(aud.publicId, "video");
    }
  }

  await Material.findByIdAndDelete(materialId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Material deleted successfully"));
});

export{
    addMaterial,
    getAllmaterialList,
    updateMaterial,
    deleteMaterial
}