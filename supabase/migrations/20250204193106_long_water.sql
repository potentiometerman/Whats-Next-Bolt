/*
  # Update RLS policies for videos table

  1. Changes
    - Modify videos table policies to ensure proper access for admins
    - Add explicit policy for admin operations
  
  2. Security
    - Maintain existing RLS
    - Add specific admin policies
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Only admins can insert videos" ON videos;

-- Create new admin policies
CREATE POLICY "Admins can manage videos"
  ON videos
  TO authenticated
  USING (
    auth.jwt() ->> 'email' LIKE '%@admin.com'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' LIKE '%@admin.com'
  );