const Gstfee = require("../../models/gstfeeschema");

// Add GST fee
exports.addGstFee = async (req, res) => {
    try {
        const gstfee = new Gstfee(req.body);
        await gstfee.save();
        res.status(201).json(gstfee);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Fetch all GST fees
exports.getAllGstFees = async (req, res) => {
    try {
        const gstfees = await Gstfee.find();
        res.json(gstfees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update GST fee by ID
exports.updateGstFee = async (req, res) => {
    try {
        const gstfee = await Gstfee.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!gstfee) return res.status(404).json({ error: "Not found" });
        res.json(gstfee);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};