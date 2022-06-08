var walk = require("walkdir");

const pathes = walk.sync(__dirname);
const entries = pathes.reduce((v, path) => {
  if (path.endsWith(".js") && !path.endsWith("index.js")) {
    const base = path.slice(__dirname.length + 1, -3);
    v[base] = require(path);
  }
  return v;
}, {});
module.exports = entries;
