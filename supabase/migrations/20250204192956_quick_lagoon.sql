/*
  # Video Platform Schema

  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `youtube_id` (text, required)
      - `title` (text, required)
      - `location` (text)
      - `video_type` (text)
      - `created_at` (timestamp)
      - `added_by` (uuid, references auth.users)
    
    - `likes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `video_id` (uuid, references videos)
      - `created_at` (timestamp)
      - Unique constraint on user_id and video_id pair

  2. Security
    - RLS enabled on both tables
    - Videos viewable by everyone
    - Only admins can insert videos
    - Users can manage their own likes
*/

-- Create videos table
CREATE TABLE videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id text NOT NULL,
  title text NOT NULL,
  location text,
  video_type text,
  created_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES auth.users(id)
);

-- Create likes table
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  video_id uuid REFERENCES videos(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Videos are viewable by everyone"
  ON videos FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can insert videos"
  ON videos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE email LIKE '%@admin.com'
  ));

-- Likes policies
CREATE POLICY "Users can view their own likes"
  ON likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);