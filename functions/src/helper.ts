import { error, log } from 'firebase-functions/logger';
import * as nodemailer from 'nodemailer';
import { gmailPassword, gmailUser, mailFrom, mailTo } from './index';

export const sendMailRegisterUser = async (
  purchasedMail: string,
  userEmail: string,
  result: boolean,
): Promise<void> => {
  const msg = {
    to: mailTo,
    from: mailFrom,
    subject: 'ユーザーが作成されました',
    text: `ユーザー作成がありました。
      購入時のメールアドレス: ${purchasedMail}
      アカウントメールアドレス: ${userEmail}
      結果: ${result ? 'ユーザーが存在しました' : 'ユーザーが作成されました'}`,
  };

  log(gmailUser, gmailPassword);
  try {
    // SMTPトランスポーターの作成
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });
    // メールオプションの設定
    const mailOptions = {
      ...msg,
    };
    // メールの送信
    const info = await transporter.sendMail(mailOptions);
    log('Message sent: %s', info.messageId);
  } catch (err) {
    error('Error sending email: ', err);
  }
};

export const mainAppName = 'loong';
