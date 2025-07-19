-- Create the words table for storing daily vocabulary
CREATE TABLE IF NOT EXISTS daily_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  word VARCHAR(100) NOT NULL,
  phonetic VARCHAR(200),
  definition TEXT NOT NULL,
  translation VARCHAR(500) NOT NULL,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  level VARCHAR(10) NOT NULL CHECK (level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  source VARCHAR(50) DEFAULT 'ai' CHECK (source IN ('ai', 'fallback', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_daily_words_date ON daily_words(date);

-- Create index for word searches
CREATE INDEX IF NOT EXISTS idx_daily_words_word ON daily_words(word);

-- Create index for level filtering
CREATE INDEX IF NOT EXISTS idx_daily_words_level ON daily_words(level);

-- Enable Row Level Security (RLS)
ALTER TABLE daily_words ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read access to daily_words" ON daily_words;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON daily_words;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON daily_words;

-- Create permissive policies for public access
-- Allow anyone to read words (public educational content)
CREATE POLICY "Public read access to daily_words" ON daily_words
  FOR SELECT USING (true);

-- Allow anyone to insert words (for API word generation)
CREATE POLICY "Public insert access to daily_words" ON daily_words
  FOR INSERT WITH CHECK (true);

-- Allow anyone to update words (for API word updates)
CREATE POLICY "Public update access to daily_words" ON daily_words
  FOR UPDATE USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_daily_words_updated_at ON daily_words;
CREATE TRIGGER update_daily_words_updated_at 
  BEFORE UPDATE ON daily_words 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing
INSERT INTO daily_words (date, word, phonetic, definition, translation, examples, level, source) 
VALUES 
  (
    '2024-01-01',
    'serendipity',
    '/ˌserənˈdɪpɪti/',
    'The occurrence of events by chance in a happy or beneficial way',
    'casualidad afortunada, chiripa',
    '["Meeting you here was pure serendipity!", "It was serendipity that led me to find this amazing café.", "Sometimes the best discoveries happen through serendipity."]'::jsonb,
    'C1',
    'manual'
  ),
  (
    '2024-01-02',
    'procrastinate',
    '/prəˈkræstɪneɪt/',
    'To delay or postpone action; to put off doing something',
    'procrastinar, postergar',
    '["I tend to procrastinate when I have difficult tasks.", "Don''t procrastinate on your homework anymore!", "She always procrastinates until the last minute."]'::jsonb,
    'B2',
    'manual'
  ),
  (
    '2024-01-03',
    'eloquent',
    '/ˈeləkwənt/',
    'Fluent and persuasive in speaking or writing',
    'elocuente, persuasivo',
    '["Her eloquent speech moved the entire audience.", "He''s quite eloquent when discussing his passions.", "The lawyer made an eloquent argument in court."]'::jsonb,
    'C1',
    'manual'
  ),
  (
    CURRENT_DATE,
    'resilient',
    '/rɪˈzɪliənt/',
    'Able to recover quickly from difficult conditions',
    'resistente, resiliente',
    '["Children are remarkably resilient creatures.", "The city proved resilient after the natural disaster.", "You need to be resilient to succeed in business."]'::jsonb,
    'B2',
    'manual'
  ),
  (
    CURRENT_DATE - INTERVAL '1 day',
    'ubiquitous',
    '/juːˈbɪkwɪtəs/',
    'Present, appearing, or found everywhere',
    'omnipresente, ubicuo',
    '["Smartphones have become ubiquitous in modern society.", "Coffee shops are ubiquitous in this neighborhood.", "Social media is ubiquitous among young people."]'::jsonb,
    'C1',
    'manual'
  )
ON CONFLICT (date) DO NOTHING;

-- Verify the setup
SELECT 'Table created successfully' as status;
SELECT COUNT(*) as sample_words_count FROM daily_words;
