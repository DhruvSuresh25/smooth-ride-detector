CREATE TABLE public.ai_assist_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_assist_usage TO service_role;
ALTER TABLE public.ai_assist_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX ai_assist_usage_client_idx ON public.ai_assist_usage (client_hash, created_at DESC);