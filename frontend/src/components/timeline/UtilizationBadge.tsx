interface UtilizationBadgeProps {
  percentage: number;
  isOverbooked: boolean;
}

export function UtilizationBadge({
  percentage,
  isOverbooked,
}: UtilizationBadgeProps) {
  let colorClasses: string;
  if (isOverbooked) {
    colorClasses = "bg-red-100 text-red-700 font-bold";
  } else if (percentage > 80) {
    colorClasses = "bg-yellow-100 text-yellow-800";
  } else {
    colorClasses = "bg-green-100 text-green-700";
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs ${colorClasses}`}
    >
      {percentage}%
    </span>
  );
}
