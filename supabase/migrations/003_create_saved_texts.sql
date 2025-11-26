-- Create saved_texts table for storing user texts
CREATE TABLE IF NOT EXISTS public.saved_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  niqqud_text TEXT,  -- הטקסט המנוקד (אם קיים)
  clean_text TEXT,   -- הטקסט ללא ניקוד (לצורך השוואות)
  is_last_worked BOOLEAN DEFAULT true,  -- האם זה הטקסט האחרון שעובד עליו
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.saved_texts ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can view their own saved texts
CREATE POLICY "Users can view own saved texts"
  ON public.saved_texts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own saved texts
CREATE POLICY "Users can insert own saved texts"
  ON public.saved_texts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own saved texts
CREATE POLICY "Users can update own saved texts"
  ON public.saved_texts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own saved texts
CREATE POLICY "Users can delete own saved texts"
  ON public.saved_texts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_texts_user_id ON public.saved_texts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_texts_user_last_worked ON public.saved_texts(user_id, is_last_worked) WHERE is_last_worked = true;
CREATE INDEX IF NOT EXISTS idx_saved_texts_last_accessed ON public.saved_texts(user_id, last_accessed_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_saved_texts_updated_at
  BEFORE UPDATE ON public.saved_texts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Ensure only one text per user is marked as last_worked
-- This function will be called before insert/update
CREATE OR REPLACE FUNCTION public.ensure_single_last_worked()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row is marked as last_worked, unmark all others for this user
  IF NEW.is_last_worked = true THEN
    UPDATE public.saved_texts
    SET is_last_worked = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_last_worked = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure only one last_worked text per user
CREATE TRIGGER ensure_single_last_worked_trigger
  BEFORE INSERT OR UPDATE ON public.saved_texts
  FOR EACH ROW
  WHEN (NEW.is_last_worked = true)
  EXECUTE FUNCTION public.ensure_single_last_worked();

