-- ============================================================================
-- Migration 0004: Add address and motto to profiles
-- ============================================================================
alter table public.users add column if not exists address text;
alter table public.users add column if not exists motto text;
