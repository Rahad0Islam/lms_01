import { Progress } from "../Models/progress.model.js";
import { Material } from "../Models/material.model.js";
import { Class } from "../Models/class.model.js";
import { Enroll } from "../Models/enroll.model.js";
import { ExamResult } from "../Models/examResult.model.js";
import { Certificate } from "../Models/certificate.model.js";
import { Course } from "../Models/Course.model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";

// Get course structure with lock status for a learner
const getCourseStructure = AsynHandler(async (req, res) => {
  const { courseID } = req.params;
  const learnerID = req.user?._id;

  // Verify enrollment
  const enrollment = await Enroll.findOne({ courseID, learnerID });
  if (!enrollment || enrollment.paymentStatus !== "paid") {
    throw new ApiError(403, "You are not enrolled in this course");
  }

  // Get all classes sorted by order
  const classes = await Class.find({ courseID }).sort({ order: 1 });

  // Get all materials sorted by class and order
  const materials = await Material.find({ courseID }).sort({ order: 1 });

  // Get all progress records for this learner
  const progressRecords = await Progress.find({ courseID, learnerID });
  const progressMap = {};
  progressRecords.forEach(p => {
    if (p.materialID) {
      progressMap[p.materialID.toString()] = p;
    }
  });

  // Get exam results
  const examResults = await ExamResult.find({ courseID, learnerID });
  const examResultsMap = {};
  examResults.forEach(e => {
    examResultsMap[e.materialID.toString()] = e;
  });

  // Build the structure with lock status
  const structure = [];
  let previousClassCompleted = true;

  for (let i = 0; i < classes.length; i++) {
    const classDoc = classes[i];
    const classMaterials = materials.filter(m => 
      m.classID && m.classID.toString() === classDoc._id.toString()
    );

    // Determine if this class is unlocked
    const isClassUnlocked = i === 0 || previousClassCompleted;

    // Process materials in this class
    const materialsWithStatus = [];
    let previousMaterialCompleted = true;
    let allMaterialsCompleted = true;

    for (let j = 0; j < classMaterials.length; j++) {
      const material = classMaterials[j];
      const materialProgress = progressMap[material._id.toString()];
      const examResult = examResultsMap[material._id.toString()];

      // Determine if material is completed
      let isCompleted = false;
      if (material.materialType === 'mcq') {
        isCompleted = !!examResult; // MCQ completed if exam result exists
      } else {
        isCompleted = materialProgress?.completed || false;
      }

      // Determine if this material is unlocked
      const isUnlocked = isClassUnlocked && (j === 0 || previousMaterialCompleted);

      materialsWithStatus.push({
        _id: material._id,
        title: material.title,
        description: material.description,
        materialType: material.materialType,
        order: material.order,
        isFinalExam: material.isFinalExam,
        isUnlocked,
        isCompleted,
        progress: materialProgress || null,
        examResult: examResult || null,
        // Only include material content if unlocked
        ...(isUnlocked && {
          text: material.text,
          picture: material.picture,
          video: material.video,
          audio: material.audio,
          questions: material.materialType === 'mcq' ? material.questions : undefined,
          mcqDuration: material.mcqDuration
        })
      });

      if (!isCompleted) {
        allMaterialsCompleted = false;
      }
      previousMaterialCompleted = isCompleted;
    }

    structure.push({
      _id: classDoc._id,
      title: classDoc.title,
      description: classDoc.description,
      order: classDoc.order,
      isUnlocked: isClassUnlocked,
      isCompleted: allMaterialsCompleted,
      materials: materialsWithStatus
    });

    previousClassCompleted = allMaterialsCompleted;
  }

  // Calculate overall course completion - only count regular materials (exclude final exam)
  const enabledClassIDs = classes.map(c => c._id.toString());
  const enabledMaterials = materials.filter(m => 
    m.classID && enabledClassIDs.includes(m.classID.toString())
  );
  
  // Filter out final exam materials from progress calculation
  const regularMaterials = enabledMaterials.filter(m => !m.isFinalExam);
  const totalMaterials = regularMaterials.length;
  
  // Count unique completed regular materials (avoid double counting)
  let completedMaterialsCount = 0;
  for (const material of regularMaterials) {
    const materialId = material._id.toString();
    // Check if MCQ exam completed
    if (material.materialType === 'mcq') {
      if (examResultsMap[materialId]) {
        completedMaterialsCount++;
      }
    } else {
      // Check if other material completed
      if (progressMap[materialId]?.completed) {
        completedMaterialsCount++;
      }
    }
  }
  
  const overallProgress = totalMaterials > 0 ? (completedMaterialsCount / totalMaterials) * 100 : 0;

  return res.status(200).json(
    new ApiResponse(200, {
      structure,
      overallProgress,
      enrollment
    }, "Course structure with lock status fetched successfully")
  );
});

