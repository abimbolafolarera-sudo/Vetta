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
  tier?: "nano" | "micro" | "mid" | "macro" | "mega" | null;
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
  rate_from?: number | null; // USD, set by the creator
  rate_to?: number | null;
  jobs_done?: number; // scorecard, set by Vetta
  on_time_pct?: number | null;
  brand_rating?: number | null;
  hook_rate?: number | null;
  repeat_brands?: number;
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
  tier?: "nano" | "micro" | "mid" | "macro" | "mega";
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
  status: "draft" | "new" | "in_talks" | "won" | "closed";
  city?: string | null;
  work_mode?: "remote" | "onsite" | "hybrid" | null;
  whatsapp?: string | null;
  whatsapp_optin?: boolean;
  matched?: string[];
  picked?: string[];
  followup_stage?: number;
  upgrade_requested?: boolean;
  unsubscribed?: boolean;
  token?: string;
};

// What a brand sees for a matched creator.
export type CreatorCard = Pick<Profile, "id" | "handle" | "display_name" | "avatar_url" | "niches" | "formats" | "city" | "country" | "work_mode" | "tier"
  | "rate_from" | "rate_to" | "jobs_done" | "on_time_pct" | "brand_rating" | "hook_rate" | "vetted">;
export type BriefDraft = { id: string; token: string; matches: CreatorCard[]; company?: string; contact_name?: string; email?: string; status?: Brief["status"]; unsubscribed?: boolean };

export type Task = {
  id: string;
  created_at: string;
  created_by?: string | null;
  brand: string;
  title: string;
  type: string;
  description: string;
  pay_model: "per_1k_views" | "flat" | "hybrid";
  rate: number; // flat fee, or the rate per 1,000 views
  base_fee?: number; // hybrid only
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

export type Settings = { notify_email: string; resend_key_set: boolean; from_email: string; site_url: string; drop_applied: number; drop_accepted: number; upgrade_price: string; upgrade_link: string };

export type Resource = {
  id: string; created_at: string;
  title: string; kind: "guide" | "template" | "video" | "live" | "checklist";
  summary: string; body: string; url?: string | null; tags: string[]; published: boolean; sample?: boolean;
};
