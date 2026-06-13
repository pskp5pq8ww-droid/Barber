const path = require("path");
const fs = require("fs");

function walletConfig({ rootDir, storageRoot }) {
  const walletStorageRoot = process.env.APPLE_WALLET_STORAGE_PATH
    || path.join(storageRoot, "wallet", "customers");
  const defaultCertDir = path.join(rootDir, "private", "wallet", "certs");

  return {
    rootDir,
    envPresence: {
      APPLE_WALLET_PASS_TYPE_ID: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_PASS_TYPE_ID"),
      APPLE_WALLET_TEAM_ID: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_TEAM_ID"),
      APPLE_WALLET_CERT_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_CERT_PATH"),
      APPLE_WALLET_KEY_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_KEY_PATH"),
      APPLE_WALLET_CERT_PASSWORD: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_CERT_PASSWORD"),
      APPLE_WALLET_WWDR_CERT_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_WWDR_CERT_PATH"),
      APPLE_WALLET_BASE_URL: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_BASE_URL"),
    },
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID || "",
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID || "",
    organizationName: process.env.APPLE_WALLET_ORG_NAME || "Urban Kings",
    certPath: process.env.APPLE_WALLET_CERT_PATH || "",
    keyPath: process.env.APPLE_WALLET_KEY_PATH || path.join(defaultCertDir, "apple-wallet-pass.key"),
    certPassword: process.env.APPLE_WALLET_CERT_PASSWORD || "",
    wwdrCertPath: process.env.APPLE_WALLET_WWDR_CERT_PATH || "",
    storagePath: walletStorageRoot,
    baseUrl: process.env.APPLE_WALLET_BASE_URL || "",
    businessLocation: process.env.APPLE_WALLET_BUSINESS_LOCATION || "Level 1 / 123 Charlotte St, Brisbane City",
    adminWalletKey: process.env.ADMIN_WALLET_KEY || "",
    assetsPath: path.join(rootDir, "src", "assets", "wallet", "urban-kings"),
    rewardGoal: 5,
    rewardText: "Free Haircut After 5 Visits",
  };
}

function missingSigningConfig(config) {
  const missing = [];
  if (!config.passTypeIdentifier) missing.push("APPLE_WALLET_PASS_TYPE_ID");
  if (!config.teamIdentifier) missing.push("APPLE_WALLET_TEAM_ID");
  if (!config.certPath) missing.push("APPLE_WALLET_CERT_PATH");
  if (!config.keyPath) missing.push("APPLE_WALLET_KEY_PATH");
  if (!config.wwdrCertPath) missing.push("APPLE_WALLET_WWDR_CERT_PATH");
  if (!config.baseUrl) missing.push("APPLE_WALLET_BASE_URL");
  return missing;
}

function looksLikeBase64(value) {
  const clean = String(value || "").trim();
  if (!clean || clean.includes("/") || clean.includes("\\") || clean.includes("-----BEGIN")) return false;
  if (clean.length < 80 || clean.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(clean);
}

function resolveSecretSource(value, rootDir) {
  const raw = String(value || "").trim();
  if (!raw) return { configured: false, sourceType: "missing", exists: false, readable: false, resolvedPath: "" };
  if (raw.includes("-----BEGIN")) {
    return { configured: true, sourceType: "inline-pem", exists: true, readable: true, content: Buffer.from(raw) };
  }
  if (looksLikeBase64(raw)) {
    try {
      return { configured: true, sourceType: "base64", exists: true, readable: true, content: Buffer.from(raw, "base64") };
    } catch (_) {
      return { configured: true, sourceType: "base64", exists: false, readable: false };
    }
  }

  const resolvedPath = path.isAbsolute(raw) ? raw : path.join(rootDir, raw);
  const status = { configured: true, sourceType: "path", exists: false, readable: false, resolvedPath };
  try {
    fs.accessSync(resolvedPath, fs.constants.F_OK);
    status.exists = true;
  } catch (_) {
    return status;
  }
  try {
    fs.accessSync(resolvedPath, fs.constants.R_OK);
    status.readable = true;
  } catch (_) {}
  return status;
}

function signingDiagnostics(config, rootDir) {
  const passCertificate = resolveSecretSource(config.certPath, rootDir);
  const privateKey = resolveSecretSource(config.keyPath, rootDir);
  const wwdrCertificate = resolveSecretSource(config.wwdrCertPath, rootDir);
  return {
    variables: {
      APPLE_WALLET_PASS_TYPE_ID: Boolean(config.envPresence.APPLE_WALLET_PASS_TYPE_ID),
      APPLE_WALLET_TEAM_ID: Boolean(config.envPresence.APPLE_WALLET_TEAM_ID),
      APPLE_WALLET_CERT_PATH: Boolean(config.envPresence.APPLE_WALLET_CERT_PATH),
      APPLE_WALLET_KEY_PATH: Boolean(config.envPresence.APPLE_WALLET_KEY_PATH),
      APPLE_WALLET_CERT_PASSWORD: Boolean(config.envPresence.APPLE_WALLET_CERT_PASSWORD),
      APPLE_WALLET_WWDR_CERT_PATH: Boolean(config.envPresence.APPLE_WALLET_WWDR_CERT_PATH),
      APPLE_WALLET_BASE_URL: Boolean(config.envPresence.APPLE_WALLET_BASE_URL),
    },
    certificates: {
      passCertificate: {
        configured: passCertificate.configured,
        sourceType: passCertificate.sourceType,
        certificateExists: passCertificate.exists,
        readable: passCertificate.readable,
      },
      privateKey: {
        configured: privateKey.configured,
        sourceType: privateKey.sourceType,
        keyExists: privateKey.exists,
        readable: privateKey.readable,
      },
      wwdrCertificate: {
        configured: wwdrCertificate.configured,
        sourceType: wwdrCertificate.sourceType,
        certificateExists: wwdrCertificate.exists,
        readable: wwdrCertificate.readable,
      },
    },
  };
}

async function readSecretSource(value, rootDir, label = "signing source") {
  const status = resolveSecretSource(value, rootDir);
  if (!status.configured) {
    const err = new Error(`Apple Wallet ${label} is not configured.`);
    err.code = "WALLET_SIGNING_SOURCE_MISSING";
    err.sourceLabel = label;
    throw err;
  }
  if (status.content) return status.content;
  if (!status.resolvedPath || !status.readable) {
    const err = new Error(`Apple Wallet ${label} is not readable.`);
    err.code = "WALLET_SIGNING_SOURCE_UNREADABLE";
    err.sourceLabel = label;
    err.sourceType = status.sourceType;
    err.exists = status.exists;
    err.readable = status.readable;
    throw err;
  }
  return fs.promises.readFile(status.resolvedPath);
}

module.exports = { walletConfig, missingSigningConfig, readSecretSource, signingDiagnostics };
