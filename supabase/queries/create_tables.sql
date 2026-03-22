-- Run with: psql <connection_string> -f create_tables.sql
-- Order: extensions → users → papers → likes

-- pgvector for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- ──────────────────────────────────────
-- Users
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.users (
  id            text PRIMARY KEY,
  google_id     text UNIQUE,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  profile_picture   text,
  google_scholar_url text,
  interests     text NOT NULL DEFAULT '[]',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────
-- Papers  (matches papers_upload.py)
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.papers (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  summary     text,
  authors     jsonb NOT NULL DEFAULT '[]',
  categories  jsonb NOT NULL DEFAULT '[]',
  links       jsonb NOT NULL DEFAULT '[]',
  published   timestamptz,
  embedding   vector(768),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────
-- Likes  (like_count = COUNT from here)
-- ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.likes (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  paper_id   text NOT NULL REFERENCES public.papers (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, paper_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────
-- Feed: recommend papers by similarity
-- to the average embedding of liked papers
-- ──────────────────────────────────────

-- ──────────────────────────────────────
-- Search: text + semantic search
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.search_papers(
  p_query      text,
  p_embedding  vector(768) DEFAULT NULL,
  p_limit      int DEFAULT 20,
  p_offset     int DEFAULT 0
)
RETURNS TABLE (
  id          text,
  title       text,
  summary     text,
  authors     jsonb,
  categories  jsonb,
  links       jsonb,
  published   timestamptz,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id, p.title, p.summary, p.authors, p.categories,
    p.links, p.published,
    CASE
      WHEN p_embedding IS NOT NULL AND p.embedding IS NOT NULL
        THEN 1 - (p.embedding <=> p_embedding)
      ELSE 0
    END AS similarity
  FROM public.papers p
  WHERE
    CASE
      WHEN p_embedding IS NOT NULL THEN
        p.embedding IS NOT NULL
      ELSE
        p.title ILIKE '%' || p_query || '%'
        OR p.summary ILIKE '%' || p_query || '%'
        OR p.authors::text ILIKE '%' || p_query || '%'
        OR p.categories::text ILIKE '%' || p_query || '%'
    END
  ORDER BY
    CASE
      WHEN p_embedding IS NOT NULL AND p.embedding IS NOT NULL
        THEN p.embedding <=> p_embedding
      ELSE 1
    END
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ──────────────────────────────────────
-- Feed: recommend papers by similarity
-- to the average embedding of liked papers
-- ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recommend_papers(
  p_user_id text,
  p_limit   int DEFAULT 20,
  p_offset  int DEFAULT 0
)
RETURNS TABLE (
  id          text,
  title       text,
  summary     text,
  authors     jsonb,
  categories  jsonb,
  links       jsonb,
  published   timestamptz,
  similarity  float
)
LANGUAGE sql STABLE
AS $$
  WITH user_avg AS (
    SELECT avg(p.embedding) AS embedding
    FROM public.likes l
    JOIN public.papers p ON p.id = l.paper_id
    WHERE l.user_id = p_user_id
      AND p.embedding IS NOT NULL
  )
  SELECT
    p.id, p.title, p.summary, p.authors, p.categories,
    p.links, p.published,
    1 - (p.embedding <=> u.embedding) AS similarity
  FROM public.papers p, user_avg u
  WHERE p.embedding IS NOT NULL
    AND u.embedding IS NOT NULL
    AND p.id NOT IN (
      SELECT paper_id FROM public.likes WHERE user_id = p_user_id
    )
  ORDER BY p.embedding <=> u.embedding
  LIMIT p_limit
  OFFSET p_offset;
$$;