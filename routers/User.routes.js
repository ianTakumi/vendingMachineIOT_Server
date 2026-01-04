import express from "express";
import {
  createUser,
  updateUser,
  getAllUsers,
  getUserById,
} from "../controllers/User.controller.js";

const router = express.Router();

// Get all users
router.get("/", getAllUsers);

// Create a new user
router.post("/", createUser);

// Get user by ID
router.get("/:userId", getUserById);

// Update user credits
router.put("/:userId", updateUser);

export default router;
