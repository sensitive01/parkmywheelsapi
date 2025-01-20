const BankDetails = require('../../../models/bankdetailsSchema');


const createOrUpdateBankDetail = async (req, res) => {
    try {
      const { vendorId, accountnumber, confirmaccountnumber, accountholdername, ifsccode } = req.body;
  
      let existingBankDetail = await BankDetails.findOne({ vendorId });
  
      if (existingBankDetail) {
        // Use findOneAndUpdate to update the document and return the updated one
        const updatedBankDetail = await BankDetails.findOneAndUpdate(
          { vendorId },
          {
            accountnumber: accountnumber || existingBankDetail.accountnumber,
            confirmaccountnumber: confirmaccountnumber || existingBankDetail.confirmaccountnumber,
            accountholdername: accountholdername || existingBankDetail.accountholdername,
            ifsccode: ifsccode || existingBankDetail.ifsccode
          },
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
          ifsccode
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
