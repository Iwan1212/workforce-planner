import type { UtilizationBadgeProps } from "@/types/timeline";

export function UtilizationBadge({
  percentage,
  isOverbooked,
}: UtilizationBadgeProps) {
  let colorClasses: string;
  if (isOverbooked) {
    colorClasses = "bg-red-100 text-red-700 font-bold dark:bg-red-500/20 dark:text-red-400";
  } else if (percentage > 80) {
    colorClasses = "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400";
  } else {
    colorClasses = "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs ${colorClasses}`}
    >
      {percentage}%
    </span>
  );
}
