-- Allow team members to insert messages into shared conversations
-- Drop the old policy
drop policy if exists "Users can insert messages into own conversations" on public.conversation_messages;

-- Create new policy that allows both owners and team members of shared conversations
create policy "Users can insert messages into accessible conversations" on public.conversation_messages
  for insert with check (
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
