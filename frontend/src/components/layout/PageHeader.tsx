import type { PageHeaderProps } from "@/types/layout";

export function PageHeader({ title, action, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex min-h-9 items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
