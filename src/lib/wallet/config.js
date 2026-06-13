const path = require("path");
const fs = require("fs");

const { WALLET_CODES, WALLET_STAGES, WalletConfigurationError } = require("./errors");

// Characters that are never valid inside a filesystem path but are invisible in
// a hosting control panel: ASCII control chars, zero-width spaces, BOM, NBSP.
// Built with explicit code points so the source stays plain ASCII.
const HIDDEN_PATH_CHARS = new RegExp(
  "[\\u0000-\\u001f\\u007f\\u00a0\\u200b\\u200c\\u200d\\ufeff]",
  "g",
);

/**
 * Clean an environment-provided path value.
 *
 * Hostinger panels frequently introduce trailing spaces, accidental wrapping
 * quotes, or a stray carriage return when a value is pasted. Those are a very
 * common cause of "file not found" that looks like a permission problem, so we
 * surface exactly what was cleaned. Ordinary interior spaces are preserved
 * (the deploy path itself contains a space, e.g. ".../King barber/...").
 */
function normalizeConfiguredPath(rawValue) {
  const raw = rawValue == null ? "" : String(rawValue);
  const hadSurroundingWhitespace = raw !== raw.trim();
  const hadHiddenChars = new RegExp(HIDDEN_PATH_CHARS.source).test(raw);

  let value = raw.trim();
  let hadSurroundingQuotes = false;
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      value = value.slice(1, -1).trim();
      hadSurroundingQuotes = true;
    }
  }
  // Remove only control / zero-width characters; keep ordinary spaces.
  value = value.replace(HIDDEN_PATH_CHARS, "");

  return {
    configured: value.length > 0,
    raw,
    value,
    isAbsolute: value.length > 0 && path.isAbsolute(value),
    hadSurroundingQuotes,
    hadSurroundingWhitespace,
    hadHiddenChars,
  };
}

