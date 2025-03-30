const Corporate = require('../../models/corporateSchema');

// Create a new corporate entry
exports.createCorporate = async (req, res) => {
    try {
        const corporate = new Corporate(req.body);
        await corporate.save();
        res.status(201).json({ message: 'Corporate created successfully', corporate });
    } catch (error) {
        res.status(500).json({ message: 'Error creating corporate', error });
    }
};

// Get all corporate entries
exports.getAllCorporates = async (req, res) => {
    try {
        const corporates = await Corporate.find();
        res.status(200).json(corporates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching corporates', error });
    }
};

// Get a single corporate entry by ID
exports.getCorporateById = async (req, res) => {
    try {
        const corporate = await Corporate.findById(req.params.id);
        if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
        res.status(200).json(corporate);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching corporate', error });
    }
};

// Update a corporate entry
exports.updateCorporate = async (req, res) => {
    try {
        const corporate = await Corporate.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
        res.status(200).json({ message: 'Corporate updated successfully', corporate });
    } catch (error) {
        res.status(500).json({ message: 'Error updating corporate', error });
    }
};

// Delete a corporate entry
exports.deleteCorporate = async (req, res) => {
    try {
        const corporate = await Corporate.findByIdAndDelete(req.params.id);
        if (!corporate) return res.status(404).json({ message: 'Corporate not found' });
        res.status(200).json({ message: 'Corporate deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting corporate', error });
    }
};
