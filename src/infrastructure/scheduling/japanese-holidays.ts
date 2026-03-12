// ============================================================
// Japanese Public Holidays
// REQ-006: 自動同期
// ============================================================

type HolidayDate = {
  year: number;
  month: number;
  day: number;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toDateKey(date: HolidayDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
  const firstDayWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const offset = (weekday - firstDayWeekday + 7) % 7;
  return 1 + offset + (nth - 1) * 7;
}

function getVernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function getAutumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function addHoliday(target: Set<string>, year: number, month: number, day: number): void {
  target.add(toDateKey({ year, month, day }));
}

function getBaseJapaneseHolidayKeys(year: number): Set<string> {
  const holidays = new Set<string>();

  addHoliday(holidays, year, 1, 1);
  addHoliday(holidays, year, 1, nthWeekdayOfMonth(year, 1, 1, 2));
  addHoliday(holidays, year, 2, 11);
  addHoliday(holidays, year, 2, 23);
  addHoliday(holidays, year, 3, getVernalEquinoxDay(year));
  addHoliday(holidays, year, 4, 29);
  addHoliday(holidays, year, 5, 3);
  addHoliday(holidays, year, 5, 4);
  addHoliday(holidays, year, 5, 5);
  addHoliday(holidays, year, 7, nthWeekdayOfMonth(year, 7, 1, 3));
  addHoliday(holidays, year, 8, 11);
  addHoliday(holidays, year, 9, nthWeekdayOfMonth(year, 9, 1, 3));
  addHoliday(holidays, year, 9, getAutumnalEquinoxDay(year));
  addHoliday(holidays, year, 10, nthWeekdayOfMonth(year, 10, 1, 2));
  addHoliday(holidays, year, 11, 3);
  addHoliday(holidays, year, 11, 23);

  return holidays;
}

function getObservedHolidayKeys(year: number, baseHolidays: Set<string>): Set<string> {
  const observed = new Set<string>();

  for (const key of baseHolidays) {
    const date = new Date(`${key}T00:00:00+09:00`);
    if (date.getDay() !== 0) {
      continue;
    }

    const substitute = new Date(date);
    do {
      substitute.setDate(substitute.getDate() + 1);
    } while (baseHolidays.has(toDateKey({
      year: substitute.getFullYear(),
      month: substitute.getMonth() + 1,
      day: substitute.getDate(),
    })) || observed.has(toDateKey({
      year: substitute.getFullYear(),
      month: substitute.getMonth() + 1,
      day: substitute.getDate(),
    })));

    observed.add(toDateKey({
      year: substitute.getFullYear(),
      month: substitute.getMonth() + 1,
      day: substitute.getDate(),
    }));
  }

  return observed;
}

function getCitizenHolidayKeys(year: number, holidays: Set<string>): Set<string> {
  const citizens = new Set<string>();

  for (let month = 1; month <= 12; month += 1) {
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 2; day < lastDay; day += 1) {
      const current = new Date(`${toDateKey({ year, month, day })}T00:00:00+09:00`);
      const weekday = current.getDay();
      if (weekday === 0 || weekday === 6) {
        continue;
      }

      const prevKey = toDateKey({ year, month, day: day - 1 });
      const currentKey = toDateKey({ year, month, day });
      const nextKey = toDateKey({ year, month, day: day + 1 });

      if (!holidays.has(currentKey) && holidays.has(prevKey) && holidays.has(nextKey)) {
        citizens.add(currentKey);
      }
    }
  }

  return citizens;
}

export function getJapaneseHolidayKeys(year: number): Set<string> {
  const base = getBaseJapaneseHolidayKeys(year);
  const observed = getObservedHolidayKeys(year, base);
  const withObserved = new Set<string>([...base, ...observed]);
  const citizens = getCitizenHolidayKeys(year, withObserved);
  return new Set<string>([...withObserved, ...citizens]);
}

export function isJapanesePublicHoliday(year: number, month: number, day: number): boolean {
  return getJapaneseHolidayKeys(year).has(toDateKey({ year, month, day }));
}