// Update progress for video/audio/text materials
const updateProgress = AsynHandler(async (req, res) => {
  const { courseID, classID, materialID, watchedSeconds, videoUrl } = req.body;
  const learnerID = req.user?._id;

  if (!courseID || !materialID) {
    throw new ApiError(400, "courseID and materialID are required");
  }

  // Verify enrollment
  const enrollment = await Enroll.findOne({ courseID, learnerID });
  if (!enrollment || enrollment.paymentStatus !== "paid") {
    throw new ApiError(403, "You are not enrolled in this course");
  }

  // Get material
  const material = await Material.findById(materialID);
  if (!material) throw new ApiError(404, "Material not found");

  // Verify material is unlocked for this learner
  const isUnlocked = await checkMaterialUnlocked(courseID, materialID, learnerID);
  if (!isUnlocked) {
    throw new ApiError(403, "This material is locked. Complete previous materials first.");
  }

  let progress = await Progress.findOne({ courseID, learnerID, materialID, videoUrl });

  // Handle different material types
  if (material.materialType === 'video' && videoUrl) {
    const videoObj = material.video.find(v => v.url === videoUrl);
    if (!videoObj) throw new ApiError(404, "Video not found in material");

    const duration = videoObj.duration;
    if (!duration) throw new ApiError(400, "Video duration not available");

    if (!progress) {
      progress = new Progress({
        courseID,
        learnerID,
        classID: material.classID,
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
        progress.completedAt = new Date();
      }

      await progress.save();
    }
  } else if (material.materialType === 'text' || material.materialType === 'audio' || material.materialType === 'image') {
    // For text, audio, image - mark as completed directly
    if (!progress) {
      progress = await Progress.create({
        courseID,
        learnerID,
        classID: material.classID,
        materialID,
        completed: true,
        completedAt: new Date(),
        watchedPercent: 100
      });
    } else if (!progress.completed) {
      progress.completed = true;
      progress.completedAt = new Date();
      progress.watchedPercent = 100;
      await progress.save();
    }
  }

  // Update overall course progress
  await updateCourseProgress(courseID, learnerID);

  console.log("Progress updated successfully");
  return res.status(200).json(
    new ApiResponse(200, progress, "Progress updated successfully")
  );
});

// Submit MCQ exam result
const submitExamResult = AsynHandler(async (req, res) => {
  const { courseID, materialID, answers, timeTaken } = req.body;
  const learnerID = req.user?._id;

  if (!courseID || !materialID || !answers) {
    throw new ApiError(400, "courseID, materialID, and answers are required");
  }

  // Verify enrollment
  const enrollment = await Enroll.findOne({ courseID, learnerID });
  if (!enrollment || enrollment.paymentStatus !== "paid") {
    throw new ApiError(403, "You are not enrolled in this course");
  }

  // Check if material is unlocked
  const isUnlocked = await checkMaterialUnlocked(courseID, materialID, learnerID);
  if (!isUnlocked) {
    throw new ApiError(403, "This exam is locked. Complete previous materials first.");
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
    score: Math.round(score * 100) / 100,
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
      classID: material.classID,
      materialID,
      completed: true,
      completedAt: new Date(),
      watchedPercent: 100
    });
  } else if (!progress.completed) {
    progress.completed = true;
    progress.completedAt = new Date();
    progress.watchedPercent = 100;
    await progress.save();
  }

  // Update overall course progress
  await updateCourseProgress(courseID, learnerID);

  console.log("Exam submitted successfully");
  return res.status(200).json(
    new ApiResponse(200, { examResult, progress }, "Exam submitted successfully")
  );
});

