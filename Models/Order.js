import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  // For vending machine: ALWAYS 1 item per transaction
  quantity: {
    type: Number,
    required: true,
    default: 1,
    validate: {
      validator: function (v) {
        return v === 1; // Vending machine = 1 item only
      },
      message: "Vending machine dispenses only 1 item per transaction",
    },
  },
  // Simple status for IoT operations
  status: {
    type: String,
    enum: ["processing", "dispensed", "failed"],
    default: "dispensed",
  },

  // IoT device response
  deviceResponse: {
    type: String,
    enum: ["success", "motor_error", "sensor_error", "timeout"],
    default: "success",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  // For analytics: when item was actually dispensed
  dispensedAt: {
    type: Date,
  },
});

// Virtual for getting price (from Product)
orderSchema.virtual("price").get(async function () {
  if (this.populated("productId")) {
    return this.productId.price;
  }
  return null;
});

// Virtual for totalPrice (quantity × product price)
orderSchema.virtual("totalPrice").get(async function () {
  if (this.populated("productId")) {
    return this.productId.price * this.quantity; // Always same as price since quantity=1
  }
  return null;
});

// Static method: Create vending machine order
orderSchema.statics.createVendingOrder = async function (
  productId,
  slotNumber,
  userId = null
) {
  // Validate slot number matches product's slot
  const product = await mongoose.model("Product").findById(productId);

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.slotNumber !== slotNumber) {
    throw new Error(
      `Product is in slot ${product.slotNumber}, not slot ${slotNumber}`
    );
  }

  if (product.stock <= 0) {
    throw new Error("Product out of stock");
  }

  // Create the order
  const order = await this.create({
    userId,
    productId,
    slotNumber,
    quantity: 1, // Always 1 for vending machine
    status: "processing",
  });

  return order;
};

// Method: Mark as dispensed
orderSchema.methods.markAsDispensed = function (deviceResponse = "success") {
  this.status = "dispensed";
  this.deviceResponse = deviceResponse;
  this.dispensedAt = new Date();
  return this.save();
};

// Method: Mark as failed
orderSchema.methods.markAsFailed = function (deviceResponse = "motor_error") {
  this.status = "failed";
  this.deviceResponse = deviceResponse;
  return this.save();
};

export const Order = mongoose.model("Order", orderSchema);
