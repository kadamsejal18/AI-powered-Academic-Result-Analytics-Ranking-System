-- Run this SQL in your Supabase SQL Editor to create the necessary table and access policies.

-- Create the students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roll_number TEXT NOT NULL UNIQUE,
  class_name TEXT NOT NULL,
  scores JSONB NOT NULL,
  total_obtained INTEGER NOT NULL,
  max_total INTEGER DEFAULT 500,
  percentage DOUBLE PRECISION NOT NULL,
  grade TEXT NOT NULL,
  status TEXT NOT NULL,
  ai_insights JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public select, insert, delete and update (suitable for a frontend-only demo)
CREATE POLICY "Allow public select" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON students FOR DELETE USING (true);
CREATE POLICY "Allow public update" ON students FOR UPDATE USING (true);
