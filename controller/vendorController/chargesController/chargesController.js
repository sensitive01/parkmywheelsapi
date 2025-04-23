const Parking = require('../../../models/chargesSchema');
const vendorModel = require('../../../models/vendorModel'); // Corrected path for vendorModel
const parkingCharges = async (req, res) => {
  const { vendorid, charges } = req.body;

  try {
    if (!vendorid || !charges || !Array.isArray(charges)) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    const existingVendor = await Parking.findOne({ vendorid });

    // Fetch the vendor's parking entries to check counts
    const vendorData = await vendorModel.findOne({ _id: vendorid }, { parkingEntries: 1 });
    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const parkingEntries = vendorData.parkingEntries.reduce((acc, entry) => {
      const type = entry.type.trim();
      acc[type] = parseInt(entry.count) || 0;
      return acc;
    }, {});

    // Check counts before adding charges
    const carCount = parkingEntries["Cars"] || 0;
    const bikeCount = parkingEntries["Bikes"] || 0;
    const otherCount = parkingEntries["Others"] || 0;

    for (const newCharge of charges) {
      if (newCharge.category === "Car" && carCount === 0) {
        return res.status(400).json({ message: "Cannot add charges for Cars as count is 0" });
      }
      if (newCharge.category === "Bike" && bikeCount === 0) {
        return res.status(400).json({ message: "Cannot add charges for Bikes as count is 0" });
      }
      if (newCharge.category === "Others" && otherCount === 0) {
        return res.status(400).json({ message: "Cannot add charges for Others as count is 0" });
      }
    }

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

const updateExtraParkingDataCar = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { fulldaycar } = req.body;

    if (!vendorId || fulldaycar === undefined) {
      return res.status(400).json({ message: "Missing required fields: vendorId or fulldayCar" });
    }

    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid: vendorId },
      { $set: { fulldaycar: fulldaycar } },
      { new: true } // Return the updated document
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Full day car data updated successfully",
      data: updatedVendor
    });

  } catch (error) {
    console.error("Error in updateExtraParkingDataCar:", error);
    res.status(500).json({
      message: "Error updating extra parking data",
      error: error.message
    });
  }
};

const updateExtraParkingDataBike = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { fulldaybike } = req.body;

    if (!vendorId || fulldaybike === undefined) {
      return res.status(400).json({ message: "Missing required fields: vendorId or fulldaybike" });
    }

    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid: vendorId },
      { $set: { fulldaybike: fulldaybike } },
      { new: true } // Return the updated document
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Full day car data updated successfully",
      data: updatedVendor
    });

  } catch (error) {
    console.error("Error in updateExtraParkingDatabike:", error);
    res.status(500).json({
      message: "Error updating extra parking data",
      error: error.message
    });
  }
};


const updateExtraParkingDataOthers = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { fulldayothers } = req.body;

    if (!vendorId || fulldayothers === undefined) {
      return res.status(400).json({ message: "Missing required fields: vendorId or fulldayothers" });
    }

    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid: vendorId },
      { $set: { fulldayothers: fulldayothers } },
      { new: true } // Return the updated document
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Full day car data updated successfully",
      data: updatedVendor
    });

  } catch (error) {
    console.error("Error in updateExtraParkingDataCar:", error);
    res.status(500).json({
      message: "Error updating extra parking data",
      error: error.message
    });
  }
};
// PUT /vendor/updateenable/:vendorId
const updateEnabledVehicles = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      carEnabled,
      bikeEnabled,
      othersEnabled,
      carTemporary,
      bikeTemporary,
      othersTemporary,
      carFullDay,
      bikeFullDay,
      othersFullDay,
      carMonthly,
      bikeMonthly,
      othersMonthly,
    } = req.body;

    if (
      !vendorId ||
      carEnabled === undefined ||
      bikeEnabled === undefined ||
      othersEnabled === undefined ||
      carTemporary === undefined ||
      bikeTemporary === undefined ||
      othersTemporary === undefined ||
      carFullDay === undefined ||
      bikeFullDay === undefined ||
      othersFullDay === undefined ||
      carMonthly === undefined ||
      bikeMonthly === undefined ||
      othersMonthly === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid: vendorId },
      {
        $set: {
          carenable: carEnabled.toString(),
          bikeenable: bikeEnabled.toString(),
          othersenable: othersEnabled.toString(),

          cartemp: carTemporary.toString(),
          biketemp: bikeTemporary.toString(),
          otherstemp: othersTemporary.toString(),

          carfullday: carFullDay.toString(),
          bikefullday: bikeFullDay.toString(),
          othersfullday: othersFullDay.toString(),

          carmonthly: carMonthly.toString(),
          bikemonthly: bikeMonthly.toString(),
          othersmonthly: othersMonthly.toString(),
        },
      },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Enabled vehicles and parking options updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating enabled vehicles:", error);
    res.status(500).json({ message: "Error updating enabled vehicles", error: error.message });
  }
};

