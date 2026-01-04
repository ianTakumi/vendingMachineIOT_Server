import { User } from "../models/User.js";

// Create a new user (REQUIRED RFID)
export const createUser = async (req, res) => {
  try {
    const { name, credits, rfid_tag } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (!rfid_tag) {
      return res.status(400).json({
        success: false,
        message: "RFID tag is required",
      });
    }

    // Check if user already exists by RFID
    const existingUserByRFID = await User.findOne({ rfid_tag });
    if (existingUserByRFID) {
      return res.status(400).json({
        success: false,
        message: "RFID tag is already assigned to a user",
        data: {
          assignedTo: existingUserByRFID.name,
          userId: existingUserByRFID._id,
        },
      });
    }

    // Check if user already exists by name
    const existingUserByName = await User.findOne({ name });
    if (existingUserByName) {
      return res.status(400).json({
        success: false,
        message: "User with this name already exists",
      });
    }

    // Create new user
    const user = new User({
      name,
      rfid_tag,
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

    // Handle duplicate key error for RFID
    if (error.code === 11000 && error.keyPattern?.rfid_tag) {
      return res.status(400).json({
        success: false,
        message: "RFID tag already exists in the system",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, rfid_tag, credits, operation = "set" } = req.body;

    // Validate input
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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

    let isUpdated = false;

    // Update name if provided
    if (name !== undefined && name !== user.name) {
      // Check if new name already exists (if changing name)
      const existingUserByName = await User.findOne({
        name,
        _id: { $ne: userId },
      });
      if (existingUserByName) {
        return res.status(400).json({
          success: false,
          message: "User with this name already exists",
        });
      }
      user.name = name;
      isUpdated = true;
    }

    // Update RFID if provided
    if (rfid_tag !== undefined && rfid_tag !== user.rfid_tag) {
      // Check if new RFID already exists (if changing RFID)
      const existingUserByRFID = await User.findOne({
        rfid_tag,
        _id: { $ne: userId },
      });
      if (existingUserByRFID) {
        return res.status(400).json({
          success: false,
          message: "RFID tag is already assigned to another user",
        });
      }
      user.rfid_tag = rfid_tag;
      isUpdated = true;
    }

    // Update credits if provided
    if (credits !== undefined) {
      if (typeof credits !== "number") {
        return res.status(400).json({
          success: false,
          message: "Credits must be a number",
        });
      }

      switch (operation.toLowerCase()) {
        case "add":
          user.credits += credits;
          break;
        case "subtract":
          if (user.credits - credits < 0) {
            return res.status(400).json({
              success: false,
              message: "Insufficient credits",
            });
          }
          user.credits -= credits;
          break;
        case "set":
        default:
          if (credits < 0) {
            return res.status(400).json({
              success: false,
              message: "Credits cannot be negative",
            });
          }
          user.credits = credits;
          break;
      }
      isUpdated = true;
    }

    // Check if there are any updates
    if (!isUpdated) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    // Save updated user
    await user.save();

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        _id: user._id,
        name: user.name,
        rfid_tag: user.rfid_tag,
        credits: user.credits,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    if (error.code === 11000 && error.keyPattern?.rfid_tag) {
      return res.status(400).json({
        success: false,
        message: "RFID tag already exists in the system",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select("-__v");

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get user by ID
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
