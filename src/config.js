
require('dotenv').config();

function positiveInteger(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

const config = {
  port: positiveInteger(process.env.PORT, 4000),
  portalBaseUrl: (
    process.env.PORTAL_BASE_URL ||
    'https://urja-ops.flockenergy.tech'
  ).replace(/\/+$/, ''),
  portalUsername: process.env.PORTAL_USERNAME || '',
  portalPassword: process.env.PORTAL_PASSWORD || '',
  portalTimeoutMs: positiveInteger(
    process.env.PORTAL_TIMEOUT_MS,
    10000
  )
};

module.exports = config;
