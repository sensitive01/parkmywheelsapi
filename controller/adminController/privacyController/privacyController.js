const PrivacyPolicy = require("../../../models/privacySchema");

const getPrivacyPolicy = async (req, res) => {
  const { id } = req.params; 

  try {
    
    const policy = await PrivacyPolicy.findOne({ id });
    
    
    if (policy) {
      res.json({ link: policy.link });  
    } else {
      res.status(404).send("Privacy policy not found"); 
    }
  } catch (error) {
    res.status(500).send("Error fetching privacy policy"); 
  }
};

module.exports = { getPrivacyPolicy };
