const Amenities = require("../../../models/amenitesSchema");


const addAmenitiesData = async (req, res) => {
  const { vendorId, amenities, parkingEntries } = req.body;

  try {
    const existingVendor = await Amenities.findOne({ vendorId });
    if (existingVendor) {
      return res.status(400).json({ message: "Vendor already exists" });
    }

    const newAmenities = new Amenities({
      vendorId,
      amenities,
      parkingEntries,
    });

    await newAmenities.save();

    res.status(201).json({
      message: "Data submitted successfully",
      AmenitiesData: newAmenities,
    });
  } catch (error) {
    console.error("Error inserting data:", error);
    res.status(500).json({ message: "Error inserting data", error: error.message });
  }
};

const getAmenitiesData = async (req, res) => {
    const { id } = req.params; 
  
    try {
      const amenitiesData = await Amenities.findOne({ vendorId: id });
  
      if (!amenitiesData) {
        return res.status(404).json({ message: `No data found for vendorId: ${id}` }); // ✅ Fixed: Changed vendorId to id
      }
  
      res.status(200).json({
        message: "Data retrieved successfully",
        AmenitiesData: amenitiesData,
      });
    } catch (error) {
      console.error("Error retrieving data:", error);
      res.status(500).json({ message: "Error retrieving data", error: error.message });
    }
};

const updateAmenitiesData = async (req, res) => {
  const { id } = req.params;  
  const { amenities } = req.body; 
  try {
  
    const existingVendor = await Amenities.findOne({ vendorId: id });

    if (!existingVendor) {
      return res.status(404).json({ message: `No data found for vendorId: ${id}` });
    }

    existingVendor.amenities = amenities || existingVendor.amenities;

    await existingVendor.save();

    res.status(200).json({
      message: "Amenities data updated successfully",
      updatedAmenitiesData: existingVendor,
    });
  } catch (error) {
    console.error("Error updating data:", error);
    res.status(500).json({ message: "Error updating data", error: error.message });
  }
};

const updateParkingEntries = async (req, res) => {
  const { id } = req.params;  
  const { parkingEntries } = req.body; 
  
  try {
    
    const existingVendor = await Amenities.findOne({ vendorId: id });

   
    if (!existingVendor) {
      return res.status(404).json({ message: `No data found for vendorId: ${id}` });
    }

    
    existingVendor.parkingEntries = parkingEntries || existingVendor.parkingEntries;

    
    await existingVendor.save();

   
    res.status(200).json({
      message: "Parking entries data updated successfully",
      updatedParkingEntries: existingVendor.parkingEntries,
    });
  } catch (error) {
    
    console.error("Error updating parking entries data:", error);
    res.status(500).json({ message: "Error updating parking entries data", error: error.message });
  }
};


module.exports = { addAmenitiesData, getAmenitiesData, updateAmenitiesData, updateParkingEntries };

