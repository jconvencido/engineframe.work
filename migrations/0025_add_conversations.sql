-- 0025_add_conversations.sql
-- Add conversations and conversation messages for persistent chat history

-- Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  advisor_mode_id uuid not null references public.advisor_modes(id) on delete cascade,
  title text not null,
  is_shared boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create index for faster queries
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_conversations_org_id on public.conversations(organization_id);
create index idx_conversations_created_at on public.conversations(created_at desc);

-- Create conversation_messages table
create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sections jsonb,
  position integer not null default 0,
  created_at timestamp with time zone default now()
);

-- Create index for faster message queries
create index idx_conversation_messages_conversation_id on public.conversation_messages(conversation_id);
create index idx_conversation_messages_position on public.conversation_messages(conversation_id, position);

-- Enable RLS
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- RLS Policies for conversations
-- Users can view their own conversations
create policy "Users can view own conversations" on public.conversations
  for select using (
    user_id = auth.uid()
  );

-- Users can view shared conversations in their organizations
create policy "Users can view shared conversations in their orgs" on public.conversations
  for select using (
    is_shared = true
    and organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

-- Users can create conversations in their organizations
create policy "Users can create conversations" on public.conversations
  for insert with check (
    user_id = auth.uid()
    and organization_id in (
      select om.organization_id from public.organization_members om
      where om.user_id = auth.uid()
    )
  );

-- Users can update their own conversations
create policy "Users can update own conversations" on public.conversations
  for update using (
    user_id = auth.uid()
  );

-- Users can delete their own conversations
create policy "Users can delete own conversations" on public.conversations
  for delete using (
    user_id = auth.uid()
  );

-- RLS Policies for conversation_messages
-- Users can view messages from conversations they have access to
create policy "Users can view messages from accessible conversations" on public.conversation_messages
  for select using (
    conversation_id in (
      select c.id from public.conversations c
      where c.user_id = auth.uid()
      or (
        c.is_shared = true
        and c.organization_id in (
          select om.organization_id from public.organization_members om
          where om.user_id = auth.uid()
        )
      )
    )
  );

-- Users can insert messages into their own conversations
create policy "Users can insert messages into own conversations" on public.conversation_messages
  for insert with check (
    conversation_id in (
      select c.id from public.conversations c
      where c.user_id = auth.uid()
    )
  );

-- Function to update conversation updated_at timestamp
create or replace function public.update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update conversation timestamp when messages are added
create trigger on_conversation_message_insert
  after insert on public.conversation_messages
  for each row execute procedure public.update_conversation_timestamp();
