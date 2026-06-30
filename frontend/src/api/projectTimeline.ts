import type { ProjectTimelineData } from "@/types/project-timeline";

export async function fetchProjectTimeline(
  startDate: string,
  endDate: string,
  search?: string,
): Promise<ProjectTimelineData> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (search) params.set("search", search);

  const res = await fetch(`/api/projects/timeline?${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? "Błąd pobierania project timeline");
  }
  return res.json();
}
