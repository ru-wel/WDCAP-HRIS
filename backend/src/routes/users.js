import express from "express";
import * as usersController from "../controllers/users.controller.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { ROLES } from "../config/constants.js";

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// list users
router.get("/", authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), usersController.getAllUsers);

// update role and/or status (status maps to employees.employment_status)
router.put("/:employeeId", authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), usersController.updateUser);

// delete user (Executive only)
router.delete("/:employeeId", authorizeRoles(ROLES.EXECUTIVE), usersController.deleteUser);

export default router;