const updatelistv = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      carTemporary,
      bikeTemporary,
      othersTemporary,
      carFullDay,
      bikeFullDay,
      othersFullDay,
      carMonthly,
      bikeMonthly,
      othersMonthly,
    } = req.body;

    // Check required fields
    if (
      !vendorId ||
      carTemporary === undefined ||
      bikeTemporary === undefined ||
      othersTemporary === undefined ||
      carFullDay === undefined ||
      bikeFullDay === undefined ||
      othersFullDay === undefined ||
      carMonthly === undefined ||
      bikeMonthly === undefined ||
      othersMonthly === undefined // 🔥 Removed trailing ||
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updatedVendor = await Parking.findOneAndUpdate(
      { vendorid: vendorId },
      {
        $set: {
          carTemporary: carTemporary.toString(),
          bikeTemporary: bikeTemporary.toString(),
          othersTemporary: othersTemporary.toString(),
          carFullDay: carFullDay.toString(),
          bikeFullDay: bikeFullDay.toString(),
          othersFullDay: othersFullDay.toString(),
          carMonthly: carMonthly.toString(),
          bikeMonthly: bikeMonthly.toString(),
          othersMonthly: othersMonthly.toString(),
        },
      },
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Enabled vehicles updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating enabled vehicles:", error);
    res.status(500).json({
      message: "Error updating enabled vehicles",
      error: error.message,
    });
  }
};

// GET /vendor/fetchenable/:vendorId
const getEnabledVehicles = async (req, res) => {
  try {
    const { vendorId } = req.params;
    if (!vendorId) {
      return res.status(400).json({ message: "vendorId is required" });
    }

    const vendorData = await Parking.findOne({ vendorid: vendorId });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      carEnabled: vendorData.carenable === "true",
      bikeEnabled: vendorData.bikeenable === "true",
      othersEnabled: vendorData.othersenable === "true",
      carTemporary: vendorData.cartemp === "true",
      bikeTemporary: vendorData.biketemp === "true",
      othersTemporary: vendorData.otherstemp === "true",
      carFullDay: vendorData.carfullday === "true",
      bikeFullDay: vendorData.bikefullday === "true",
      othersFullDay: vendorData.othersfullday === "true",
      carMonthly: vendorData.carmonthly === "true",
      bikeMonthly: vendorData.bikemonthly === "true",
      othersMonthly: vendorData.othersmonthly === "true",
    });
  } catch (error) {
    console.error("Error fetching enabled vehicles:", error);
    res.status(500).json({ message: "Error fetching enabled vehicles", error: error.message });
  }
};





const getFullDayModes = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Parking.findOne({ vendorid: vendorId });

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Fetched full day modes",
      data: {
        fulldaycar: vendor.fulldaycar,
        fulldaybike: vendor.fulldaybike,
        fulldayothers: vendor.fulldayothers
      }
    });

  } catch (error) {
    console.error("Error fetching full day modes:", error);
    res.status(500).json({
      message: "Error fetching full day modes",
      error: error.message
    });
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



const Explorecharge = async (req, res) => {
  const { id } = req.params;

  try {
    const vendor = await Parking.findOne({ vendorid: id });

    if (!vendor) {
      return res.status(404).json({ message: `Vendor with ID ${id} not found` });
    }

    // Define expected charge IDs
    const requiredChargeIds = ["A", "E"];
    
    // Create a map of available charges
    const chargeMap = new Map(
      vendor.charges.map(({ chargeid, type, amount }) => {
        const match = type.match(/0 to (\d+) hours?/);
        const formattedType = match ? `${match[1]} Hour(s)` : type;
        return [chargeid, { type: formattedType, amount }];
      })
    );

    // Ensure both "A" and "E" exist, otherwise return default values
    const filteredCharges = requiredChargeIds.map(chargeid => 
      chargeMap.get(chargeid) || { type: "N/A", amount: "0" }
    );

    res.status(200).json({ message: "Parking Charges data fetched successfully", charges: filteredCharges });
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
      console.log(`No charges found for vendorid: ${vendorid}.`);
      return res.status(404).json({ message: "No matching charges found." });
    }

    // Transform the charges into the desired format
    const transformedData = transformCharges(result.charges);

    // Respond with the transformed data as JSON
    return res.json(transformedData);
  } catch (error) {
    console.error("Error fetching charges for vendorid:", vendorid, error);
    return res.status(500).json({ message: "Error fetching charges." });
  }
};

