// const mongoose = require("mongoose");

// const adminSchema = new mongoose.Schema(
//   {
//     adminName: { type: String, required: true },
//     contacts: [
//       {
//         name: { type: String, required: true },
//         mobile: { type: String, required: true }
//       }
//     ],
//     latitude: {
//       type: String,
//     },
//     longitude: {
//       type: String,
//     },
//     placetype: {
//       type: String,
//     },
//     address: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     password: {
//       type: String,
//       required: true,
//     },
//     landMark: {
//       type: String,
//     },

//    : { type: String, default: "0" },
//     platformfee: { type: String, },
//     subscription: { type: String, default: "false" },
//     subscriptionenddate: { type: String, },
//     image: {
//       type: String,
//     },
//     adminId: {
//       type: String,
//     //   unique: true
//     },
//     parkingEntries: [{
//       type: {
//         type: String,

//       },
//       count: {
//         type: String
//       },


//     }],
//   },
//   { timestamps: true }
// );


// module.exports = mongoose.model("admin", adminSchema);

const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');

const adminSchema = new mongoose.Schema(
  {
    adminName: { type: String, required: true },
    contacts: [
      {
        name: { type: String, required: true },
        mobile: { type: String, required: true }
      }
    ],
    latitude: {
      type: String,
    },
    longitude: {
      type: String,
    },
    placetype: {
      type: String,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    landMark: {
      type: String,
    },
  subscriptionleft: { type: Number, default: 0 },

    platformfee: { type: String, },
    subscription: { type: String, default: "false" },
    subscriptionenddate: { type: String, },
    image: {
      type: String,
    },
    vendorId: {
      type: String,
      unique: true,
      default: function() {
        return `VENDOR-${uuidv4().split('-')[0].toUpperCase()}`;
      }
    },
    adminId: {
      type: String,
    },
    parkingEntries: [{
      type: {
        type: String,
      },
      count: {
        type: String
      },
    }],
  },
  { timestamps: true }
);

// Pre-save hook to generate unique identifiers
adminSchema.pre('save', async function(next) {
  // If no vendorId exists, generate one
  if (!this.vendorId) {
    this.vendorId = `VENDOR-${uuidv4().split('-')[0].toUpperCase()}`;
  }

  // If no adminId exists, use _id
  if (!this.adminId) {
    this.adminId = this._id.toString();
  }

  next();
});

module.exports = mongoose.model("admin", adminSchema);