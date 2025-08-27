-- Add the followers-only posts policy after follows table exists
DROP POLICY IF EXISTS "posts_select_public" ON public.posts;

CREATE POLICY "posts_select_public" ON public.posts 
  FOR SELECT USING (
    is_active = TRUE AND (
      EXISTS (SELECT 1 FROM profiles WHERE id = author_id AND privacy_setting = 'public') OR
      author_id = auth.uid() OR
      (EXISTS (SELECT 1 FROM profiles WHERE id = author_id AND privacy_setting = 'followers_only') AND
       EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = author_id))
    )
  );
