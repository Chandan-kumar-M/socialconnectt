-- Adding the followers_only policy after follows table exists
-- Add the followers_only privacy policy now that follows table exists
DROP POLICY IF EXISTS "profiles_select_basic" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles 
  FOR SELECT USING (
    privacy_setting = 'public' OR 
    auth.uid() = id OR
    (privacy_setting = 'followers_only' AND EXISTS (
      SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = id
    ))
  );
