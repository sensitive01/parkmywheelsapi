const Feedback = require("../../../models/feedbackreviewSchema");

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

// Add Feedback
const addFeedback = async (req, res) => {
  try {
    const { userId, rating, description } = req.body;

    if (!userId || !rating) {
      return res.status(400).json({ message: "User ID and Rating are required" });
    }

    const feedback = new Feedback({ userId, rating, description });
    await feedback.save();

    res.status(201).json({ message: "Feedback submitted successfully", feedback });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Fetch Feedback by User ID
const fetchFeedbackByUserId = async (req, res) => {
  try {
    const { userId } = req.params;

    const feedback = await Feedback.find({ userId });
    if (!feedback.length) {
      return res.status(404).json({ message: "No feedback found for this user" });
    }

    res.status(200).json(feedback);
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update Feedback by User ID
const updateFeedback = async (req, res) => {
    try {
      const { userId } = req.params;  // Get the userId from the route parameter
      const { rating, description } = req.body;
  
      // Check if required fields are provided
      if (!userId || !rating) {
        return res.status(400).json({ message: "User ID and Rating are required" });
      }
  
      // Find and update the feedback by userId
      const updatedFeedback = await Feedback.findOneAndUpdate(
        { userId },  // Search feedback by userId
        { rating, description },  // Update the rating and description
        { new: true }  // Return the updated document
      );
  
      // If no feedback is found for the user
      if (!updatedFeedback) {
        return res.status(404).json({ message: "No feedback found for this user" });
      }
  
      // Return the updated feedback as response
      res.status(200).json({ message: "Feedback updated successfully", updatedFeedback });
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  };
  

module.exports = {
  fetchFeedback,
  addFeedback,
  fetchFeedbackByUserId,
  updateFeedback
};
