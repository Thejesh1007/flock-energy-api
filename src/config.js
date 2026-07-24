require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  portalBaseUrl: process.env.PORTAL_BASE_URL,
  portalUsername: process.env.PORTAL_USERNAME,
  portalPassword: process.env.PORTAL_PASSWORD,
};