const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

function safeSegment(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 96) || "unknown";
}

function walletDir(config, customerId) {
  return path.join(config.storagePath, safeSegment(customerId));
}

function walletPaths(config, customerId) {
  const dir = walletDir(config, customerId);
  return {
    dir,
    pass: path.join(dir, "pass.pkpass"),
    metadata: path.join(dir, "metadata.json"),
    history: path.join(dir, "wallet-history.json"),
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fsp.rename(tmp, filePath);
}

async function appendHistory(config, customerId, event) {
  const paths = walletPaths(config, customerId);
  const history = await readJson(paths.history, []);
  history.unshift({ ...event, createdAt: new Date().toISOString() });
  await writeJson(paths.history, history.slice(0, 200));
  return history;
}

async function passExists(config, customerId) {
  try {
    await fsp.access(walletPaths(config, customerId).pass, fs.constants.F_OK);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  appendHistory,
  passExists,
  readJson,
  safeSegment,
  walletPaths,
  writeJson,
};
