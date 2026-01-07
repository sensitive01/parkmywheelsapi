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
    const subscriptions = await Subscription.aggregate([
      {
        $addFields: {
          userObjId: {
            $convert: {
              input: '$userId',
              to: 'objectId',
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: { uObjId: '$userObjId' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$_id', '$$uObjId'] }
              }
            },
            {
              $project: {
                _id: 0,
                userName: 1,
                userMobile: 1
              }
            }
          ],
          as: 'uDetails'
        }
      },
      {
        $lookup: {
          from: 'vendors',
          let: { uStrId: '$userId', uObjId: '$userObjId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$vendorId', '$$uStrId'] },
                    { $eq: ['$_id', '$$uObjId'] }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 0,
                userName: '$vendorName',
                userMobile: { $arrayElemAt: ['$contacts.mobile', 0] }
              }
            }
          ],
          as: 'vDetails'
        }
      },
      {
        $addFields: {
          resolvedUser: {
            $ifNull: [
              { $arrayElemAt: ['$uDetails', 0] },
              { $arrayElemAt: ['$vDetails', 0] }
            ]
          }
        }
      },
      {
        $addFields: {
          userId: {
            $ifNull: ['$resolvedUser', '$userId']
          }
        }
      },
      {
        $project: {
          uDetails: 0,
          vDetails: 0,
          resolvedUser: 0,
          userObjId: 0
        }
      }
    ]);
    console.log(subscriptions);
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

