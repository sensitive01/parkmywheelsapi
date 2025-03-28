const Subscription = require('../../models/adminsubscriptionSchema');

// Create a new subscription
exports.createSubscription = async (req, res) => {
  try {
    const { userId, planId, planTitle, price, autoRenew, expiresAt, paymentDetails } = req.body;

    const newSubscription = new Subscription({
      userId,
      planId,
      planTitle,
      price,
      autoRenew,
      expiresAt,
      paymentDetails
    });

    await newSubscription.save();
    res.status(201).json({ message: 'Subscription created successfully', subscription: newSubscription });
  } catch (error) {
    res.status(500).json({ message: 'Error creating subscription', error });
  }
};

// Get user's subscription
exports.getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription', error });
  }
};

// Cancel Subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.params;
    const subscription = await Subscription.findOneAndUpdate(
      { userId },
      { status: 'cancelled' },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.status(200).json({ message: 'Subscription cancelled successfully', subscription });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling subscription', error });
  }
};

// Get all subscriptions (for admin)
exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.status(200).json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscriptions', error });
  }
};

// Update Subscription
exports.updateSubscription = async (req, res) => {
    try {
      const { userId } = req.params;
      const { planId, planTitle, price, autoRenew, expiresAt } = req.body;
  
      const updatedSubscription = await Subscription.findOneAndUpdate(
        { userId },
        { planId, planTitle, price, autoRenew, expiresAt },
        { new: true }
      );
  
      if (!updatedSubscription) {
        return res.status(404).json({ message: 'Subscription not found' });
      }
  
      res.status(200).json({ message: 'Subscription updated successfully', subscription: updatedSubscription });
    } catch (error) {
      res.status(500).json({ message: 'Error updating subscription', error });
    }
  };
  
