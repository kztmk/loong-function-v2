import * as auth from './v2/auth/index';
import * as crawler from './v2/crawler/index';

export const v2 = {
  auth: { ...auth },
  crawler: { ...crawler },
};