// Function to transform charges into the desired format
const fetchexit = async (req, res) => {
  const vendorid = req.params.id;
  const vehicleType = req.params.vehicleType;

  const chargeConfig = {
    Car: { chargeIds: ["A", "B", "C", "D"], fullDayChargeField: 'fulldaycar' },
    Bike: { chargeIds: ["E", "F", "G", "H"], fullDayChargeField: 'fulldaybike' },
    Others: { chargeIds: ["I", "J", "K", "L"], fullDayChargeField: 'fulldayothers' },
  };

  const config = chargeConfig[vehicleType];
  if (!config) {
    return res.status(400).json({ message: "Invalid vehicle type." });
  }

  try {
    const result = await Parking.findOne({
      vendorid: vendorid,
      "charges.category": vehicleType,
      "charges.chargeid": { $in: config.chargeIds }
    });

    if (!result || !result.charges || result.charges.length === 0) {
      console.log(`No charges found for vendorid: ${vendorid} and vehicleType: ${vehicleType}.`);
      return res.status(404).json({ message: "No matching charges found." });
    }

    const filteredCharges = result.charges.filter(charge => charge.category === vehicleType);
    if (filteredCharges.length === 0) {
      return res.status(404).json({ message: "No matching charges found." });
    }

    const transformedData = transformCharges(filteredCharges);
    const fullDayCharge = result[config.fullDayChargeField];

    return res.json({ transformedData, fullDayCharge });
  } catch (error) {
    console.error("Error fetching charges:", error);
    return res.status(500).json({ message: "Error fetching charges." });
  }
};
// Function to transform charges into the desired format
const transformCharges = (charges) => {
  return charges.map(charge => {
    console.log("Processing charge:", charge); // Log the charge being processed
    switch (charge.chargeid) {
      case 'A':
      case 'B':
      case 'C':
      case 'D':
      case 'E':
      case 'F':
      case 'G':
      case 'H':
      case 'I':
      case 'J':
      case 'K':
      case 'L':
        return {
          type: charge.type,
          amount: charge.amount,
          category: charge.category,
          chargeid: charge.chargeid,
        };
      default:
        // console.warn(Unknown chargeid: ${charge.chargeid});
        
        return null; // Return null for unknown charge IDs
    }
  }).filter(charge => charge !== null); // Filter out null values
};


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
const fetchbookamout = async (req, res) => {
  const vendorid = req.params.id; // Extract vendorid from the URL parameter
  const vehicleType = req.params.vehicleType; // Extract vehicle type from the URL parameter

  // Define charge IDs based on vehicle type
  let chargeIds;
  switch (vehicleType) {
    case 'Car':
      chargeIds = ["A", "B", "C" ];
      break;
    case 'Bike':
      chargeIds = ["E", "F", "G"];
      break;
    case 'Others':
      chargeIds = ["I", "J", "K"];
      break;
    default:
      return res.status(400).json({ message: "Invalid vehicle type." });
  }

  try {
    // Query the database for the vendor's charges based on vehicle type
    const result = await Parking.findOne(
      { 
        vendorid: vendorid, 
        "charges.category": vehicleType, // Use vehicleType to filter charges
        "charges.chargeid": { $in: chargeIds } // Use the defined charge IDs based on vehicle type
      }
    );

    // Check if the result is found and has charges
    if (!result || !result.charges || result.charges.length === 0) {
      console.log(`No charges found for vendorid: ${vendorid} and vehicleType: ${vehicleType}.`);

      return res.status(404).json({ message: "No matching charges found." });
    }

    // Filter the charges to only include those that match the vehicleType
    const filteredCharges = result.charges.filter(charge => charge.category === vehicleType);

    // Check if any charges were found after filtering
    if (filteredCharges.length === 0) {
      // console.log(No charges found for vendorid: ${vendorid} and vehicleType: ${vehicleType}.);
      return res.status(404).json({ message: "No matching charges found." });
    }

    // Transform the charges into the desired format
    const transformedData = booktransformCharges(filteredCharges);

    // Respond with the transformed data as JSON
    return res.json(transformedData);
  } catch (error) {
    // console.error("Error fetching charges for vendorid:", vendorid, "and vehicleType:", vehicleType, error);
    return res.status(500).json({ message: "Error fetching charges." });
  }
};
const booktransformCharges = (charges) => {
  return charges.map(charge => {
    console.log("Processing charge:", charge); // Log the charge being processed
    let transformedCharge = null;

    switch (charge.chargeid) {
      case 'A':
      case 'B':
      case 'C':
      case 'E':
      case 'F':
      case 'G':
      case 'I':
      case 'J':
      case 'K':
        // Create a transformed charge object
        transformedCharge = {
          type: charge.type,
          amount: charge.amount,
          category: charge.category,
          chargeid: charge.chargeid,
        };

        // Modify the type for specific charge IDs
        if (charge.chargeid === 'B' || charge.chargeid === 'F' || charge.chargeid === 'J') {
          // Extract the number of hours from the type string
          const match = charge.type.match(/Additional (\d+) hours/);
          if (match) {
            const hours = match[1]; // Get the number of hours
            transformedCharge.type = `Every ${hours} hours`; // Construct the new type string
          }
        }
        break;
      default:
        // console.warn(`Unknown chargeid: ${charge.chargeid}`);
        break; // No action needed for unknown charge IDs
    }

    return transformedCharge; // Return the transformed charge
  }).filter(charge => charge !== null); // Filter out null values
};
const fetchbookmonth = async (req, res) => {
  const vendorid = req.params.id; // Extract vendorid from the URL parameter
  const vehicleType = req.params.vehicleType; // Extract vehicle type from the URL parameter

  // Define charge IDs based on vehicle type
  let chargeIds;
  switch (vehicleType) {
    case 'Car':
      chargeIds = ["D" ];
      break;
    case 'Bike':
      chargeIds = ["H" ];
      break;
    case 'Others':
      chargeIds = ["L"];
      break;
    default:
      return res.status(400).json({ message: "Invalid vehicle type." });
  }

  try {
    // Query the database for the vendor's charges based on vehicle type
    const result = await Parking.findOne(
      { 
        vendorid: vendorid, 
        "charges.category": vehicleType, // Use vehicleType to filter charges
        "charges.chargeid": { $in: chargeIds } // Use the defined charge IDs based on vehicle type
      }
    );

    // Check if the result is found and has charges
    if (!result || !result.charges || result.charges.length === 0) {
      console.log(`No charges found for vendorid: ${vendorid} and vehicleType: ${vehicleType}.`);

      return res.status(404).json({ message: "No matching charges found." });
    }

    // Filter the charges to only include those that match the vehicleType
    const filteredCharges = result.charges.filter(charge => charge.category === vehicleType);

    // Check if any charges were found after filtering
    if (filteredCharges.length === 0) {
      // console.log(No charges found for vendorid: ${vendorid} and vehicleType: ${vehicleType}.);
      return res.status(404).json({ message: "No matching charges found." });
    }

    // Transform the charges into the desired format
    const tranformedData = bookmonth(filteredCharges);

    // Respond with the transformed data as JSON
    return res.json(tranformedData);
  } catch (error) {
    // console.error("Error fetching charges for vendorid:", vendorid, "and vehicleType:", vehicleType, error);
    return res.status(500).json({ message: "Error fetching charges." });
  }
};
const bookmonth = (charges) => {
  return charges.map(charge => {
    console.log("Processing charge:", charge); // Log the charge being processed
    let transformedCharge = null;

    switch (charge.chargeid) {
      case 'D':
      case 'H':
      case 'L':
   
        // Create a transformed charge object
        transformedCharge = {
          type: charge.type,
          amount: charge.amount,
          category: charge.category,
          chargeid: charge.chargeid,
        };

        // Modify the type for specific charge IDs
        if (charge.chargeid === 'B' || charge.chargeid === 'F' || charge.chargeid === 'J') {
          // Extract the number of hours from the type string
          const match = charge.type.match(/Additional (\d+) hours/);
          if (match) {
            const hours = match[1]; // Get the number of hours
            transformedCharge.type = `Every ${hours} hours`; // Construct the new type string
          }
        }
        break;
      default:
        // console.warn(`Unknown chargeid: ${charge.chargeid}`);
        break; // No action needed for unknown charge IDs
    }

    return transformedCharge; // Return the transformed charge
  }).filter(charge => charge !== null); // Filter out null values
};
module.exports = {updatelistv,getEnabledVehicles,updateEnabledVehicles,getFullDayModes,updateExtraParkingDataCar,updateExtraParkingDataOthers,updateExtraParkingDataBike, parkingCharges,fetchbookmonth, getChargesbyId, getChargesByCategoryAndType,fetchexit,fetchbookamout, fetchC, transformCharges,Explorecharge};
