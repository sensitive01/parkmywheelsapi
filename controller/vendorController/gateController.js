const Gate = require("../../models/gateSchema.js");

// Auto open the gate: sets gatestatus = true for the first/only gate
const openGate = async (req, res) => {
  try {
    let gate = await Gate.findOne();

    // If no gate found, create and open one
    if (!gate) {
      gate = new Gate({ gatestatus: true });
      await gate.save();

      return res.status(201).send("open");
    }

    // If gate exists, just open it
    gate.gatestatus = true;
    await gate.save();

    res.status(200).send("open");
  } catch (error) {
    console.error("Gate open error:", error);
    res.status(500).send("Internal server error");
  }
};

const closeGate = async (req, res) => {
  try {
    let gate = await Gate.findOne();

    // If no gate exists, create one and set it as closed
    if (!gate) {
      gate = new Gate({ gatestatus: false });
      await gate.save();

      return res.status(201).json({
        message: "Gate document created and gate closed successfully",
        gatestatus: gate.gatestatus,
      });
    }

    // If gate exists, just close it
    gate.gatestatus = false;
    await gate.save();

     res.status(200).send("close");
  } catch (error) {
    console.error("Gate close error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
module.exports = { openGate,closeGate  };
