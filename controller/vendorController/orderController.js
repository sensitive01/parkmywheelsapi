const Razorpay = require('razorpay');
const Order = require('../../models/orderSchema');

const razorpay = new Razorpay({
key_id: process.env.SECRETKEYID,
  key_secret: process.env.SECRETCODE,
});

exports.createOrder = async (req, res) => {
  const { amount, vendor_id, plan_id } = req.body;

  // Validate request body
  if (!amount || !vendor_id || !plan_id) {
    console.error('Missing required fields:', { amount, vendor_id, plan_id });
    return res.status(400).json({ success: false, error: 'Amount, vendor_id, and plan_id are required' });
  }

  try {
    // Create Razorpay order
    const options = {
      amount: parseInt(amount) * 100, // Convert rupees to paise
      currency: 'INR',
      receipt: `rcptid_${Date.now()}`,
      notes: { vendor_id, plan_id },
    };

    const order = await razorpay.orders.create(options);
    console.log('Razorpay order created:', order);

    // Save order to database
    const newOrder = new Order({
      orderId: order.id,
      amount: parseInt(amount), // Store amount in rupees
      currency: order.currency,
      status: order.status,
      vendor_id,
      plan_id,
      created_at: new Date(),
    });

    await newOrder.save();
    console.log('Order saved to database:', newOrder);

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: `Failed to create order: ${error.message}` });
  }
};