const BankDetails = require('../../../models/bankdetailsSchema');


const createOrUpdateBankDetail = async (req, res) => {
    try {
      // Destructure data from request body
      const { vendorId, accountnumber, confirmaccountnumber, accountholdername, ifsccode } = req.body;
  
      // Check if all required fields are provided
      if (!vendorId || !accountnumber || !confirmaccountnumber || !accountholdername || !ifsccode) {
        return res.status(400).json({
          message: 'All fields are required.',
        });
      }
  
      // Check if bank details for this vendorId already exist
      let existingBankDetail = await BankDetails.findOne({ vendorId });
  
      if (existingBankDetail) {
        // If bank details exist, update the existing record
        existingBankDetail.accountnumber = accountnumber;
        existingBankDetail.confirmaccountnumber = confirmaccountnumber;
        existingBankDetail.accountholdername = accountholdername;
        existingBankDetail.ifsccode = ifsccode;
  
        // Save the updated bank details
        await existingBankDetail.save();
  
        return res.status(200).json({
          message: 'Bank detail updated successfully',
          data: existingBankDetail
        });
      } else {
        // If no existing record, create a new one
        const newBankDetail = new BankDetails({
          vendorId,
          accountnumber,
          confirmaccountnumber,
          accountholdername,
          ifsccode
        });
  
        // Save the new bank detail to the database
        await newBankDetail.save();
  
        return res.status(201).json({
          message: 'Bank detail created successfully',
          data: newBankDetail
        });
      }
    } catch (error) {
      // Handle any errors that occur during the create/update process
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
