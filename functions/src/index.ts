import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import * as loong from './loong/services';

dotenv.config();

export const mailFrom = process.env.MAIL_FROM;
export const mailTo = process.env.MAIL_TO;
export const gmailUser = process.env.GMAIL_USER;
export const gmailPassword = process.env.GMAIL_PASSWORD;
export const xloginId = process.env.X_LOGIN_ID;
export const xloginPassword = process.env.X_LOGIN_PASSWORD;
export const xloginAccountName = process.env.X_LOGIN_ACCOUNT_NAME;
export const comfirmCode = process.env.COMFIRM_CODE;

admin.initializeApp();
export const db = admin.firestore();
export const bucket = admin.storage().bucket('crawler-screenshot');
export { loong };
