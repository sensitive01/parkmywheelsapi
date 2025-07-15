const Parking = require('../../../models/chargesSchema');
const vendorModel = require('../../../models/venderSchema');
const Booking = require("../../../models/bookingSchema");
const Parkingcharges = require("../../../models/chargesSchema");
const { DateTime } = require('luxon');


// Corrected path for vendorModel
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


const tested = async (req, res) => { 
  try {
    // Step 1: Retrieve booking information by booking ID
    const booking = await Booking.findById(req.params.id)
      .populate('vendorId', 'parkingCharges');

    // Step 2: Check if booking exists
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Step 3: Ensure vehicle is in PARKED state
    if (booking.status !== 'PARKED') {
      return res.status(400).json({ error: 'Vehicle not in parked state' });
    }

    // Step 4: Calculate parking duration
    const parkedDateTime = parseDateTime(booking.parkedDate, booking.parkedTime);
    const exitDateTime = new Date();
    const durationMs = exitDateTime - parkedDateTime;
    const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

    console.log(`Parked Duration: ${durationHours} hours`);

    // Step 5: Get charges for this vendor and vehicle type
    const charges = await Parkingcharges.findOne({ 
      vendorid: booking.vendorId, 
      "charges.category": { $regex: new RegExp(`^${booking.vehicleType}$`, 'i') }
    });

    console.log('Charges Query:', {
      vendorid: booking.vendorId,
      category: new RegExp(`^${booking.vehicleType}$`, 'i')
    });

    if (!charges) {
      console.warn(`No charges found for vendor ${booking.vendorId} and vehicle type ${booking.vehicleType}`);
      return res.status(400).json({ error: 'No charges found for this vehicle type' });
    }

    console.log('Retrieved Charges:', charges);

    // Step 6: Calculate amount based on booking type
    let amount = 0;
    if (booking.bookType.toLowerCase() === 'hourly') {
      amount = calculateHourly(charges, durationHours);
    } else {
      const fullDayType = getFullDayTypeForVehicle(charges, booking.vehicleType); // dynamically get type
      amount = calculateFullDay(charges, parkedDateTime, exitDateTime, fullDayType);
    }

    // Step 7: Update booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        // exitvehicledate: formatDate(exitDateTime),
        // exitvehicletime: formatTime(exitDateTime),
        amount: amount.toFixed(2),
        // hour: durationHours.toString(),
        // status: 'PARKED'
      },
      { new: true }
    );

    // Step 8: Return response
    return res.json({
      success: true,
      booking: updatedBooking,
      payableAmount: amount.toFixed(2),
      durationHours
    });

  } catch (error) {
    console.error('Error occurred:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
};

function getFullDayTypeForVehicle(charges, vehicleType) {
  const lowerType = vehicleType.toLowerCase();
  switch (lowerType) {
    case 'car':
      return charges.fulldaycar || 'fullDayCharge';
    case 'bike':
      return charges.fulldaybike || 'fullDayCharge';
    case 'others':
      return charges.fulldayothers || 'fullDayCharge';
    default:
      throw new Error(`Unknown vehicle type: ${vehicleType}`);
  }
}

// Helper functions
function parseDateTime(dateStr, timeStr) {
  const [day, month, year] = dateStr.split('-');
  const [time, period] = timeStr.split(' ');
  let [hours, minutes] = time.split(':');
  
  hours = parseInt(hours);
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return new Date(year, month-1, day, hours, minutes);
}

function calculateHourly(charges, durationHours) {
  let amount = 0;
  const initialCharge = charges.charges.find(c => c.chargeid === 'A');
  
  if (initialCharge) {
    amount += parseFloat(initialCharge.amount);
    const remaining = durationHours - 1;
    
    if (remaining > 0) {
      const additionalCharge = charges.charges.find(c => 
        c.type.startsWith('Additional')
      );
      
      if (additionalCharge) {
        const hoursPerBlock = parseInt(additionalCharge.type.match(/\d+/)[0]);
        const blocks = Math.ceil(remaining / hoursPerBlock);
        amount += blocks * parseFloat(additionalCharge.amount);
      }
    }
  }
  
  return amount;
}

function calculateFullDay(charges, startDate, endDate, bookType) {
  const typeKey = bookType.toLowerCase();

  // Find the charge by exact type match
  const fullDayCharge = charges.charges.find(c => 
    c.type.toLowerCase() === 'full day'
  );

  if (!fullDayCharge) {
    throw new Error(`Full day charge not found for type: ${bookType}`);
  }

  let days = 1;

  // Calculate based on fullday type
  if (typeKey === 'full day') {
    // Count unique calendar days (midnight to midnight)
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Reset time to midnight for date comparison
    const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endMidnight = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    // Calculate days by finding the difference in days
    const msPerDay = 1000 * 60 * 60 * 24;
    days = Math.ceil((endMidnight - startMidnight) / msPerDay) + 1;

    // If end time is exactly midnight, reduce by 1 day
    if (end.getHours() === 0 && end.getMinutes() === 0) {
      days--;
    }

    // Ensure at least 1 day
    days = Math.max(1, days);
  } else if (typeKey === '24 hours') {
    // Count 24-hour periods
    const durationMs = endDate - startDate;
    const durationHours = durationMs / (1000 * 60 * 60);
    days = Math.ceil(durationHours / 24);
  } else {
    throw new Error(`Unsupported charge type: ${bookType}`);
  }

  return days * parseFloat(fullDayCharge.amount);
}

// const { DateTime } = require('luxon');


const fetchtestAmount = async (req, res) => {
  try {
    console.log('🔍 Incoming request ID:', req.params.id);

    // Step 1: Retrieve booking
    const booking = await Booking.findById(req.params.id)
      .populate('vendorId', 'parkingCharges');

    if (!booking) {
      console.error('❌ Booking not found');
      return res.status(404).json({ error: 'Booking not found' });
    }

    console.log('📦 Booking:', booking);
    console.log('📌 Vehicle Type:', booking.vehicleType);
    console.log('📌 Book Type:', booking.bookType);
    console.log('📌 Status:', booking.status);

    if (booking.status !== 'PARKED') {
      return res.status(400).json({ error: 'Vehicle not in parked state' });
    }

    // Step 2: Parse DateTime
    const parkedDateTimeLuxon = DateTime.fromFormat(
      `${booking.parkedDate} ${booking.parkedTime}`,
      'dd-MM-yyyy hh:mm a',
      { zone: 'Asia/Kolkata' }
    );

    if (!parkedDateTimeLuxon.isValid) {
      return res.status(400).json({ error: 'Invalid parked date/time format' });
    }

    const parkedDateTime = parkedDateTimeLuxon.toJSDate();
    const exitDateTime = DateTime.now().setZone('Asia/Kolkata').toJSDate();

    if (exitDateTime < parkedDateTime) {
      return res.status(400).json({ error: 'Exit time cannot be before parked time' });
    }

    const durationMs = exitDateTime - parkedDateTime;
    const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));

    console.log('🧮 Duration (hours):', durationHours);

    // Step 3: Fetch charges for vehicle type
    const charges = await Parkingcharges.findOne({
      vendorid: booking.vendorId,
      "charges.category": { $regex: new RegExp(`^${booking.vehicleType}$`, 'i') }
    });

    if (!charges) {
      return res.status(400).json({ error: 'No charges found for this vehicle type' });
    }

    console.log('✅ Charges found:', JSON.stringify(charges, null, 2));

    // Step 4: Calculate amount
    let amount = 0;
    if (booking.bookType.toLowerCase() === 'hourly') {
      amount = calculateHourly(charges, durationHours, booking.vehicleType);
    } else {
      // Add your full-day/monthly logic here if needed
      return res.status(400).json({ error: 'Full-day/monthly calculation not implemented' });
    }

    return res.json({
      success: true,
      payableAmount: amount?.toFixed(2) ?? '0.00',
      durationHours
    });

  } catch (error) {
    console.error('🔥 Error occurred:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Hourly calculation helper
function calculateHourly(chargesData, durationHours, vehicleType) {
  const filteredCharges = chargesData.charges.filter(
    c => c.category.toLowerCase() === vehicleType.toLowerCase()
  );

  let baseCharge = null;
  let additionalCharge = null;

  for (let charge of filteredCharges) {
    const type = charge.type.toLowerCase();

    if (type.includes('0 to')) {
      const match = type.match(/0 to (\d+) hours?/);
      if (match && durationHours <= parseInt(match[1])) {
        baseCharge = parseFloat(charge.amount);
        break;
      }
    } else if (type.includes('additional')) {
      additionalCharge = {
        amount: parseFloat(charge.amount),
        hours: extractHoursFromAdditional(type)
      };
    }
  }

  if (baseCharge !== null) return baseCharge;

  if (additionalCharge) {
    const cycles = Math.ceil(durationHours / additionalCharge.hours);
    return additionalCharge.amount * cycles;
  }

  return 0;
}

// ✅ Helper to extract hour count from "Additional X hours"
function extractHoursFromAdditional(type) {
  const match = type.match(/additional (\d+) hours?/i);
  return match ? parseInt(match[1]) : 1;
}

module.exports = { fetchtestAmount };


// Include the helper functions: getFullDayTypeForVehicle, parseDateTime, calculateHourly, calculateFullDay
// (These remain unchanged from your original code)

function formatDate(date) {
  return `${date.getDate().toString().padStart(2, '0')}-${
    (date.getMonth() + 1).toString().padStart(2, '0')}-${
    date.getFullYear()}`;
}

function formatTime(date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

const fetchVendorsWithCategorizedCharges = async (req, res) => {
  try {
    const vendors = await vendorModel.find({ status: 'approved', visibility: true }, { password: 0 });

    if (!vendors || vendors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No approved and visible vendors found",
      });
    }

    const chargeMap = {
      A: "carInstant",
      B: "carSchedule",
      C: "carFullDay",
      D: "carMonthly",
      E: "bikeInstant",
      F: "bikeSchedule",
      G: "bikeFullDay",
      H: "bikeMonthly",
      I: "othersInstant",
      J: "othersSchedule",
      K: "othersFullDay",
      L: "othersMonthly"
    };

    const results = [];

    for (const vendor of vendors) {
      const chargesDoc = await Parkingcharges.findOne({ vendorid: vendor.vendorId });

      const categorizedCharges = {};

      if (chargesDoc && chargesDoc.charges) {
        chargesDoc.charges.forEach((charge) => {
          const key = chargeMap[charge.chargeid];
          if (key) {
            categorizedCharges[key] = {
              type: charge.type,
              amount: charge.amount,
              category: charge.category,
            };
          }
        });
      }

      results.push({
        vendor: vendor,
        charges: categorizedCharges,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendors with categorized charges fetched successfully",
      data: results,
    });

  } catch (error) {
    console.error("Error fetching vendors with charges:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
module.exports = {fetchVendorsWithCategorizedCharges,fetchtestAmount,tested,updatelistv,getEnabledVehicles,updateEnabledVehicles,getFullDayModes,updateExtraParkingDataCar,updateExtraParkingDataOthers,updateExtraParkingDataBike, parkingCharges,fetchbookmonth, getChargesbyId, getChargesByCategoryAndType,fetchexit,fetchbookamout, fetchC, transformCharges,Explorecharge};
