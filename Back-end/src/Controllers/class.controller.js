import { Class } from "../Models/class.model.js";
import { Course } from "../Models/Course.model.js";
import { Material } from "../Models/material.model.js";
import { User } from "../Models/User.Model.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { AsynHandler } from "../Utils/AsyncHandler.js";

// Create a new class in a course
const addClass = AsynHandler(async (req, res) => {
  const { courseID, title, description, isFinalExam } = req.body;

  if (!courseID || !title) {
    throw new ApiError(400, "courseID and title are required");
  }

  const course = await Course.findById(courseID);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const user = await User.findById(req.user?._id);
  if (!user || (user.Role !== "admin" && user.Role !== "instructor")) {
    throw new ApiError(403, "Only admin and instructor can create classes");
  }

  // Check if user owns the course or is admin
  if (course.owner.toString() !== user._id.toString() && user.Role !== "admin") {
    throw new ApiError(403, "You can only add classes to your own courses");
  }

  // Get the next order number
  const lastClass = await Class.findOne({ courseID }).sort({ order: -1 });
  const order = lastClass ? lastClass.order + 1 : 0;

  const newClass = await Class.create({
    courseID,
    title,
    description: description || "",
    order,
    isFinalExam: isFinalExam || false,
    isEnabled: isFinalExam ? false : true, // Final exam starts disabled
    createdBy: user._id
  });

  console.log("Class added successfully");
  return res.status(201).json(
    new ApiResponse(201, newClass, "Class added successfully")
  );
});

// Get all classes for a course
const getClassesByCourse = AsynHandler(async (req, res) => {
  const { courseID } = req.params;

  const classes = await Class.find({ courseID })
    .sort({ order: 1 })
    .populate('createdBy', 'fullName email');

  return res.status(200).json(
    new ApiResponse(200, classes, "Classes fetched successfully")
  );
});

// Update a class
const updateClass = AsynHandler(async (req, res) => {
  const { classID } = req.params;
  const { title, description, isEnabled } = req.body;

  const classDoc = await Class.findById(classID);
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  const course = await Course.findById(classDoc.courseID);
  const user = await User.findById(req.user?._id);

  if (!user || (user.Role !== "admin" && user.Role !== "instructor")) {
    throw new ApiError(403, "Only admin and instructor can update classes");
  }

  if (course.owner.toString() !== user._id.toString() && user.Role !== "admin") {
    throw new ApiError(403, "You can only update classes in your own courses");
  }

  if (title) classDoc.title = title;
  if (description !== undefined) classDoc.description = description;
  if (isEnabled !== undefined) classDoc.isEnabled = isEnabled;

  await classDoc.save();

  return res.status(200).json(
    new ApiResponse(200, classDoc, "Class updated successfully")
  );
});

// Delete a class (and its materials)
const deleteClass = AsynHandler(async (req, res) => {
  const { classID } = req.params;

  const classDoc = await Class.findById(classID);
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  const course = await Course.findById(classDoc.courseID);
  const user = await User.findById(req.user?._id);

  if (!user || (user.Role !== "admin" && user.Role !== "instructor")) {
    throw new ApiError(403, "Only admin and instructor can delete classes");
  }

  if (course.owner.toString() !== user._id.toString() && user.Role !== "admin") {
    throw new ApiError(403, "You can only delete classes from your own courses");
  }

  // Delete all materials in this class
  await Material.deleteMany({ classID });

  // Delete the class
  await Class.findByIdAndDelete(classID);

  return res.status(200).json(
    new ApiResponse(200, null, "Class and its materials deleted successfully")
  );
});

// Reorder classes
const reorderClasses = AsynHandler(async (req, res) => {
  const { courseID, classOrders } = req.body; // classOrders: [{ classID, order }]

  if (!courseID || !Array.isArray(classOrders)) {
    throw new ApiError(400, "courseID and classOrders array are required");
  }

  const course = await Course.findById(courseID);
  if (!course) {
    throw new ApiError(404, "Course not found");
  }

  const user = await User.findById(req.user?._id);
  if (!user || (user.Role !== "admin" && user.Role !== "instructor")) {
    throw new ApiError(403, "Only admin and instructor can reorder classes");
  }

  if (course.owner.toString() !== user._id.toString() && user.Role !== "admin") {
    throw new ApiError(403, "You can only reorder classes in your own courses");
  }

  // Update each class order
  const updatePromises = classOrders.map(({ classID, order }) =>
    Class.findByIdAndUpdate(classID, { order }, { new: true })
  );

  await Promise.all(updatePromises);

  const updatedClasses = await Class.find({ courseID }).sort({ order: 1 });

  return res.status(200).json(
    new ApiResponse(200, updatedClasses, "Classes reordered successfully")
  );
});

// Enable final exam (instructor only)
const enableFinalExam = AsynHandler(async (req, res) => {
  const { classID } = req.params;

  const classDoc = await Class.findById(classID);
  if (!classDoc) {
    throw new ApiError(404, "Class not found");
  }

  if (!classDoc.isFinalExam) {
    throw new ApiError(400, "This class is not a final exam");
  }

  const course = await Course.findById(classDoc.courseID);
  const user = await User.findById(req.user?._id);

  if (!user || (user.Role !== "admin" && user.Role !== "instructor")) {
    throw new ApiError(403, "Only admin and instructor can enable final exam");
  }

  if (course.owner.toString() !== user._id.toString() && user.Role !== "admin") {
    throw new ApiError(403, "You can only enable final exams in your own courses");
  }

  classDoc.isEnabled = true;
  await classDoc.save();

  return res.status(200).json(
    new ApiResponse(200, classDoc, "Final exam enabled successfully")
  );
});

export {
  addClass,
  getClassesByCourse,
  updateClass,
  deleteClass,
  reorderClasses,
  enableFinalExam
};
