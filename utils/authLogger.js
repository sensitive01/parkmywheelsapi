const UAParser = require("ua-parser-js");
const AuthLog = require("../models/authLogSchema");

/**
 * Automatically maps standard OS names from ua-parser to AuthLog OS enum
 */
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

/**
 * Maps standard device types to AuthLog device enum
 */
const mapDeviceToEnum = (deviceType, isMobileOS) => {
  if (deviceType === "mobile") return "PHONE";
  if (deviceType === "tablet") return "TABLET";
  // If undefined but OS is Android/iOS, default to phone
  if (!deviceType && isMobileOS) return "PHONE";
  if (!deviceType) return "DESKTOP"; // Standard browsers on PCs return undefined device type
  return "UNKNOWN";
};

/**
 * Creates an authentication audit log entry.
 * Designed to never throw errors that could disrupt the main auth flow.
 *
 * @param {Object} params
 * @param {Object} params.req - Express request object (used to extract IP and User-Agent)
 * @param {Object} params.user - User object containing _id, name, email
 * @param {String} params.userType - 'ADMIN', 'VENDOR', 'USER', 'ACCOUNTANT'
 * @param {String} params.action - 'LOGIN', 'LOGIN_FAILED', 'LOGOUT', etc.
 * @param {String} params.status - 'SUCCESS' or 'FAILED'
 * @param {String} [params.reason] - Reason for failure (optional)
 * @param {String} [params.customUserAgent] - Optional override for User-Agent
 * @param {Object} [params.metadata] - Any extra data to log
 */
const createAuthLog = async ({
  req,
  user,
  userType,
  action,
  status,
  reason = "",
  customUserAgent = "",
  metadata = {},
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
      if (!osName) osName = "Android"; // Default to Android for native app requests that lack OS info
    }

    const osType = mapOsToEnum(osName);
    const isMobileOS = osType === "ANDROID" || osType === "IOS";
    const deviceType = mapDeviceToEnum(parsedDeviceType, isMobileOS);

    let accessType = "WEB";
    if (userAgentString.toLowerCase().includes("okhttp") || userAgentString.toLowerCase().includes("dart")) {
      // Basic heuristics for native app requests if they don't use standard browser UAs
      accessType = osType === "IOS" ? "IOS_APP" : "ANDROID_APP";
    }

    const logData = {
      userId: user?._id || user?.id || "UNKNOWN",
      name: user?.name || user?.personName || user?.vendorName || user?.adminName || "UNKNOWN",
      email: user?.email || user?.emailid || user?.mobile || (user?.contacts && user.contacts.length > 0 ? user.contacts[0].mobile : null) || user?.contacts?.mobile || "UNKNOWN",
      userType: userType || "UNKNOWN",
      action,
      status,
      accessType,
      osType,
      deviceType,
      browser: result.browser.name || "UNKNOWN",
      browserVersion: result.browser.version || "",
      deviceName: result.device.model || result.device.vendor || "",
      userAgent: userAgentString,
      ipAddress,
      location: "", // Can be filled via a GeoIP service if needed in the future
      sessionId: req?.sessionID || "",
      reason,
      metadata,
    };

    await AuthLog.create(logData);
  } catch (error) {
    // We catch and log the error to the console, but DO NOT rethrow it.
    // We never want audit logging failures to prevent users from logging in.
    console.error("🔥 Failed to create Authentication Audit Log:", error.message);
  }
};

module.exports = {
  createAuthLog,
};
