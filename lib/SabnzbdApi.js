'use strict';

class SabnzbdApi {

  constructor({ url, apikey }) {
    this._baseUrl = url.trim().replace(/\/$/, '');
    this.apikey = apikey;
    this._lib = this._baseUrl.startsWith('https://') ? require('https') : require('http');
  }

  _request(mode, extra = {}) {
    const params = { mode, apikey: this.apikey, output: 'json', ...extra };
    const qs = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');
    const fullUrl = `${this._baseUrl}/api?${qs}`;

    return new Promise((resolve, reject) => {
      const req = this._lib.get(fullUrl, { timeout: 8000 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.status === false) {
              reject(new Error(parsed.error || 'SABnzbd returned an error'));
            } else {
              resolve(parsed);
            }
          } catch {
            reject(new Error('Invalid response from SABnzbd'));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out'));
      });
    });
  }

  getQueue() {
    return this._request('queue');
  }

  getHistory(limit = 20) {
    return this._request('history', { limit });
  }

  async getVersion() {
    const result = await this._request('version');
    if (!result.version) throw new Error('Unexpected response — check URL and API key');
    return result.version;
  }

  pause() {
    return this._request('pause');
  }

  resume() {
    return this._request('resume');
  }

  // mbps = 0 removes the speed limit
  setSpeedLimit(mbps) {
    const kbps = mbps <= 0 ? 0 : Math.round(mbps * 1024);
    return this._request('config', { name: 'speedlimit', value: kbps });
  }

  addUrl(url) {
    return this._request('addurl', { name: url });
  }

  async testConnection() {
    return this.getVersion();
  }

}

module.exports = SabnzbdApi;
