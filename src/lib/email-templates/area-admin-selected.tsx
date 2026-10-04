import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  areas?: string
  actionUrl?: string
  newAccount?: boolean
}

const AreaAdminSelectedEmail = ({ name, areas, actionUrl, newAccount }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You have been selected to be an admin of DriveSafe Vision</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>DriveSafe Vision</Text>
        <Heading style={h1}>You have been selected as an admin</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          You have been selected to be an area admin of DriveSafe Vision
          {areas ? ` for ${areas}` : ''}. You'll review pothole complaints in your area,
          update their status and get them fixed before the deadline.
        </Text>
        <Text style={text}>
          {newAccount
            ? 'Click the button below to set your password, then sign in on the admin sign-in page.'
            : 'Sign in with your existing account on the admin sign-in page.'}
        </Text>
        {actionUrl ? (
          <Button style={button} href={actionUrl}>
            {newAccount ? 'Set your password' : 'Open admin sign in'}
          </Button>
        ) : null}
        <Text style={footer}>If you weren't expecting this, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AreaAdminSelectedEmail,
  subject: 'You have been selected to be an admin of DriveSafe Vision',
  displayName: 'Area admin selected',
  previewData: { name: 'Ravi', areas: 'Jayanagar', actionUrl: 'https://drivesafevision.com/admin/login', newAccount: true },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const brand = { fontSize: '13px', fontWeight: 'bold' as const, color: '#4f46e5', margin: '0 0 8px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 14px' }
const button = {
  backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '14px', borderRadius: '8px',
  padding: '12px 20px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
