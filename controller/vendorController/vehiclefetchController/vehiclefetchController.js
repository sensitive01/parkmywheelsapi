const vendorModel = require("../../../models/venderSchema");  // Correct path

// Fetch bike and car parking data for the vendor
const fetchParkingData = async (req, res) => {
  try {
    console.log("Fetching parking data for vendor ID:", req.params.id);

    // Get vendor ID from route parameters
    const { id } = req.params;

    // Fetch vendor data, excluding the password field
    const vendorData = await vendorModel.findOne({ _id: id }, { password: 0 });

    // Check if vendor exists
    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Initialize total spaces for bike and car
    let totalBikeSpaces = 0;
    let totalCarSpaces = 0;

    // Find the parking entry for bikes
    const bikeParkingEntry = vendorData.parkingEntries.find(
      (entry) => entry.type === 'Bikes'
    );

    // Find the parking entry for cars
    const carParkingEntry = vendorData.parkingEntries.find(
      (entry) => entry.type === 'Cars'
    );

    // Calculate total bike parking spaces
    if (bikeParkingEntry) {
      totalBikeSpaces = parseInt(bikeParkingEntry.count) || 0;
    }

    // Calculate total car parking spaces
    if (carParkingEntry) {
      totalCarSpaces = parseInt(carParkingEntry.count) || 0;
    }

    // Calculate the total of both bike and car parking spaces
    const totalParkingSpaces = totalBikeSpaces + totalCarSpaces;

    // Return the parking data
    return res.status(200).json({
      message: "Parking data fetched successfully",
      vendorName: vendorData.vendorName,
      totalBikeSpaces: totalBikeSpaces,
      totalCarSpaces: totalCarSpaces,
      totalParkingSpaces: totalParkingSpaces,  // Total of both bike and car spaces
    });
  } catch (err) {
    console.log("Error in fetching parking data:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { fetchParkingData };
