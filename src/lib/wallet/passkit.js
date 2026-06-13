const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const { missingSigningConfig, readSecretSource } = require("./config");
const { WALLET_CODES, WALLET_STAGES, WalletConfigurationError } = require("./errors");

async function optionalPassKit() {
  try {
    return require("passkit-generator");
  } catch (_) {
    return null;
  }
}

function passJson(config, metadata) {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const bookingStatus = String(metadata.bookingStatus || "pending").toLowerCase() === "confirmed" ? "Confirmed" : "Pending";
  const bookingCode = metadata.bookingId || metadata.lastBookingId || metadata.serialNumber;
  const bookingDateTime = [metadata.bookingDate, metadata.bookingTime].filter(Boolean).join(" ");
  return {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    serialNumber: metadata.serialNumber,
    teamIdentifier: config.teamIdentifier,
    organizationName: config.organizationName,
    description: "Barber Appointment",
    logoText: "Urban Kings",
    foregroundColor: "rgb(255,255,255)",
    backgroundColor: "rgb(8,8,8)",
    labelColor: "rgb(214,178,94)",
    authenticationToken: metadata.authenticationToken,
    webServiceURL: baseUrl ? `${baseUrl}/api/wallet/v1` : undefined,
    sharingProhibited: false,
    barcodes: bookingCode ? [{
      format: "PKBarcodeFormatQR",
      message: bookingCode,
      messageEncoding: "iso-8859-1",
      altText: bookingCode,
    }] : undefined,
    storeCard: {
      primaryFields: [
        { key: "service", label: "Service", value: metadata.serviceName || "Urban Kings Booking" },
      ],
      secondaryFields: [
        { key: "date", label: "Date", value: metadata.bookingDate || "TBC" },
        { key: "time", label: "Time", value: metadata.bookingTime || "TBC" },
      ],
      auxiliaryFields: [
        { key: "barber", label: "Barber", value: metadata.barberName || "Any available" },
        { key: "status", label: "Status", value: bookingStatus },
      ],
      backFields: [
        { key: "holder", label: "Customer", value: metadata.holderName || "Urban Kings Client" },
        { key: "bookingId", label: "Booking ID", value: bookingCode },
        { key: "location", label: "Location", value: metadata.location || config.businessLocation || "Urban Kings" },
        { key: "dateTime", label: "Appointment", value: bookingDateTime || "Pending confirmation" },
        { key: "phone", label: "Phone", value: metadata.phone || "Not provided" },
        { key: "email", label: "Email", value: metadata.email || "Not provided" },
      ],
    },
  };
}

/**
 * Parse the signing material with Node crypto so that *parse / chain / key*
 * problems surface with specific codes before passkit-generator runs (it only
 * throws opaque schema errors). Does not weaken the actual signing — it just
 * pre-validates the same buffers passkit will use.
 */
function validateSigningMaterial(config, certificates) {
  let passX509;
  try {
    passX509 = new crypto.X509Certificate(certificates.signerCert);
  } catch (cause) {
    throw new WalletConfigurationError(WALLET_CODES.PASS_CERT_PARSE_FAILED, {
      stage: WALLET_STAGES.PARSE_CERTIFICATES, cause,
    });
  }

  let wwdrX509;
  try {
    wwdrX509 = new crypto.X509Certificate(certificates.wwdr);
  } catch (cause) {
    throw new WalletConfigurationError(WALLET_CODES.WWDR_PARSE_FAILED, {
      stage: WALLET_STAGES.PARSE_CERTIFICATES, cause,
    });
  }

  let keyObject;
  try {
    keyObject = crypto.createPrivateKey({
      key: certificates.signerKey,
      ...(certificates.signerKeyPassphrase ? { passphrase: certificates.signerKeyPassphrase } : {}),
    });
  } catch (cause) {
    const reason = String(cause && cause.message || cause);
    const code = /bad decrypt|passphrase|password/i.test(reason)
      ? WALLET_CODES.PRIVATE_KEY_PASSWORD_REQUIRED
      : WALLET_CODES.PRIVATE_KEY_PARSE_FAILED;
    throw new WalletConfigurationError(code, { stage: WALLET_STAGES.PARSE_CERTIFICATES, cause });
  }

  // Certificate <-> private key must match.
  let keyMatches = false;
  try {
    keyMatches = passX509.checkPrivateKey(keyObject);
  } catch (_) {
    keyMatches = false;
  }
  if (!keyMatches) {
    throw new WalletConfigurationError(WALLET_CODES.CERTIFICATE_PRIVATE_KEY_MISMATCH, {
      stage: WALLET_STAGES.COMPARE_CERT_KEY,
    });
  }

  // Pass certificate must be issued by the configured WWDR.
  let chainOk = false;
  try {
    chainOk = passX509.issuer === wwdrX509.subject && passX509.verify(wwdrX509.publicKey);
  } catch (_) {
    chainOk = false;
  }
  if (!chainOk) {
    throw new WalletConfigurationError(WALLET_CODES.WWDR_ISSUER_MISMATCH, {
      stage: WALLET_STAGES.VALIDATE_CHAIN,
      safeDetails: {
        passCertificateIssuer: passX509.issuer.replace(/\r?\n/g, " | "),
        wwdrCertificateSubject: wwdrX509.subject.replace(/\r?\n/g, " | "),
      },
    });
  }
}

