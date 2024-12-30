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

  if (!vendorid || !charges || !Array.isArray(charges)) {
    return res.status(400).send('Vendor ID and a valid charges array are required.');
  }

  try {
    // Filter charges for "Car" category
    const carCharges = charges.filter((charge) => charge.category === "Car");

    // Update the vendor's charges, overwriting the entire "charges" array
    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid },
      { $set: { charges: carCharges } },
      { new: true, upsert: true } // `new: true` returns the updated document; `upsert: true` creates a new document if it doesn't exist
    );

    res.status(200).json({
      message: "Car charges updated successfully.",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};



const updateParkingChargesBike = async (req, res) => {
  const { vendorid, charges } = req.body;

  if (!vendorid || !charges || !Array.isArray(charges)) {
    return res.status(400).send('Vendor ID and a valid charges array are required.');
  }

  try {
    // Filter charges for "Bike" category
    const bikeCharges = charges.filter((charge) => charge.category === "Bike");

    // Update the vendor's charges, overwriting the entire "charges" array for Bike
    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid },
      { $set: { charges: bikeCharges } },
      { new: true, upsert: true } // `new: true` returns the updated document; `upsert: true` creates a new document if it doesn't exist
    );

    res.status(200).json({
      message: "Bike charges updated successfully.",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};


const updateParkingChargesOthers = async (req, res) => {
  const { vendorid, charges } = req.body;

  if (!vendorid || !charges || !Array.isArray(charges)) {
    return res.status(400).send('Vendor ID and a valid charges array are required.');
  }

  try {
    // Filter charges for "Others" category
    const othersCharges = charges.filter((charge) => charge.category === "Others");

    // Update the vendor's charges, overwriting the entire "charges" array for Others
    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid },
      { $set: { charges: othersCharges } },
      { new: true, upsert: true } // `new: true` returns the updated document; `upsert: true` creates a new document if it doesn't exist
    );

    res.status(200).json({
      message: "Others charges updated successfully.",
      vendor: updatedVendor,
    });
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};

module.exports = { parkingCharges, getChargesbyId, updateParkingChargesCar,updateParkingChargesBike ,updateParkingChargesOthers,};
