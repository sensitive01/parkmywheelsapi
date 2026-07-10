const UAParser = require("ua-parser-js");
const ActivityLog = require("../models/activityLogSchema");

const mapOsToEnum = (osName) => {
  if (!osName) return "UNKNOWN";
  const lowerOs = osName.toLowerCase();
  if (lowerOs.includes("windows")) return "WINDOWS";
  if (lowerOs.includes("mac")) return "MACOS";
  if (lowerOs.includes("linux") || lowerOs.includes("ubuntu")) return "LINUX";
  if (lowerOs.includes("android")) return "ANDROID";
  if (lowerOs.includes("ios") || lowerOs.includes("iphone") || lowerOs.includes("ipad")) return "IOS";
  return "UNKNOWN";
};

const mapDeviceToEnum = (deviceType, isMobileOS) => {
  if (deviceType === "mobile") return "PHONE";
  if (deviceType === "tablet") return "TABLET";
  if (!deviceType && isMobileOS) return "PHONE";
  if (!deviceType) return "DESKTOP";
  return "UNKNOWN";
};

const logActivity = async ({
  req,
  actor,
  actorType,
  action,
  resourceType,
  resourceId = "",
  details = {},
  customUserAgent = "",
}) => {
  try {
    const userAgentString = customUserAgent || (req && req.body && req.body.userAgent ? req.body.userAgent : "") || (req && req.headers ? req.headers["user-agent"] : "");
    const ipAddress = req && (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "");

    const parser = new UAParser(userAgentString);
    const result = parser.getResult();

    let osName = result.os.name;
    let parsedDeviceType = result.device.type;

    if (userAgentString.toLowerCase().includes("dart") || userAgentString.toLowerCase().includes("okhttp")) {
      parsedDeviceType = "mobile";
      if (!osName) osName = "Android";
    }

    const osType = mapOsToEnum(osName);
    const isMobileOS = osType === "ANDROID" || osType === "IOS";
    const deviceType = mapDeviceToEnum(parsedDeviceType, isMobileOS);
    
    let accessType = "WEB";
    if (userAgentString.toLowerCase().includes("okhttp") || userAgentString.toLowerCase().includes("dart")) {
      accessType = osType === "IOS" ? "IOS_APP" : "ANDROID_APP";
    }

    const logData = {
      actorId: actor?._id || actor?.id || actor?.vendorId || "UNKNOWN",
      actorType: actorType || "UNKNOWN",
      action,
      resourceType,
      resourceId: resourceId ? resourceId.toString() : "",
      details,
      accessType,
      osType,
      deviceType,
      browser: result.browser.name || "UNKNOWN",
      browserVersion: result.browser.version || "",
      deviceName: result.device.model || result.device.vendor || "",
      userAgent: userAgentString,
      ipAddress,
    };

    await ActivityLog.create(logData);
  } catch (error) {
    console.error("Failed to create Activity Log:", error.message);
    try { require('fs').appendFileSync('C:\\Users\\Mr.Green\\Documents\\Office\\ParkmyWheels\\activity_error.log', new Date().toISOString() + ' - ' + error.stack + '\n'); } catch(e){}
  }
};

module.exports = {
  logActivity,
};

const fs = require('fs');
const appendLog = (msg) => { try { fs.appendFileSync('C:\\Users\\Mr.Green\\Documents\\Office\\ParkmyWheels\\activity_debug.txt', new Date().toISOString() + ' - ' + msg + '\\n'); } catch (e) {} };
