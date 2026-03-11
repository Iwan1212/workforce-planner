import { create } from "zustand";
import {
  startOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";

import { ALL_TEAMS } from "@/lib/constants";

export type ViewMode = "monthly" | "weekly";

export interface UtilizationFilter {
  dateFrom: string | null; // "yyyy-MM-dd"
  dateTo: string | null;
  minPct: number | null;
  maxPct: number | null;
}

interface TimelineState {
  viewMode: ViewMode;
  startDate: Date;
  selectedTeams: string[];
  searchQuery: string;
  utilizationFilter: UtilizationFilter | null;
  setViewMode: (mode: ViewMode) => void;
  setStartDate: (date: Date) => void;
  setSelectedTeams: (teams: string[]) => void;
  setSearchQuery: (query: string) => void;
  setUtilizationFilter: (filter: UtilizationFilter | null) => void;
  scrollForward: () => void;
  scrollBack: () => void;
  goToToday: () => void;
}

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

export { ALL_TEAMS } from "@/lib/constants";
