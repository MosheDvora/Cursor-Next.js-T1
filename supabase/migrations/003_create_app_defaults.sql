-- Create app_defaults table for storing site-wide default values
-- This table stores default settings that will be used for new users, anonymous users, and as fallback values

CREATE TABLE IF NOT EXISTS public.app_defaults (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.app_defaults ENABLE ROW LEVEL SECURITY;

-- Create policy: Only admins can view app defaults
CREATE POLICY "Admins can view app defaults"
  ON public.app_defaults
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create policy: Only admins can insert app defaults
CREATE POLICY "Admins can insert app defaults"
  ON public.app_defaults
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create policy: Only admins can update app defaults
CREATE POLICY "Admins can update app defaults"
  ON public.app_defaults
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create policy: Only admins can delete app defaults
CREATE POLICY "Admins can delete app defaults"
  ON public.app_defaults
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE TRIGGER set_app_defaults_updated_at
  BEFORE UPDATE ON public.app_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

