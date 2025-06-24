# Firebase Functions Email Service Setup

This guide explains how to set up Firebase Functions with an email service provider for sending invitation emails in production.

## Overview

Currently, the app uses `expo-mail-composer` which opens the device's email app. For production, you should implement Firebase Functions with a proper email service provider for reliable, automated email delivery.

## Prerequisites

- Firebase project with Firestore enabled
- Firebase CLI installed (`npm install -g firebase-tools`)
- Email service provider account (SendGrid, Mailgun, or similar)

## Setup Steps

### 1. Initialize Firebase Functions

```bash
# In your project root
firebase init functions

# Choose:
# - TypeScript or JavaScript (recommend TypeScript)
# - Install dependencies
```

### 2. Install Email Service Dependencies

```bash
cd functions
npm install @sendgrid/mail
# OR for Mailgun:
# npm install mailgun-js
# OR for Nodemailer:
# npm install nodemailer
```

### 3. Set Environment Variables

```bash
# Set your email service API key
firebase functions:config:set sendgrid.api_key="YOUR_SENDGRID_API_KEY"
firebase functions:config:set email.from_address="noreply@chorecraft.app"
firebase functions:config:set email.from_name="ChoreCraft"

# For local development
firebase functions:config:get > .runtimeconfig.json
```

### 4. Create Email Function

Create `functions/src/email.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Initialize SendGrid
sgMail.setApiKey(functions.config().sendgrid.api_key);

interface EmailInvitation {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  householdName: string;
  inviteCode: string;
  role: 'admin' | 'member';
  customMessage?: string;
}

export const sendInvitationEmail = functions.https.onCall(async (data: EmailInvitation, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { recipientEmail, inviterName, householdName, inviteCode, role, customMessage } = data;
    
    const greeting = data.recipientName ? `Hi ${data.recipientName}` : 'Hello';
    const roleText = role === 'admin' ? 'administrator' : 'member';
    
    const subject = `🏠 You're invited to join ${householdName} on ChoreCraft!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ChoreCraft Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6C63FF; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .invite-code { background: #fff; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; color: #6C63FF; margin: 20px 0; }
          .button { display: inline-block; background: #6C63FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .features { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .feature { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 ChoreCraft Invitation</h1>
          </div>
          <div class="content">
            <p>${greeting},</p>
            
            <p><strong>${inviterName}</strong> has invited you to join their household "<strong>${householdName}</strong>" as ${role === 'admin' ? 'an' : 'a'} ${roleText} on ChoreCraft!</p>
            
            ${customMessage ? `<p><em>"${customMessage}"</em></p>` : ''}
            
            <div class="invite-code">
              <div>Your Invite Code:</div>
              <div>${inviteCode}</div>
            </div>
            
            <div class="features">
              <h3>What is ChoreCraft?</h3>
              <p>ChoreCraft is a family chore management app that makes household tasks fun and rewarding:</p>
              <div class="feature">📋 Manage and track household chores</div>
              <div class="feature">🪙 Earn coins for completing tasks</div>
              <div class="feature">🎁 Redeem rewards with your earned coins</div>
              <div class="feature">📊 See family progress and achievements</div>
              <div class="feature">🏆 Build streaks and compete with family members</div>
            </div>
            
            <h3>How to Join:</h3>
            <ol>
              <li>Download ChoreCraft from the App Store or Google Play</li>
              <li>Create an account using this email address (${recipientEmail})</li>
              <li>Enter the invite code: <strong>${inviteCode}</strong></li>
              <li>Start earning coins and completing chores!</li>
            </ol>
            
            <p>If you already have ChoreCraft installed, just open the app and enter the invite code in the "Join Household" section.</p>
            
            <p><strong>Note:</strong> This invitation will expire in 14 days, so don't wait too long!</p>
            
            <p>Welcome to the family,<br>The ChoreCraft Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
${greeting},

${inviterName} has invited you to join their household "${householdName}" as ${role === 'admin' ? 'an' : 'a'} ${roleText} on ChoreCraft!

${customMessage ? `Personal message: "${customMessage}"\n` : ''}

ChoreCraft is a family chore management app that makes household tasks fun and rewarding. With ChoreCraft, you can:
• 📋 Manage and track household chores
• 🪙 Earn coins for completing tasks
• 🎁 Redeem rewards with your earned coins
• 📊 See family progress and achievements
• 🏆 Build streaks and compete with family members

Your Invitation Details:
• Household: ${householdName}
• Role: ${roleText.charAt(0).toUpperCase() + roleText.slice(1)}
• Invite Code: ${inviteCode}

How to Join:
1. Download ChoreCraft from the App Store or Google Play
2. Create an account using this email address (${recipientEmail})
3. Enter the invite code: ${inviteCode}
4. Start earning coins and completing chores!

If you already have ChoreCraft installed, just open the app and enter the invite code in the "Join Household" section.

This invitation will expire in 14 days, so don't wait too long!

Welcome to the family,
The ChoreCraft Team

---
Need help? Contact us at support@chorecraft.app
Download ChoreCraft: https://chorecraft.app/download
    `.trim();

    const msg = {
      to: recipientEmail,
      from: {
        email: functions.config().email.from_address,
        name: functions.config().email.from_name,
      },
      subject,
      text: textContent,
      html: htmlContent,
    };

    await sgMail.send(msg);
    
    console.log(`✅ Invitation email sent to ${recipientEmail}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send invitation email');
  }
});

