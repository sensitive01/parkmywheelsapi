const Parking = require('../../../models/chargesSchema');

// Insert or Update Parking Charges for Vendor
const parkingCharges = async (req, res) => {
  const { vendorid, charges } = req.body;

  try {
    // Validate input
    if (!vendorid || !charges || !Array.isArray(charges)) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    // Check if the vendor already exists
    const existingVendor = await Parking.findOne({ vendorid });

    if (existingVendor) {
      // Add all new charges to the charges array
      existingVendor.charges.push(...charges);

      // Save updated document
      await existingVendor.save();
      return res.status(201).json({
        message: "New charges added successfully",
        vendor: existingVendor,
      });
    }

    // Create a new vendor document if it doesn't exist
    const newVendor = new Parking({ vendorid, charges });
    await newVendor.save();

    res.status(201).json({
      message: "Vendor created successfully",
      vendor: newVendor,
    });
  } catch (error) {
    console.error("Error managing parking charges:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


const getChargesbyId = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Parking.findOne({ vendorid: id });

    if (!vendor) {
      return res.status(404).json({ message: `Vendor with ID ${id} not found` });
    }

    res.status(200).json({ message: "Parking Charges data fetched successfully", vendor });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving Parking Charges details", error: error.message });
  }
};

const updateParkingChargesCar = async (req, res) => {
  const { vendorid, charges } = req.body;

  if (!vendorid || !charges) {
    return res.status(400).send('Vendor ID and charges are required.');
  }

  try {
    // Filter the incoming charges that are for 'Car'
    const incomingCarCharges = charges.filter((charge) => charge.category === "Car");

    // Create an array of charge types (without _id)
    const incomingCarChargeIds = incomingCarCharges.map((charge) => charge.type);

    // Remove charges that are not in the incoming list
    await Parking.updateOne(
      { vendorid },
      {
        $pull: {
          charges: {
            category: "Car",
            type: { $nin: incomingCarChargeIds }, // Pull charges that are not in the incoming list
          },
        },
      }
    );

    // Iterate over the incoming charges and either update or insert them
    for (let charge of incomingCarCharges) {
      if (charge._id) {
        // If the charge already has an ID, update it
        await Parking.updateOne(
          {
            vendorid,
            "charges._id": charge._id,
          },
          {
            $set: {
              "charges.$.type": charge.type,
              "charges.$.amount": charge.amount,
              "charges.$.category": charge.category,
            },
          }
        );
      } else {
        // If the charge doesn't have an ID, insert it as a new charge
        await Parking.updateOne(
          { vendorid },
          {
            $push: {
              charges: {
                type: charge.type,
                amount: charge.amount,
                category: charge.category,
              },
            },
          },
          { upsert: true }
        );
      }
    }

    res.status(200).send('Car charges updated successfully.');
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};




const updateParkingChargesBike = async (req, res) => {
  const { vendorid, charges } = req.body;

  if (!vendorid || !charges) {
    return res.status(400).send('Vendor ID and charges are required.');
  }

  try {
   
    const incomingBikeCharges = charges.filter((charge) => charge.category === "Bike");
    const incomingBikeChargeIds = incomingBikeCharges.map((charge) => charge._id);

   
    await Parking.updateOne(
      { vendorid },
      {
        $pull: {
          charges: {
            category: "Bike",
            _id: { $nin: incomingBikeChargeIds },
          },
        },
      }
    );

    
    for (let charge of incomingBikeCharges) {
      await Parking.updateOne(
        {
          vendorid,
          "charges._id": charge._id,
        },
        {
          $set: {
            "charges.$.type": charge.type,
            "charges.$.amount": charge.amount,
            "charges.$.category": charge.category,
          },
        },
        { upsert: true } 
      );
    }

    res.status(200).send('Bike charges updated successfully.');
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};

module.exports = { parkingCharges, getChargesbyId, updateParkingChargesCar,updateParkingChargesBike };
