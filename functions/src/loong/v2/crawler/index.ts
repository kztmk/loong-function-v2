import * as admin from 'firebase-admin';
import { error, log } from 'firebase-functions/logger';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler';
import {
  db,
  xloginAccountName,
  xloginId,
  xloginPassword,
} from '../../../index';
import { crawlX } from './crawlX';

export const writeXtrends = onSchedule(
  {
    schedule: '0 4,8,12,16,20 * * *',
    timeZone: 'Asia/Tokyo',
    // Puppeteerを使用するため、メモリとタイムアウトの指定を推奨します
    // memory: '1GiB',
    // timeoutSeconds: 300, // 5分
  },
  async (event: ScheduledEvent): Promise<void> => {
    log(
      `Executing scheduled function writeXtrends, 
        triggered at: ${event.scheduleTime}`,
    );
    const xtrendsCollection = db.collection('XTrends');

    if (xloginId && xloginPassword && xloginAccountName) {
      const xtrends = await crawlX(xloginId, xloginPassword, xloginAccountName);
      const data = {
        xtrends,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        // Add new document
        await xtrendsCollection.add(data);
        log('Document written successfully!');

        // Get all documents ordered by timestamp
        const snapshot = await xtrendsCollection.orderBy('timestamp').get();

        // If there are more than 8 documents, delete the oldest one
        if (snapshot.size > 6) {
          const oldestDoc = snapshot.docs[0];
          await xtrendsCollection.doc(oldestDoc.id).delete();
          log('Oldest document deleted successfully!');
        }
      } catch (err) {
        error('Error writing document:', err);
      }
    } else {
      error('writeXtrends: Missing xlogin credentials. Skipping crawl.');
    }
    // Promise<void> の場合、明示的な return は不要 (return null も可)
  },
);

export const testWriteXtrends = onRequest(async (req, res) => {
  const xtrendsCollection = db.collection('XTrends');

  if (xloginId && xloginPassword && xloginAccountName) {
    const xtrends = await crawlX(xloginId, xloginPassword, xloginAccountName);
    const data = {
      xtrends,
    };

    try {
      // Add new document
      await xtrendsCollection.add(data);
      log('Document written successfully!');
      res.status(200).send('Document written successfully!');

      // // Get all documents ordered by timestamp
      // const snapshot = await xtrendsCollection.orderBy('timestamp').get();

      // // If there are more than 8 documents, delete the oldest one
      // if (snapshot.size > 8) {
      //   const oldestDoc = snapshot.docs[0];
      //   await xtrendsCollection.doc(oldestDoc.id).delete();
      //   log('Oldest document deleted successfully!');
      // }
    } catch (err) {
      error('Error writing document:', err);
      res.status(500).send('Error writing document:');
    }
  } else {
    res.status(400).send('Missing xlogin credentials');
  }
});
