export function createLocalDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function addDays(date: Date, amount: number) {
  return createLocalDate(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

export function addMonths(date: Date, amount: number) {
  return createLocalDate(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function parseMonthKey(monthKey: string) {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;

  return createLocalDate(year, monthIndex, 1);
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
}

export function parseDateKey(dateKey: string) {
  const [yearPart, monthPart, dayPart] = dateKey.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const day = Number(dayPart);

  return createLocalDate(year, monthIndex, day);
}

export function startOfMonthGrid(monthDate: Date) {
  const firstOfMonth = createLocalDate(monthDate.getFullYear(), monthDate.getMonth(), 1);
  return addDays(firstOfMonth, -firstOfMonth.getDay());
}

export function endOfMonthGrid(monthDate: Date) {
  const lastOfMonth = createLocalDate(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  return addDays(lastOfMonth, 6 - lastOfMonth.getDay());
}

export function getMonthGridBounds(monthDate: Date) {
  const start = startOfMonthGrid(monthDate);
  const end = addDays(endOfMonthGrid(monthDate), 1);

  return { start, end };
}
