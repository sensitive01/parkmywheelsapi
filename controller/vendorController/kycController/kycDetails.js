const { uploadImage } = require("../../../config/cloudinary");
const KycDetails = require('../../../models/kycSchema');

const createKycData = async (req, res) => {
  try {
    console.log("BODY", req.body);

    const {
      vendorId,
      idProof,
      idProofNumber,
      addressProof,
      addressProofNumber,
      status,
    } = req.body;
    console.log("FILES:", req.files); 

    if (!req.files) {
      return res.status(400).json({ message: 'Images are required' });
    }
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
    res.status(200).json({ message: 'KYC details created successfully', data: kycDetails });
  } catch (error) {
    console.log("Multer error", error); 
    res.status(500).json({ message: 'Error creating KYC details', error: error.message });
  }
};



const getKycData = async (req, res) => {
  try {
    const { id } = req.params; 

    const kycDetails = await KycDetails.findOne({ vendorId: id });

    if (!kycDetails) {
      return res.status(404).json({ message: 'KYC details not found' });
    }
    res.status(200).json({ data: kycDetails });
  } catch (error) {

    res.status(500).json({ message: 'Error fetching KYC details', error: error.message });
  }
};
const updateKycData = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      idProof,
      idProofNumber,
      addressProof,
      addressProofNumber,
      status,
    } = req.body;

    console.log("Request Body:", req.body);
    console.log("Request Files:", req.files);

    const updateData = { idProof, idProofNumber, addressProof, addressProofNumber, status };

    if (req.files && req.files.idProofImage) {
      updateData.idProofImage = await uploadImage(req.files.idProofImage[0].buffer, "kyc/idProofs");
    }

    if (req.files && req.files.addressProofImage) {
      updateData.addressProofImage = await uploadImage(req.files.addressProofImage[0].buffer, "kyc/addressProofs");
    }

    const updatedKycDetails = await KycDetails.findOneAndUpdate(
      { vendorId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedKycDetails) {
      return res.status(404).json({ message: 'KYC details not found' });
    }

    res.status(200).json({ message: 'KYC details updated successfully', data: updatedKycDetails });
  } catch (error) {
    console.error("Error updating KYC details:", error.message);
    res.status(500).json({ message: 'Error updating KYC details', error: error.message });
  }
};




const getallKycData = async (req, res) => {
  try {
    const kycDetails = await KycDetails.find();

    if (!kycDetails || kycDetails.length === 0) {
      return res.status(404).json({ message: 'No KYC details found' });
    }

    res.status(200).json({ data: kycDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all KYC details', error: error.message });
  }
};

const verifyKycStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const kycDetails = await KycDetails.findOne({ vendorId });

    if (!kycDetails) {
      return res.status(404).json({ message: 'KYC details not found' });
    }

    // Check if KYC is already verified
    if (kycDetails.status === 'Verified') {
      return res.status(400).json({ message: 'KYC is already verified' });
    }

    // Update status to Verified
    kycDetails.status = 'Verified';
    await kycDetails.save();

    res.status(200).json({ message: 'KYC verified successfully', data: kycDetails });
  } catch (error) {
    console.error('Error verifying KYC:', error.message);
    res.status(500).json({ message: 'Error verifying KYC', error: error.message });
  }
};



module.exports = {
  createKycData,
  getKycData,
  updateKycData,
  getallKycData,
  verifyKycStatus,
};

