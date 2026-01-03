const handlingFeeSchema = require("../../models/gstfeeschema");


const addCustomerHandlingFee = async (req, res) => {
    try {
        // FIXED: Added description and isActive to destructuring
        const { percentage, description, isActive } = req.body;

        const handlingFee = new handlingFeeSchema({
            handlingfee: percentage,
            description,
            isActive: isActive !== undefined ? isActive : true
        });

        await handlingFee.save();
        res.status(201).json({ message: "Customer handling fee added successfully", handlingFee });
    } catch (error) {
        console.error("Error adding customer handling fee:", error);
        res.status(500).json({ message: "Failed to add customer handling fee" });
    }
};

const getCustomerHandlingFee = async (req, res) => {
    try {
        const handlingFee = await handlingFeeSchema.find({}).sort({ createdAt: -1 });
        res.status(200).json({ handlingFee });
    } catch (error) {
        console.error("Error getting customer handling fee:", error);
        res.status(500).json({ message: "Failed to get customer handling fee" });
    }
};

const updateCustomerHandlingFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { handlingfee, description, isActive } = req.body;
        console.log("req.body",req.body)

        const handlingFee = await handlingFeeSchema.findByIdAndUpdate(
            id,
            {
                handlingfee:handlingfee,
                description,
                isActive
            },
            { new: true }
        );

        if (!handlingFee) {
            return res.status(404).json({ message: "Customer handling fee not found" });
        }
        res.status(200).json({ handlingFee });
    } catch (error) {
        console.error("Error updating customer handling fee:", error);
        res.status(500).json({ message: "Failed to update customer handling fee" });
    }
};

const deleteCustomerHandlingFee = async (req, res) => {
    try {
        const { id } = req.params;

        const handlingFee = await handlingFeeSchema.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        if (!handlingFee) {
            return res.status(404).json({ message: "Customer handling fee not found" });
        }

        res.status(200).json({ message: "Customer handling fee deactivated successfully", handlingFee });
    } catch (error) {
        console.error("Error deactivating customer handling fee:", error);
        res.status(500).json({ message: "Failed to deactivate customer handling fee" });
    }
};


const getActiveCustomerHandlingFee = async (req, res) => {
    try {
        const handlingFee = await handlingFeeSchema.findOne({ isActive: true });

        if (!handlingFee) {
            return res.status(404).json({ message: "Customer handling fee not found" });
        }

        res.status(200).json({ handlingFee });
    } catch (error) {
        console.error("Error getting active customer handling fee:", error);
        res.status(500).json({ message: "Failed to get active customer handling fee" });
    }
};






module.exports = {
    addCustomerHandlingFee,
    getCustomerHandlingFee,
    updateCustomerHandlingFee,
    deleteCustomerHandlingFee,
    getActiveCustomerHandlingFee,
};