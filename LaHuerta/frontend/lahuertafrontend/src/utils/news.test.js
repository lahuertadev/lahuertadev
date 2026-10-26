import { matchesNewsFilter } from './news';

const seenCurrent = { seen: true, is_current: true };
const unseenCurrent = { seen: false, is_current: true };
const seenExpired = { seen: true, is_current: false };
const unseenExpired = { seen: false, is_current: false };
const allNews = [seenCurrent, unseenCurrent, seenExpired, unseenExpired];

const filterNews = (filter) => allNews.filter((item) => matchesNewsFilter(item, filter));

describe('matchesNewsFilter', () => {
  test('todas: muestra vistas y no vistas, vigentes y vencidas', () => {
    expect(filterNews('all')).toEqual(allNews);
  });

  test('no vistas: solo las que el usuario no marcó como vistas', () => {
    expect(filterNews('unseen')).toEqual([unseenCurrent, unseenExpired]);
  });

  test('vigentes: solo las que están dentro de su vigencia', () => {
    expect(filterNews('current')).toEqual([seenCurrent, unseenCurrent]);
  });

  test('vencidas: solo las que ya pasaron su vigencia', () => {
    expect(filterNews('expired')).toEqual([seenExpired, unseenExpired]);
  });
});
