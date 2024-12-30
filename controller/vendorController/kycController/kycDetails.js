const { uploadImage } = require("../../../config/cloudinary");
const KycDetails = require('../../../models/kycSchema');

// Create KYC Details
const createKycData = async (req, res) => {
  try {
    console.log("BODY", req.body); // Debugging: Log files being sent in the request

    const {
      vendorId,
      idProof,
      idProofNumber,
      addressProof,
      addressProofNumber,
      status,
    } = req.body;
    console.log("FILES:", req.files); // Debugging: Log files

    if (!req.files) {
      return res.status(400).json({ message: 'Images are required' });
    }

    // Upload images to Cloudinary and get the URLs
    const idProofImage = await uploadImage(req.files.idProofImage[0].buffer, "kyc/idProofs");
    const addressProofImage = await uploadImage(req.files.addressProofImage[0].buffer, "kyc/addressProofs");

    const kycDetails = new KycDetails({
      vendorId,
      idProof,
      idProofNumber,
      idProofImage: idProofImage,
      addressProof,
      addressProofNumber,
      addressProofImage: addressProofImage,
      status,
    });

    await kycDetails.save();
    res.status(201).json({ message: 'KYC details created successfully', data: kycDetails });
  } catch (error) {
    console.log("Multer error", error); // Log the error for debugging
    res.status(500).json({ message: 'Error creating KYC details', error: error.message });
  }
};


// Get a Single KYC Data by ID
const getKycData = async (req, res) => {
  try {
    const { id } = req.params;
    const kycDetails = await KycDetails.findById(id);

    if (!kycDetails || !req.files.idProofImage || !req.files.addressProofImage) {
      return res.status(404).json({ message: 'KYC details not found' });
    }

    res.status(200).json({ data: kycDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching KYC details', error: error.message });
  }
};

// Update KYC Data by ID
const updateKycData = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      idProof,
      idProofNumber,
      addressProof,
      addressProofNumber,
      status,
    } = req.body;

    const kycDetails = await KycDetails.findById(id);
    if (!kycDetails) {
      return res.status(404).json({ message: 'KYC details not found' });
    }

    // Update fields
    if (idProof) kycDetails.idProof = idProof;
    if (idProofNumber) kycDetails.idProofNumber = idProofNumber;
    if (addressProof) kycDetails.addressProof = addressProof;
    if (addressProofNumber) kycDetails.addressProofNumber = addressProofNumber;
    if (status) kycDetails.status = status;

    // Update images if provided
    if (req.files && req.files.idProofImage) {
      const idProofImage = await uploadImage(req.files.idProofImage[0].buffer, 'kyc/idProofs');
      kycDetails.idProofImage = idProofImage;
    }

    if (req.files && req.files.addressProofImage) {
      const addressProofImage = await uploadImage(req.files.addressProofImage[0].buffer, 'kyc/addressProofs');
      kycDetails.addressProofImage = addressProofImage;
    }

    await kycDetails.save();
    res.status(200).json({ message: 'KYC details updated successfully', data: kycDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error updating KYC details', error: error.message });
  }
};

// Get All KYC Data for a Vendor ID
const getallKycData = async (req, res) => {
  try {
    const { id: vendorId } = req.params;
    const kycDetails = await KycDetails.find({ vendorId });

    if (!kycDetails || kycDetails.length === 0) {
      return res.status(404).json({ message: 'No KYC details found for this vendor' });
    }

    res.status(200).json({ data: kycDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all KYC details', error: error.message });
  }
};

// Export the controller functions
module.exports = {
  createKycData,
  getKycData,
  updateKycData,
  getallKycData,
};
