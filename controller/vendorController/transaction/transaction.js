const Payment = require("../../../models/transactionschema");
async function generateBookingId(vendorId) {
  const prefix = "PMW";
  
  const now = new Date();
  // Convert to IST offset (+5.5 hours)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const day = String(istTime.getUTCDate()).padStart(2, '0');
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const year = istTime.getUTCFullYear();
  const dateString = `${day}${month}${year}`;

  const startOfDay = new Date(Date.UTC(year, istTime.getUTCMonth(), istTime.getUTCDate(), 0, 0, 0) - istOffset);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const count = await Payment.countDocuments({
    vendorId: vendorId,
    createdAt: {
      $gte: startOfDay,
      $lt: endOfDay
    }
  });

  const sequence = String(count + 1).padStart(3, '0');
  return `${prefix}${dateString}${sequence}`;
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
    const vendor_id = req.params.vendorId;
    const order_id = await generateBookingId(vendor_id); // Generate a unique order ID

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
      vendorid
    } = req.body;

    const userid = req.params.userid;

    const payment = new Payment({
      paymentId: payment_id,
      orderId: order_id,
      signature: signature,
      vendorname: vendorname,
      userid: userid,
      vendorId: vendorid,
      planId: plan_id,
      transactionName: transaction_name,
      paymentStatus: payment_status,
      amount: amount,
    });

    await payment.save();

    // Fetch user FCM tokens
    const user = await require("../../../models/userModel").findOne({ uuid: userid }, { userfcmTokens: 1 });
    const tokens = user?.userfcmTokens || [];

    // Prepare notification
    let title, message;
    if (payment_status === "success" || payment_status === "SUCCESS") {
      title = "Payment Successful";
      message = `Payment of ₹${amount} for ${transaction_name || "Booking/Subscription"} was successful. Transaction ID: ${payment_id}.`;
    } else {
      title = "Payment Failed";
      message = `Payment failed for ${transaction_name || "Booking/Subscription"}. Please try again or use a different payment method.`;
    }

    // Send FCM notification
    if (tokens.length) {
      const payload = {
        notification: {
          title,
          body: message,
        },
        android: { notification: { sound: 'default', priority: 'high' } },
        apns: { payload: { aps: { sound: 'default' } } },
        data: {
          paymentId: String(payment_id),
          type: payment_status === "success" || payment_status === "SUCCESS" ? "payment_success" : "payment_failure",
        },
      };

      const admin = require("../../../config/firebaseAdmin");
      const invalidTokens = [];
      for (const token of tokens) {
        try {
          await admin.messaging().send({ ...payload, token });
        } catch (sendErr) {
          if (sendErr?.errorInfo?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
          }
        }
      }
      if (invalidTokens.length) {
        await require("../../../models/userModel").updateOne(
          { uuid: userid },
          { $pull: { userfcmTokens: { $in: invalidTokens } } }
        );
      }
    }

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
