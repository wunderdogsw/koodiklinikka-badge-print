const fs = require("fs");

function getOverrides() {
  if (fs.existsSync("./overrides.json")) {
    return require("./overrides.json");
  }

  return {};
}

module.exports = getOverrides();
