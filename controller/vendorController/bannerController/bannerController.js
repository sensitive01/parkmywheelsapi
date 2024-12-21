const Banner = require("../../../models/bannerSchema");
const { uploadImage } = require("../../../config/cloudinary");


const createBanner = async (req, res) => {
    try {
      const { id, name, page } = req.body;
    //   let { image } = req.body;
  
      // Validate input
      if (!id || !name || !page) {
        return res.status(400).json({ message: "id, name, and page are required" });
      }
  
      // Check if a banner with the given id already exists
      const existingBanner = await Banner.findOne({ id });
      if (existingBanner) {
        return res.status(409).json({ message: "Banner with this ID already exists" });
      }
  
      // Check if image is uploaded
      if (req.files && req.files.image) {
        const imageFile = req.files.image[0]; // Assuming you're using express-fileupload and files are in an array
        const uploadedImageUrl = await uploadImage(imageFile.buffer, "Banner_images");
        image = uploadedImageUrl; // Update the image URL to the uploaded one
        console.log("Uploaded Image URL:", uploadedImageUrl);
      }
  
      // Create a new banner with the uploaded image URL
      const banner = new Banner({
        id,
        name,
        page,
        image, // Save the uploaded image URL
      });
  
      // Save banner to the database
      await banner.save();
  
      // Return success response
      return res.status(201).json({
        message: "Banner created successfully",
        banner,
      });
    } catch (err) {
      console.error("Error creating banner:", err);
      return res.status(500).json({ message: "Internal server error", error: err.message });
    }
  };
  

// Get all banner
const getBanners = async (req, res) => {
  try {
    // Fetch all banners from the database
    const banners = await Banner.find();

    // If no banners found
    if (banners.length === 0) {
      return res.status(404).json({ message: "No banners found" });
    }

    // Return the banners in the response
    return res.status(200).json({
      message: "Banners fetched successfully",
      banners, // Array of banners
    });
  } catch (err) {
    console.error("Error fetching banners:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

module.exports = {
    createBanner,
    getBanners,
};
