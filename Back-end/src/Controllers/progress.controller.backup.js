import { Progress } from "../Models/progress.model.js";
import { Material } from "../Models/material.model.js";
import { Enroll } from "../Models/enroll.model.js";
import { ExamResult } from "../Models/examResult.model.js";
import { Certificate } from "../Models/certificate.model.js";
import { Course } from "../Models/Course.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";

const updateProgress = AsynHandler(async (req, res) => {
  const { courseID, materialID, watchedSeconds, videoUrl } = req.body;
  const learnerID = req.user?._id;

  if (!courseID || !materialID || !watchedSeconds || !videoUrl) {
    throw new ApiError(400, "courseID, materialID, watchedSeconds, videoUrl are required");
  }

  const material = await Material.findById(materialID);
  if (!material) throw new ApiError(404, "Material not found");

  
  const videoObj = material.video.find(v => v.url === videoUrl);
  if (!videoObj) throw new ApiError(404, "Video not found in material");

  const duration = videoObj.duration;
  if (!duration) throw new ApiError(400, "Video duration not available");


  let progress = await Progress.findOne({ courseID, learnerID, materialID, videoUrl });

  if (!progress) {
    progress = new Progress({
      courseID,
      learnerID,
      materialID,
      videoUrl,
      watchedSeconds: 0,
      watchedPercent: 0,
      completed: false
    });
  }

  if (watchedSeconds > progress.watchedSeconds) {
    progress.watchedSeconds = watchedSeconds;
    progress.watchedPercent = (watchedSeconds / duration) * 100;

    if (progress.watchedPercent >= 80) {
      progress.completed = true;
    }

    await progress.save();
  }


  const totalMaterials = await Material.countDocuments({ courseID });
  const completedMaterials = await Progress.countDocuments({ courseID, learnerID, completed: true });
  const courseProgress = (completedMaterials / totalMaterials) * 100;

  const enroll = await Enroll.findOneAndUpdate(
    { courseID, learnerID },
    { progress: courseProgress },
    { new: true }
  );


  if (courseProgress >= 100 && !enroll.certificateIssued) {
    enroll.status = "completed";
    // enroll.certificateIssued = true;
    await enroll.save({validateBeforeSave:false});
  }
  
 console.log("Progress updated successfully");

  return res
  .status(200)
  .json(
    new ApiResponse(200, { progress, enroll }, "Progress updated successfully")
  );
});


// Submit MCQ exam result
const submitExamResult = AsynHandler(async (req, res) => {
  const { courseID, materialID, answers, timeTaken } = req.body;
  const learnerID = req.user?._id;

  if (!courseID || !materialID || !answers) {
    throw new ApiError(400, "courseID, materialID, and answers are required");
  }

  // Check if learner already took this exam
  const existingResult = await ExamResult.findOne({ learnerID, materialID });
  if (existingResult) {
    throw new ApiError(400, "You have already taken this exam. Each exam can only be attempted once.");
  }

  // Get the material to verify answers
  const material = await Material.findById(materialID);
  if (!material) {
    throw new ApiError(404, "Material not found");
  }

  if (material.materialType !== 'mcq') {
    throw new ApiError(400, "This material is not an MCQ exam");
  }

  // Calculate score
  const totalQuestions = material.questions.length;
  let correctAnswers = 0;
  const processedAnswers = [];

  answers.forEach((answer, index) => {
    const question = material.questions[index];
    const isCorrect = question && answer.selectedAnswer === question.answer;
    
    if (isCorrect) {
      correctAnswers++;
    }

    processedAnswers.push({
      questionIndex: index,
      selectedAnswer: answer.selectedAnswer || '',
      isCorrect: isCorrect
    });
  });

  const score = (correctAnswers / totalQuestions) * 100;

  // Create exam result
  const examResult = await ExamResult.create({
    courseID,
    learnerID,
    materialID,
    answers: processedAnswers,
    score: Math.round(score * 100) / 100, // Round to 2 decimal places
    totalQuestions,
    correctAnswers,
    timeTaken: timeTaken || 0
  });

  // Mark material as completed in progress
  let progress = await Progress.findOne({ courseID, learnerID, materialID });
  
  if (!progress) {
    progress = await Progress.create({
      courseID,
      learnerID,
      materialID,
      completed: true,
      watchedPercent: 100
    });
  } else {
    progress.completed = true;
    progress.watchedPercent = 100;
    await progress.save();
  }

  // Update course enrollment progress
  const totalMaterials = await Material.countDocuments({ courseID });
  const completedMaterials = await Progress.countDocuments({ courseID, learnerID, completed: true });
  const courseProgress = (completedMaterials / totalMaterials) * 100;

  const enroll = await Enroll.findOneAndUpdate(
    { courseID, learnerID },
    { progress: courseProgress },
    { new: true }
  );

  if (courseProgress >= 100 && enroll && !enroll.certificateIssued) {
    enroll.status = "completed";
    await enroll.save({ validateBeforeSave: false });
  }

  return res
    .status(201)
    .json(
      new ApiResponse(201, examResult, "Exam submitted successfully")
    );
});


