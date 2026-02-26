import { Course } from "../Models/Course.model.js";
import { Enroll } from "../Models/enroll.model.js";
import { User } from "../Models/User.Model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";
import { FileDelete, FileUpload } from "../Utils/Cloudinary.js";
import jwt from 'jsonwebtoken';
import { transaction } from "../Utils/transaction.js";
import { adminID } from "../constant.js";


const addCourse=AsynHandler(async(req,res)=>{
     const {title,description,price}=req.body;


     if(!title || !description || !price){
        throw new ApiError(401,"All fields are required ");
     }
     if(Number(price)<0){
        throw new ApiError(401,"price can not be negative");
     }

    
     const user=await User.findById(req.user?._id);
     if(!user){
        throw new ApiError(401,"userId not valid");
     }

     if(user.Role!=="admin" && user.Role!=="instructor"){
        throw new ApiError(401,"only admin and instructor can lanch a course ");
     }

     let courseImageLocalPath="";
         if (
                 Array.isArray(req.files?.courseImage) &&
                 req.files?.courseImage.length > 0 
                )
            {
           courseImageLocalPath=req.files?.courseImage[0]?.path;
         }
     
     
     
         if(!courseImageLocalPath){
             throw new ApiError(401,"course picture is required");
         }
       
         console.log(courseImageLocalPath);
     
      const courseImage=await FileUpload(courseImageLocalPath);

      if(!courseImage){
        throw new ApiError(501,"cloudinary problem");
      }

      const course=await Course.create({
          title,
          description,
          price,
          courseImage:courseImage?.url,
          courseImagePublicID:courseImage?.public_id,
          owner:user._id
      })
   

    console.log("course added succesfully ");

    return res
    .status(201)
    .json(
        new ApiResponse(201,course,"course added succesfully")
    )
})


const courseEnroll=AsynHandler(async(req,res)=>{
      const {courseID,price,secretKey}=req.body;
      console.log(courseID);

      if(!courseID){
        throw new ApiError(401,"courseID needed! ");
      }
      

      const courseCheck=await Enroll.findOne({
           courseID:courseID,
           learnerID:req.user?._id 
      });

      if(courseCheck?.paymentStatus==="pending" || courseCheck?.paymentStatus==="paid"){
         throw new ApiError(401,"payment already done ")
      }

  
      if(!adminID){
        throw new ApiError(401, "adminID not valid")
      }

    //   const adminid=await User.findById(adminID);
    //   if(!adminid || adminid.Role!=="admin"){
    //      throw new ApiError(401, "admin are required ");
    //   }

      const course=await Course.findById(courseID);
      if(!course){
        throw new ApiError(501,"course not found");
      }

     if(course.isActive==false){
        throw new ApiError(401,"course are not availabe ")
     }
      if(price!=course.price){
        throw new ApiError(401,"price are not same")
      }

      const user=await User.findById(req.user?._id);
      if(!user){
        throw new ApiError(401,"user not found");
      }
    
      const IsSecretCorr=await user.IssecretKeyCorrect(secretKey);
      if(!IsSecretCorr)throw new ApiError(401,"secret key invalid");

      if(price>user.balance){
        throw new ApiError(401,"balance are insufficient!");
      }
      
      user.balance=Number(user.balance)-Number(price);

      const txn=new transaction(user._id,adminID,price,`purchase course: ${course.title}`)
      const transactionID=await txn.tnx();
      const enrolled=await Enroll.create({
         courseID,
         learnerID:user._id,
         enrollAt:new Date(),
         transactionID,
         paymentStatus:"pending"

      })

      await  user.save({validateBeforeSave:false});
      console.log("enrolled succesfully .. awaiting for admin approval");
       

      
      return res
      .status(201)
      .json(
        new ApiResponse(201,enrolled,"enrolled succesfully .. awaiting for admin approval")
      )

})

const pendingCourseList = AsynHandler(async (req, res) => {
    // Get all courses that are pending approval (isActive: false)
    const pendingCourses = await Course.find({ isActive: false })
        .populate('owner', 'FullName Email ProfileImage')
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(200, pendingCourses, "Pending courses fetched successfully")
        );
});

