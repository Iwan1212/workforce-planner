import { create } from "zustand";
import {
  startOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import type { ViewMode } from "@/types/timeline";

interface ProjectTimelineState {
  viewMode: ViewMode;
  startDate: Date;
  searchQuery: string;
  setViewMode: (mode: ViewMode) => void;
  setStartDate: (date: Date) => void;
  setSearchQuery: (query: string) => void;
  scrollForward: () => void;
  scrollBack: () => void;
  goToToday: () => void;
}

function snapToMode(date: Date, mode: ViewMode): Date {
  return mode === "weekly"
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date);
}

export const useProjectTimelineStore = create<ProjectTimelineState>((set) => ({
  viewMode: "monthly",
  startDate: subMonths(startOfMonth(new Date()), 1),
  searchQuery: "",

  setViewMode: (mode) =>
    set((state) => ({
      viewMode: mode,
      startDate: snapToMode(state.startDate, mode),
    })),
  setStartDate: (date) =>
    set((state) => ({ startDate: snapToMode(date, state.viewMode) })),
  setSearchQuery: (query) => set({ searchQuery: query }),

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
