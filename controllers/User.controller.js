import { User } from "../models/User.js";

// Create a new user
export const createUser = async (req, res) => {
  try {
    const { name, credits } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this name already exists",
      });
    }

    // Create new user
    const user = new User({
      name,
      credits: credits || 0,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update user credits
export const updateCredits = async (req, res) => {
  try {
    const { userId } = req.params;
    const { credits, operation = "set" } = req.body; // operation: 'set', 'add', 'subtract'

    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (typeof credits !== "number") {
      return res.status(400).json({
        success: false,
        message: "Credits must be a number",
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

    // Update credits based on operation
    let updatedCredits;
    switch (operation.toLowerCase()) {
      case "add":
        updatedCredits = user.credits + credits;
        break;
      case "subtract":
        updatedCredits = user.credits - credits;
        if (updatedCredits < 0) {
          return res.status(400).json({
            success: false,
            message: "Insufficient credits",
          });
        }
        break;
      case "set":
      default:
        if (credits < 0) {
          return res.status(400).json({
            success: false,
            message: "Credits cannot be negative",
          });
        }
        updatedCredits = credits;
        break;
    }

    // Update user
    user.credits = updatedCredits;
    user.updatedAt = Date.now();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Credits updated successfully",
      data: {
        userId: user._id,
        name: user.name,
        previousCredits:
          user.credits -
          (operation === "add"
            ? -credits
            : operation === "subtract"
            ? credits
            : 0),
        newCredits: user.credits,
        operation,
      },
    });
  } catch (error) {
    console.error("Update credits error:", error);

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

// Get user by ID (optional helper)
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
