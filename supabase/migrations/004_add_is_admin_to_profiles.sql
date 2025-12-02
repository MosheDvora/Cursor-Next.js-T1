-- Add is_admin column to profiles table
-- This column identifies which users are administrators and can manage app defaults

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Create index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;

-- Update existing profiles to have is_admin = false (if not already set)
UPDATE public.profiles
SET is_admin = false
WHERE is_admin IS NULL;


