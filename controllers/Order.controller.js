import { Order } from "../Models/Order.js";
import { User } from "../Models/User.js";
import { Product } from "../Models/Product.js";

// Create a new vending machine order
export const createOrder = async (req, res) => {
  try {
    const { userId, productId } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Check product stock
    if (product.stock <= 0) {
      return res.status(400).json({
        success: false,
        message: `"${product.name}" is out of stock`,
      });
    }

    // Check user credits
    if (user.credits < product.price) {
      return res.status(400).json({
        success: false,
        message: "Insufficient credits",
        data: {
          userCredits: user.credits,
          requiredCredits: product.price,
          difference: product.price - user.credits,
        },
      });
    }

    // Deduct credits from user
    user.credits -= product.price;
    await user.save();

    // Reduce product stock
    product.stock -= 1;
    product.updatedAt = new Date();
    await product.save();

    const order = new Order({
      userId,
      productId,
    });

    await order.save();

    // Populate order details for response
    const populatedOrder = await Order.findById(order._id)
      .populate("userId", "name rfid_tag credits")
      .populate("productId", "name price slotNumber");

    res.status(201).json({
      success: true,
      message: "Order created successfully. Ready for dispensing.",
      data: {
        order: populatedOrder,
        transactionDetails: {
          userCreditsBefore: user.credits + product.price,
          userCreditsAfter: user.credits,
          productStockBefore: product.stock + 1,
          productStockAfter: product.stock,
          amountDeducted: product.price,
        },
        deviceInstructions: {
          action: "dispense",
          slotNumber: product.slotNumber, // Get slot number from product
          orderId: order._id,
        },
      },
    });
  } catch (error) {
    console.error("Create order error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update order status (for IoT device response)
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, deviceResponse } = req.body;

    // Validate input
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    // Validate status
    const validStatuses = ["processing", "dispensed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Validate device response
    const validResponses = [
      "success",
      "motor_error",
      "sensor_error",
      "timeout",
    ];
    if (deviceResponse && !validResponses.includes(deviceResponse)) {
      return res.status(400).json({
        success: false,
        message: `Device response must be one of: ${validResponses.join(", ")}`,
      });
    }

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Update status and response
    if (status) order.status = status;
    if (deviceResponse) order.deviceResponse = deviceResponse;

    // Set dispensed time if status changes to "dispensed"
    if (status === "dispensed" && order.status !== "dispensed") {
      order.dispensedAt = new Date();
    }

    await order.save();

    // Populate for response
    const updatedOrder = await Order.findById(order._id)
      .populate("userId", "name rfid_tag")
      .populate("productId", "name price");

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all orders with filters
export const getAllOrders = async (req, res) => {
  try {
    const {
      userId,
      productId,
      status,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    if (userId) filter.userId = userId;
    if (productId) filter.productId = productId;
    if (status) filter.status = status;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Fetch orders with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const orders = await Order.find(filter)
      .populate("userId", "name rfid_tag")
      .populate("productId", "name price slotNumber")
      .sort(sortConfig)
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      data: {
        orders,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNextPage: page * limit < totalOrders,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "name rfid_tag credits")
      .populate("productId", "name price slotNumber stock");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get orders by user ID
export const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 20 } = req.query;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Build filter
    const filter = { userId };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate("productId", "name price slotNumber")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Calculate user stats
    const totalOrders = orders.length;
    const successfulOrders = orders.filter(
      (o) => o.status === "dispensed"
    ).length;
    const totalSpent = orders
      .filter((o) => o.status === "dispensed")
      .reduce((sum, order) => {
        if (order.productId && order.productId.price) {
          return sum + order.productId.price;
        }
        return sum;
      }, 0);

    res.status(200).json({
      success: true,
      message: "User orders retrieved successfully",
      data: {
        user: {
          _id: user._id,
          name: user.name,
          rfid_tag: user.rfid_tag,
          currentCredits: user.credits,
        },
        orders,
        stats: {
          totalOrders,
          successfulOrders,
          failedOrders: totalOrders - successfulOrders,
          totalSpent,
        },
      },
    });
  } catch (error) {
    console.error("Get orders by user error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get orders by product ID
export const getOrdersByProduct = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const orders = await Order.find({ productId })
      .populate("userId", "name rfid_tag")
      .sort({ createdAt: -1 });

    // Calculate product stats
    const totalOrders = orders.length;
    const successfulOrders = orders.filter(
      (o) => o.status === "dispensed"
    ).length;
    const totalRevenue = successfulOrders * product.price;

    res.status(200).json({
      success: true,
      message: "Product orders retrieved successfully",
      data: {
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          slotNumber: product.slotNumber,
          currentStock: product.stock,
        },
        orders,
        stats: {
          totalOrders,
          successfulOrders,
          failedOrders: totalOrders - successfulOrders,
          successRate:
            totalOrders > 0
              ? ((successfulOrders / totalOrders) * 100).toFixed(2) + "%"
              : "0%",
          totalRevenue,
        },
      },
    });
  } catch (error) {
    console.error("Get orders by product error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get today's orders summary
export const getTodaysOrders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysOrders = await Order.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate("userId", "name")
      .populate("productId", "name price");

    // Calculate daily stats
    const totalOrders = todaysOrders.length;
    const successfulOrders = todaysOrders.filter(
      (o) => o.status === "dispensed"
    ).length;
    const totalRevenue = todaysOrders
      .filter((o) => o.status === "dispensed")
      .reduce((sum, order) => {
        if (order.productId && order.productId.price) {
          return sum + order.productId.price;
        }
        return sum;
      }, 0);

    // Most popular product today
    const productSales = {};
    todaysOrders.forEach((order) => {
      if (order.status === "dispensed" && order.productId) {
        const productName = order.productId.name;
        productSales[productName] = (productSales[productName] || 0) + 1;
      }
    });

    const mostPopularProduct = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([name, count]) => ({ name, sales: count }));

    res.status(200).json({
      success: true,
      message: "Today's orders retrieved successfully",
      data: {
        date: today.toISOString().split("T")[0],
        orders: todaysOrders,
        stats: {
          totalOrders,
          successfulOrders,
          failedOrders: totalOrders - successfulOrders,
          successRate:
            totalOrders > 0
              ? ((successfulOrders / totalOrders) * 100).toFixed(2) + "%"
              : "0%",
          totalRevenue,
          mostPopularProduct: mostPopularProduct[0] || null,
        },
      },
    });
  } catch (error) {
    console.error("Get today's orders error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete order (admin only)
export const deleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByIdAndDelete(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
      data: {
        orderId: order._id,
        userId: order.userId,
        productId: order.productId,
        status: order.status,
      },
    });
  } catch (error) {
    console.error("Delete order error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
