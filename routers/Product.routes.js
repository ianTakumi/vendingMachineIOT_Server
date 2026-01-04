import express from "express";
import {
  createProduct,
  updateProduct,
  getAllProducts,
  getProductById,
} from "../controllers/Product.controller.js";

const router = express.Router();

// Create a new product
router.post("/", createProduct);

// Get all products
router.get("/", getAllProducts);

// Get product by ID
router.get("/:productId", getProductById);

// Update an existing product
router.put("/:productId", updateProduct);

export default router;
