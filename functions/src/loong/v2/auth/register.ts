import * as admin from 'firebase-admin';
import { log } from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { sendMailRegisterUser } from '../../../helper';

// ユーザーから
// - 購入時のメールアドレス
// - アカウント作成時のメールアドレス
// - パスワード
// が送られ, それを元にユーザーが存在するかどうかを確認する。
// ユーザーが存在しない場合は, ユーザーを作成し, データベースに購入時のメールアドレスを保存する。
// ユーザーが存在する場合は, その旨を返す。

import { db } from '../../../index';

export const registerUser = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  // リクエストボディの存在を確認
  if (!req.body) {
    res.status(400).send('Request body is missing');
    return;
  }

  // パラメータの取得
  const { purchaseEmail, accountEmail, password } = req.body;

  // purchaseEmailの存在を確認
  if (!purchaseEmail) {
    res.status(400).send('購入者用メールアドレスは必須です。');
    return;
  }

  // accountEmailの存在を確認
  if (!accountEmail) {
    res.status(400).send('ID用メールアドレスは必須です。');
    return;
  }

  // passwordの存在を確認
  if (!password) {
    res.status(400).send('パスワードは必須です。');
    return;
  }

  const usersRef = db.collection('users');
  const snapshot = await usersRef
    .where('purchaseEmail', '==', purchaseEmail)
    .get();

  log('create user request', purchaseEmail);

  if (!snapshot.empty) {
    log('user exists');
    await sendMailRegisterUser(purchaseEmail, accountEmail, true);
    res
      .status(200)
      .send('購入者用メールアドレスでアカウントが作成されています。');
  } else {
    log('Create user: start');
    const userRecord = await admin.auth().createUser({
      email: accountEmail,
      password: password,
    });

    log('Successfully created new user:', userRecord.uid);
    // ユーザーが作成された後、データベースに購入時のメールアドレスを保存
    try {
      await usersRef.doc(userRecord.uid).set({
        purchaseEmail: purchaseEmail,
        userId: userRecord.uid,
        accountEmail: accountEmail,
        timeStamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      res.status(500).send('ID用メールアドレスのアカウントが既に存在します。');
    }

    log('Create user: end');
    await sendMailRegisterUser(purchaseEmail, accountEmail, false);
    res.status(200).send(`User created: ${userRecord.uid}`);
  }
});