const allCourseList = AsynHandler(async (req, res) => {
    // Get all courses (both active and inactive)
    const allCourses = await Course.find()
        .populate('owner', 'FullName Email ProfileImage')
        .sort({ createdAt: -1 });

    // Calculate actual enrolled count for each course
    const coursesWithEnrollCount = await Promise.all(
        allCourses.map(async (course) => {
            const enrolledCount = await Enroll.countDocuments({
                courseID: course._id,
                paymentStatus: 'paid'
            });
            return {
                ...course.toObject(),
                totalEnrolled: enrolledCount
            };
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, coursesWithEnrollCount, "All courses fetched successfully")
        );
});

const enrolledCourseList = AsynHandler(async (req, res) => {
    // Get all courses the current user is enrolled in
    const userID = req.user?._id;

    if (!userID) {
        throw new ApiError(401, "User not authenticated");
    }

    // Find all enrollments for this user where payment is approved
    const enrollments = await Enroll.find({ 
        learnerID: userID,
        paymentStatus: "paid" 
    }).populate({
        path: 'courseID',
        populate: {
            path: 'owner',
            select: 'FullName Email ProfileImage'
        }
    }).sort({ enrollAt: -1 });

    // Extract course details from enrollments and add actual enrolled count
    const enrolledCourses = await Promise.all(
        enrollments.map(async (enrollment) => {
            const enrolledCount = await Enroll.countDocuments({
                courseID: enrollment.courseID._id,
                paymentStatus: 'paid'
            });
            
            return {
                ...enrollment.courseID._doc,
                enrollmentDate: enrollment.enrollAt,
                enrollmentID: enrollment._id,
                totalEnrolled: enrolledCount
            };
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, enrolledCourses, "Enrolled courses fetched successfully")
        );
});

const availabeCourseList = AsynHandler(async (req, res) => {
    // Get all active courses (approved by admin)
    const availableCourses = await Course.find({ isActive: true })
        .populate('owner', 'FullName Email ProfileImage')
        .sort({ createdAt: -1 });

    // Calculate actual enrolled count for each course
    const coursesWithEnrollCount = await Promise.all(
        availableCourses.map(async (course) => {
            const enrolledCount = await Enroll.countDocuments({
                courseID: course._id,
                paymentStatus: 'paid'
            });
            return {
                ...course.toObject(),
                totalEnrolled: enrolledCount
            };
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, coursesWithEnrollCount, "Available courses fetched successfully")
        );
});

const getCourseById = AsynHandler(async (req, res) => {
    const { id } = req.params;
    const userID = req.user?._id;

    if (!id) {
        throw new ApiError(400, "Course ID is required");
    }

    const course = await Course.findById(id)
        .populate('owner', 'FullName Email ProfileImage');

    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    // Calculate actual enrolled count
    const enrolledCount = await Enroll.countDocuments({
        courseID: id,
        paymentStatus: 'paid'
    });

    // Check if the current user is enrolled in this course
    let enrollmentStatus = null;
    if (userID) {
        const enrollment = await Enroll.findOne({ 
            courseID: id, 
            learnerID: userID 
        });
        
        if (enrollment) {
            enrollmentStatus = {
                isEnrolled: true,
                paymentStatus: enrollment.paymentStatus,
                status: enrollment.status,
                progress: enrollment.progress,
                enrolledAt: enrollment.enrollAt
            };
        }
    }

    // Add enrolled count to course object
    const courseWithEnrollCount = {
        ...course.toObject(),
        totalEnrolled: enrolledCount
    };

    return res
        .status(200)
        .json(
            new ApiResponse(200, { course: courseWithEnrollCount, enrollmentStatus }, "Course fetched successfully")
        );
});

const getInstructorCourses = AsynHandler(async (req, res) => {
    const instructorID = req.user?._id;

    if (!instructorID) {
        throw new ApiError(401, "User not authenticated");
    }

    // Get all courses created by this instructor OR by admin
    // Instructors can manage their own courses + all admin-created courses
    const courses = await Course.find({ 
        $or: [
            { owner: instructorID },
            { owner: adminID }
        ]
    })
        .populate('owner', 'FullName Email ProfileImage')
        .sort({ createdAt: -1 });

    // Calculate actual enrolled count for each course
    const coursesWithEnrollCount = await Promise.all(
        courses.map(async (course) => {
            const enrolledCount = await Enroll.countDocuments({
                courseID: course._id,
                paymentStatus: 'paid'
            });
            
            return {
                ...course.toObject(),
                totalEnrolled: enrolledCount,
                isAdminCourse: course.owner._id.toString() === adminID.toString()
            };
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, coursesWithEnrollCount, "Instructor courses fetched successfully")
        );
});

const getInstructorPendingEnrollments = AsynHandler(async (req, res) => {
    const instructorID = req.user?._id;

    if (!instructorID) {
        throw new ApiError(401, "User not authenticated");
    }

    // Get all courses owned by this instructor OR by admin
    const instructorCourses = await Course.find({ 
        $or: [
            { owner: instructorID },
            { owner: adminID }
        ]
    }).select('_id');
    const courseIds = instructorCourses.map(course => course._id);

    // Find pending enrollments for instructor's courses + admin courses
    const pendingEnrollments = await Enroll.find({ 
        courseID: { $in: courseIds },
        paymentStatus: "pending" 
    })
    .populate({
        path: 'courseID',
        select: 'title description price courseImage'
    })
    .populate({
        path: 'learnerID',
        select: 'FullName Email ProfileImage UserName'
    })
    .sort({ enrollAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(200, pendingEnrollments, "Pending enrollments fetched successfully")
        );
});

const rateCourse = AsynHandler(async (req, res) => {
    const { courseID, rating, review } = req.body;
    const learnerID = req.user?._id;

    if (!courseID || !rating) {
        throw new ApiError(400, "Course ID and rating are required");
    }

    if (rating < 1 || rating > 5) {
        throw new ApiError(400, "Rating must be between 1 and 5");
    }

    const user = await User.findById(learnerID);
    if (!user || user.Role !== 'learner') {
        throw new ApiError(403, "Only learners can rate courses");
    }

    // Check if learner is enrolled and payment is done
    const enrollment = await Enroll.findOne({
        courseID,
        learnerID,
        paymentStatus: 'paid'
    });

    if (!enrollment) {
        throw new ApiError(403, "You must be enrolled in this course to rate it");
    }

    const course = await Course.findById(courseID);
    if (!course) {
        throw new ApiError(404, "Course not found");
    }

    // Import Rating model
    const { Rating } = await import("../Models/rating.model.js");

    // Update or create rating
    let ratingDoc = await Rating.findOne({ courseID, learnerID });
    
    if (ratingDoc) {
        // Update existing rating
        const oldRating = ratingDoc.rating;
        ratingDoc.rating = rating;
        ratingDoc.review = review || "";
        await ratingDoc.save();

        // Recalculate average
        const totalRatings = course.totalRatings;
        const currentTotal = course.averageRating * totalRatings;
        const newTotal = currentTotal - oldRating + rating;
        course.averageRating = newTotal / totalRatings;
    } else {
        // Create new rating
        ratingDoc = await Rating.create({
            courseID,
            learnerID,
            rating,
            review: review || ""
        });

        // Update course average
        const totalRatings = course.totalRatings + 1;
        const currentTotal = course.averageRating * course.totalRatings;
        const newTotal = currentTotal + rating;
        course.averageRating = newTotal / totalRatings;
        course.totalRatings = totalRatings;
    }

    await course.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, { rating: ratingDoc, averageRating: course.averageRating }, "Rating submitted successfully")
        );
});

const getCourseRating = AsynHandler(async (req, res) => {
    const { courseID } = req.params;
    const learnerID = req.user?._id;

    const { Rating } = await import("../Models/rating.model.js");
    
    const rating = await Rating.findOne({ courseID, learnerID });

    return res
        .status(200)
        .json(
            new ApiResponse(200, rating, "Rating fetched successfully")
        );
});

export{
    addCourse,
    courseEnroll,
    pendingCourseList,
    allCourseList,
    enrolledCourseList,
    availabeCourseList,
    getCourseById,
    getInstructorCourses,
    getInstructorPendingEnrollments,
    rateCourse,
    getCourseRating
}