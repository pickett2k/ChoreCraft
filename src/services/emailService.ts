import * as MailComposer from 'expo-mail-composer';
import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';

export interface EmailInvitation {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  householdName: string;
  inviteCode: string;
  role: 'admin' | 'member';
  customMessage?: string;
}

export interface EmailTemplate {
  subject: string;
  body: string;
  isHTML?: boolean;
}

class EmailService {
  private generateInvitationTemplate(invitation: EmailInvitation): EmailTemplate {
    const { recipientName, inviterName, householdName, inviteCode, role, customMessage } = invitation;
    
    const greeting = recipientName ? `Hi ${recipientName}` : 'Hello';
    const roleText = role === 'admin' ? 'administrator' : 'member';
    
    const subject = `🏠 You're invited to join ${householdName} on ChoreCraft!`;
    
    const body = `
${greeting},

${inviterName} has invited you to join their household "${householdName}" as ${role === 'admin' ? 'an' : 'a'} ${roleText} on ChoreCraft!

${customMessage ? `Personal message: "${customMessage}"\n` : ''}

ChoreCraft is a family chore management app that makes household tasks fun and rewarding. With ChoreCraft, you can:
• 📋 Manage and track household chores
• 🪙 Earn coins for completing tasks
• 🎁 Redeem rewards with your earned coins
• 📊 See family progress and achievements
• 🏆 Build streaks and compete with family members

**Your Invitation Details:**
• Household: ${householdName}
• Role: ${roleText.charAt(0).toUpperCase() + roleText.slice(1)}
• Invite Code: ${inviteCode}

**How to Join:**
1. Download ChoreCraft from the App Store or Google Play
2. Create an account using this email address (${invitation.recipientEmail})
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

    return { subject, body };
  }

  private generateWelcomeTemplate(householdName: string, inviterName: string): EmailTemplate {
    const subject = `🎉 Welcome to ${householdName}!`;
    
    const body = `
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

    return { subject, body };
  }

  async sendInvitationEmail(invitation: EmailInvitation): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if mail composer is available
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        return this.fallbackToShareInvitation(invitation);
      }

      const template = this.generateInvitationTemplate(invitation);
      
      const result = await MailComposer.composeAsync({
        recipients: [invitation.recipientEmail],
        subject: template.subject,
        body: template.body,
        isHtml: false,
      });

      if (result.status === MailComposer.MailComposerStatus.SENT) {
        console.log('✅ Invitation email sent successfully');
        return { success: true };
      } else if (result.status === MailComposer.MailComposerStatus.SAVED) {
        console.log('📝 Invitation email saved as draft');
        return { success: true };
      } else {
        console.log('❌ Email sending cancelled by user');
        return { success: false, error: 'Email sending was cancelled' };
      }
    } catch (error) {
      console.error('❌ Error sending invitation email:', error);
      return this.fallbackToShareInvitation(invitation);
    }
  }

  private async fallbackToShareInvitation(invitation: EmailInvitation): Promise<{ success: boolean; error?: string }> {
    const template = this.generateInvitationTemplate(invitation);
    
    // Create a shareable text message
    const shareText = `${template.subject}\n\n${template.body}`;
    
    // Try to open default email app with pre-filled content
    const emailUrl = `mailto:${invitation.recipientEmail}?subject=${encodeURIComponent(template.subject)}&body=${encodeURIComponent(template.body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
        return { success: true };
      }
    } catch (error) {
      console.log('Could not open email app, showing manual sharing option');
    }

    // Final fallback - show the user the invitation details to share manually
    Alert.alert(
      'Share Invitation',
      `Email app not available. Please share this invitation manually:\n\nTo: ${invitation.recipientEmail}\nInvite Code: ${invitation.inviteCode}\n\nOr copy the full invitation message and send it via your preferred method.`,
      [
        { text: 'OK' },
        {
          text: 'Copy Invitation',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(shareText);
              Alert.alert('Copied!', 'Invitation details copied to clipboard');
            } catch (error) {
              console.error('Failed to copy to clipboard:', error);
              Alert.alert('Error', 'Failed to copy invitation to clipboard');
            }
          }
        }
      ]
    );

    return { success: true };
  }

  async sendWelcomeEmail(recipientEmail: string, householdName: string, inviterName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        // For welcome emails, we can skip if not available since it's not critical
        console.log('📧 Mail composer not available, skipping welcome email');
        return { success: true };
      }

      const template = this.generateWelcomeTemplate(householdName, inviterName);
      
      const result = await MailComposer.composeAsync({
        recipients: [recipientEmail],
        subject: template.subject,
        body: template.body,
        isHtml: false,
      });

      return { success: result.status === MailComposer.MailComposerStatus.SENT };
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send welcome email' };
    }
  }

  // Firebase Functions integration (for production)
  async sendEmailViaFirebaseFunction(
    functionName: string, 
    emailData: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would call a Firebase Function that handles email sending
      // Example using Firebase Functions SDK:
      /*
      const functions = getFunctions();
      const sendEmail = httpsCallable(functions, functionName);
      const result = await sendEmail(emailData);
      return result.data;
      */
      
      console.log('🔥 Firebase Functions not implemented yet');
      return { success: false, error: 'Firebase Functions email service not configured' };
    } catch (error) {
      console.error('❌ Error calling Firebase Function:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email via Firebase' };
    }
  }

  // Method to check if email services are properly configured
  async checkEmailServiceAvailability(): Promise<{
    mailComposer: boolean;
    firebaseFunctions: boolean;
    recommendedAction?: string;
  }> {
    const mailComposer = await MailComposer.isAvailableAsync();
    const firebaseFunctions = false; // Would check if Firebase Functions are configured
    
    let recommendedAction: string | undefined;
    
    if (!mailComposer && !firebaseFunctions) {
      recommendedAction = 'Set up Firebase Functions with an email service provider for reliable email delivery';
    } else if (!firebaseFunctions) {
      recommendedAction = 'Consider setting up Firebase Functions for production email delivery';
    }

    return {
      mailComposer,
      firebaseFunctions,
      recommendedAction
    };
  }
}

export const emailService = new EmailService();
export default emailService; 