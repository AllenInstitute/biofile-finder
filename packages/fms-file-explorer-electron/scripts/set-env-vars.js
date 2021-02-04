/**
 * Used in testing to populate any required environment variables. See .mocharc.js.
 */

// APPLICATION_VERSION (required by ApplicationInfoService)
const packageJson = require("../package.json");
process.env["APPLICATION_VERSION"] = packageJson.version;
