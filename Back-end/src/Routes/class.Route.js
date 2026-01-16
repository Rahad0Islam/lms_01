import { Router } from "express";
import { 
  addClass, 
  getClassesByCourse, 
  updateClass, 
  deleteClass, 
  reorderClasses,
  enableFinalExam 
} from "../Controllers/class.controller.js";
import { jwtVerification } from "../Middleware/Authentication.Middleware.js";

const router = Router();

// Class management routes
router.route("/add").post(jwtVerification, addClass);
router.route("/course/:courseID").get(jwtVerification, getClassesByCourse);
router.route("/:classID").patch(jwtVerification, updateClass);
router.route("/:classID").delete(jwtVerification, deleteClass);
router.route("/reorder").post(jwtVerification, reorderClasses);
router.route("/enable-final/:classID").patch(jwtVerification, enableFinalExam);

export default router;