// Helper: Check if material is unlocked for learner
async function checkMaterialUnlocked(courseID, materialID, learnerID) {
  const material = await Material.findById(materialID);
  if (!material) return false;

  const classDoc = await Class.findById(material.classID);
  if (!classDoc || !classDoc.isEnabled) return false;

  // Get all classes in order
  const allClasses = await Class.find({ courseID, isEnabled: true }).sort({ order: 1 });
  const currentClassIndex = allClasses.findIndex(c => c._id.toString() === classDoc._id.toString());

  // Check if all previous classes are completed
  for (let i = 0; i < currentClassIndex; i++) {
    const prevClass = allClasses[i];
    const isCompleted = await isClassCompleted(prevClass._id, learnerID);
    if (!isCompleted) {
      return false; // Previous class not completed
    }
  }

  // Get all materials in current class
  const classMaterials = await Material.find({ classID: classDoc._id }).sort({ order: 1 });
  const currentMaterialIndex = classMaterials.findIndex(m => m._id.toString() === materialID.toString());

  // Check if all previous materials in class are completed
  for (let i = 0; i < currentMaterialIndex; i++) {
    const prevMaterial = classMaterials[i];
    const isCompleted = await isMaterialCompleted(prevMaterial._id, learnerID);
    if (!isCompleted) {
      return false; // Previous material not completed
    }
  }

  return true; // Material is unlocked
}

// Helper: Check if class is completed
async function isClassCompleted(classID, learnerID) {
  const classMaterials = await Material.find({ classID });
  
  for (const material of classMaterials) {
    const isCompleted = await isMaterialCompleted(material._id, learnerID);
    if (!isCompleted) {
      return false;
    }
  }
  
  return true;
}

// Helper: Check if material is completed
async function isMaterialCompleted(materialID, learnerID) {
  const material = await Material.findById(materialID);
  if (!material) return false;

  if (material.materialType === 'mcq') {
    const examResult = await ExamResult.findOne({ materialID, learnerID });
    return !!examResult;
  } else {
    const progress = await Progress.findOne({ materialID, learnerID, completed: true });
    return !!progress;
  }
}

// Helper: Update overall course progress
async function updateCourseProgress(courseID, learnerID) {
  // Only count materials from enabled classes
  const enabledClasses = await Class.find({ courseID, isEnabled: true });
  const enabledClassIDs = enabledClasses.map(c => c._id);
  
  const allMaterials = await Material.find({ 
    courseID,
    classID: { $in: enabledClassIDs }
  });
  
  const totalMaterials = allMaterials.length;

  if (totalMaterials === 0) return;

  let completedCount = 0;
  for (const material of allMaterials) {
    const isCompleted = await isMaterialCompleted(material._id, learnerID);
    if (isCompleted) {
      completedCount++;
    }
  }

  const progressPercent = (completedCount / totalMaterials) * 100;

  const enroll = await Enroll.findOne({ courseID, learnerID });
  if (enroll) {
    enroll.progress = Math.round(progressPercent);
    
    if (progressPercent >= 100 && !enroll.certificateIssued) {
      enroll.status = "completed";
    }
    
    await enroll.save({ validateBeforeSave: false });
  }
}

// Get exam result for a specific material
const getExamResult = AsynHandler(async (req, res) => {
  const { materialID } = req.params;
  const learnerID = req.user?._id;

  const examResult = await ExamResult.findOne({ materialID, learnerID });

  if (!examResult) {
    return res.status(200).json(
      new ApiResponse(200, null, "No exam result found")
    );
  }

  return res.status(200).json(
    new ApiResponse(200, examResult, "Exam result fetched successfully")
  );
});

// Get learner progress for a course
const getLearnerProgress = AsynHandler(async (req, res) => {
  const { courseID } = req.params;
  const learnerID = req.user?._id;

  const enrollment = await Enroll.findOne({ courseID, learnerID });
  if (!enrollment) {
    throw new ApiError(404, "Enrollment not found");
  }

  const progressRecords = await Progress.find({ courseID, learnerID })
    .populate('materialID', 'title materialType')
    .populate('classID', 'title order');

  const examResults = await ExamResult.find({ courseID, learnerID })
    .populate('materialID', 'title materialType');

  return res.status(200).json(
    new ApiResponse(200, {
      enrollment,
      progressRecords,
      examResults
    }, "Learner progress fetched successfully")
  );
});

export {
  getCourseStructure,
  updateProgress,
  submitExamResult,
  getExamResult,
  getLearnerProgress
};
