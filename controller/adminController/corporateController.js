// controllers/commercialServiceController.js
const CommercialService = require('../../models/CommercialSchema');

// Create a new service
exports.createService = async (req, res) => {
  try {
    const service = new CommercialService(req.body);
    await service.save();
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await CommercialService.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const service = await CommercialService.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update a service by ID
exports.updateService = async (req, res) => {
  try {
    const service = await CommercialService.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a service by ID
exports.deleteService = async (req, res) => {
  try {
    const service = await CommercialService.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
