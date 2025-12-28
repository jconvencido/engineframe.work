// app/api/conversations/[id]/fork/route.ts
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
    const originalConversationId = id;

    // Fetch original conversation
    const { data: originalConversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', originalConversationId)
      .single();

    if (convError || !originalConversation) {
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user has access to the original conversation (must be shared in their org)
    if (originalConversation.user_id === user.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'You already own this conversation' 
      }, { status: 400 });
    }

    if (!originalConversation.is_shared) {
      return NextResponse.json({ 
        success: false, 
        error: 'This conversation is not shared' 
      }, { status: 403 });
    }

    // Verify user is in the same organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', originalConversation.organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied - not a member of this organization' 
      }, { status: 403 });
    }

    // Create new conversation (forked copy)
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        organization_id: originalConversation.organization_id,
        title: `${originalConversation.title} (Copy)`,
        advisor_mode_id: originalConversation.advisor_mode_id,
        is_shared: false, // Forked conversations are private by default
        forked_from_conversation_id: originalConversationId,
      })
      .select()
      .single();

    if (createError || !newConversation) {
      console.error('Error creating forked conversation:', createError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fork conversation' 
      }, { status: 500 });
    }

    // Fetch all messages from original conversation
    const { data: originalMessages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', originalConversationId)
      .order('position', { ascending: true });

    if (messagesError) {
      console.error('Error fetching original messages:', messagesError);
      // Delete the created conversation if we can't copy messages
      await supabase
        .from('conversations')
        .delete()
        .eq('id', newConversation.id);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to copy messages' 
      }, { status: 500 });
    }

    // Copy messages to new conversation
    if (originalMessages && originalMessages.length > 0) {
      const messagesToInsert = originalMessages.map(msg => ({
        conversation_id: newConversation.id,
        role: msg.role,
        content: msg.content,
        sections: msg.sections,
        position: msg.position,
      }));

      const { error: insertMessagesError } = await supabase
        .from('conversation_messages')
        .insert(messagesToInsert);

      if (insertMessagesError) {
        console.error('Error inserting copied messages:', insertMessagesError);
        // Delete the created conversation if we can't copy messages
        await supabase
          .from('conversations')
          .delete()
          .eq('id', newConversation.id);
        
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to copy messages' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: newConversation,
        messageCount: originalMessages?.length || 0,
      },
    });
  } catch (err) {
    console.error('Error in POST /api/conversations/[id]/fork:', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal error' 
    }, { status: 500 });
  }
}
