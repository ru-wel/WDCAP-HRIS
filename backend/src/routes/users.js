import express from "express";
import * as usersController from "../controllers/users.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// list users
router.get("/", authorizeRoles(ROLES.ADMIN), usersController.getAllUsers);

// update role and/or status (status maps to employees.employment_status)
router.put("/:employeeId", authorizeRoles(ROLES.ADMIN), usersController.updateUser);

// delete user (Admin only)
router.delete("/:employeeId", authorizeRoles(ROLES.ADMIN), usersController.deleteUser);

export default router;
