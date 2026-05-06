'use strict';

const Homey = require('homey');

module.exports = class SabnzbdApp extends Homey.App {

  async onInit() {
    this.log('SABnzbd app initialized');
  }

};
