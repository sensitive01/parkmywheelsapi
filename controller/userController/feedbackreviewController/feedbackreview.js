const Feedback = require("../../../models/feedbackreviewSchema");
const Booking = require("../../../models/bookingSchema");
const Notification = require("../../../models/notificationschema");
const User = require("../../../models/userModel");

// Fetch all feedback
const fetchFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find();
        res.status(200).json(feedback);
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Add Feedback - Stores feedback in booking document
const addFeedback = async (req, res) => {
    try {
        const { userId, vendorId, bookingId, rating, description, feedbackPoints } = req.body;

        // Validate input data
        if (!userId || !rating) {
            return res.status(400).json({ message: "User ID and Rating are required" });
        }

        // Build query to find booking
        let query = {};
        if (bookingId) {
            // Prefer bookingId if provided
            query = { _id: bookingId, userid: userId };
        } else if (vendorId) {
            // Fallback to userId and vendorId - find most recent completed booking
            query = { userid: userId, vendorId: vendorId, status: "COMPLETED" };
        } else {
            return res.status(400).json({ message: "Booking ID or Vendor ID is required" });
        }

        // Find the booking
        let booking = await Booking.findOne(query).sort({ createdAt: -1 }); // Get most recent if multiple

        if (booking) {
            // Update feedback in booking document
            booking.feedback = {
                rating: rating,
                description: description || "",
                feedbackPoints: feedbackPoints || [],
                status: "submitted",
                submittedAt: new Date()
            };

            await booking.save();

            // Get customer name for notification
            let customerName = booking.personName || "Customer";
            try {
                const user = await User.findOne({ uuid: userId });
                if (user && user.userName) {
                    customerName = user.userName;
                }
            } catch (err) {
                console.error("Error fetching user for notification:", err);
                // Use booking personName as fallback
            }

            // Create stars based on rating
            const stars = "⭐".repeat(rating);

            // Create vendor notification
            try {
                const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
                const [datePart, timePart] = nowInIndia.split(", ");
                const [day, month, year] = datePart.split("/");
                const notificationDate = `${day}-${month}-${year}`;
                const notificationTime = timePart; // Keep full time string

                const vendorNotification = new Notification({
                    vendorId: booking.vendorId,
                    userId: userId,
                    bookingId: booking._id.toString(),
                    title: "New Feedback Received",
                    message: `${customerName} rated your service ${stars}. View full feedback.`,
                    vehicleType: booking.vehicleType || "",
                    vehicleNumber: booking.vehicleNumber || "",
                    createdAt: new Date(),
                    read: false,
                    sts: "feedback",
                    bookingtype: booking.bookType || "",
                    vendorname: booking.vendorName || "",
                    parkingDate: booking.parkingDate || "",
                    parkingTime: booking.parkingTime || "",
                    bookingdate: booking.bookingDate || "",
                    schedule: booking.parkingDate && booking.parkingTime ? `${booking.parkingDate} ${booking.parkingTime}` : "",
                    notificationdtime: `${notificationDate} ${notificationTime}`,
                    status: "feedback",
                });

                await vendorNotification.save();
                console.log(`✅ Feedback notification sent to vendor: ${booking.vendorId}`);
            } catch (notifError) {
                console.error("Error creating vendor notification:", notifError);
                // Don't fail the feedback submission if notification fails
            }

            res.status(200).json({ 
                message: "Feedback updated successfully", 
                feedback: booking.feedback,
                bookingId: booking._id
            });
        } else {
            return res.status(404).json({ message: "Booking not found" });
        }
    } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
const fetchFeedbackByUserId = async (req, res) => {
    try {
        const { userId } = req.params;  // Extract userId from params
        
        // Find all bookings for this user that have feedback
        const bookings = await Booking.find({ 
            userid: userId,
            "feedback.status": { $in: ["submitted", "pending"] }
        }).select("feedback vendorId _id createdAt");

        if (!bookings.length) {
            return res.status(404).json({ message: "No feedback found for this user" });
        }

        // Format response to include bookingId
        const feedbackList = bookings.map(booking => ({
            userId: booking.userid,
            vendorId: booking.vendorId,
            bookingId: booking._id.toString(),
            ...booking.feedback.toObject()
        }));

        res.status(200).json(feedbackList);  // Return feedback as response
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


// Update Feedback by User ID - Updates feedback in booking document
const updateFeedback = async (req, res) => {
    try {
        const { userId } = req.params;  // Get the userId from the route parameter
        const { vendorId, bookingId, rating, description, feedbackPoints } = req.body;

        // Check if required fields are provided
        if (!userId || !rating) {
            return res.status(400).json({ message: "User ID and Rating are required" });
        }

        // Build query - prefer bookingId if provided, otherwise use userId and vendorId
        let query = {};
        if (bookingId) {
            query = { _id: bookingId, userid: userId };
        } else if (vendorId) {
            // Find most recent completed booking for this user and vendor
            query = { userid: userId, vendorId: vendorId, status: "COMPLETED" };
        } else {
            return res.status(400).json({ message: "Booking ID or Vendor ID is required" });
        }

        // Find the booking
        let booking = await Booking.findOne(query).sort({ createdAt: -1 }); // Get most recent if multiple

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // Update feedback in booking document
        booking.feedback = {
            rating: rating,
            description: description || "",
            feedbackPoints: feedbackPoints || [],
            status: "submitted",
            submittedAt: new Date()
        };

        await booking.save();

        // Get customer name for notification
        let customerName = booking.personName || "Customer";
        try {
            const user = await User.findOne({ uuid: userId });
            if (user && user.userName) {
                customerName = user.userName;
            }
        } catch (err) {
            console.error("Error fetching user for notification:", err);
            // Use booking personName as fallback
        }

        // Create stars based on rating
        const stars = "⭐".repeat(rating);

        // Create vendor notification
        try {
            const nowInIndia = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
            const [datePart, timePart] = nowInIndia.split(", ");
            const [day, month, year] = datePart.split("/");
            const notificationDate = `${day}-${month}-${year}`;
            const notificationTime = timePart; // Keep full time string

            const vendorNotification = new Notification({
                vendorId: booking.vendorId,
                userId: userId,
                bookingId: booking._id.toString(),
                title: "New Feedback Received",
                message: `${customerName} rated your service ${stars}. View full feedback.`,
                vehicleType: booking.vehicleType || "",
                vehicleNumber: booking.vehicleNumber || "",
                createdAt: new Date(),
                read: false,
                sts: "feedback",
                bookingtype: booking.bookType || "",
                vendorname: booking.vendorName || "",
                parkingDate: booking.parkingDate || "",
                parkingTime: booking.parkingTime || "",
                bookingdate: booking.bookingDate || "",
                schedule: booking.parkingDate && booking.parkingTime ? `${booking.parkingDate} ${booking.parkingTime}` : "",
                notificationdtime: `${notificationDate} ${notificationTime}`,
                status: "feedback",
            });

            await vendorNotification.save();
            console.log(`✅ Feedback notification sent to vendor: ${booking.vendorId}`);
        } catch (notifError) {
            console.error("Error creating vendor notification:", notifError);
            // Don't fail the feedback submission if notification fails
        }

        // Return the updated feedback as response
        res.status(200).json({ 
            message: "Feedback updated successfully", 
            feedback: booking.feedback,
            bookingId: booking._id
        });
    } catch (error) {
        console.error("Error updating feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Fetch Feedback by Vendor ID - Gets feedback from bookings
const fetchFeedbackByVendorId = async (req, res) => {
    try {
        const { vendorId } = req.params;  // Extract vendorId from params
        
        // Find all bookings for this vendor that have feedback
        const bookings = await Booking.find({ 
            vendorId: vendorId,
            "feedback.status": { $in: ["submitted", "pending"] }
        }).select("feedback userid vendorId _id createdAt");

        if (!bookings.length) {
            return res.status(404).json({ message: "No feedback found for this vendor" });
        }

        // Format response to include bookingId
        const feedbackList = bookings.map(booking => ({
            userId: booking.userid,
            vendorId: booking.vendorId,
            bookingId: booking._id.toString(),
            ...booking.feedback.toObject()
        }));

        res.status(200).json(feedbackList);  // Return feedback as response
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Fetch Feedback by Booking ID - Gets feedback from booking document
const fetchFeedbackByBookingId = async (req, res) => {
    try {
        const { bookingId } = req.params;  // Extract bookingId from params
        
        // Find booking by ID
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (!booking.feedback || booking.feedback.status === "pending") {
            return res.status(404).json({ message: "No feedback found for this booking" });
        }

        // Format response to include bookingId
        const feedback = {
            userId: booking.userid,
            vendorId: booking.vendorId,
            bookingId: booking._id.toString(),
            ...booking.feedback.toObject()
        };

        res.status(200).json(feedback);  // Return feedback as response
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};


module.exports = {
    fetchFeedback,
    addFeedback,
    fetchFeedbackByUserId,
    updateFeedback,
    fetchFeedbackByVendorId,
    fetchFeedbackByBookingId
};
