import { AsynHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Certificate } from "../Models/certificate.model.js";
import { Enroll } from "../Models/enroll.model.js";
import { ExamResult } from "../Models/examResult.model.js";
import { Material } from "../Models/material.model.js";
import { User } from "../Models/User.Model.js";
import { Progress } from "../Models/progress.model.js";

// Student requests a certificate after completing final exam
const requestCertificate = AsynHandler(async (req, res) => {
  const { courseID } = req.body;
  const learnerID = req.user?._id;

  if (!courseID) {
    throw new ApiError(400, "Course ID is required");
  }

  // Check if student is enrolled
  const enrollment = await Enroll.findOne({ courseID, learnerID });
  if (!enrollment) {
    throw new ApiError(404, "You are not enrolled in this course");
  }

  // Check if enrollment is cancelled
  if (enrollment.status === "cancelled") {
    throw new ApiError(400, "Your enrollment has been cancelled");
  }

  // Check if certificate already requested or issued
  const existingCertificate = await Certificate.findOne({ courseID, learnerID });
  if (existingCertificate) {
    if (existingCertificate.status === "pending") {
      throw new ApiError(400, "Certificate request already pending approval");
    }
    if (existingCertificate.status === "approved") {
      throw new ApiError(400, "Certificate already issued for this course");
    }
    if (existingCertificate.status === "rejected") {
      throw new ApiError(400, "Your previous certificate request was rejected. Please contact admin.");
    }
  }

  // Get final exam for this course
  const finalExam = await Material.findOne({ courseID, isFinalExam: true });
  if (!finalExam) {
    throw new ApiError(404, "No final exam found for this course");
  }

  // Check if student has completed final exam
  const finalExamResult = await ExamResult.findOne({
    courseID,
    learnerID,
    materialID: finalExam._id
  });

  if (!finalExamResult) {
    throw new ApiError(400, "You must complete the final exam before requesting a certificate");
  }

  // Use final exam score as the certificate score
  const averageScore = finalExamResult.score;

  // Generate unique certificate code
  const certificateCode = `CERT-${Date.now()}-${learnerID.toString().slice(-6)}`;

  // Create certificate request
  const certificate = await Certificate.create({
    courseID,
    learnerID,
    averageScore: parseFloat(averageScore.toFixed(2)),
    certificateCode,
    status: "pending"
  });

  const populatedCertificate = await Certificate.findById(certificate._id)
    .populate("courseID", "title courseImage")
    .populate("learnerID", "FullName Email");

  return res.status(201).json(
    new ApiResponse(201, populatedCertificate, "Certificate request submitted successfully. Please wait for admin approval.")
  );
});

// Get student's certificates (approved only by default)
const getMyCertificates = AsynHandler(async (req, res) => {
  const learnerID = req.user?._id;
  const { status } = req.query; // Optional: filter by status

  const query = { learnerID };
  if (status) {
    query.status = status;
  } else {
    // By default, only show approved certificates
    query.status = "approved";
  }

  const certificates = await Certificate.find(query)
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage")
    .sort({ issuedAt: -1, createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, certificates, "Certificates fetched successfully")
  );
});

// Get certificate by ID (for viewing/downloading)
const getCertificateById = AsynHandler(async (req, res) => {
  const { certificateID } = req.params;
  const userID = req.user?._id;

  const certificate = await Certificate.findById(certificateID)
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage");

  if (!certificate) {
    throw new ApiError(404, "Certificate not found");
  }

  // Only allow learner or admin to view
  const user = await User.findById(userID);
  if (
    certificate.learnerID._id.toString() !== userID.toString() &&
    user.Role !== "admin"
  ) {
    throw new ApiError(403, "You don't have permission to view this certificate");
  }

  // Only show approved certificates to students
  if (certificate.status !== "approved" && user.Role !== "admin") {
    throw new ApiError(403, "This certificate is not yet approved");
  }

  return res.status(200).json(
    new ApiResponse(200, certificate, "Certificate fetched successfully")
  );
});

// Admin: Get pending certificate requests
const getPendingCertificateRequests = AsynHandler(async (req, res) => {
  const adminID = req.user?._id;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can view pending certificate requests");
  }

  const pendingCertificates = await Certificate.find({ status: "pending" })
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage UserName")
    .sort({ requestedAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, pendingCertificates, "Pending certificate requests fetched successfully")
  );
});

// Admin: Get all certificate requests (with filters)
const getAllCertificateRequests = AsynHandler(async (req, res) => {
  const adminID = req.user?._id;
  const { status, courseID } = req.query;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can view certificate requests");
  }

  const query = {};
  if (status) query.status = status;
  if (courseID) query.courseID = courseID;

  const certificates = await Certificate.find(query)
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage UserName")
    .populate("approvedBy", "FullName Email")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new ApiResponse(200, certificates, "Certificate requests fetched successfully")
  );
});

