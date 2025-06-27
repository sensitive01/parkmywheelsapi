const Plan = require('./models/Plan'); // Adjust path to your Plan model

// Define Order schema
const OrderSchema = new mongoose.Schema({
  order_id: {
    type: String,
    required: true,
    unique: true,
  },
  vendor_id: {
    type: String,
    required: true,
  },
  plan_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed'],
    default: 'created',
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

const Order = mongoose.model('Order', OrderSchema);

module.exports = Order;