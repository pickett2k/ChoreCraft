# Resend Email Integration for ChoreCraft

## Overview

ChoreCraft now uses **Resend** for sending professional transactional emails directly from the app, replacing the previous expo-mail-composer implementation that required opening the device's mail app.

## Features

### ✅ Direct Email Sending
- Emails are sent directly via API without user interaction
- Professional HTML emails with ChoreCraft branding
- Automatic fallback to plain text for compatibility

### ✅ Email Types Supported
1. **Invitation Emails**: Sent when inviting new household members
2. **Welcome Emails**: Sent when users accept invitations

### ✅ Professional Design
- Responsive HTML email templates
- ChoreCraft branding and colors
- Mobile-friendly design
- Rich content with emojis and styling

## Configuration

### API Setup
- **Provider**: Resend (resend.com)
- **API Key**: `re_i3uaTod9_4kAGD9emHeAtsooiNFExeDCc`
- **From Address**: `ChoreCraft <noreply@formcraft.co.uk>`
- **Domain**: Using your existing formcraft.co.uk domain

### Implementation Files
- `src/services/resendEmailService.ts` - Main email service
- `src/services/firestoreService.ts` - Updated to use Resend
- `src/components/InvitationManagementModal.tsx` - Updated UI

## Email Templates

### Invitation Email Features
- Personal greeting with recipient name
- Household details and role information
- Clear invite code display
- Custom message support
- Step-by-step joining instructions
- Feature highlights of ChoreCraft
- Professional branding

### Welcome Email Features
- Congratulations message
- Getting started tips
- Household welcome message
- Quick start guide
- Support contact information

## Usage

### Sending Invitations
```typescript
import { resendEmailService } from '../services/resendEmailService';

const invitation = {
  recipientEmail: 'user@example.com',
  recipientName: 'John Doe', // optional
  inviterName: 'Jane Smith',
  householdName: 'The Smith Family',
  inviteCode: 'ABC123',
  role: 'member',
  customMessage: 'Welcome to our family!' // optional
};

const result = await resendEmailService.sendInvitationEmail(invitation);
```

### Sending Welcome Emails
```typescript
const result = await resendEmailService.sendWelcomeEmail(
  'user@example.com',
  'The Smith Family',
  'Jane Smith'
);
```

## Testing

### Development Testing
- Test button available in invitation modal (development builds only)
- Sends test emails to verify service functionality
- Real-time status checking

### Production Verification
- Email delivery confirmation via Resend dashboard
- Delivery tracking and analytics
- Error handling and logging

## Benefits Over Previous Implementation

### ✅ User Experience
- **Before**: Required users to manually send emails from their device
- **After**: Automatic email delivery without user interaction

### ✅ Reliability
- **Before**: Dependent on user's email app configuration
- **After**: Professional email service with 99.9% uptime

### ✅ Branding
- **Before**: Plain text emails from user's personal account
- **After**: Professional HTML emails with ChoreCraft branding

### ✅ Tracking
- **Before**: No delivery confirmation
- **After**: Full delivery tracking and analytics

## Cost Considerations

- **Free Tier**: 3,000 emails/month
- **Paid Plans**: Start at $20/month for 50,000 emails
- **Current Usage**: Well within free tier limits
- **Estimated Cost**: $0/month for typical household app usage

## Security

- API key securely configured
- Rate limiting built into Resend
- Email validation and sanitization
- Tag sanitization (household names converted to ASCII-only)
- No sensitive data exposed in emails

## Monitoring

### Resend Dashboard
- View all sent emails: https://resend.com/emails
- Delivery status and analytics
- Bounce and complaint tracking
- Real-time monitoring

### App Logging
- Success/failure logging in app console
- Error tracking for debugging
- Performance monitoring

## Future Enhancements

### Potential Additions
- Email templates for chore reminders
- Reward notifications
- Household digest emails
- Achievement congratulations
- Custom email themes

### Advanced Features
- Email scheduling
- A/B testing for templates
- Advanced analytics
- Webhook integration for delivery events

## Support

For any email delivery issues:
1. Check Resend dashboard for delivery status
2. Verify API key configuration
3. Check app console logs for errors
4. Contact Resend support if needed

## Troubleshooting

### Common Issues

#### "Tags should only contain ASCII letters, numbers, underscores, or dashes"
- **Fix**: Household names are automatically sanitized to replace special characters with underscores
- **Example**: "Smith Family 🏠" becomes "Smith_Family__"

#### "Invalid from address"
- **Fix**: Ensure the domain is verified in Resend dashboard
- **Current**: `ChoreCraft <noreply@formcraft.co.uk>`

#### "Rate limit exceeded"
- **Fix**: Resend free tier allows 3,000 emails/month
- **Solution**: Upgrade plan or implement email queuing

#### Email not delivered
- **Check**: Resend dashboard for bounce/complaint status
- **Common causes**: Invalid recipient email, spam filters, domain reputation

---

**Status**: ✅ Active and fully functional
**Last Updated**: December 2024
**Integration Status**: Production Ready 