import { error, log } from 'firebase-functions/logger';
import { Page } from 'puppeteer';
import { convertTojson } from './utils';

/**
 * Retrieves the Xtrends data from the specified page.
 *
 * @param {Page} page - The Puppeteer page object.
 * @return {Promise<string>} A promise that resolves to
 *a string representing the Xtrends data.
 */
export async function getXtrends(page: Page): Promise<string> {
  try {
    // find link to /explore
    log('Finding the explore link');
    const exploreLink = await page.waitForSelector('a[href="/explore"]');
    if (!exploreLink) {
      error('Failed to find explore link');
      throw new Error('Failed to find explore link');
    }

    // click the link
    exploreLink.click();
    log('Clicked the explore link');
    // wait for the page to load
    log('Waiting for trending link to appear');
    const trendingLink = await page.waitForSelector(
      'a[href="/explore/tabs/trending"]',
    );
    if (!trendingLink) {
      error('Failed to find trending link');
      throw new Error('Failed to find trending link');
    }

    trendingLink.click();
    log('Clicked the trending link');
    // wait for the page to load

    log('Waiting for H2 title (日本のトレンド or trends) to appear');
    let isJapanese = true;
    const h2TitleCheckTimeout = 15000; // 15 seconds timeout for finding the title

    try {
      const foundTitleLangHandle = await page.waitForFunction(
        () => {
          const h1Elements = Array.from(document.querySelectorAll('h1'));
          for (const h1 of h1Elements) {
            if (h1.innerText.includes('話題を検索')) {
              return 'japanese';
            }
            if (h1.innerText.includes('Explore')) {
              return 'english';
            }
          }
          return false; // Keep trying until timeout
        },
        { timeout: h2TitleCheckTimeout },
      );

      const foundTitleLang = await foundTitleLangHandle.jsonValue();
      if (foundTitleLang === 'japanese') {
        isJapanese = true;
        log("H1 title '話題を検索' found.");
      } else if (foundTitleLang === 'english') {
        isJapanese = false;
        log("H1 title 'Explore' found.");
      } else {
        // This case implies timeout or waitForFunction returned an unexpected truthy value
        error(
          `H1 title (話題を検索 or Explore) not found or unexpected result from waitForFunction (got: ${foundTitleLang}) within ${h2TitleCheckTimeout}ms.`,
        );
        return '';
      }
    } catch (e) {
      error(
        `Timeout or error waiting for H1 title (話題を検索 or Explore) after ${h2TitleCheckTimeout}ms:`,
        e,
      );
      // Consider taking a screenshot here for debugging if needed
      return '';
    }

    const searchTarget = isJapanese
      ? 'div[aria-label="タイムライン: 話題を検索"]'
      : 'div[aria-label="Timeline: Explore"]';

    // The logic now proceeds only if foundTitleLang was 'japanese' or 'english'
    // await targetPage.waitForNavigation({ waitUntil: 'domcontentloaded' });
    // log("h2 title found"); // Already logged above
    const TimelineElement = await page.$(searchTarget);
    if (TimelineElement) {
      log(
        `Timeline element found using selector: ${searchTarget} (${isJapanese ? 'Japanese' : 'English'})`,
      );

      // Wait for the element's innerText to be non-empty
      try {
        await page.waitForFunction(
          (selector) => {
            const el = document.querySelector(selector);
            // elがHTMLElementのインスタンスであり、innerTextプロパティを持つか確認
            // また、innerTextが空でないことを確認
            return el instanceof HTMLElement && el.innerText.trim() !== '';
          },
          { timeout: 10000 }, // 10秒待機（必要に応じて調整）
          searchTarget,
        );
        log('Timeline element innerText is now populated.');
      } catch (e) {
        error(
          'Timeout waiting for timeline element innerText to be populated:',
          e,
        );
        return ''; // テキストが取得できなければ空文字を返す
      }

      const elementText = await page.$eval(searchTarget, (el: Element) =>
        'innerText' in el ? el['innerText'] : '',
      );
      if (typeof elementText === 'string') {
        log(`elementText: ${elementText}`);
        const jsonDataStringity = JSON.stringify(convertTojson(elementText));
        return jsonDataStringity;
      } else {
        error('elementText is not string');
        return '';
      }
    } else {
      error('Timeline: Explore not found');
      return '';
    }
  } catch (err) {
    error('Error getting xtrends:', err);
    return '';
  }
}
