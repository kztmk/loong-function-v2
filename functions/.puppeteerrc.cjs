const { join } = require('path');

/**
 * @type {import('puppeteer').PuppeteerConfig}
 */
module.exports = {
  cacheDirectory: join(__dirname, 'cache', 'puppeteer'),
};
