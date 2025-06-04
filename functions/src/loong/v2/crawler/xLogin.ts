import { error, log } from 'firebase-functions/logger';
import { Page } from 'puppeteer';
import { bucket, comfirmCode } from '../../../index';
import { findLoginButton, findNextButton } from './utils';
/**
 * Logs in using email and password.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} email - The email address.
 * @param {string} password - The password.
 * @param {string} accountName - The account name.
 * @return {Promise<boolean>} - A promise that resolves
 *to true if login is successful, false otherwise.
 */
export async function loginByEmailAndPassword(
  page: Page,
  email: string,
  password: string,
  accountName: string,
) {
  try {
    const inputIdField = 'input[autocomplete="username"]';
    await page.waitForSelector(inputIdField);
    log('--------  Found email field, typing email...');

    await page.type(inputIdField, email, { delay: 120 });
    log('--------  typed email');
    // find next button and click
    let nextButton = await findNextButton(page);
    if (!nextButton) {
      error('-error-  failed to find next button');
      throw new Error('failed to find next button');
    }

    await nextButton.click();
    log('--------  clicked next button');

    // check suspects unusual activity
    // It's better to wait for a specific element that indicates this state,
    // rather than just checking h1 immediately after a click.
    // For now, we'll try to find the password field or the suspect prompt.
    const suspectTitleSelector = 'h1 span'; // Example: More specific selector for title text
    const suspectAccountNameInputSelector = 'input[name="text"]'; // Example: Specific selector for username/phone input

    const isPasswordPage = await page
      .waitForSelector('input[autocomplete="current-password"]', {
        timeout: 5000,
      })
      .then(() => true)
      .catch(() => false);

    if (!isPasswordPage) {
      log(
        '--------  Password field not immediately found, checking for unusual activity prompt...',
      );
      const suspectTitleElement = await page.$(suspectTitleSelector);
      if (suspectTitleElement) {
        const suspectText = await suspectTitleElement.evaluate((el) =>
          el.textContent?.trim(),
        );
        log(`--------  Found potential suspect title: ${suspectText}`);
        if (
          suspectText === 'Enter your phone number or username' ||
          suspectText === '電話番号またはユーザー名を入力'
        ) {
          log(
            '--------  Unusual activity detected, attempting to enter account name.',
          );
          try {
            await page.waitForSelector(suspectAccountNameInputSelector, {
              timeout: 5000,
            });
            await page.type(suspectAccountNameInputSelector, accountName, {
              delay: 120,
            });
            log('--------  Typed account name for unusual activity prompt.');
            nextButton = await findNextButton(page);
            if (!nextButton) {
              error(
                '-error-  Failed to find next button after account name input for unusual activity',
              );
              return false;
            }
            await nextButton.click();
            log(
              '--------  Clicked next button after account name input for unusual activity.',
            );
          } catch (err) {
            error(
              '--------  Failed to handle unusual activity prompt (account name input):',
              err,
            );
            // Consider taking a screenshot here
            return false;
          }
        }
      }
    }
    // find password field
    const inputPasswordField = 'input[autocomplete="current-password"]';
    await page.waitForSelector(inputPasswordField);
    log('--------  Found password field, typing password...');
    await page.type(inputPasswordField, password, { delay: 120 });
    log('--------  typed password');
    // find login button and click
    const loginButton = await findLoginButton(page);
    if (!loginButton) {
      error('-error-  failed to find login button');
      return false;
    }

    await loginButton.click();
    log('--------  clicked login button');
    // check successfuly login?
    try {
      await page.waitForSelector("a[href='/explore']", { timeout: 4000 });
    } catch (e) {
      try {
        // request comfirmation code
        log('--------  request comfirmation code');
        const confirmInput = await page.waitForSelector(
          'input[data-testid="ocfEnterTextTextInput"]',
        );
        log('--------  found confirm input');
        if (confirmInput) {
          log('--------  type comfirmation code');
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          await confirmInput.type(comfirmCode!, { delay: 120 });
          const nextButton = await findNextButton(page);
          if (nextButton) {
            log('--------  found next button');
            await nextButton.click();
            return true;
          }
        }
        return false;
      } catch (e) {
        log('--------  failed to find comfirmation code input');
        log('-------- take screenshot and save to storage');
        const screenShotBase64 = await page.screenshot({ encoding: 'base64' });
        const file = bucket.file(
          `puppeteer_screenshots/crawler_${Date.now()}.png`,
        );
        log('--------  created file');
        await file.save(screenShotBase64, { contentType: 'image/png' });
        log('--------  saved file');
        log('--------  failed to find explore link');
        return false;
      }
    }
    return true;
  } catch (error) {
    log(`-error- ${error}`);
    return false;
  }
}
