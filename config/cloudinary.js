const cloudinary = require("cloudinary").v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: "dsyqzw9ft",
  api_key: "639592464425626",
  api_secret: "1bdQpon4QnDnkKOFCtORmyjU2c0",
});

// Function to upload image to Cloudinary with dynamic folder
const uploadImage = async (imageBuffer, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: folder, // Folder dynamically set
        resource_type: "auto", // Automatically detect image type
      },
      (error, result) => {
        if (error) {
          return reject(new Error("Cloudinary upload failed: " + error.message));
        }
        resolve(result.secure_url); // Return the uploaded image URL
      }
    ).end(imageBuffer); // End the stream with the image buffer
  });
};

module.exports = { uploadImage };
