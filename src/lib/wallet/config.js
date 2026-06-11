const path = require("path");

function walletConfig({ rootDir, storageRoot }) {
  const walletStorageRoot = process.env.APPLE_WALLET_STORAGE_PATH
    || path.join(storageRoot, "wallet", "customers");

  return {
    passTypeIdentifier: process.env.APPLE_WALLET_PASS_TYPE_ID || "",
    teamIdentifier: process.env.APPLE_WALLET_TEAM_ID || "",
    organizationName: process.env.APPLE_WALLET_ORG_NAME || "Urban Kings Barber",
    certPath: process.env.APPLE_WALLET_CERT_PATH || "",
    certPassword: process.env.APPLE_WALLET_CERT_PASSWORD || "",
    wwdrCertPath: process.env.APPLE_WALLET_WWDR_CERT_PATH || "",
    storagePath: walletStorageRoot,
    baseUrl: process.env.APPLE_WALLET_BASE_URL || "",
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
  if (!config.certPassword) missing.push("APPLE_WALLET_CERT_PASSWORD");
  if (!config.wwdrCertPath) missing.push("APPLE_WALLET_WWDR_CERT_PATH");
  if (!config.baseUrl) missing.push("APPLE_WALLET_BASE_URL");
  return missing;
}

module.exports = { walletConfig, missingSigningConfig };
