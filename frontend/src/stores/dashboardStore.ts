import { create } from "zustand";
import { format } from "date-fns";
import type { DashboardState } from "@/types/dashboard";

/** "yyyy-MM" of the month a date falls in. */
export function monthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/**
 * Which month to select when the year changes: the current month while we are
 * on the current year, January otherwise, so the selection is always inside the
 * shown year.
 */
function defaultMonthForYear(year: number): string {
  const today = new Date();
  return year === today.getFullYear() ? monthKey(today) : `${year}-01`;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  year: new Date().getFullYear(),
  selectedMonth: monthKey(new Date()),
  selectedTeamIds: [],
  selectedTechnologyIds: [],

  setYear: (year) => set({ year, selectedMonth: defaultMonthForYear(year) }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedTeamIds: (ids) => set({ selectedTeamIds: ids }),
  setSelectedTechnologyIds: (ids) => set({ selectedTechnologyIds: ids }),

  stepYear: (delta) =>
    set((state) => {
      const year = state.year + delta;
      return { year, selectedMonth: defaultMonthForYear(year) };
    }),

  goToToday: () => {
    const today = new Date();
    set({ year: today.getFullYear(), selectedMonth: monthKey(today) });
  },
}));
