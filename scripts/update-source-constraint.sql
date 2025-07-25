-- Update the source constraint to allow new source types
-- This script updates the existing table to support new source values

-- First, drop the existing constraint
ALTER TABLE daily_words DROP CONSTRAINT IF EXISTS daily_words_source_check;

-- Add the updated constraint with all possible source values
ALTER TABLE daily_words ADD CONSTRAINT daily_words_source_check 
  CHECK (source IN (
    'ai',                    -- AI generated from Hugging Face
    'curated',              -- High-quality curated words
    'smart_generated',      -- Smart word bank generated
    'manual',               -- Manually entered words
    'fallback',             -- Fallback system words
    'database_unavailable', -- When database is not accessible
    'emergency',            -- Emergency fallback
    'hardcoded',           -- Hardcoded emergency words
    'ai_fallback',         -- AI generation fallback
    'generation_error'     -- When generation fails
  ));

-- Verify the constraint was updated
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'daily_words'::regclass 
AND conname = 'daily_words_source_check';

-- Show current data to verify everything is working
SELECT source, COUNT(*) as count 
FROM daily_words 
GROUP BY source 
ORDER BY source;

-- Test insert with new source type
INSERT INTO daily_words (date, word, phonetic, definition, translation, examples, level, source) 
VALUES (
  '2024-12-01',
  'test_curated',
  '/test/',
  'A test word to verify the curated source works',
  'palabra de prueba',
  '["This is a test example."]'::jsonb,
  'B2',
  'curated'
) ON CONFLICT (date) DO NOTHING;

-- Clean up test data
DELETE FROM daily_words WHERE word = 'test_curated';

SELECT 'Source constraint updated successfully!' as status;
