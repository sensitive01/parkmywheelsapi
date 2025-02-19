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
        const formattedType = match ? `${match[1]} Hours` : type;
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
  const vendorid = req.params.id; // Extract vendorid from the URL parameter
  const vehicleType = req.params.vehicleType; // Extract vehicle type from the URL parameter

  // Define charge IDs based on vehicle type
  let chargeIds;
  switch (vehicleType) {
    case 'Car':
      chargeIds = ["A", "B", "C", "D"];
      break;
    case 'Bike':
      chargeIds = ["E", "F", "G", "H"];
      break;
    case 'Others':
      chargeIds = ["I", "J", "K", "L"];
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
    const transformedData = transformCharges(filteredCharges);

    // Respond with the transformed data as JSON
    return res.json(transformedData);
  } catch (error) {
    // console.error("Error fetching charges for vendorid:", vendorid, "and vehicleType:", vehicleType, error);
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


module.exports = { parkingCharges, getChargesbyId, getChargesByCategoryAndType,fetchexit, fetchC, transformCharges,Explorecharge};
