import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { sendInvitationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { organizationId, email, role } = await request.json();

    // Get current user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a Supabase client with the user's session token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to invite (owner or admin)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single();

      console.log('Membership info:', membership);

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }

    // Check if the invited email belongs to an existing member
    // First get the user_id for the invited email
    const { data: invitedUser } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

      console.log('Invited user info:', invitedUser);

    if (invitedUser) {
      // Check if this user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', invitedUser.user_id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'The invited email does not belong to any registered user' },
        { status: 400 }
      );
    }

    // Delete any existing invitations for this email/org combination
    // This handles expired, accepted, or cancelled invitations
    await supabase
      .from('organization_invitations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('email', email);

    // Generate invitation token
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: email,
        role: role,
        invited_by: user.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Generate invitation link
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/organization/invite/${inviteToken}`;

    // Fetch organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    if (orgError || !orgData) {
      console.error('Error fetching organization:', orgError);
      return NextResponse.json(
        { error: 'Failed to fetch organization details' },
        { status: 500 }
      );
    }

    // Fetch inviter details
    const { data: inviterData, error: inviterError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    if (inviterError || !inviterData) {
      console.error('Error fetching inviter profile:', inviterError);
      return NextResponse.json(
        { error: 'Failed to fetch inviter details' },
        { status: 500 }
      );
    }

    // Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        organizationName: orgData.name,
        inviterName: inviterData.full_name || inviterData.email,
        inviterEmail: inviterData.email,
        role: role,
        inviteLink: inviteLink,
        expiresAt: expiresAt,
      });

      console.log('Invitation email sent successfully to:', email);
    } catch (emailError: any) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the request if email fails, but log it
      // The invitation is still created in the database
      return NextResponse.json({
        success: true,
        invitation,
        inviteLink,
        message: 'Invitation created but email failed to send. Please share the link manually.',
        emailError: emailError.message,
      });
    }

    return NextResponse.json({
      success: true,
      invitation,
      inviteLink,
      message: 'Invitation sent successfully',
    });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
