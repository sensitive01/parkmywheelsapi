const Parking = require('../../../models/chargesSchema');


const parkingCharges = async (req, res) => {
  const { vendorid, charges } = req.body;

  try {

    if (!vendorid || !charges || !Array.isArray(charges)) {
      return res.status(400).json({ message: "Invalid input data" });
    }
    
    const existingVendor = await Parking.findOne({ vendorid });

    if (existingVendor) {

      existingVendor.charges.push(...charges);


      await existingVendor.save();
      return res.status(201).json({
        message: "New charges added successfully",
        vendor: existingVendor,
      });
    }

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


const getChargesByCategoryAndType = async (req, res) => {
  const { vendorid, category, type } = req.params;

  try {
    const vendor = await Parking.findOne({ vendorid });

    if (!vendor) {
      return res.status(404).json({ message: `Vendor with ID ${vendorid} not found` });
    }

    // Filter charges based on category and type
    const filteredCharges = vendor.charges.filter(
      (charge) => charge.category === category && charge.type === type
    );

    if (filteredCharges.length === 0) {
      return res
        .status(404)
        .json({ message: `No charges found for category ${category} and type ${type}` });
    }

    res.status(200).json({
      message: "Parking Charges data fetched successfully",
      charges: filteredCharges,
    });
  } catch (error) {
    console.error("Error retrieving charges:", error.message);
    res.status(500).json({ message: "Error retrieving Parking Charges details", error: error.message });
  }
};




const updateParkingChargesCategory = async (req, res) => {
  const { vendorid, charges } = req.body;

  if (!vendorid || !charges || !Array.isArray(charges)) {
    return res.status(400).send('Vendor ID and a valid charges array are required.');
  }

  try {

    const categoryToUpdate = charges[0]?.category;

    if (!categoryToUpdate) {
      return res.status(400).send('Category is required in the charges data.');
    }

    const existingVendor = await Parking.findOne({ vendorid });

    if (!existingVendor) {
      return res.status(404).json({ message: `Vendor with ID ${vendorid} not found.` });
    }

    const filteredCharges = existingVendor.charges.filter(
      (charge) => charge.category !== categoryToUpdate
    );

    const updatedCharges = [...filteredCharges, ...charges];
    existingVendor.charges = updatedCharges;
    await existingVendor.save();

    res.status(200).json({
      message: `${categoryToUpdate} charges updated successfully.`,
      vendor: existingVendor,
    });
  } catch (error) {
    console.error("Error while updating charges:", error.message);
    res.status(500).send('Server error');
  }
};


module.exports = { parkingCharges, getChargesbyId, getChargesByCategoryAndType, updateParkingChargesCategory};
