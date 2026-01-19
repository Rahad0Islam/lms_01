import { Router } from "express";
import { upload } from "../Middleware/Multer.Middleware.js";

import { jwtVerification } from "../Middleware/Authentication.Middleware.js";
import { addCourse, courseEnroll, pendingCourseList, allCourseList, enrolledCourseList, availabeCourseList, getCourseById, getInstructorCourses, getInstructorPendingEnrollments, rateCourse, getCourseRating } from "../Controllers/Course.controller.js";
import { addMaterial, getAllmaterialList, updateMaterial, deleteMaterial } from "../Controllers/material.controller.js";
import { approvedCourse, approvedEnroll, issueCertificate, getPendingEnrollments } from "../Controllers/admin.controller.js";
import { getCourseStructure, updateProgress, submitExamResult, getExamResult, getLearnerProgress } from "../Controllers/progress.controller.js";
const router=Router();


router.route("/addcourse").post(

    jwtVerification,
    upload.fields([
        {
           name:"courseImage",
           maxCount:1 
        }
    ]),addCourse
)


router.route("/contentUpload").post(
    jwtVerification,
    upload.fields([
        {
            name:"audio",
            maxCount:10
        },
         {
            name:"video",
            maxCount:5
        },
           {
            name:"picture",
            maxCount:10
        },
        {
            name:"pdf",
            maxCount:10
        }
         
    ]),
    addMaterial
)


router.route("/courseEnroll").post(jwtVerification,courseEnroll)

router.route("/approvedEnroll").post(jwtVerification,approvedEnroll);
router.route("/approvedCourse").post(jwtVerification,approvedCourse);
router.route("/pendingEnrollments").get(jwtVerification, getPendingEnrollments);

router.route("/getAllmaterialList").post(jwtVerification,getAllmaterialList)

// New progress routes with sequential locking
router.route("/structure/:courseID").get(jwtVerification, getCourseStructure);
router.route("/learnerProgress/:courseID").get(jwtVerification, getLearnerProgress);
router.route("/updateProgress").post(jwtVerification,updateProgress)
router.route("/issueCertificate").post(jwtVerification,issueCertificate)

// Course list routes
router.route("/pendingCourses").get(jwtVerification, pendingCourseList);
router.route("/allCourses").get(jwtVerification, allCourseList);
router.route("/enrolledCourses").get(jwtVerification, enrolledCourseList);
router.route("/availableCourses").get(jwtVerification, availabeCourseList);
router.route("/instructorCourses").get(jwtVerification, getInstructorCourses);
router.route("/instructorPendingEnrollments").get(jwtVerification, getInstructorPendingEnrollments);

router.route("/updateMaterial").post(jwtVerification,
     upload.fields([
        {
            name:"audio",
            maxCount:10
        },
         {
            name:"video",
            maxCount:5
        },
           {
            name:"picture",
            maxCount:10
        },
        {
            name:"pdf",
            maxCount:10
        }
         
    ]),
    updateMaterial);

router.route("/material/:materialId").patch(jwtVerification,
     upload.fields([
        {
            name:"audio",
            maxCount:10
        },
         {
            name:"video",
            maxCount:5
        },
           {
            name:"picture",
            maxCount:10
        },
        {
            name:"pdf",
            maxCount:10
        }
         
    ]),
    updateMaterial);

router.route("/material/:materialId").delete(jwtVerification, deleteMaterial);

router.route("/rateCourse").post(jwtVerification, rateCourse);
router.route("/rating/:courseID").get(jwtVerification, getCourseRating);

// Exam routes
router.route("/submitExam").post(jwtVerification, submitExamResult);
router.route("/examResult/:materialID").get(jwtVerification, getExamResult);

// Certificate routes - Keep from old controller if they exist
// router.route("/certificateEligibility/:courseID").get(jwtVerification, checkCertificateEligibility);
// router.route("/generateCertificate").post(jwtVerification, generateCertificate);
// router.route("/certificate/:certificateID").get(jwtVerification, getCertificate);
// router.route("/myCertificates").get(jwtVerification, getMyCertificates);

// Course by ID route - MUST be last to avoid catching other routes
router.route("/:id").get(jwtVerification, getCourseById);

export default router