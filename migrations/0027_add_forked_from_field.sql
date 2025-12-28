-- Add forked_from_conversation_id field to track conversation lineage
-- This allows users to fork shared conversations into their own copies

alter table public.conversations
  add column forked_from_conversation_id uuid references public.conversations(id) on delete set null;

-- Add index for performance when querying forked conversations
create index idx_conversations_forked_from on public.conversations(forked_from_conversation_id);

-- Add comment for documentation
comment on column public.conversations.forked_from_conversation_id is 'References the original conversation if this was forked from a shared conversation';
