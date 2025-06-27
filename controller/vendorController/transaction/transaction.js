const Payment = require("../../../models/transactionschema");
function generateBookingId() {
  const prefix = "PMW";
  const randomDigits = Math.floor(1000000 + Math.random() * 9000000); // Ensures 7 digits
  return prefix + randomDigits;
}
const verifyPaymentResponse = async (req, res) => {
 
  try {
    const {
      payment_id,
      // order_id,
      signature,
      plan_id,
      amount,
      transaction_name,
      payment_status,
    } = req.body;
const order_id = generateBookingId(); // Generate a unique order ID
    const vendor_id = req.params.vendorId;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      vendorId: vendor_id,
      planId: plan_id,
      transactionName: transaction_name,
      paymentStatus: payment_status,
      amount: amount,
    });

    await payment.save();

    console.log("Payment saved successfully:", payment);
    return res.status(200).json({ message: "Payment verified and vendor approved", payment });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const logpay = async (req, res) => {
  try {
    const {
      payment_id,
      order_id,
      signature,
      plan_id,
      amount,
      transaction_name,
      payment_status,
    } = req.body;

    const vendor_id = req.params.vendorId;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      vendorId: vendor_id,
      planId: plan_id,
      transactionName: transaction_name,
      paymentStatus: payment_status,
      amount: amount,
    });

    await payment.save();

    console.log("Payment saved successfully:", payment);
    return res.status(200).json({ message: "Payment verified and vendor approved", payment });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const userverifyPaymentResponse = async (req, res) => {
  try {
    const {
      payment_id,
      order_id,
      signature,
      plan_id,
      amount,
      vendorname,
      transaction_name,
      payment_status,
      vendorid // ← FIX: get this from body
    } = req.body;

    const userid = req.params.userid;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      vendorname:vendorname,
      userid: userid,
      vendorId: vendorid, // ← FIX: use the correct variable
      planId: plan_id,
      transactionName: transaction_name,
      paymentStatus: payment_status,
      amount: amount,
    });

    await payment.save();

    console.log("Payment saved successfully:", payment);
    return res.status(200).json({ message: "Payment verified and vendor approved", payment });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
const getPaymentsUserId = async (req, res) => {
  try {
    const userid = req.params.userid;

    // Fetch payments for the user
    const payments = await Payment.find({ userid: userid });

    if (payments.length === 0) {
      return res.status(404).json({ message: "No payments found for this user." });
    }

    console.log(`Payments fetched for user ${userid}:`, payments);

    return res.status(200).json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const userlogpay = async (req, res) => {
  try {
    const {
      payment_id,
      order_id,
      amount,
      transaction_name,
      payment_status,
    } = req.body;

    const userid = req.params.userid;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      userid: userid,
      vendorId: vendor_id,
      transactionName: transaction_name,
      paymentStatus: payment_status,
      amount: amount,
    });

    await payment.save();

    console.log("Payment saved successfully:", payment);
    return res.status(200).json({ message: "Payment verified and vendor approved", payment });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = {
  verifyPaymentResponse,
  logpay,
  userverifyPaymentResponse,
  userlogpay,
  getPaymentsUserId,
};
