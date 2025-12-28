// app/api/conversations/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
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

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return new NextResponse('organizationId is required', { status: 400 });
    }

    // Verify user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new NextResponse('Not a member of this organization', { status: 403 });
    }

    // Fetch conversations (own + shared in org)
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`user_id.eq.${user.id},is_shared.eq.true`)
      .order('updated_at', { ascending: false });

    if (convError) {
      console.error('Error fetching conversations:', convError);
      return new NextResponse('Failed to fetch conversations', { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { conversations: conversations || [] },
    });
  } catch (err) {
    console.error('Error in GET /api/conversations:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
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

    const { organization_id, advisor_mode_id, title, is_shared = false } = await req.json();

    if (!organization_id || !advisor_mode_id || !title) {
      return new NextResponse('organization_id, advisor_mode_id, and title are required', {
        status: 400,
      });
    }

    // Verify user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new NextResponse('Not a member of this organization', { status: 403 });
    }

    // Create conversation
    const { data: conversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        organization_id,
        advisor_mode_id,
        title,
        is_shared,
      })
      .select()
      .single();

    if (createError || !conversation) {
      console.error('Error creating conversation:', createError);
      return new NextResponse('Failed to create conversation', { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { conversation },
    });
  } catch (err) {
    console.error('Error in POST /api/conversations:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
