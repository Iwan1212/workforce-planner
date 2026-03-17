import { create } from "zustand";
import {
  startOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import type { ViewMode, TimelineState } from "@/types/timeline";

function snapToMode(date: Date, mode: ViewMode): Date {
  return mode === "weekly"
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date);
}

export const useTimelineStore = create<TimelineState>((set) => ({
  viewMode: "monthly",
  startDate: subMonths(startOfMonth(new Date()), 1),
  selectedTeams: [],
  searchQuery: "",

  setViewMode: (mode) =>
    set((state) => ({
      viewMode: mode,
      startDate: snapToMode(state.startDate, mode),
    })),
  setStartDate: (date) =>
    set((state) => ({ startDate: snapToMode(date, state.viewMode) })),
  setSelectedTeams: (teams) => set({ selectedTeams: teams }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  utilizationFilter: null,
  setUtilizationFilter: (filter) => set({ utilizationFilter: filter }),

  scrollForward: () =>
    set((state) => ({
      startDate:
        state.viewMode === "monthly"
          ? addMonths(state.startDate, 1)
          : addWeeks(state.startDate, 1),
    })),

  scrollBack: () =>
    set((state) => ({
      startDate:
        state.viewMode === "monthly"
          ? subMonths(state.startDate, 1)
          : subWeeks(state.startDate, 1),
    })),

  goToToday: () =>
    set((state) => ({ startDate: snapToMode(new Date(), state.viewMode) })),
}));
