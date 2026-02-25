export function parseYMDToLocalDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getWeekDates(selectedYMD: string) {
  const selected = parseYMDToLocalDate(selectedYMD);
  const dayOfWeek = selected.getDay();
  const sunday = new Date(selected);
  sunday.setDate(selected.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(sunday);
    current.setDate(sunday.getDate() + index);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}

export function getFiveDates(selectedYMD: string) {
  const selected = parseYMDToLocalDate(selectedYMD);
  return Array.from({ length: 5 }, (_, index) => {
    const current = new Date(selected);
    current.setDate(selected.getDate() + (index - 2)); // -2, -1, 0, 1, 2
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, "0");
    const day = String(current.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
}

export function formatDateLabel(ymd: string) {
  const date = parseYMDToLocalDate(ymd);

  const today = new Date();
  const todayLocal = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const diffDays = Math.round(
    (date.getTime() - todayLocal.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "今天";
  if (diffDays === -1) return "昨天";
  if (diffDays === 1) return "明天";

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;
}
