export type Role = "creator" | "brand" | "admin";
export type AccountStatus = "active" | "suspended" | "banned";
export type Link = { label: string; url: string };
export type Metric = { label: string; value: string };

export type Profile = {
  id: string;
  created_at: string;
  role: Role;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  bio: string;
  location: string; // legacy one-line location
  city?: string | null;
  region?: string | null; // state or province
  country?: string | null;
  work_mode?: "remote" | "onsite" | "hybrid" | null;
  open_to_travel?: boolean;
  links: Link[];
  niches: string[];
  formats: string[];
  metrics: Metric[];
  vetted: boolean;
  vetted_drop?: string | null;
  status: AccountStatus;
  plan: "free" | "pro";
  company?: string | null;
  website?: string | null;
  job_title?: string | null;
  email?: string; // only ever filled for yourself or for admins
  sample?: boolean;
};

export type Video = {
  id: string;
  created_at: string;
  owner_id: string;
  stream_uid?: string | null;
  playback_url?: string | null; // HLS (Cloudflare Stream) or a direct file
  thumbnail_url?: string | null;
  duration?: number | null;
  caption: string;
  niches: string[];
  kind: "entry" | "post";
  status: "processing" | "ready" | "hidden" | "removed";
  like_count?: number;
  sample?: boolean;
};

export type WorkLink = { url: string; brand?: string; result?: string };

export type EntryStatus = "new" | "shortlisted" | "selected" | "declined";
export type Entry = {
  id: string;
  created_at: string;
  user_id: string;
  drop: string;
  country: string;
  city?: string;
  region?: string;
  work_mode?: "remote" | "onsite" | "hybrid";
  handles: string;
  level: string;
  niches: string[];
  formats: string[];
  brands_worked?: string;
  best_result?: string;
  showcase_video_id?: string | null;
  showcase_url?: string | null;
  showcase_note?: string;
  work_links: WorkLink[];
  consent_feature: boolean;
  consent_terms: boolean;
  status: EntryStatus;
  score_craft?: number | null;
  score_creativity?: number | null;
  score_proof?: number | null;
  notes?: string | null;
};

export type Shortlist = { id: string; created_at: string; brand_id: string; name: string; creator_ids: string[] };

export type Brief = {
  id: string;
  created_at: string;
  brand_id?: string | null;
  creator_id?: string | null;
  company: string;
  contact_name: string;
  email: string;
  niches: string[];
  budget: string;
  timeline: string;
  brief: string;
  status: "new" | "in_talks" | "won" | "closed";
};

export type Task = {
  id: string;
  created_at: string;
  created_by?: string | null;
  brand: string;
  title: string;
  type: string;
  description: string;
  pay_model: "per_1k_views" | "flat";
  rate: number;
  budget: number;
  slots?: number | null;
  min_views: number;
  platforms: string[];
  rules: string;
  source_url?: string | null;
  status: "pending" | "live" | "ended" | "rejected";
  niches?: string[];
  deliverables?: string;
  deadline?: string | null;
  location_mode?: "remote" | "onsite" | "hybrid";
  location_city?: string | null;
  vetted_only?: boolean;
  assets?: { name: string; url: string }[];
};

export type TaskSubmission = {
  id: string;
  created_at: string;
  task_id: string;
  user_id: string;
  post_url: string;
  claimed_views?: number | null;
  verified_views?: number | null;
  status: "pending" | "approved" | "rejected" | "paid";
};

export type Conversation = { id: string; created_at: string; user_id: string; last_at: string };
export type Message = { id: string; created_at: string; conversation_id: string; sender_id: string; body: string };

export type Report = {
  id: string; created_at: string; reporter_id: string;
  target_type: "profile" | "video" | "message"; target_id: string; reason: string; status: "open" | "resolved";
};

export type Settings = { notify_email: string; resend_key_set: boolean; palette: string };

export type Resource = {
  id: string; created_at: string;
  title: string; kind: "guide" | "template" | "video" | "live" | "checklist";
  summary: string; body: string; url?: string | null; tags: string[]; published: boolean; sample?: boolean;
};
