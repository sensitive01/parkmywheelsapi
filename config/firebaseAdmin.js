// filepath: d:\apersonal\api\parkmywheelsapi\config\firebaseAdmin.js
const admin = require("firebase-admin");
const { getFirebaseConfig } =require( "./serviceaccount.js");


// Use environment variable to load the service account file
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getFirebaseConfig()),

  });
}

module.exports = admin;