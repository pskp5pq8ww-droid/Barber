const fsp = require("fs/promises");
const path = require("path");

const { missingSigningConfig } = require("./config");

async function optionalPassKit() {
  try {
    return require("passkit-generator");
  } catch (_) {
    return null;
  }
}

function passJson(config, metadata) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    serialNumber: metadata.serialNumber,
    teamIdentifier: config.teamIdentifier,
    organizationName: config.organizationName,
    description: "Urban Kings Membership",
    logoText: "Urban Kings",
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(8,8,8)",
    labelColor: "rgb(214,178,94)",
    authenticationToken: metadata.authenticationToken,
    webServiceURL: baseUrl ? `${baseUrl}/api/wallet/v1` : undefined,
    sharingProhibited: false,
    storeCard: {
      primaryFields: [
        { key: "holder", label: "Holder", value: metadata.holderName },
      ],
      secondaryFields: [
        { key: "membership", label: "Membership", value: metadata.membershipStatus },
        { key: "booking", label: "Booking", value: metadata.bookingStatus },
      ],
      auxiliaryFields: [
        { key: "visits", label: "Visits", value: `${metadata.visits} / ${metadata.visitsGoal}` },
        { key: "reward", label: "Reward", value: metadata.reward },
      ],
      backFields: [
        { key: "type", label: "Card Type", value: "Urban Kings Membership" },
        { key: "memberSince", label: "Member Since", value: metadata.createdAt.slice(0, 10) },
        { key: "phone", label: "Phone", value: metadata.phone || "Not provided" },
        { key: "email", label: "Email", value: metadata.email || "Not provided" },
      ],
    },
  };
}

async function buildSignedPass(config, metadata, outputPath) {
  const missing = missingSigningConfig(config);
  if (missing.length) {
    const err = new Error(`Apple Wallet signing is not configured. Missing: ${missing.join(", ")}`);
    err.code = "WALLET_SIGNING_NOT_CONFIGURED";
    err.missing = missing;
    throw err;
  }

  const passkit = await optionalPassKit();
  if (!passkit || !passkit.PKPass) {
    const err = new Error("passkit-generator is not installed. Run npm install after package.json is updated.");
    err.code = "PASSKIT_GENERATOR_MISSING";
    throw err;
  }

  const { PKPass } = passkit;
  const certificates = {
    wwdr: await fsp.readFile(config.wwdrCertPath),
    signerCert: await fsp.readFile(config.certPath),
    signerKeyPassphrase: config.certPassword,
  };

  const pass = new PKPass({}, certificates, passJson(config, metadata));
  const assets = [
    ["icon.png", "icon.png"],
    ["icon@2x.png", "icon@2x.png"],
    ["logo.png", "logo.png"],
    ["logo@2x.png", "logo@2x.png"],
    ["strip.png", "strip.png"],
  ];

  for (const [assetName, passName] of assets) {
    const assetPath = path.join(config.assetsPath, assetName);
    try {
      pass.addBuffer(passName, await fsp.readFile(assetPath));
    } catch (_) {
      // Assets are optional during scaffolding. A signed production pass should include them.
    }
  }

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, pass.getAsBuffer());
  return outputPath;
}

module.exports = { buildSignedPass, passJson };
