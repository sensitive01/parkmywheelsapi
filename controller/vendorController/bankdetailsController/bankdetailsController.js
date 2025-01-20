const BankDetails = require('../../../models/bankdetailsSchema');


const createOrUpdateBankDetail = async (req, res) => {
  try {
 
    const { vendorId, accountnumber, confirmaccountnumber, accountholdername, ifsccode } = req.body;

    let existingBankDetail = await BankDetails.findOne({ vendorId });

    if (existingBankDetail) {
      existingBankDetail.accountnumber = accountnumber || existingBankDetail.accountnumber;
      existingBankDetail.confirmaccountnumber = confirmaccountnumber || existingBankDetail.confirmaccountnumber;
      existingBankDetail.accountholdername = accountholdername || existingBankDetail.accountholdername;
      existingBankDetail.ifsccode = ifsccode || existingBankDetail.ifsccode;
      await existingBankDetail.save();

      return res.status(200).json({
        message: 'Bank detail updated successfully',
        data: existingBankDetail
      });
    } else {
      const newBankDetail = new BankDetails({
        vendorId,
        accountnumber,
        confirmaccountnumber,
        accountholdername,
        ifsccode
      });
      await newBankDetail.save();

      return res.status(201).json({
        message: 'Bank detail created successfully',
        data: newBankDetail
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
