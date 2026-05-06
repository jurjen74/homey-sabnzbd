'use strict';

const Homey = require('homey');
const SabnzbdApi = require('../../lib/SabnzbdApi');

class SabnzbdDriver extends Homey.Driver {

  async onInit() {
    this._triggerQueueEmpty = this.homey.flow.getDeviceTriggerCard('queue_empty');
    this._triggerDownloadComplete = this.homey.flow.getDeviceTriggerCard('download_complete');
    this._triggerStatusChanged = this.homey.flow.getDeviceTriggerCard('status_changed');

    this.homey.flow.getConditionCard('is_paused')
      .registerRunListener(({ device }) => device.getCapabilityValue('sabnzbd_status') === 'paused');

    this.homey.flow.getConditionCard('is_downloading')
      .registerRunListener(({ device }) => device.getCapabilityValue('sabnzbd_status') === 'downloading');

    this.homey.flow.getConditionCard('speed_above')
      .registerRunListener(({ device, speed }) => device.getCapabilityValue('measure_download_speed') > speed);

    this.homey.flow.getConditionCard('speed_below')
      .registerRunListener(({ device, speed }) => device.getCapabilityValue('measure_download_speed') < speed);

    // args.size is in GB, capability is in MB
    this.homey.flow.getConditionCard('queue_size_above')
      .registerRunListener(({ device, size }) => device.getCapabilityValue('measure_queue_size') > size * 1024);

    this.homey.flow.getActionCard('pause')
      .registerRunListener(({ device }) => device.cmdPause());

    this.homey.flow.getActionCard('resume')
      .registerRunListener(({ device }) => device.cmdResume());

    this.homey.flow.getActionCard('set_speed_limit')
      .registerRunListener(({ device, speed }) => device.cmdSetSpeedLimit(speed));

    this.homey.flow.getActionCard('add_nzb_url')
      .registerRunListener(({ device, url }) => device.cmdAddNzbUrl(url));
  }

  triggerQueueEmpty(device) {
    return this._triggerQueueEmpty.trigger(device, {}, {});
  }

  triggerDownloadComplete(device, tokens) {
    return this._triggerDownloadComplete.trigger(device, tokens, {});
  }

  triggerStatusChanged(device, tokens) {
    return this._triggerStatusChanged.trigger(device, tokens, {});
  }

  async onPair(session) {
    let pairData = {};

    session.setHandler('test_connection', async ({ url, apiKey }) => {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const api = new SabnzbdApi({ url: cleanUrl, apikey: apiKey.trim() });
      const version = await api.testConnection(); // throws with user-readable message on failure
      pairData = { url: cleanUrl, apikey: apiKey.trim() };
      return { version };
    });

    session.setHandler('list_devices', () => {
      const { url, apikey } = pairData;
      return [
        {
          name: `SABnzbd (${url})`,
          data: { id: url },
          settings: { url, apikey, poll_interval: 10 },
        },
      ];
    });
  }

}

module.exports = SabnzbdDriver;
