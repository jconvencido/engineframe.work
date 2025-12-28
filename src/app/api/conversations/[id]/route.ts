// app/api/conversations/[id]/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
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
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;

    // Get pagination parameters from query string
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    
    // Parse with defaults (no limit by default for backward compatibility)
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

    // Fetch conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Verify access (owner or shared in user's org)
    if (conversation.user_id !== user.id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', conversation.organization_id)
        .eq('user_id', user.id)
        .single();

      if (!membership || !conversation.is_shared) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch messages with optional pagination
    let messagesQuery = supabase
      .from('conversation_messages')
      .select('*', { count: 'exact' })
      .eq('conversation_id', conversationId)
      .order('position', { ascending: true });

    // Apply pagination if limit is provided
    if (limit !== undefined) {
      messagesQuery = messagesQuery.range(offset, offset + limit - 1);
    }

    const { data: messages, error: msgError, count } = await messagesQuery;

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages: messages || [],
        pagination: limit !== undefined ? {
          total: count || 0,
          limit,
          offset,
          hasMore: (offset + (messages?.length || 0)) < (count || 0),
        } : undefined,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/conversations/[id]:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
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
    const { title, is_shared } = await req.json();

    // Update conversation (only owner can update)
    const { data: conversation, error: updateError } = await supabase
      .from('conversations')
      .update({
        ...(title !== undefined && { title }),
        ...(is_shared !== undefined && { is_shared }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !conversation) {
      console.error('Error updating conversation:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { conversation },
    });
  } catch (err) {
    console.error('Error in PATCH /api/conversations/[id]:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
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
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const conversationId = id;

    // Delete conversation (only owner can delete)
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to delete conversation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (err) {
    console.error('Error in DELETE /api/conversations/[id]:', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
