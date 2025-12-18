import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  inviteLink: string;
  expiresAt: Date;
}

export const InvitationEmail = ({
  organizationName = 'Example Organization',
  inviterName = 'John Doe',
  inviterEmail = 'john@example.com',
  role = 'member',
  inviteLink = 'https://example.com/invite/abc123',
  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
}: InvitationEmailProps) => {
  const previewText = `Join ${organizationName} on Advisor GPT`;
  
  const formattedExpiryDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(expiresAt);

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been invited to join {organizationName}</Heading>
          
          <Text style={text}>
            <strong>{inviterName}</strong> ({inviterEmail}) has invited you to join{' '}
            <strong>{organizationName}</strong> as a <strong>{role}</strong>.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              Accept Invitation
            </Button>
          </Section>

          <Text style={text}>
            This invitation will expire on <strong>{formattedExpiryDate}</strong>.
          </Text>

          <Text style={footerText}>
            If you weren't expecting this invitation, you can safely ignore this email.
          </Text>

          <Text style={footerText}>
            Or copy and paste this URL into your browser:{' '}
            <a href={inviteLink} style={link}>
              {inviteLink}
            </a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default InvitationEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 48px',
};

const buttonContainer = {
  padding: '27px 48px',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 48px',
  marginTop: '16px',
};

const link = {
  color: '#5469d4',
  textDecoration: 'underline',
};
