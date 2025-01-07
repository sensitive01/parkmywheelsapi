const Parking = require('../../../models/chargesSchema');

const parkingCharges = async (req, res) => {
  const { vendorid, charges } = req.body;

  try {
    if (!vendorid || !charges || !Array.isArray(charges)) {
      return res.status(400).json({ message: "Invalid input data" });
    }
    const existingVendor = await Parking.findOne({ vendorid });

    if (existingVendor) {
      charges.forEach((newCharge) => {
        const existingCharge = existingVendor.charges.find(
          (charge) => charge.chargeid === newCharge.chargeid
        );

        if (existingCharge) {
          existingCharge.type = newCharge.type || existingCharge.type;
          existingCharge.amount = newCharge.amount || existingCharge.amount;
          existingCharge.category = newCharge.category || existingCharge.category; 
        } else {
          existingVendor.charges.push(newCharge);
        }
      });
      await existingVendor.save();
      return res.status(201).json({
        message: "Charges updated successfully",
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
  const { vendorid, category, chargeid } = req.params;

  try {
    const vendor = await Parking.findOne({ vendorid });

    if (!vendor) {
      return res.status(404).json({ message: `Vendor with ID ${vendorid} not found` });
    }
    const filteredCharges = vendor.charges.filter(
      (charge) => charge.category === category && charge.chargeid === chargeid
    );

    if (filteredCharges.length === 0) {
      return res
        .status(404)
        .json({ message: `No charges found for category ${category} and type ${chargeid}` });
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

const fetchC = async (req, res) => {
  const vendorid = req.params.id; // Extract vendorid from the URL parameter
  
  try {
    // Query the database for the vendor's charges
    const result = await Parking.findOne(
      { 
        vendorid: vendorid, 
        "charges.category": "Car", 
        "charges.chargeid": { $in: ["A", "B", "C", "D"] }
      }
    );

    // Check if the result is found and has charges
    if (!result || !result.charges || result.charges.length === 0) {
      console.log("No matching charges found.");
      return res.status(404).json({ message: "No matching charges found." });
    }

    // Transform the charges into the desired format
    const transformedData = transformCharges(result.charges);

    // Respond with the transformed data as JSON
    return res.json(transformedData);
  } catch (error) {
    console.error("Error fetching charges:", error);
    return res.status(500).json({ message: "Error fetching charges." });
  }
};

// Function to transform charges into the desired format
const transformCharges = (charges) => {
  // Initialize an object to hold the transformed data
  const transformedData = {
    minimumHoursAmount: { amount: null, type: null },
    additionalHoursAmount: { amount: null, type: null },
    fullDayAmount: { amount: null, type: null },
    monthlyAmount: { amount: null, type: null },
  };

  // Iterate through the charges and assign values based on chargeid
  charges.forEach(charge => {
    switch (charge.chargeid) {
      case "A":
        if (charge.amount && charge.type) {
          transformedData.minimumHoursAmount = { amount: charge.amount, type: charge.type };
        } else {
          console.log("Charge A missing amount or type.");
        }
        break;
      case "B":
        if (charge.amount && charge.type) {
          transformedData.additionalHoursAmount = { amount: charge.amount, type: charge.type };
        }
        break;
      case "C":
        if (charge.amount && charge.type) {
          transformedData.fullDayAmount = { amount: charge.amount, type: charge.type };
        }
        break;
      case "D":
        if (charge.amount && charge.type) {
          transformedData.monthlyAmount = { amount: charge.amount, type: charge.type };
        }
        break;
      default:
        break;
    }
  });

  return transformedData;
};


// const updateParkingChargesCategory = async (req, res) => {
//   const { vendorid, charges } = req.body;

//   if (!vendorid || !charges || !Array.isArray(charges)) {
//     return res.status(400).send('Vendor ID and a valid charges array are required.');
//   }

//   try {

//     const categoryToUpdate = charges[0]?.category;

//     if (!categoryToUpdate) {
//       return res.status(400).send('Category is required in the charges data.');
//     }

//     const existingVendor = await Parking.findOne({ vendorid });

//     if (!existingVendor) {
//       return res.status(404).json({ message: `Vendor with ID ${vendorid} not found.` });
//     }

//     const filteredCharges = existingVendor.charges.filter(
//       (charge) => charge.category !== categoryToUpdate
//     );

//     const updatedCharges = [...filteredCharges, ...charges];
//     existingVendor.charges = updatedCharges;
//     await existingVendor.save();

//     res.status(200).json({
//       message: `${categoryToUpdate} charges updated successfully.`,
//       vendor: existingVendor,
//     });
//   } catch (error) {
//     console.error("Error while updating charges:", error.message);
//     res.status(500).send('Server error');
//   }
// };


module.exports = { parkingCharges, getChargesbyId, getChargesByCategoryAndType, fetchC, transformCharges};
