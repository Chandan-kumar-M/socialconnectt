-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- ✅ Any user can see likes
CREATE POLICY "likes_select_all" ON public.likes FOR SELECT USING (TRUE);

-- ✅ Users can like posts (only their own user_id allowed)
CREATE POLICY "likes_insert_own" ON public.likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ✅ Users can unlike their own likes
CREATE POLICY "likes_delete_own" ON public.likes 
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS likes_post_idx ON public.likes(post_id);
CREATE INDEX IF NOT EXISTS likes_user_idx ON public.likes(user_id);

-- ✅ Trigger: auto-update like_count on posts
CREATE OR REPLACE FUNCTION handle_like_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_like_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id AND like_count > 0;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS like_insert_trigger ON likes;
CREATE TRIGGER like_insert_trigger
AFTER INSERT ON likes
FOR EACH ROW
EXECUTE FUNCTION handle_like_insert();

DROP TRIGGER IF EXISTS like_delete_trigger ON likes;
CREATE TRIGGER like_delete_trigger
AFTER DELETE ON likes
FOR EACH ROW
EXECUTE FUNCTION handle_like_delete();
