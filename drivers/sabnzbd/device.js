'use strict';

const Homey = require('homey');
const SabnzbdApi = require('../../lib/SabnzbdApi');

class SabnzbdDevice extends Homey.Device {

  async onInit() {
    this._api = new SabnzbdApi(this.getSettings());
    this._prevStatus = null;
    this._prevQueueCount = null;
    this._seenHistoryIds = null; // null = first poll, skip triggering

    this.registerCapabilityListener('onoff', async (value) => {
      if (value) {
        await this._api.resume();
      } else {
        await this._api.pause();
      }
    });

    this._startPolling();
    this.log(`${this.getName()} initialized`);
  }

  _startPolling(intervalSeconds) {
    const secs = intervalSeconds ?? this.getSetting('poll_interval') ?? 10;
    this._pollTimer = this.homey.setInterval(() => this._poll(), secs * 1000);
    this._poll(); // immediate first poll
  }

  _stopPolling() {
    if (this._pollTimer) {
      this.homey.clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  async _poll() {
    try {
      const [queueResult, historyResult] = await Promise.all([
        this._api.getQueue(),
        this._api.getHistory(20),
      ]);

      const { queue } = queueResult;
      const speedMbps = parseFloat(queue.kbpersec || 0) / 1024;
      const queueSizeMb = parseFloat(queue.mbleft || 0);
      const queueCount = parseInt(queue.noofslots || 0, 10);
      const status = this._parseStatus(queue, queueCount);

      await Promise.all([
        this.setCapabilityValue('measure_download_speed', parseFloat(speedMbps.toFixed(2))),
        this.setCapabilityValue('sabnzbd_status', status),
        this.setCapabilityValue('measure_queue_size', Math.round(queueSizeMb)),
        this.setCapabilityValue('measure_queue_count', queueCount),
        this.setCapabilityValue('onoff', !queue.paused),
      ]);

      await this._handleStatusEvents(status, queueCount);
      await this._handleHistory(historyResult.history?.slots ?? []);

      this._prevStatus = status;
      this._prevQueueCount = queueCount;

      if (!this.getAvailable()) await this.setAvailable();
    } catch (err) {
      this.error('Poll failed:', err.message);
      await this.setUnavailable(err.message);
    }
  }

  _parseStatus(queue, queueCount) {
    if (queue.paused) return 'paused';
    const s = (queue.status || '').toLowerCase();
    if (s === 'downloading' || s === 'fetching') return 'downloading';
    if (queueCount > 0) return 'downloading';
    return 'idle';
  }

  async _handleStatusEvents(status, queueCount) {
    if (this._prevStatus === null) return; // skip first poll

    if (this._prevStatus !== status) {
      this.driver.triggerStatusChanged(this, { status }).catch(this.error.bind(this));
    }

    if (this._prevStatus === 'downloading' && status === 'idle' && queueCount === 0) {
      this.driver.triggerQueueEmpty(this).catch(this.error.bind(this));
    }
  }

  async _handleHistory(slots) {
    if (this._seenHistoryIds === null) {
      this._seenHistoryIds = new Set(slots.map(s => s.nzo_id));
      return;
    }

    for (const slot of slots) {
      if (!this._seenHistoryIds.has(slot.nzo_id) && slot.status === 'Completed') {
        this.driver.triggerDownloadComplete(this, { name: slot.name }).catch(this.error.bind(this));
      }
    }

    this._seenHistoryIds = new Set(slots.map(s => s.nzo_id));
  }

  async onSettings({ newSettings }) {
    this._stopPolling();
    this._api = new SabnzbdApi(newSettings);
    this._startPolling(newSettings.poll_interval);
  }

  onDeleted() {
    this._stopPolling();
  }

  // ── Flow action targets ───────────────────────────────────────────────────

  async cmdPause() {
    await this._api.pause();
    await this.setCapabilityValue('onoff', false);
    await this.setCapabilityValue('sabnzbd_status', 'paused');
  }

  async cmdResume() {
    await this._api.resume();
    await this.setCapabilityValue('onoff', true);
  }

  async cmdSetSpeedLimit(mbps) {
    await this._api.setSpeedLimit(mbps);
  }

  async cmdAddNzbUrl(url) {
    await this._api.addUrl(url);
  }

}

module.exports = SabnzbdDevice;
