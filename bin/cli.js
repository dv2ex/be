#!/usr/bin/env node
if (!process.env["NODE_CONFIG_DIR"]) {
  process.env["NODE_CONFIG_DIR"] = require("path").join(
    __dirname,
    "..",
    "config"
  );
}

const { start } = require(require("path").join(__dirname, ".."));

const rootdir = require("path").join(require("os").homedir(), ".dv2ex");
process.env.NODE_CONFIG = JSON.stringify({
  db: {
    dbPrefix: require("path").join(rootdir, "data/"),
  },
  ipfs: {
    repo: require("path").join(rootdir, "ipfs"),
  },
});
if (!require("fs").existsSync(require("config").get("db.dbPrefix"))) {
  require("fs").mkdirSync(require("config").get("db.dbPrefix"), {
    recursive: true,
  });
}
start();
