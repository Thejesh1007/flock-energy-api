
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const config = require('./config');

function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/*
 * The portal timestamp is documented as DD/MM/YYYY HH:mm.
 *
 * We interpret a timestamp without a timezone as UTC for deterministic
 * output across machines. Verify this assumption against the portal's
 * displayed timezone before relying on it for billing or reporting.
 */
function toIsoTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const input = value.trim();

  // Support an already-normalized ISO timestamp.
  if (/^\d{4}-\d{2}-\d{2}T/.test(input)) {
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime())
      ? null
      : parsed.toISOString();
  }

  const match = input.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, dayText, monthText, yearText, hourText, minuteText, secondText] =
    match;

  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText || 0);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const timestamp = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second)
  );

  // Date.UTC normalizes impossible dates, so verify the components.
  if (
    timestamp.getUTCFullYear() !== year ||
    timestamp.getUTCMonth() !== month - 1 ||
    timestamp.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp.toISOString();
}

class UrjaClient {
  constructor() {
    this.jar = new CookieJar();

    this.http = wrapper(
      axios.create({
        baseURL: config.portalBaseUrl,
        jar: this.jar,
        withCredentials: true,
        timeout: config.portalTimeoutMs,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
          Origin: config.portalBaseUrl,
          Referer: `${config.portalBaseUrl}/login`,
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
            'AppleWebKit/537.36 (KHTML, like Gecko) ' +
            'Chrome/126.0.0.0 Safari/537.36',
          Accept: 'application/json'
        }
      })
    );

    this.loggedIn = false;
    this.loginPromise = null;
  }

  async login() {
    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = this.performLogin();

    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  async performLogin() {
    if (!config.portalUsername || !config.portalPassword) {
      const error = new Error(
        'Portal credentials are missing. Configure ' +
        'PORTAL_USERNAME and PORTAL_PASSWORD in .env.'
      );
      error.status = 503;
      throw error;
    }

    let response;

    try {
      response = await this.http.post(
        '/login',
        new URLSearchParams({
          email: config.portalUsername,
          password: config.portalPassword
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
    } catch (cause) {
      this.loggedIn = false;

      const error = new Error(
        `Unable to contact the portal during login: ${cause.message}`
      );
      error.status = 502;
      throw error;
    }

    const acceptedStatus = [200, 201, 204, 302, 303];

    if (!acceptedStatus.includes(response.status)) {
      this.loggedIn = false;

      const error = new Error(
        `Portal login failed with status ${response.status}`
      );
      error.status = 502;
      throw error;
    }

    const cookies = await this.jar.getCookies(config.portalBaseUrl);

    if (cookies.length === 0) {
      this.loggedIn = false;

      const error = new Error(
        'Portal login did not establish a session cookie. ' +
        'Verify the login flow against the live portal.'
      );
      error.status = 502;
      throw error;
    }

    this.loggedIn = true;
  }

  isAuthenticationFailure(response) {
    if ([401, 403].includes(response.status)) {
      return true;
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.location || '';
      return /\/login(?:[/?#]|$)/i.test(location);
    }

    return false;
  }

  async request(requestFn) {
    if (!this.loggedIn) {
      await this.login();
    }

    let response;

    try {
      response = await requestFn();
    } catch (cause) {
      const error = new Error(
        `Unable to contact the portal: ${cause.message}`
      );
      error.status = 502;
      throw error;
    }

    if (this.isAuthenticationFailure(response)) {
      this.loggedIn = false;
      await this.login();

      try {
        response = await requestFn();
      } catch (cause) {
        const error = new Error(
          `Portal request failed after reauthentication: ${cause.message}`
        );
        error.status = 502;
        throw error;
      }
    }

    if (this.isAuthenticationFailure(response)) {
      this.loggedIn = false;

      const error = new Error(
        'Portal authentication failed after retry.'
      );
      error.status = 502;
      throw error;
    }

    if (response.status >= 400 || response.status >= 300) {
      const error = new Error(
        `Portal request failed with status ${response.status}`
      );
      error.status = 502;
      throw error;
    }

    const contentType = response.headers['content-type'] || '';

    if (
      typeof response.data === 'string' &&
      contentType.includes('text/html')
    ) {
      const error = new Error(
        'Portal returned HTML instead of the expected API response.'
      );
      error.status = 502;
      throw error;
    }

    return response.data;
  }

  async searchMeters(query = '', page = 1) {
    if (!Number.isInteger(page) || page < 1) {
      const error = new Error('page must be a positive integer.');
      error.status = 400;
      throw error;
    }

    return this.request(() =>
      this.http.get('/portal/meters/search', {
        params: {
          q: String(query),
          page
        }
      })
    );
  }

  async getMeter(meterId) {
    const data = await this.searchMeters(meterId, 1);
    const meters = Array.isArray(data?.data) ? data.data : [];

    const meter = meters.find(
      (item) => String(item.meterId) === String(meterId)
    );

    if (!meter) {
      const error = new Error(`Meter ${meterId} not found.`);
      error.status = 404;
      throw error;
    }

    return meter;
  }

  async getMeterConsumption(meterId) {
    const safeId = encodeURIComponent(meterId);

    const raw = await this.request(() =>
      this.http.get(`/portal/meters/${safeId}/energy`)
    );

    if (!Array.isArray(raw?.data)) {
      const error = new Error(
        'Portal returned an unexpected consumption response.'
      );
      error.status = 502;
      throw error;
    }

    return raw.data.map((entry) => ({
      timestamp: toIsoTimestamp(entry.timestamp),
      kwh: toNumber(entry.kwh),
      kvah: toNumber(entry.kvah),
      voltageR: toNumber(entry.voltR)
    }));
  }

  async listTransformers(page = 1) {
    if (!Number.isInteger(page) || page < 1) {
      const error = new Error('page must be a positive integer.');
      error.status = 400;
      throw error;
    }

    return this.request(() =>
      this.http.get('/portal/dts', {
        params: { page }
      })
    );
  }
}

module.exports = new UrjaClient();
module.exports.UrjaClient = UrjaClient;
module.exports.toNumber = toNumber;
module.exports.toIsoTimestamp = toIsoTimestamp;
