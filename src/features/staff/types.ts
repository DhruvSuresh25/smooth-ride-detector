export type StaffRole = { isSuper: boolean; isAreaAdmin: boolean };

export type Area = { id: string; name: string };

export type Performance = {
  total: number;
  fixed: number;
  fixed_on_time: number;
  overdue: number;
  on_time_rate: number | null;
  avg_rating: number | null;
  rating_count: number;
};

export type Band = "Good" | "Average" | "Poor" | null;
