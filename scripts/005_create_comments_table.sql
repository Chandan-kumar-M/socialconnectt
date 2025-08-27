-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(content) <= 200),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
CREATE POLICY "comments_select_active" ON public.comments 
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "comments_insert_own" ON public.comments 
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "comments_update_own" ON public.comments 
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "comments_delete_own" ON public.comments 
  FOR DELETE USING (auth.uid() = author_id);

-- Admin can manage all comments
CREATE POLICY "comments_admin_all" ON public.comments 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create index
CREATE INDEX IF NOT EXISTS comments_post_created_idx ON public.comments(post_id, created_at DESC);
