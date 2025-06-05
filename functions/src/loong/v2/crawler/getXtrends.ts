import { error, log } from 'firebase-functions/logger';
import { Page } from 'puppeteer-core';
import {
  checkPageLanguageRobust,
  convertTojson,
  type PageLanguage,
} from './utils';

/**
 * Retrieves the Xtrends data from the specified page.
 *
 * @param {Page} page - The Puppeteer page object.
 * @return {Promise<string>} A promise that resolves to
 *a string representing the Xtrends data.
 */
export async function getXtrends(page: Page): Promise<string> {
  let pageLanguage: PageLanguage = 'japanese'; // Default to English
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
      { timeout: 10000 },
    );
    if (!trendingLink) {
      error('Failed to find trending link');
      throw new Error('Failed to find trending link');
    }

    pageLanguage = await checkPageLanguageRobust(page, trendingLink);
    log(
      `[Debug] Page language detected: ${pageLanguage} (type: ${typeof pageLanguage})`,
    );
  } catch (e) {
    error(`Error occurred while checking page language:`, e);
    // Consider taking a screenshot here for debugging if needed
    return '';
  }

  const searchTarget =
    pageLanguage === 'japanese'
      ? 'div[aria-label="タイムライン: 話題を検索"]'
      : 'div[aria-label="Timeline: Explore"]';
  log(`[Debug] searchTarget set to: ${searchTarget}`);

  // The logic now proceeds only if foundTitleLang was 'japanese' or 'english'
  // await targetPage.waitForNavigation({ waitUntil: 'domcontentloaded' });
  // log("h2 title found"); // Already logged above
  log(
    '[Debug] Attempting to find TimelineElement with page.$(searchTarget)...',
  );
  const timelineElement = await page.$(searchTarget);

  if (timelineElement) {
    log(
      `Timeline element found using selector: ${searchTarget} (${pageLanguage})`,
    );

    // Wait for the element's innerText to be non-empty
    log(
      '[Debug] Attempting to wait for timeline element innerText to be populated...',
    );
    try {
      await page.waitForFunction(
        (selector: string) => {
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
      // Consider taking a screenshot here for debugging
      // if (page && page.screenshot) {
      //   try {
      //     await page.screenshot({ path: `error_screenshot_getXtrends_innerText_timeout_${Date.now()}.png` });
      //     log('[Debug] Screenshot taken on innerText timeout.');
      //   } catch (screenshotError) {
      //     error('[Debug] Failed to take screenshot on innerText timeout:', screenshotError);
      //   }
      // }
      return ''; // テキストが取得できなければ空文字を返す
    }

    log(
      '[Debug] Attempting to evaluate timeline element innerText with page.$eval...',
    );
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
    // Consider taking a screenshot here for debugging
    // if (page && page.screenshot) {
    //   try {
    //     await page.screenshot({ path: `error_screenshot_getXtrends_timeline_not_found_${Date.now()}.png` });
    //     log('[Debug] Screenshot taken on timeline not found.');
    //   } catch (screenshotError) {
    //     error('[Debug] Failed to take screenshot on timeline not found:', screenshotError);
    //   }
    // }
    return ''; // タイムラインが見つからなければ空文字を返す
  }
}
