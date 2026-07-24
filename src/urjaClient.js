const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const config = require('./config');

// This class is the ONLY part of our code that knows the legacy
// portal exists. Everything else (our API routes) talks to this
// class, not to the portal directly.
class UrjaClient {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      baseURL: config.portalBaseUrl,
      jar: this.jar,
      withCredentials: true,
      timeout: 10000,
      validateStatus: () => true, // we check status codes ourselves below
      headers: {
        // The portal appears to check these (common anti-CSRF measure) —
        // a real browser sends them automatically, a script doesn't.
        Origin: config.portalBaseUrl,
        Referer: `${config.portalBaseUrl}/login`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    }));
    this.loggedIn = false;
  }

  async login() {
    const response = await this.http.post(
      '/login',
      new URLSearchParams({
        email: config.portalUsername,
        password: config.portalPassword,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.status !== 200) {
      throw new Error(`Portal login failed with status ${response.status}`);
    }

    this.loggedIn = true;
  }

  async request(requestFn) {
    if (!this.loggedIn) {
      await this.login();
    }

    let response = await requestFn();

    if (response.status === 401 || response.status === 403) {
      await this.login();
      response = await requestFn();
    }

    if (response.status >= 400) {
      const err = new Error(`Portal request failed with status ${response.status}`);
      err.status = response.status;
      throw err;
    }

    return response.data;
  }

  async searchMeters(query = '', page = 1) {
    return this.request(() =>
      this.http.get('/portal/meters/search', { params: { q: query, page } })
    );
  }

  async getMeter(meterId) {
    const data = await this.searchMeters(meterId, 1);
    const meter = (data.data || []).find((m) => m.meterId === meterId);

    if (!meter) {
      const err = new Error(`Meter ${meterId} not found`);
      err.status = 404;
      throw err;
    }

    return meter;
  }

  async getMeterConsumption(meterId) {
    const raw = await this.request(() =>
      this.http.get(`/portal/meters/${meterId}/energy`)
    );

    return (raw.data || []).map((entry) => ({
      timestamp: toIsoTimestamp(entry.timestamp),
      kwh: toNumber(entry.kwh),
      kvah: toNumber(entry.kvah),
      voltageR: toNumber(entry.voltR),
    }));
  }

  async listTransformers(page = 1) {
    return this.request(() => this.http.get('/portal/dts', { params: { page } }));
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function toIsoTimestamp(value) {
  const [datePart, timePart] = value.split(' ');
  const [day, month, year] = datePart.split('/');
  return new Date(`${year}-${month}-${day}T${timePart}:00`).toISOString();
}

module.exports = new UrjaClient();