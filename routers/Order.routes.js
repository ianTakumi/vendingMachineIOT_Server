import express from "express";
import {
  createOrder,
  updateOrderStatus,
  getAllOrders,
  getOrderById,
  getOrdersByUser,
  getOrdersByProduct,
  getTodaysOrders,
  deleteOrder,
} from "../controllers/Order.controller.js";

const router = express.Router();

// Create a new vending machine order
router.post("/", createOrder);

// Get all orders with filters
router.get("/", getAllOrders);

// Get today's orders summary
router.get("/today", getTodaysOrders);

// Get order by ID
router.get("/:orderId", getOrderById);

// Update order status (for IoT device)
router.patch("/:orderId/status", updateOrderStatus);

// Get orders by user ID
router.get("/user/:userId", getOrdersByUser);

// Get orders by product ID
router.get("/product/:productId", getOrdersByProduct);

// Delete order (admin only)
router.delete("/:orderId", deleteOrder);

export default router;
