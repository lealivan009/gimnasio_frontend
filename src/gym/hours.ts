import { DAY_LABELS, type OpeningHour } from "../api/gym";

export interface HourGroup {
  label: string;
  value: string;
  closed: boolean;
}

export interface DayHoursDraft {
  dayOfWeek: number;
  shifts: { opensAt: string; closesAt: string }[];
}

export function weekdayIndex(date = new Date()) {
  return date.getDay() === 0 ? 7 : date.getDay();
}

export function groupOpeningHours(hours: OpeningHour[]): HourGroup[] {
  const byDay = new Map<number, OpeningHour[]>();
  for (let day = 1; day <= 7; day += 1) {
    byDay.set(day, []);
  }
  for (const hour of hours) {
    byDay.get(hour.dayOfWeek)?.push(hour);
  }
  for (const shifts of byDay.values()) {
    shifts.sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  }

  const groups: { days: number[]; shifts: OpeningHour[] }[] = [];
  for (let day = 1; day <= 7; day += 1) {
    const shifts = byDay.get(day) ?? [];
    const previous = groups[groups.length - 1];
    const same =
      previous &&
      previous.days[previous.days.length - 1] === day - 1 &&
      signature(previous.shifts) === signature(shifts);
    if (same && previous) {
      previous.days.push(day);
    } else {
      groups.push({ days: [day], shifts });
    }
  }

  return groups.map((group) => ({
    label: dayRangeLabel(group.days),
    value: group.shifts.length === 0 ? "Cerrado" : group.shifts.map(shiftText).join("  ·  "),
    closed: group.shifts.length === 0,
  }));
}

export function isOpenNow(hours: OpeningHour[], now = new Date()) {
  const day = weekdayIndex(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return hours.some((hour) => {
    if (hour.dayOfWeek !== day) {
      return false;
    }
    return minutes >= minutesOf(hour.opensAt) && minutes < minutesOf(hour.closesAt);
  });
}

export function todayHoursText(hours: OpeningHour[], now = new Date()) {
  const day = weekdayIndex(now);
  const shifts = hours
    .filter((hour) => hour.dayOfWeek === day)
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  const dayName = DAY_LABELS[day]?.toLowerCase() ?? "hoy";
  if (shifts.length === 0) {
    return `Hoy, ${dayName}, está cerrado.`;
  }
  return `Hoy, ${dayName}, de ${shifts.map(shiftText).join(" y ")}.`;
}

export function draftFromHours(hours: OpeningHour[] | undefined): DayHoursDraft[] {
  const source = hours ?? [];
  if (source.length === 0) {
    return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      shifts:
        dayOfWeek <= 5
          ? [{ opensAt: "07:00", closesAt: "23:00" }]
          : dayOfWeek === 6
            ? [
                { opensAt: "09:00", closesAt: "13:00" },
                { opensAt: "16:00", closesAt: "21:00" },
              ]
            : [],
    }));
  }
  return [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
    dayOfWeek,
    shifts: source
      .filter((hour) => hour.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
      .map((hour) => ({ opensAt: hour.opensAt.slice(0, 5), closesAt: hour.closesAt.slice(0, 5) })),
  }));
}

export function draftsToHours(days: DayHoursDraft[]): OpeningHour[] {
  return days.flatMap((day) =>
    day.shifts
      .filter((shift) => shift.opensAt && shift.closesAt)
      .map((shift) => ({
        dayOfWeek: day.dayOfWeek,
        opensAt: shift.opensAt,
        closesAt: shift.closesAt,
      })),
  );
}

function signature(shifts: OpeningHour[]) {
  return shifts.map((shift) => `${shift.opensAt}-${shift.closesAt}`).join("|");
}

function shiftText(shift: OpeningHour) {
  return `${shift.opensAt.slice(0, 5)} a ${shift.closesAt.slice(0, 5)}`;
}

function dayRangeLabel(days: number[]) {
  if (days.length === 1) {
    return DAY_LABELS[days[0]];
  }
  if (days.length === 2) {
    return `${DAY_LABELS[days[0]]} y ${DAY_LABELS[days[1]].toLowerCase()}`;
  }
  return `${DAY_LABELS[days[0]]} a ${DAY_LABELS[days[days.length - 1]].toLowerCase()}`;
}

function minutesOf(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}
