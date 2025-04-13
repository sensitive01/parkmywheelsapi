const Payment = require("../../../models/transactionschema");

const verifyPaymentResponse = async (req, res) => {
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
      transaction_name,
      payment_status,
    } = req.body;

    const userid = req.params.userid;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      userid: userid,
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

const userlogpay = async (req, res) => {
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

    const userid = req.params.userid;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      userid: userid,
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
module.exports = {
  verifyPaymentResponse,
  logpay,
  userverifyPaymentResponse,
  userlogpay,
};
