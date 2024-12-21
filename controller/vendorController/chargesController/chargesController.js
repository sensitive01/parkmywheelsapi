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


module.exports={ parkingCharges, getChargesbyId }