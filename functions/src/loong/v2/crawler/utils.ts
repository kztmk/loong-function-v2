import { error, log } from 'firebase-functions/logger';
import { ElementHandle, Page } from 'puppeteer';

/**
 * Sleeps for a specified amount of time.
 * @param {number} ms - The number of milliseconds to sleep (default: 1000).
 * @return {Promise<unknown>} A promise that resolves after
 *the specified time has elapsed.
 */
export function sleep(ms = 1000) {
  const random = Math.floor(Math.random() * 1000) + ms;
  return new Promise((resolve) => {
    setTimeout(resolve, random);
  });
}

interface TrendItem {
  rank: number;
  chart: string;
  keyword: string;
  posts?: number;
}

/**
 * Converts the given data to JSON format.
 * @param {string} data - The data to convert.
 * @return {TrendItem[]} An array of trend item objects representing the converted data.
 */
export function convertTojson(data: string): TrendItem[] {
  // テキストを行ごとに分割して不要な行（ピリオドのみの行）をフィルタリング
  const lines = data
    .trim()
    .split('\n')
    .filter((line) => line !== '·');
  log('trends split by lines');
  const jsonData: TrendItem[] = [];

  try {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^\d+$/)) {
        // Rankの行を見つけた場合
        const rank = parseInt(line, 10);
        const chart = lines[i + 1].trim().split(' · ')[0];
        const keyword = lines[i + 2].trim();

        // 次の行がpostsかどうかをチェック
        if (i + 3 < lines.length && lines[i + 3].includes('posts')) {
          const posts = parseInt(lines[i + 3].replace(/[^0-9]/g, ''), 10);
          jsonData.push({ rank, chart, keyword, posts });
          i += 3; // posts行を含めて4行進める
        } else {
          jsonData.push({ rank, chart, keyword });
          i += 2; // keyword行まで含めて3行進める
        }
      }
    }
  } catch (e) {
    error('-error-  generating trends json data');
    error(`error:${e}`);
  }

  return jsonData;
}

/**
 * Finds the next button on the page.
 * @param {Page} page - The Puppeteer page object.
 * @return {Promise<ElementHandle<Element> | null>} A promise
 *that resolves with the next button element handle, or null if not found.
 */
export async function findNextButton(page: Page) {
  let nextButton: ElementHandle<Element> | null = null;
  try {
    nextButton = await page.waitForSelector('span ::-p-text(次へ)', {
      timeout: 1000,
    });
  } catch (error) {
    log('--------  failed to find next button in Japanese');
  }
  if (!nextButton) {
    try {
      nextButton = await page.waitForSelector('span ::-p-text(Next)', {
        timeout: 1000,
      });
    } catch (error) {
      log('--------  failed to find next button in English');
    }
  }

  return nextButton;
}

/**
 * Finds the Login button on the page.
 * @param {Page} page - The Puppeteer page object.
 * @return {Promise<ElementHandle<Element> | null>}
 *A promise that resolves with the next button element handle,
 *or null if not found.
 */
export async function findLoginButton(page: Page) {
  let loginButton: ElementHandle<Element> | null = null;
  try {
    loginButton = await page.waitForSelector('span ::-p-text(ログイン)', {
      timeout: 1000,
    });
  } catch (error) {
    log('--------  failed to find login button in Japanese');
  }
  if (!loginButton) {
    try {
      loginButton = await page.waitForSelector('span ::-p-text(Log in)', {
        timeout: 1000,
      });
    } catch (error) {
      log('--------  failed to find login button in English');
    }
  }

  return loginButton;
}
