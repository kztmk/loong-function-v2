import chromium from '@sparticuz/chromium';
import { error, log } from 'firebase-functions/logger';
import puppeteer, { Cookie } from 'puppeteer-core';
import { bucket, db } from '../../../index';
import { getXtrends } from './getXtrends';
import { loginByEmailAndPassword } from './xLogin';

/**
 * Retrieves cookies for the specified account name from Firestore.
 * @param {string} accountName - The name of the account.
 * @return {Promise<Cookie[]>} A promise that resolves to an array of cookies.
 */
async function getCookies(accountName: string): Promise<Cookie[]> {
  log('accountName:', accountName);
  const docRef = db.collection('cookies').doc(accountName);

  const docSnapshot = await docRef.get();

  if (docSnapshot.exists) {
    // subcollectionの取得
    log('snapshot exists');
    const cookiesData = docSnapshot.get('cookies');
    if (!cookiesData) {
      log('No cookies found for account: ', accountName);
    } else {
      log(cookiesData.length, 'cookies found for account: ', accountName);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cookies = cookiesData.map((data: any) => {
      return {
        name: data.name,
        value: data.value,
        domain: data.domain,
        path: data.path,
        expires: data.expires,
        size: data.size,
        httpOnly: data.httpOnly,
        secure: data.secure,
        session: data.session,
        sameSite: data.sameSite,
      } as Cookie;
    });
    return cookies;
  } else {
    log('snapshot not exists');
    return [];
  }
}

/**
 * Saves the specified cookies to Firestore.
 * @param {string} accountName - The name of the account.
 * @param {Cookie[]} cookies - An array of cookies to save.
 */
async function saveCookies(
  accountName: string,
  cookies: Cookie[],
): Promise<void> {
  log(
    `[saveCookies] Starting for account: ${accountName}. Cookies count: ${cookies.length}`,
  );
  try {
    // Firestoreに保存する前に、各CookieオブジェクトからpartitionKeyプロパティを処理する
    // partitionKeyがundefinedの場合、または単に除外したい場合は、プロパティごと削除する
    const cookiesToSave = cookies.map((cookie) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { partitionKey, ...restOfCookie } = cookie; // partitionKey を除外
      return restOfCookie;
    });
    // Save the cookies to Firestore
    await db
      .collection('cookies')
      .doc(accountName)
      .set({ cookies: cookiesToSave });
    log(`[saveCookies] Successfully saved cookies for account: ${accountName}`);
  } catch (e) {
    error(`[saveCookies] Error saving cookies for account ${accountName}:`, e);
    // Firestoreへの保存エラーがPuppeteerのクラッシュに繋がることは考えにくいが、
    // エラーをスローして crawlX の catch ブロックで処理させる
    throw e;
  }
}

/**
 * Crawls the X website.
 * @param {string} email - The email address to use for logging in.
 * @param {string} password - The password to use for logging in.
 * @param {string} accountName - The name of the account.
 * @return {Promise<JSON>} A promise that resolves to the X trends.
 */
export async function crawlX(
  email: string,
  password: string,
  accountName: string,
) {
  let updateCookie: Cookie[] = [];

  log('Start the crawler');
  //
  let xTrends = '';
  const browser = await puppeteer.launch({
    headless: true, // Cloud Functions 環境では true にする必要があります
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--lang=ja-JP,ja',
      '--disable-dev-shm-usage', // メモリが少ない環境で有効な場合がある
    ],
    // Cloud Functions 環境にプリインストールされている Chromium を指定
    executablePath: await chromium.executablePath(),
    // dumpio: true, // ブラウザのstdout/stderrをNode.jsのプロセスにパイプする
  });
  // new page and go to X homepage
  const page = await browser.newPage();

  // // ページイベントのリスナーを設定
  // page.on('console', (msg) => log(`BROWSER LOG: ${msg.type()}: ${msg.text()}`));
  // page.on('pageerror', (error) => log(`BROWSER PAGE ERROR: ${error.message}`));
  // page.on('response', (response) =>
  //   log(`BROWSER RESPONSE: ${response.status()} ${response.url()}`),
  // );
  // page.on('requestfailed', (request) =>
  //   log(
  //     `BROWSER REQUEST FAILED: ${request.failure()?.errorText} ${request.url()}`,
  //   ),
  // );

  try {
    // Retrieve the cookie from Firestore
    let cookies = await getCookies(accountName);
    // Check if cookies array is empty
    if (cookies.length === 0) {
      log('No cookies found for account: ', accountName);
      cookies = [];
    } else {
      // Set the retrieved cookie in Puppeteer
      await browser.setCookie(...cookies);
      log('--------  set cookies');
    }

    await page.goto('https://x.com/home');

    // check login status
    // if not login, redirect to login page
    let firstPage = '';
    const promiseLogined = page
      .waitForSelector('a[href="/home"]', { timeout: 10000 })
      .then(
        () => {
          log('--------  home Timeline found');
          return 'logined';
        },
        () => {
          if (firstPage.length === 0) {
            log('-error-  home Timeline not found');
          }
          return 'error_logined';
        },
      );
    // not login
    const promiseNeedLogin = page
      .waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
      .then(
        () => {
          log('--------  need login');
          return 'need_logined';
        },
        () => {
          if (firstPage.length === 0) {
            log('--------  already logined');
          }
          return 'error_need_logined';
        },
      );

    await Promise.race([promiseLogined, promiseNeedLogin]).then((result) => {
      firstPage = result;
    });

    let loginStatus = false;
    if (firstPage === 'logined' || firstPage === 'error_need_logined') {
      loginStatus = true;
    }

    if (!loginStatus) {
      loginStatus = await loginByEmailAndPassword(
        page,
        email,
        password,
        accountName,
      );
    }

    if (!loginStatus) {
      error('Failed to login');
      return '';
    }
    const loginCookies = await browser.cookies();
    await saveCookies(accountName, loginCookies);
    log('--------  saved login cookies');

    // Perform login and other actions
    xTrends = await getXtrends(page);
    log('--------  got trends');
    log('--------  update cookie');
    updateCookie = await browser.cookies();
    await saveCookies(accountName, updateCookie);
    log('--------  saved update cookies');
    return xTrends;
  } catch (e) {
    error('Error in crawlX:', e);
    // Take screenshot on error
    if (page && browser.connected) {
      try {
        log('-------- take screenshot on error and save to storage');
        const screenShotBase64 = await page.screenshot({ encoding: 'base64' });
        const file = bucket.file(
          `puppeteer_screenshots/crawler_error_${Date.now()}.png`,
        );
        await file.save(screenShotBase64, { contentType: 'image/png' });
        log('--------  saved error screenshot');
      } catch (screenshotError) {
        error('Error taking or saving screenshot:', screenshotError);
      }
    }
    return xTrends;
  } finally {
    // Close the page and save the cookie to Firestore
    await browser.close();
    log('End the crawler');
  }
}
