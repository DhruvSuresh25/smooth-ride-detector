import type { ReportStatus, Severity } from "@/lib/constants";

export type Report = {
  id: string;
  report_number: string;
  user_id: string;
  submitter_name: string;
  submitter_email: string;
  original_image_url: string | null;
  annotated_image_url: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  pothole_count: number;
  severity: Severity;
  confidence: number | null;
  estimated_width: number | null;
  estimated_height: number | null;
  road_position: string | null;
  description: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  area_id: string | null;
  assigned_admin_id: string | null;
  deadline_at: string | null;
  citizen_rating: number | null;
  rated_at: string | null;
  citizen_comment: string | null;
  confirmed_fixed: boolean | null;
  repair_image_url: string | null;
};

export type StatusEvent = {
  id: string;
  report_id: string;
  status: string;
  note: string | null;
  changed_by: string | null;
  created_at: string;
};

