import type { OpeningHour } from "../api/gym";
import { groupOpeningHours } from "../gym/hours";

export function HoursBoard({ hours }: { hours: OpeningHour[] }) {
  const groups = groupOpeningHours(hours);
  return (
    <ul className="hours-board">
      {groups.map((group) => (
        <li key={group.label} className={group.closed ? "closed" : undefined}>
          <span>{group.label}</span>
          <strong>{group.value}</strong>
        </li>
      ))}
    </ul>
  );
}
