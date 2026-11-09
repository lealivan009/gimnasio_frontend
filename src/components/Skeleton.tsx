export function SkeletonLines({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-stack" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={`skeleton skeleton-line${index === count - 1 ? " short" : ""}`} />
      ))}
    </div>
  );
}

export function SkeletonCalendar() {
  return (
    <div className="skeleton-calendar" aria-hidden="true">
      {Array.from({ length: 35 }, (_, index) => (
        <span key={index} className="skeleton skeleton-cell" />
      ))}
    </div>
  );
}
