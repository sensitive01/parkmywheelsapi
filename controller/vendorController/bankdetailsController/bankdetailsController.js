const BankDetails = require('../../../models/bankdetailsSchema');
const { uploadImage } = require('../../../config/cloudinary');


const createOrUpdateBankDetail = async (req, res) => {
    try {
      const { vendorId, accountnumber, confirmaccountnumber, accountholdername, ifsccode } = req.body;
  
      let existingBankDetail = await BankDetails.findOne({ vendorId });

      // Handle bank passbook image upload
      let bankpassbookimage = null;
      if (req.file) {
        bankpassbookimage = await uploadImage(req.file.buffer, "bankdetails/passbook");
      } else if (req.body.bankpassbookimage && req.body.bankpassbookimage.startsWith("data:image")) {
        // If image is base64, upload it
        try {
          const base64Data = req.body.bankpassbookimage.split(",")[1];
          const buffer = Buffer.from(base64Data, "base64");
          bankpassbookimage = await uploadImage(buffer, "bankdetails/passbook");
        } catch (error) {
          console.error("Error uploading base64 image:", error);
        }
      } else if (req.body.bankpassbookimage) {
        // If it's already a URL, use it directly
        bankpassbookimage = req.body.bankpassbookimage;
      }
  
      if (existingBankDetail) {
        // Use findOneAndUpdate to update the document and return the updated one
        const updateData = {
          accountnumber: accountnumber || existingBankDetail.accountnumber,
          confirmaccountnumber: confirmaccountnumber || existingBankDetail.confirmaccountnumber,
          accountholdername: accountholdername || existingBankDetail.accountholdername,
          ifsccode: ifsccode || existingBankDetail.ifsccode
        };

        // Only update bankpassbookimage if a new one is provided
        if (bankpassbookimage) {
          updateData.bankpassbookimage = bankpassbookimage;
        } else if (existingBankDetail.bankpassbookimage) {
          // Keep existing image if no new one is provided
          updateData.bankpassbookimage = existingBankDetail.bankpassbookimage;
        }

        const updatedBankDetail = await BankDetails.findOneAndUpdate(
          { vendorId },
          updateData,
          { new: true } // This will return the updated document
        );
  
        return res.status(200).json({
          message: 'Bank detail updated successfully',
          data: updatedBankDetail // Full updated data will be in the response
        });
      } else {
        const newBankDetail = new BankDetails({
          vendorId,
          accountnumber,
          confirmaccountnumber,
          accountholdername,
          ifsccode,
          bankpassbookimage: bankpassbookimage || null
        });
  
        const savedBankDetail = await newBankDetail.save();
  
        return res.status(201).json({
          message: 'Bank detail created successfully',
          data: savedBankDetail // Full data will be included in the response
        });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Error creating or updating bank detail',
        error: error.message
      });
    }
  };
  
  

  const getBankDetails = async (req, res) => {
    try {
      const { vendorId } = req.params;
      const bankDetails = await BankDetails.find({ vendorId });
  
      if (bankDetails.length === 0) {
        return res.status(404).json({
          message: `No bank details found for vendorId: ${vendorId}`,
        });
      }
  
      res.status(200).json({
        message: 'Bank details fetched successfully',
        data: bankDetails
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: 'Error fetching bank details',
        error: error.message
      });
    }
  };
  
  

module.exports = { createOrUpdateBankDetail, getBankDetails };