export const sendWelcomeEmail = functions.https.onCall(async (data: { 
  recipientEmail: string; 
  householdName: string; 
  inviterName: string; 
}, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const { recipientEmail, householdName, inviterName } = data;
    
    const subject = `🎉 Welcome to ${householdName}!`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to ChoreCraft</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .tips { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .tip { margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to ChoreCraft!</h1>
          </div>
          <div class="content">
            <p>Congratulations! You've successfully joined "<strong>${householdName}</strong>" and you're ready to start earning coins and completing chores!</p>
            
            <div class="tips">
              <h3>Here are some tips to get started:</h3>
              <div class="tip">📱 Check the Chores tab to see what tasks are available</div>
              <div class="tip">🪙 Complete chores to earn coins</div>
              <div class="tip">🎁 Visit the Exchange tab to see available rewards</div>
              <div class="tip">📊 Track your progress on the Home screen</div>
            </div>
            
            <p><strong>${inviterName}</strong> and your household are excited to have you aboard!</p>
            
            <p>Happy chore-ing!<br>The ChoreCraft Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to ChoreCraft!

You've successfully joined "${householdName}" and you're ready to start earning coins and completing chores!

Here are some tips to get started:
• 📱 Check the Chores tab to see what tasks are available
• 🪙 Complete chores to earn coins
• 🎁 Visit the Exchange tab to see available rewards
• 📊 Track your progress on the Home screen

${inviterName} and your household are excited to have you aboard!

Happy chore-ing!
The ChoreCraft Team

---
Need help getting started? Check out our guide: https://chorecraft.app/getting-started
    `.trim();

    const msg = {
      to: recipientEmail,
      from: {
        email: functions.config().email.from_address,
        name: functions.config().email.from_name,
      },
      subject,
      text: textContent,
      html: htmlContent,
    };

    await sgMail.send(msg);
    
    console.log(`✅ Welcome email sent to ${recipientEmail}`);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send welcome email');
  }
});
```

### 5. Update Client-Side Code

Update `src/services/emailService.ts` to use Firebase Functions:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

// Add to EmailService class
async sendEmailViaFirebaseFunction(
  functionName: string, 
  emailData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const functions = getFunctions();
    const sendEmail = httpsCallable(functions, functionName);
    const result = await sendEmail(emailData);
    return result.data as { success: boolean; error?: string };
  } catch (error) {
    console.error('❌ Error calling Firebase Function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email via Firebase' };
  }
}
```

### 6. Deploy Functions

```bash
# Deploy all functions
firebase deploy --only functions

# Or deploy specific functions
firebase deploy --only functions:sendInvitationEmail,sendWelcomeEmail
```

### 7. Update Firestore Service

Modify `sendInvitation` method in `firestoreService.ts`:

```typescript
// In production, use Firebase Functions instead of local email service
if (process.env.NODE_ENV === 'production') {
  const { getFunctions, httpsCallable } = await import('firebase/functions');
  const functions = getFunctions();
  const sendInvitationEmail = httpsCallable(functions, 'sendInvitationEmail');
  
  const emailResult = await sendInvitationEmail(emailInvitation);
  // Handle result...
} else {
  // Use local email service for development
  const { emailService } = await import('./emailService');
  const emailResult = await emailService.sendInvitationEmail(emailInvitation);
  // Handle result...
}
```

## Email Service Providers

### SendGrid (Recommended)
- Free tier: 100 emails/day
- Easy setup and reliable delivery
- Great templates and analytics
- Sign up: https://sendgrid.com/

### Mailgun
- Free tier: 5,000 emails/month for 3 months
- Developer-friendly API
- Good for transactional emails
- Sign up: https://www.mailgun.com/

### Amazon SES
- Very cost-effective
- $0.10 per 1,000 emails
- Requires AWS account
- More complex setup

## Current Implementation

The app currently works with:
1. **Expo MailComposer** - Opens device's email app with pre-filled invitation
2. **System Share Dialog** - Fallback for copying invitation text
3. **Direct Email Links** - Opens default email app with mailto: links

## Production Upgrade Path

To upgrade to Firebase Functions for production:
1. Set up Firebase Functions (see setup guide above)
2. Choose an email service provider
3. Implement server-side email templates
4. Add proper authentication and rate limiting
5. Deploy and test

## Cost Estimation

- Firebase Functions: $0.40 per million invocations
- SendGrid: Free tier covers most small to medium households
- Total cost for 1,000 invitations/month: ~$1-2

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **Authentication**: Verify user authentication in functions
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Email Validation**: Validate email addresses server-side
5. **Spam Prevention**: Use proper email headers and authentication

## Testing

```bash
# Test locally
firebase emulators:start --only functions

# Test the function
curl -X POST https://us-central1-your-project.cloudfunctions.net/sendInvitationEmail \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"test@example.com","inviterName":"Test User","householdName":"Test Household","inviteCode":"ABC123","role":"member"}'
```

## Monitoring

- Check Firebase Console > Functions for logs and metrics
- Monitor email delivery rates in your email provider dashboard
- Set up alerts for function failures

## Troubleshooting

### Common Issues:
1. **"Permission denied"**: Check Firebase security rules
2. **"API key invalid"**: Verify environment variables
3. **"Email not delivered"**: Check spam folder, verify sender domain
4. **"Function timeout"**: Increase timeout in Firebase Console

### Debug Steps:
1. Check Firebase Functions logs
2. Test with a simple email first
3. Verify email provider settings
4. Check network connectivity

## Next Steps

After setting up Firebase Functions:
1. Test with real email addresses
2. Set up email templates for different languages
3. Add email tracking and analytics
4. Implement email preferences (frequency, types)
5. Set up automated email sequences

This setup provides a production-ready email service that's scalable, reliable, and cost-effective for your ChoreCraft application. 