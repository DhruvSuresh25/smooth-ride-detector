import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  reportNumber?: string
  status?: string
  note?: string
  address?: string
  reportUrl?: string
}

const STATUS_LINES: Record<string, string> = {
  'Pending': 'Your report is waiting in the queue for review.',
  'Under Review': 'Our team has started reviewing your report.',
  'Action Taken': 'Repair work has been scheduled or started for this pothole.',
  'Resolved': 'Good news — this pothole has been repaired. Thank you for helping make the roads safer!',
  'Submitted': 'Your report is waiting in the queue for review.',
  'Received': 'Your area admin has received your report.',
  'In Progress': 'Repair work has started on this pothole.',
  'Fixed': 'Good news — this pothole has been fixed. You can now rate the repair in the app.',
  'Rejected': 'After review, our team could not take action on this report.',
}

const ReportStatusEmail = ({ name, reportNumber, status, note, address, reportUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your report ${reportNumber ?? ''} is now ${status ?? 'updated'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>DriveSafe Vision</Text>
        <Heading style={h1}>Your report has been reviewed</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'}</Text>
        <Text style={text}>
          An inspector updated your pothole report{reportNumber ? ` ${reportNumber}` : ''}
          {address ? ` at ${address}` : ''}.
        </Text>
        <Section style={statusBox}>
          <Text style={statusLabel}>New status</Text>
          <Text style={statusValue}>{status ?? 'Updated'}</Text>
          <Text style={textSmall}>{STATUS_LINES[status ?? ''] ?? 'The status of your report has changed.'}</Text>
        </Section>
        {note ? (
          <Section style={noteBox}>
            <Text style={statusLabel}>Message from the inspector</Text>
            <Text style={textSmall}>{note}</Text>
          </Section>
        ) : null}
        {reportUrl ? (
          <Button style={button} href={reportUrl}>View your report</Button>
        ) : null}
        <Text style={footer}>You're receiving this because you submitted this report on DriveSafe Vision.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportStatusEmail,
  subject: (d: Record<string, any>) =>
    `Report ${d['reportNumber'] ?? ''} update: ${d['status'] ?? 'status changed'}`,
  displayName: 'Report status update',
  previewData: {
    name: 'Jane',
    reportNumber: 'RPT-0001',
    status: 'Received',
    note: 'An inspector will visit the site this week.',
    address: 'MG Road, Bengaluru',
    reportUrl: 'https://drivesafevision.com/reports',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const brand = { fontSize: '13px', fontWeight: 'bold' as const, color: '#4f46e5', margin: '0 0 8px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 14px' }
const textSmall = { fontSize: '14px', color: '#334155', lineHeight: '1.5', margin: '0' }
const statusBox = { border: '1px solid #4f46e5', borderRadius: '8px', padding: '14px 16px', margin: '10px 0 16px' }
const noteBox = { backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '14px 16px', margin: '0 0 20px' }
const statusLabel = { fontSize: '12px', color: '#64748b', margin: '0 0 4px', textTransform: 'uppercase' as const }
const statusValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0f172a', margin: '0 0 6px' }
const button = {
  backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '14px', borderRadius: '8px',
  padding: '12px 20px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