function walletConfig({ rootDir, storageRoot }) {
  const walletStorageRoot = process.env.APPLE_WALLET_STORAGE_PATH
    || path.join(storageRoot, "wallet", "customers");
  const defaultCertDir = path.join(rootDir, "private", "wallet", "certs");

  return {
    rootDir,
    storageRoot,
    logsPath: process.env.APPLE_WALLET_LOG_PATH
      || path.join(storageRoot, "logs", "apple-wallet"),
    envPresence: {
      APPLE_WALLET_PASS_TYPE_ID: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_PASS_TYPE_ID"),
      APPLE_WALLET_TEAM_ID: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_TEAM_ID"),
      APPLE_WALLET_CERT_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_CERT_PATH"),
      APPLE_WALLET_KEY_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_KEY_PATH"),
      APPLE_WALLET_CERT_PASSWORD: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_CERT_PASSWORD"),
      APPLE_WALLET_WWDR_CERT_PATH: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_WWDR_CERT_PATH"),
      APPLE_WALLET_BASE_URL: Object.prototype.hasOwnProperty.call(process.env, "APPLE_WALLET_BASE_URL"),
    },
    passTypeIdentifier: (process.env.APPLE_WALLET_PASS_TYPE_ID || "").trim(),
    teamIdentifier: (process.env.APPLE_WALLET_TEAM_ID || "").trim(),
    organizationName: process.env.APPLE_WALLET_ORG_NAME || "Urban Kings",
    certPath: process.env.APPLE_WALLET_CERT_PATH || "",
    keyPath: process.env.APPLE_WALLET_KEY_PATH || path.join(defaultCertDir, "apple-wallet-pass.key"),
    certPassword: process.env.APPLE_WALLET_CERT_PASSWORD || "",
    wwdrCertPath: process.env.APPLE_WALLET_WWDR_CERT_PATH || "",
    storagePath: walletStorageRoot,
    baseUrl: (process.env.APPLE_WALLET_BASE_URL || "").trim(),
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
  const normalized = normalizeConfiguredPath(value);
  const raw = normalized.value;
  if (!normalized.configured) {
    return { configured: false, sourceType: "missing", exists: false, readable: false, empty: false, resolvedPath: "", normalized };
  }
  if (raw.includes("-----BEGIN")) {
    return { configured: true, sourceType: "inline-pem", exists: true, readable: true, empty: false, content: Buffer.from(String(value)), normalized };
  }
  if (looksLikeBase64(raw)) {
    try {
      return { configured: true, sourceType: "base64", exists: true, readable: true, empty: false, content: Buffer.from(raw, "base64"), normalized };
    } catch (_) {
      return { configured: true, sourceType: "base64", exists: false, readable: false, empty: false, normalized };
    }
  }

  const resolvedPath = normalized.isAbsolute ? raw : path.join(rootDir, raw);
  const status = { configured: true, sourceType: "path", exists: false, readable: false, empty: false, resolvedPath, normalized };
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
  if (status.readable) {
    try {
      status.empty = fs.statSync(resolvedPath).size === 0;
    } catch (_) {}
  }
  return status;
}

// Maps each signing source to its specific error codes + pipeline stage so the
// generic "is not readable" message is never the only thing we report.
const SECRET_SOURCE_CODES = {
  wwdr: {
    stage: WALLET_STAGES.READ_WWDR,
    notConfigured: WALLET_CODES.WWDR_ENV_NOT_CONFIGURED,
    notFound: WALLET_CODES.WWDR_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.WWDR_FILE_NOT_READABLE,
    empty: WALLET_CODES.WWDR_FILE_EMPTY,
  },
  passCert: {
    stage: WALLET_STAGES.READ_PASS_CERT,
    notConfigured: WALLET_CODES.PASS_CERT_ENV_NOT_CONFIGURED,
    notFound: WALLET_CODES.PASS_CERT_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.PASS_CERT_FILE_NOT_READABLE,
    empty: WALLET_CODES.PASS_CERT_FILE_EMPTY,
  },
  privateKey: {
    stage: WALLET_STAGES.READ_PRIVATE_KEY,
    notConfigured: WALLET_CODES.PRIVATE_KEY_ENV_NOT_CONFIGURED,
    notFound: WALLET_CODES.PRIVATE_KEY_FILE_NOT_FOUND,
    notReadable: WALLET_CODES.PRIVATE_KEY_FILE_NOT_READABLE,
    empty: WALLET_CODES.PRIVATE_KEY_FILE_EMPTY,
  },
};

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

/**
 * Read a signing source (WWDR cert, pass cert, private key) into a Buffer,
 * throwing a WalletConfigurationError with a *specific* code so the caller can
 * tell "not configured" vs "not found" vs "not readable" vs "empty" apart.
 *
 * @param {"wwdr"|"passCert"|"privateKey"} kind
 */
async function readSecretSource(value, rootDir, kind = "wwdr", label = "") {
  const codes = SECRET_SOURCE_CODES[kind] || SECRET_SOURCE_CODES.wwdr;
  const safeLabel = label || kind;
  const status = resolveSecretSource(value, rootDir);
  const basePath = status.resolvedPath || "";

  if (!status.configured) {
    throw new WalletConfigurationError(codes.notConfigured, {
      stage: codes.stage,
      safeDetails: { source: safeLabel },
    });
  }
  if (status.content) return status.content;
  if (!status.resolvedPath) {
    throw new WalletConfigurationError(codes.notConfigured, {
      stage: codes.stage,
      safeDetails: { source: safeLabel },
    });
  }
  if (!status.exists) {
    throw new WalletConfigurationError(codes.notFound, {
      stage: codes.stage,
      safeDetails: { source: safeLabel, path: basePath },
    });
  }
  if (!status.readable) {
    throw new WalletConfigurationError(codes.notReadable, {
      stage: codes.stage,
      safeDetails: { source: safeLabel, path: basePath },
    });
  }
  if (status.empty) {
    throw new WalletConfigurationError(codes.empty, {
      stage: codes.stage,
      safeDetails: { source: safeLabel, path: basePath },
    });
  }
  try {
    return await fs.promises.readFile(status.resolvedPath);
  } catch (cause) {
    const code = cause && cause.code === "ENOENT" ? codes.notFound : codes.notReadable;
    throw new WalletConfigurationError(code, {
      stage: codes.stage,
      safeDetails: { source: safeLabel, path: basePath },
      cause,
    });
  }
}

module.exports = {
  walletConfig,
  missingSigningConfig,
  readSecretSource,
  resolveSecretSource,
  signingDiagnostics,
  normalizeConfiguredPath,
};
