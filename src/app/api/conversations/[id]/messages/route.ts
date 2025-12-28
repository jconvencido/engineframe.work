// app/api/conversations/[id]/messages/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('bearer '.length);
    const supabase = await createServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;
    const { role, content, sections } = await req.json();

    if (!role || (content === undefined && !sections)) {
      return NextResponse.json({ success: false, error: 'role and either content or sections are required' }, { status: 400 });
    }

    // Verify user has access to conversation (owner or shared in their org)
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id, organization_id, is_shared')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Allow if user is the owner
    const isOwner = conversation.user_id === user.id;
    
    // Allow if conversation is shared and user is in the same organization
    let hasAccess = isOwner;
    if (!isOwner && conversation.is_shared) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', conversation.organization_id)
        .eq('user_id', user.id)
        .single();

      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get next position
    const { data: lastMessage } = await supabase
      .from('conversation_messages')
      .select('position')
      .eq('conversation_id', conversationId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = lastMessage ? lastMessage.position + 1 : 0;

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content: content || '',
        sections: sections || null,
        position: nextPosition,
      })
      .select()
      .single();

    if (insertError || !message) {
      console.error('Error inserting message:', insertError);
      console.error('Insert details:', { conversationId, role, contentLength: content?.length, sectionsCount: sections?.length, position: nextPosition });
      return NextResponse.json({ 
        success: false, 
        error: `Failed to save message: ${insertError?.message || 'Unknown error'}`,
        details: insertError?.details || insertError?.hint 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { message },
    });
  } catch (err) {
    console.error('Error in POST /api/conversations/[id]/messages:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