// Get exam result for a specific material
const getExamResult = AsynHandler(async (req, res) => {
  const { materialID } = req.params;
  const learnerID = req.user?._id;

  if (!materialID) {
    throw new ApiError(400, "Material ID is required");
  }

  const examResult = await ExamResult.findOne({ learnerID, materialID })
    .populate('materialID', 'title description')
    .populate('courseID', 'title');

  if (!examResult) {
    return res
      .status(200)
      .json(
        new ApiResponse(200, null, "No exam result found")
      );
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, examResult, "Exam result fetched successfully")
    );
});


// Get all exam results for a learner in a course
const getCourseExamResults = AsynHandler(async (req, res) => {
  const { courseID } = req.params;
  const learnerID = req.user?._id;

  if (!courseID) {
    throw new ApiError(400, "Course ID is required");
  }

  const examResults = await ExamResult.find({ learnerID, courseID })
    .populate('materialID', 'title description')
    .sort({ completedAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, examResults, "Exam results fetched successfully")
    );
});


// Check certificate eligibility
const checkCertificateEligibility = AsynHandler(async (req, res) => {
  const { courseID } = req.params;
  const learnerID = req.user?._id;

  if (!courseID) {
    throw new ApiError(400, "Course ID is required");
  }

  // Get all materials in the course
  const allMaterials = await Material.find({ courseID });
  const videoMaterials = allMaterials.filter(m => m.materialType === 'video');
  const mcqMaterials = allMaterials.filter(m => m.materialType === 'mcq');

  // Check video completion (80% watched for each video)
  let videoCompletionPercentage = 0;
  if (videoMaterials.length > 0) {
    const videoProgress = await Progress.find({
      courseID,
      learnerID,
      materialID: { $in: videoMaterials.map(m => m._id) }
    });

    let totalWatchedPercentage = 0;
    videoProgress.forEach(progress => {
      totalWatchedPercentage += progress.watchedPercent || 0;
    });

    videoCompletionPercentage = videoProgress.length > 0 
      ? totalWatchedPercentage / videoMaterials.length 
      : 0;
  } else {
    // If no videos, consider it 100% complete
    videoCompletionPercentage = 100;
  }

  // Check MCQ completion and calculate average score
  let averageScore = 0;
  let allMcqsCompleted = false;

  if (mcqMaterials.length > 0) {
    const examResults = await ExamResult.find({
      courseID,
      learnerID,
      materialID: { $in: mcqMaterials.map(m => m._id) }
    });

    allMcqsCompleted = examResults.length === mcqMaterials.length;

    if (examResults.length > 0) {
      const totalScore = examResults.reduce((sum, result) => sum + result.score, 0);
      averageScore = totalScore / examResults.length;
    }
  } else {
    // If no MCQs, consider it complete with 100%
    allMcqsCompleted = true;
    averageScore = 100;
  }

  // Check eligibility
  const videoRequirementMet = videoCompletionPercentage >= 80;
  const mcqRequirementMet = allMcqsCompleted && averageScore >= 60;
  const eligible = videoRequirementMet && mcqRequirementMet;

  // Check if certificate already issued
  const existingCertificate = await Certificate.findOne({ learnerID, courseID })
    .populate('courseID', 'title')
    .populate('learnerID', 'FullName Email');

  return res
    .status(200)
    .json(
      new ApiResponse(200, {
        eligible,
        videoCompletionPercentage: Math.round(videoCompletionPercentage * 100) / 100,
        videoRequirementMet,
        averageScore: Math.round(averageScore * 100) / 100,
        allMcqsCompleted,
        mcqRequirementMet,
        totalMcqs: mcqMaterials.length,
        completedMcqs: await ExamResult.countDocuments({
          courseID,
          learnerID,
          materialID: { $in: mcqMaterials.map(m => m._id) }
        }),
        certificateIssued: !!existingCertificate,
        certificate: existingCertificate
      }, "Certificate eligibility checked")
    );
});


