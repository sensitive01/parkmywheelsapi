const Report = require("../../../models/reportSchema");

const saveReport = async (req, res) => {
  try {
    const {
      vendorid,
      empid,
      fromdate_time,
      todate_time,
      entry,
      exit,
      "12hrsveh": veh12hrs,
      "24hrsveh": veh24hrs,
      "48hrsveh": veh48hrs,
      "72hrsveh": veh72hrs,
      "7daysveh": veh7days,
      "15daysveh": veh15days,
      "30daysveh": veh30days,
      "12hrsvehamt": amt12hrs,
      "24hrsvehamt": amt24hrs,
      "48hrsvehamt": amt48hrs,
      "72hrsvehamt": amt72hrs,
      "7daysvehamt": amt7days,
      "15daysvehamt": amt15days,
      "30daysvehamt": amt30days,
      totals,
      cash,
      online,
      hourlycount,
      hourlyamount,
      reportdate_time,
    } = req.body;

    if (!vendorid) {
      return res.status(400).json({ message: "vendorid is required" });
    }

    const report = new Report({
      vendorid,
      empid: empid || "",
      fromdate_time: fromdate_time || "",
      todate_time: todate_time || "",
      entry: entry || 0,
      exit: exit || 0,
      "12hrsveh": veh12hrs || 0,
      "24hrsveh": veh24hrs || 0,
      "48hrsveh": veh48hrs || 0,
      "72hrsveh": veh72hrs || 0,
      "7daysveh": veh7days || 0,
      "15daysveh": veh15days || 0,
      "30daysveh": veh30days || 0,
      "12hrsvehamt": amt12hrs || 0,
      "24hrsvehamt": amt24hrs || 0,
      "48hrsvehamt": amt48hrs || 0,
      "72hrsvehamt": amt72hrs || 0,
      "7daysvehamt": amt7days || 0,
      "15daysvehamt": amt15days || 0,
      "30daysvehamt": amt30days || 0,
      totals: totals || 0,
      cash: cash || 0,
      online: online || 0,
      hourlycount: hourlycount || 0,
      hourlyamount: hourlyamount || 0,
      reportdate_time: reportdate_time || "",
    });

    const saved = await report.save();
    return res.status(201).json({ message: "Report saved", reportid: saved._id });
  } catch (error) {
    console.error("saveReport error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

const getReportsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const reports = await Report.find({ vendorid: vendorId }).sort({ createdAt: -1 });
    return res.status(200).json({ reports });
  } catch (error) {
    console.error("getReportsByVendor error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

module.exports = { saveReport, getReportsByVendor };
