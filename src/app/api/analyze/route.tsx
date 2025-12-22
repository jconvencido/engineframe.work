// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function parseAIResponse(response: string): Array<{ section_name: string; content: string }> {
  // Split response into sections based on numbered lists or headers
  const sections: Array<{ section_name: string; content: string }> = [];
  
  // Try to detect sections with numbered headers (1., 2., etc.) or markdown headers
  const lines = response.split('\n');
  let currentSection: { section_name: string; content: string } | null = null;
  
  for (const line of lines) {
    // Check for numbered section headers like "1. Engine Identification"
    const numberedMatch = line.match(/^\d+\.\s+(.+)/);
    const headerMatch = line.match(/^#+\s+(.+)/);
    
    if (numberedMatch || headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        section_name: (numberedMatch || headerMatch)![1].trim(),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    } else if (line.trim()) {
      // Content before first header
      if (!currentSection) {
        currentSection = {
          section_name: 'Analysis',
          content: line,
        };
      }
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  // If no sections were detected, return the whole response as one section
  if (sections.length === 0) {
    sections.push({
      section_name: 'Analysis',
      content: response.trim(),
    });
  }
  
  return sections;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const token = authHeader.slice('bearer '.length);

    const { advisor_mode_id, prompt, organization_id } = await req.json();

    if (!advisor_mode_id || !prompt || !organization_id) {
      return new NextResponse('advisor_mode_id, prompt, and organization_id are required', {
        status: 400,
      });
    }

    // Create server client
    const supabase = await createServerClient();

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

    // Verify user has permission in organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organization_id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return new NextResponse('You do not have permission to create analyses in this organization', { status: 403 });
    }

    // Fetch mode by slug (since frontend sends slug like 'sales', 'marketing')
    const { data: mode, error: modeError } = await supabase
      .from('advisor_modes')
      .select('*')
      .eq('slug', advisor_mode_id)
      .or(`is_global.eq.true,organization_id.eq.${organization_id}`)
      .maybeSingle();

    if (modeError || !mode) {
      console.error('Mode lookup error:', modeError);
      return new NextResponse('Invalid advisor mode', { status: 400 });
    }

    if (!mode.system_prompt) {
      console.error('Mode missing system_prompt:', mode);
      return new NextResponse('Advisor mode is not configured properly', { status: 500 });
    }

    const modeName = mode.name;
    const modeUuid = mode.id;

    // Get the system prompt from the database
    const systemPrompt = mode.system_prompt;

    // Call OpenAI/Anthropic API with the system prompt
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const useAnthropic = !!process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return new NextResponse('AI API key not configured', { status: 500 });
    }

    let aiResponse: string;
    
    if (useAnthropic) {
      // Anthropic Claude API call
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const error = await anthropicResponse.text();
        console.error('Anthropic API error:', error);
        return new NextResponse('AI service error', { status: 500 });
      }

      const anthropicData = await anthropicResponse.json();
      aiResponse = anthropicData.content[0].text;
    } else {
      // OpenAI API call
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 4096,
        }),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        console.error('OpenAI API error:', error);
        return new NextResponse('AI service error', { status: 500 });
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0].message.content;
    }

    // Parse AI response into sections
    // The AI should return structured output, but we'll parse it
    const sections = parseAIResponse(aiResponse);

    // Save analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .insert({
        user_id: userId,
        advisor_mode_id: modeUuid,
        organization_id: organization_id,
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