// Generate certificate
const generateCertificate = AsynHandler(async (req, res) => {
  const { courseID } = req.body;
  const learnerID = req.user?._id;

  if (!courseID) {
    throw new ApiError(400, "Course ID is required");
  }

  // Check if certificate already exists
  const existingCertificate = await Certificate.findOne({ learnerID, courseID });
  if (existingCertificate) {
    throw new ApiError(400, "Certificate already issued for this course");
  }

  // Get all materials in the course
  const allMaterials = await Material.find({ courseID });
  const videoMaterials = allMaterials.filter(m => m.materialType === 'video');
  const mcqMaterials = allMaterials.filter(m => m.materialType === 'mcq');

  // Check video completion
  let videoCompletionPercentage = 0;
  if (videoMaterials.length > 0) {
    const videoProgress = await Progress.find({
      courseID,
      learnerID,
      materialID: { $in: videoMaterials.map(m => m._id) }
    });

    let totalWatchedPercentage = 0;
    videoProgress.forEach(progress => {
      totalWatchedPercentage += progress.watchedPercent || 0;
    });

    videoCompletionPercentage = videoProgress.length > 0 
      ? totalWatchedPercentage / videoMaterials.length 
      : 0;
  } else {
    videoCompletionPercentage = 100;
  }

  if (videoCompletionPercentage < 80) {
    throw new ApiError(400, `Video completion requirement not met. You have watched ${Math.round(videoCompletionPercentage)}% of videos. Minimum required: 80%`);
  }

  // Check MCQ completion and calculate average
  let averageScore = 0;
  if (mcqMaterials.length > 0) {
    const examResults = await ExamResult.find({
      courseID,
      learnerID,
      materialID: { $in: mcqMaterials.map(m => m._id) }
    });

    if (examResults.length !== mcqMaterials.length) {
      throw new ApiError(400, `All MCQ exams must be completed. Completed: ${examResults.length}/${mcqMaterials.length}`);
    }

    const totalScore = examResults.reduce((sum, result) => sum + result.score, 0);
    averageScore = totalScore / examResults.length;

    if (averageScore < 60) {
      throw new ApiError(400, `Average score requirement not met. Your average: ${Math.round(averageScore)}%. Minimum required: 60%`);
    }
  } else {
    averageScore = 100;
  }

  // Generate certificate code
  const certificateCode = `CERT-${courseID.toString().slice(-6).toUpperCase()}-${learnerID.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;

  // Create certificate
  const certificate = await Certificate.create({
    courseID,
    learnerID,
    averageScore: Math.round(averageScore * 100) / 100,
    videoCompletionPercentage: Math.round(videoCompletionPercentage * 100) / 100,
    certificateCode
  });

  // Update enrollment
  await Enroll.findOneAndUpdate(
    { courseID, learnerID },
    { 
      certificateIssued: true,
      certificateID: certificate._id,
      status: 'completed'
    }
  );

  // Populate certificate data
  const populatedCertificate = await Certificate.findById(certificate._id)
    .populate('courseID', 'title')
    .populate('learnerID', 'FullName Email');

  return res
    .status(201)
    .json(
      new ApiResponse(201, populatedCertificate, "Certificate generated successfully")
    );
});


// Get certificate by ID
const getCertificate = AsynHandler(async (req, res) => {
  const { certificateID } = req.params;

  if (!certificateID) {
    throw new ApiError(400, "Certificate ID is required");
  }

  const certificate = await Certificate.findById(certificateID)
    .populate({
      path: 'courseID',
      select: 'title',
      populate: {
        path: 'owner',
        select: 'FullName'
      }
    })
    .populate('learnerID', 'FullName Email');

  if (!certificate) {
    throw new ApiError(404, "Certificate not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, certificate, "Certificate fetched successfully")
    );
});


// Get all certificates for a learner
const getMyCertificates = AsynHandler(async (req, res) => {
  const learnerID = req.user?._id;

  if (!learnerID) {
    throw new ApiError(401, "User not authenticated");
  }

  const certificates = await Certificate.find({ learnerID })
    .populate({
      path: 'courseID',
      select: 'title courseImage',
      populate: {
        path: 'owner',
        select: 'FullName'
      }
    })
    .populate('learnerID', 'FullName Email')
    .sort({ issuedAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, certificates, "Certificates fetched successfully")
    );
});


export { updateProgress, submitExamResult, getExamResult, getCourseExamResults, checkCertificateEligibility, generateCertificate, getCertificate, getMyCertificates }