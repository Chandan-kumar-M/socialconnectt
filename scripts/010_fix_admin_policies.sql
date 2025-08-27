-- Fix admin policies to prevent infinite recursion
-- This script adds admin policies that don't reference the same table

-- Create a function to check if user is admin using auth metadata
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'user_metadata' ->> 'role')::text = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies that use the function instead of table lookup
CREATE POLICY "profiles_admin_select" ON public.profiles 
  FOR SELECT USING (is_admin());

CREATE POLICY "profiles_admin_update" ON public.profiles 
  FOR UPDATE USING (is_admin());

CREATE POLICY "profiles_admin_delete" ON public.profiles 
  FOR DELETE USING (is_admin());
