import { Course } from "../Models/Course.model.js";
import { Enroll } from "../Models/enroll.model.js";
import { User } from "../Models/User.Model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";
import { FileDelete, FileUpload } from "../Utils/Cloudinary.js";
import jwt from 'jsonwebtoken';
import { transaction } from "../Utils/transaction.js";
import { Bank } from "../Models/bank.model.js";
import { Certificate } from "../Models/certificate.model.js";

const approvedEnroll=AsynHandler(async(req,res)=>{
  
    const{courseID,learnerID,transactionID}=req.body;

    if(!courseID || !learnerID || !transactionID){
        throw new ApiError(401,"courseID , LearnerID and transactionID are needed");
    }

    const currentUser=await User.findById(req.user?._id);
    
    const course=await Course.findById(courseID)
    const learner= await User.findById(learnerID)
    if(!course){
        throw new ApiError(401,"course are not found")
    }
    if(!learner){
        throw new ApiError(401,"learner are not found ")
    }

    // Check if user is the course owner (instructor) or admin
    const isOwner = course.owner.toString() === currentUser._id.toString();
    const isAdmin = currentUser.Role === "admin";
    
    if (!isOwner && !isAdmin) {
        throw new ApiError(403, "Only the course instructor or admin can approve enrollments");
    }

    const txn=await Bank.findById(transactionID);
    if(!txn){
        throw new ApiError(401,"transaction not found ")
    }

    if(txn.status==="success"){
        throw new ApiError(401,"payment already accepted")
    }

    const enroll=await  Enroll.findOne({
          courseID,learnerID
    })

    if(!enroll){
        throw new ApiError(401,"enroll ID not found ")
    }
    
    // Get admin user for payment processing
    const admin = await User.findOne({ Role: "admin" });
    if (!admin) {
        throw new ApiError(500, "Admin user not found");
    }
    
    //aproved
    txn.status="success";
    admin.balance=Number(admin.balance)+Number(txn.amount);
    enroll.paymentStatus="paid";
    enroll.status="active";
    
    const courseOwner=course.owner;

    let instructorBank=null;
    console.log(course.owner.toString());
    console.log(admin._id.toString());
    if (course.owner.toString() !== admin._id.toString()) {

    const perEnrolled=Number(txn.amount)*.60;

    admin.balance=(admin.balance)-perEnrolled;
    const tranc=new transaction(admin?._id,courseOwner,perEnrolled,"instructors salary ");
    const tnx=await tranc.tnx()
    console.log("teacher salay done ",perEnrolled);
    instructorBank=await Bank.findById(tnx);
    
    const teacher=await User.findById(courseOwner);
    
    teacher.balance=Number(teacher.balance)+(perEnrolled);
    instructorBank.status="success";
    await teacher.save({validateBeforeSave:false})

  }

 
    await course.save({validateBeforeSave:false})
    if(instructorBank)
    await instructorBank.save({validateBeforeSave:false})
    await txn.save({validateBeforeSave:false})
    await admin.save({validateBeforeSave:false})
    await enroll.save({validateBeforeSave:false})

    console.log("approved successfully ");
    
    return res
    .status(201)
    .json(
        new ApiResponse(201,{txn,enroll},"approved successfully and instructor salary done ")
    )
})

const approvedCourse=AsynHandler(async(req,res)=>{
     const {courseID,courseLanchPayment}=req.body;
     console.log(courseID);

     if(!courseID){
        throw new ApiError(401,"courseID are needed");
     }

     if(!courseLanchPayment){
        throw new ApiError(401,"courseLanchPayment is needed");
     }

     const course=await Course.findById(courseID);
     if(!course){
        throw new ApiError(401,"course not found ");
     }
    
     if(course.isActive==true){
        throw new ApiError(401,"already approved! ")
     }
     const admin =await User.findById(req.user?._id);
     if(!admin || admin.Role!=="admin"){
        throw new ApiError(401,"only admin can approved the course ")
     }

     if(admin.balance<courseLanchPayment){
        throw new ApiError(401,"insufficient balance");
     }

     //balance update
     let bankCheck;
     const teacher= await User.findById(course.owner);
     if(teacher._id.toString()!=admin._id.toString()){
        
     teacher.balance=Number(teacher.balance)+Number(courseLanchPayment);
     const bank=new transaction(admin._id,teacher?._id,courseLanchPayment,`salary for courseLanch ${course.title}`);
     const txn=await bank.tnx();
    
     bankCheck=await Bank.findById(txn);
     bankCheck.status="success";
     await teacher.save({validateBeforeSave:false});
     await bankCheck.save({validateBeforeSave:false});

     }
     
     // Deduct admin balance regardless of who owns the course
     admin.balance=Number(admin.balance)-Number(courseLanchPayment);
     await admin.save({validateBeforeSave:false});
     
    //course update
   
     course.isActive=true;
     course.status="available";
     await course.save({validateBeforeSave:false});

    console.log("Course approved and salary given succesfully");
    return res
    .status(201)
    .json(
        new ApiResponse(201,(bankCheck?bankCheck:null),"Course approved and salary given succesfully")
    )
})


const issueCertificate = AsynHandler(async (req, res) => {
  const { courseID, learnerID } = req.body;
  const adminID = req.user?._id;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can issue certificates");
  }

  const enroll = await Enroll.findOne({ courseID, learnerID });
  if (!enroll) throw new ApiError(404, "Enrollment not found");

  if (enroll.progress < 80) {
    throw new ApiError(400, "Learner has not reached 80% progress");
  }

  if (enroll.certificateIssued) {
    throw new ApiError(400, "Certificate already issued");
  }

  const certificate = await Certificate.create({
    courseID,
    learnerID,
    issuedBy: adminID,
    certificateCode: `CERTIFICATE-${Date.now()}-${learnerID}`
  });

  enroll.status = "completed";
  enroll.certificateIssued = true;
  enroll.certificateID = certificate._id;
  await enroll.save();

  return res.status(201).json(
    new ApiResponse(201, certificate, "Certificate issued successfully")
  );
});

const getPendingEnrollments = AsynHandler(async (req, res) => {
  const adminID = req.user?._id;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can view pending enrollments");
  }

  // Find all enrollments with pending payment status
  const pendingEnrollments = await Enroll.find({ paymentStatus: "pending" })
    .populate({
      path: 'courseID',
      select: 'title description price courseImage'
    })
    .populate({
      path: 'learnerID',
      select: 'FullName Email ProfileImage UserName'
    })
    .sort({ enrollAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, pendingEnrollments, "Pending enrollments fetched successfully")
  );
});


export{
    approvedEnroll,
    approvedCourse,
    issueCertificate,
    getPendingEnrollments
}