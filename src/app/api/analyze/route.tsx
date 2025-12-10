// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice('bearer '.length);

    const { advisor_mode_id, prompt } = await req.json();

    if (!advisor_mode_id || !prompt) {
      return new NextResponse('advisor_mode_id and prompt are required', {
        status: 400,
      });
    }

    // Create client with the user's auth context
    // This pattern is the same one recommended for Edge Functions / SSR. :contentReference[oaicite:1]{index=1}
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    // Get user from the token explicitly
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error(userError);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    // Fetch mode by slug (since frontend sends slug like 'sales', 'marketing')
    const { data: mode, error: modeError } = await supabase
      .from('advisor_modes')
      .select('*')
      .eq('slug', advisor_mode_id)
      .maybeSingle();

    if (modeError || !mode) {
      console.error('Mode lookup error:', modeError);
      return new NextResponse('Invalid advisor mode', { status: 400 });
    }

    const modeName = mode.name;
    const modeUuid = mode.id;

    // Mock structured AI response (you'll replace this with real AI later)
    const sections = [
      {
        section_name: 'Diagnosis',
        content: `In ${modeName}, the core issue appears to be:\n\n${prompt}`,
      },
      {
        section_name: 'Insights',
        content:
          'Here are 3 structured insights based on your description:\n\n1) Example insight.\n2) Another perspective.\n3) A constraint or risk to watch.',
      },
      {
        section_name: 'Recommendations',
        content:
          'Practical next steps:\n\n1) Define the key metric.\n2) Run one experiment this week.\n3) Re-evaluate based on results.',
      },
    ];

    // Save analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        advisor_mode_id: modeUuid,
        prompt,
      })
      .select()
      .single();

    if (analysisError || !analysis) {
      console.error(analysisError);
      return new NextResponse('Failed to save analysis', { status: 500 });
    }

    const outputsToInsert = sections.map((s, idx) => ({
      analysis_id: analysis.id,
      section_name: s.section_name,
      content: s.content,
      position: idx,
    }));

    const { error: outputsError } = await supabase
      .from('analysis_outputs')
      .insert(outputsToInsert);

    if (outputsError) {
      console.error(outputsError);
      // still return success for now
    }

    return NextResponse.json({ sections });
  } catch (err) {
    console.error(err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
