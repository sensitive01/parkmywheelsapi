const vendorModel = require("../../../models/venderSchema");  

const fetchParkingData = async (req, res) => {
  try {
    console.log("Fetching parking data for vendor ID:", req.params.id);

    const { id } = req.params;

    const vendorData = await vendorModel.findOne({ _id: id }, { password: 0 });

    if (!vendorData) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    let totalBikeSpaces = 0;
    let totalCarSpaces = 0;

    const bikeParkingEntry = vendorData.parkingEntries.find(
      (entry) => entry.type === 'Bikes'
    );

    const carParkingEntry = vendorData.parkingEntries.find(
      (entry) => entry.type === 'Cars'
    );

    if (bikeParkingEntry) {
      totalBikeSpaces = parseInt(bikeParkingEntry.count) || 0;
    }

    if (carParkingEntry) {
      totalCarSpaces = parseInt(carParkingEntry.count) || 0;
    }

    const totalParkingSpaces = totalBikeSpaces + totalCarSpaces;

    return res.status(200).json({
      message: "Parking data fetched successfully",
      vendorName: vendorData.vendorName,
      totalBikeSpaces: totalBikeSpaces,
      totalCarSpaces: totalCarSpaces,
      totalParkingSpaces: totalParkingSpaces, 
    });
  } catch (err) {
    console.log("Error in fetching parking data:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { fetchParkingData };
