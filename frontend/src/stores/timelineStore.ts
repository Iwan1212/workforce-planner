import { create } from "zustand";
import {
  startOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";

export type ViewMode = "monthly" | "weekly";

interface TimelineState {
  viewMode: ViewMode;
  startDate: Date;
  selectedTeams: string[];
  searchQuery: string;
  setViewMode: (mode: ViewMode) => void;
  setStartDate: (date: Date) => void;
  setSelectedTeams: (teams: string[]) => void;
  setSearchQuery: (query: string) => void;
  scrollForward: () => void;
  scrollBack: () => void;
  goToToday: () => void;
}

const ALL_TEAMS = [
  "PM",
  "QA",
  "Frontend",
  "Backend",
  "Mobile",
  "UX_UI_Designer",
  "DevOps",
];

function snapToMode(date: Date, mode: ViewMode): Date {
  return mode === "weekly"
    ? startOfWeek(date, { weekStartsOn: 1 })
    : startOfMonth(date);
}

export const useTimelineStore = create<TimelineState>((set) => ({
  viewMode: "monthly",
  startDate: startOfMonth(new Date()),
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

export { ALL_TEAMS };