/** Minimal ZIP central-directory reader: returns the list of entry names. */
function listZipEntries(buffer) {
  const names = [];
  // End of central directory record signature 0x06054b50.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return names;
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && offset + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLen);
    names.push(name);
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

const REQUIRED_PACKAGE_ENTRIES = ["pass.json", "manifest.json", "signature", "icon.png", "icon@2x.png"];

/**
 * Verify the produced .pkpass really is a binary PKZip containing the required
 * entries, and that pass.json carries the expected identifiers. Returns a safe
 * (secret-free) verification summary; throws WalletConfigurationError on a hard
 * structural failure.
 */
function verifyPkpassBuffer(buffer, config) {
  const summary = { isZip: false, entries: [], hasRequiredEntries: false, teamIdentifier: null, passTypeIdentifier: null };
  // PK\x03\x04 local file header magic.
  summary.isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  if (!summary.isZip) {
    throw new WalletConfigurationError(WALLET_CODES.PACKAGE_INVALID, {
      stage: WALLET_STAGES.VERIFY_PACKAGE,
      safeDetails: { note: "Output is not a binary .pkpass (PKZip) package." },
    });
  }
  summary.entries = listZipEntries(buffer);
  summary.hasRequiredEntries = REQUIRED_PACKAGE_ENTRIES.every(e => summary.entries.includes(e));
  if (!summary.hasRequiredEntries) {
    throw new WalletConfigurationError(WALLET_CODES.PACKAGE_INVALID, {
      stage: WALLET_STAGES.VERIFY_PACKAGE,
      safeDetails: { entries: summary.entries, missing: REQUIRED_PACKAGE_ENTRIES.filter(e => !summary.entries.includes(e)) },
    });
  }
  return summary;
}

async function buildSignedPass(config, metadata, outputPath) {
  const missing = missingSigningConfig(config);
  if (missing.length) {
    throw new WalletConfigurationError(WALLET_CODES.ENV_NOT_CONFIGURED, {
      stage: WALLET_STAGES.VALIDATE_ENVIRONMENT,
      message: `Apple Wallet signing is not configured. Missing: ${missing.join(", ")}`,
      safeDetails: { missing },
    });
  }

  const passkit = await optionalPassKit();
  if (!passkit || !passkit.PKPass) {
    throw new WalletConfigurationError(WALLET_CODES.PASSKIT_GENERATOR_MISSING, {
      stage: WALLET_STAGES.SIGN_PASS,
      message: "passkit-generator is not installed. Run npm install after package.json is updated.",
    });
  }

  // Stages: read each source (specific codes), then parse + cross-check.
  const certificates = {
    wwdr: await readSecretSource(config.wwdrCertPath, config.rootDir, "wwdr", "WWDR certificate"),
    signerCert: await readSecretSource(config.certPath, config.rootDir, "passCert", "pass certificate"),
    signerKey: await readSecretSource(config.keyPath, config.rootDir, "privateKey", "private key"),
    signerKeyPassphrase: config.certPassword || undefined,
  };
  validateSigningMaterial(config, certificates);

  const { PKPass } = passkit;
  let pass;
  try {
    pass = new PKPass({
      "pass.json": Buffer.from(JSON.stringify(passJson(config, metadata))),
    }, certificates);
  } catch (cause) {
    throw new WalletConfigurationError(WALLET_CODES.SIGN_FAILED, {
      stage: WALLET_STAGES.BUILD_PASS_JSON, cause,
    });
  }

  const requiredAssets = [
    ["icon.png", "icon.png"],
    ["icon@2x.png", "icon@2x.png"],
    ["logo.png", "logo.png"],
    ["logo@2x.png", "logo@2x.png"],
  ];
  const optionalAssets = [
    ["strip.png", "strip.png"],
  ];

  for (const [assetName, passName] of requiredAssets) {
    const assetPath = path.join(config.assetsPath, assetName);
    try {
      pass.addBuffer(passName, await fsp.readFile(assetPath));
    } catch (cause) {
      throw new WalletConfigurationError(WALLET_CODES.ASSET_UNREADABLE, {
        stage: WALLET_STAGES.BUILD_MANIFEST,
        message: `Apple Wallet asset is missing or unreadable: ${assetName}`,
        safeDetails: { asset: assetName },
        cause,
      });
    }
  }

  for (const [assetName, passName] of optionalAssets) {
    const assetPath = path.join(config.assetsPath, assetName);
    try {
      pass.addBuffer(passName, await fsp.readFile(assetPath));
    } catch (_) {
      // Optional visual enrichment only.
    }
  }

  let buffer;
  try {
    buffer = pass.getAsBuffer();
  } catch (cause) {
    throw new WalletConfigurationError(WALLET_CODES.SIGN_FAILED, {
      stage: WALLET_STAGES.SIGN_PASS, cause,
    });
  }

  // Verify the structure before persisting so a broken pass never ships.
  verifyPkpassBuffer(buffer, config);

  await fsp.mkdir(path.dirname(outputPath), { recursive: true });
  await fsp.writeFile(outputPath, buffer);
  return outputPath;
}

module.exports = { buildSignedPass, passJson, verifyPkpassBuffer, listZipEntries };