// Admin: Approve certificate request
const approveCertificate = AsynHandler(async (req, res) => {
  const { certificateID } = req.params;
  const adminID = req.user?._id;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can approve certificates");
  }

  const certificate = await Certificate.findById(certificateID);
  if (!certificate) {
    throw new ApiError(404, "Certificate request not found");
  }

  if (certificate.status === "approved") {
    throw new ApiError(400, "Certificate already approved");
  }

  if (certificate.status === "rejected") {
    throw new ApiError(400, "Cannot approve a rejected certificate. Student must request again.");
  }

  // Update certificate
  certificate.status = "approved";
  certificate.issuedAt = new Date();
  certificate.approvedBy = adminID;
  await certificate.save();

  // Update enrollment
  const enrollment = await Enroll.findOne({
    courseID: certificate.courseID,
    learnerID: certificate.learnerID
  });

  if (enrollment) {
    enrollment.certificateIssued = true;
    enrollment.certificateID = certificate._id.toString();
    enrollment.status = "completed";
    await enrollment.save();
  }

  const populatedCertificate = await Certificate.findById(certificate._id)
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage")
    .populate("approvedBy", "FullName Email");

  return res.status(200).json(
    new ApiResponse(200, populatedCertificate, "Certificate approved successfully")
  );
});

// Admin: Reject certificate request
const rejectCertificate = AsynHandler(async (req, res) => {
  const { certificateID } = req.params;
  const { reason } = req.body;
  const adminID = req.user?._id;

  const admin = await User.findById(adminID);
  if (!admin || admin.Role !== "admin") {
    throw new ApiError(403, "Only admin can reject certificates");
  }

  const certificate = await Certificate.findById(certificateID);
  if (!certificate) {
    throw new ApiError(404, "Certificate request not found");
  }

  if (certificate.status === "approved") {
    throw new ApiError(400, "Cannot reject an approved certificate");
  }

  if (certificate.status === "rejected") {
    throw new ApiError(400, "Certificate already rejected");
  }

  // Update certificate
  certificate.status = "rejected";
  certificate.rejectionReason = reason || "Not meeting requirements";
  certificate.approvedBy = adminID;
  await certificate.save();

  const populatedCertificate = await Certificate.findById(certificate._id)
    .populate({
      path: "courseID",
      select: "title description courseImage owner",
      populate: {
        path: "owner",
        select: "FullName Email"
      }
    })
    .populate("learnerID", "FullName Email ProfileImage")
    .populate("approvedBy", "FullName Email");

  return res.status(200).json(
    new ApiResponse(200, populatedCertificate, "Certificate request rejected")
  );
});

// Check if student is eligible to request certificate
const checkCertificateEligibility = AsynHandler(async (req, res) => {
  const { courseID } = req.params;
  const learnerID = req.user?._id;

  try {
    const enrollment = await Enroll.findOne({ courseID, learnerID });
    if (!enrollment) {
      return res.status(200).json(
        new ApiResponse(200, { 
          eligible: false, 
          reason: "Not enrolled in this course",
          requirements: {
            finalExamCompleted: false,
            finalExamScore: 0,
            averageScore: 0
          }
        })
      );
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ courseID, learnerID });
    if (existingCertificate) {
      return res.status(200).json(
        new ApiResponse(200, {
          eligible: false,
          reason: `Certificate ${existingCertificate.status}`,
          certificate: existingCertificate,
          requirements: {
            finalExamCompleted: true,
            finalExamScore: existingCertificate.averageScore || 0,
            averageScore: existingCertificate.averageScore || 0
          }
        })
      );
    }

    // Get final exam
    const finalExam = await Material.findOne({ courseID, isFinalExam: true });
    if (!finalExam) {
      return res.status(200).json(
        new ApiResponse(200, {
          eligible: false,
          reason: "No final exam available for this course",
          requirements: {
            finalExamCompleted: false,
            finalExamScore: 0,
            averageScore: 0
          }
        })
      );
    }

    // Check final exam result
    const finalExamResult = await ExamResult.findOne({
      courseID,
      learnerID,
      materialID: finalExam._id
    });

    const finalExamScore = finalExamResult ? finalExamResult.score : 0;
    const averageScore = finalExamScore;
    const finalExamCompleted = !!finalExamResult;

    const eligible = finalExamCompleted;

    const reason = eligible ? "Eligible to request certificate" : "Final exam not completed";

    return res.status(200).json(
      new ApiResponse(200, {
        eligible,
        reason,
        requirements: {
          finalExamCompleted,
          finalExamScore: parseFloat(finalExamScore.toFixed(2)),
          averageScore: parseFloat(averageScore.toFixed(2))
        }
      })
    );
  } catch (error) {
    console.error('Error checking certificate eligibility:', error);
    return res.status(200).json(
      new ApiResponse(200, {
        eligible: false,
        reason: "Error checking eligibility",
        requirements: {
          finalExamCompleted: false,
          finalExamScore: 0,
          averageScore: 0
        }
      })
    );
  }
});

export {
  requestCertificate,
  getMyCertificates,
  getCertificateById,
  getPendingCertificateRequests,
  getAllCertificateRequests,
  approveCertificate,
  rejectCertificate,
  checkCertificateEligibility
};
