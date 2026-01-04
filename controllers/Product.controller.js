import { Product } from "../models/Product.js";

// Create a new product
export const createProduct = async (req, res) => {
  try {
    const { name, price, slotNumber, stock } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (price === undefined || typeof price !== "number" || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a positive number",
      });
    }

    if (slotNumber !== 1 && slotNumber !== 2) {
      return res.status(400).json({
        success: false,
        message: "Slot number must be either 1 or 2",
      });
    }

    // Check if a product already exists in this slot
    const existingProduct = await Product.findOne({ slotNumber });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: `Slot ${slotNumber} is already occupied by product: ${existingProduct.name}`,
      });
    }

    // Create new product
    const product = new Product({
      name: name.trim(),
      price,
      slotNumber,
      stock: stock || 0,
    });

    await product.save();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update an existing product
export const updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { name, price, stock } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
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

    // Update fields if provided
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Product name cannot be empty",
        });
      }
      product.name = name.trim();
    }

    if (price !== undefined) {
      if (typeof price !== "number" || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a positive number",
        });
      }
      product.price = price;
    }

    if (stock !== undefined) {
      if (typeof stock !== "number" || stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a non-negative number",
        });
      }
      product.stock = stock;
    }

    // Update timestamp
    product.updatedAt = Date.now();

    await product.save();

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

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

// Get all products (optional helper)
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ slotNumber: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Get product by ID (optional helper)
export const getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
