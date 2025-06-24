import { Resend } from 'resend';

export interface EmailInvitation {
  recipientEmail: string;
  recipientName?: string;
  inviterName: string;
  householdName: string;
  inviteCode: string;
  role: 'admin' | 'member';
  customMessage?: string;
}

class ResendEmailService {
  private resend: Resend;
  private fromEmail = 'ChoreCraft <noreply@formcraft.co.uk>'; // Using your domain
  
  constructor() {
    // Initialize Resend with your API key
    this.resend = new Resend('re_i3uaTod9_4kAGD9emHeAtsooiNFExeDCc');
  }

  private generateInvitationHTML(invitation: EmailInvitation): string {
    const { recipientName, inviterName, householdName, inviteCode, role, customMessage } = invitation;
    
    const greeting = recipientName ? `Hi ${recipientName}` : 'Hello';
    const roleText = role === 'admin' ? 'administrator' : 'member';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ChoreCraft Invitation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #6C63FF 0%, #5A52E3 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .invite-details {
            background: #f8fafc;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #6C63FF;
        }
        .invite-code {
            background: #6C63FF;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
            margin: 20px 0;
            font-family: 'Courier New', monospace;
        }
        .features {
            background: #f0f9ff;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .feature {
            display: flex;
            align-items: center;
            margin: 12px 0;
            font-size: 16px;
        }
        .feature-icon {
            margin-right: 12px;
            font-size: 20px;
        }
        .steps {
            background: #fefce8;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .step {
            margin: 12px 0;
            padding-left: 24px;
            position: relative;
            font-size: 16px;
        }
        .step::before {
            content: counter(step-counter);
            counter-increment: step-counter;
            position: absolute;
            left: 0;
            top: 0;
            background: #f59e0b;
            color: white;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
        }
        .steps {
            counter-reset: step-counter;
        }
        .custom-message {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 16px 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
            font-style: italic;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }
        .footer a {
            color: #6C63FF;
            text-decoration: none;
        }
        .btn {
            display: inline-block;
            background: #6C63FF;
            color: white;
            padding: 14px 28px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background: #5A52E3;
        }
        .highlight {
            background: #fef3c7;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 You're Invited!</h1>
            <p>Join ${householdName} on ChoreCraft</p>
        </div>
        
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 24px;">${greeting},</p>
            
            <p style="font-size: 16px;"><strong>${inviterName}</strong> has invited you to join their household "<strong>${householdName}</strong>" as ${role === 'admin' ? 'an' : 'a'} <span class="highlight">${roleText}</span> on ChoreCraft!</p>
            
            ${customMessage ? `
            <div class="custom-message">
                <strong>Personal message from ${inviterName}:</strong><br>
                "${customMessage}"
            </div>
            ` : ''}
            
            <div class="invite-details">
                <h3 style="margin-top: 0; color: #374151;">📋 Your Invitation Details</h3>
                <p><strong>Household:</strong> ${householdName}</p>
                <p><strong>Role:</strong> ${roleText.charAt(0).toUpperCase() + roleText.slice(1)}</p>
                <p><strong>Invited by:</strong> ${inviterName}</p>
            </div>
            
            <div class="invite-code">
                ${inviteCode}
            </div>
            <p style="text-align: center; margin-top: 8px; color: #6b7280; font-size: 14px;">Your invite code</p>
            
            <div class="features">
                <h3 style="margin-top: 0; color: #374151;">🎯 What is ChoreCraft?</h3>
                <p style="margin-bottom: 16px;">ChoreCraft makes household tasks fun and rewarding for the whole family:</p>
                
                <div class="feature">
                    <span class="feature-icon">📋</span>
                    <span>Manage and track household chores easily</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🪙</span>
                    <span>Earn coins for completing tasks</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🎁</span>
                    <span>Redeem rewards with your earned coins</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📊</span>
                    <span>See family progress and achievements</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🏆</span>
                    <span>Build streaks and compete with family</span>
                </div>
            </div>
            
            <div class="steps">
                <h3 style="margin-top: 0; color: #374151;">🚀 How to Join</h3>
                <div class="step">Download ChoreCraft from the App Store or Google Play</div>
                <div class="step">Create an account using this email address (${invitation.recipientEmail})</div>
                <div class="step">Enter the invite code: <strong>${inviteCode}</strong></div>
                <div class="step">Start earning coins and completing chores!</div>
            </div>
            
            <p style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 24px 0;">
                <strong>⏰ Important:</strong> This invitation will expire in <strong>14 days</strong>, so don't wait too long!
            </p>
            
            <p style="font-size: 16px; margin-top: 32px;">
                If you already have ChoreCraft installed, just open the app and enter the invite code <strong>${inviteCode}</strong> in the "Join Household" section.
            </p>
            
            <p style="font-size: 18px; margin-top: 32px;">
                Welcome to the family! 🎉<br>
                <em>The ChoreCraft Team</em>
            </p>
        </div>
        
        <div class="footer">
            <p>Need help? Contact us at <a href="mailto:support@chorecraft.app">support@chorecraft.app</a></p>
            <p>Download ChoreCraft: <a href="https://chorecraft.app/download">https://chorecraft.app/download</a></p>
            <p style="font-size: 12px; margin-top: 20px;">
                This email was sent because ${inviterName} invited you to join their ChoreCraft household.
            </p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  private generateInvitationText(invitation: EmailInvitation): string {
    const { recipientName, inviterName, householdName, inviteCode, role, customMessage } = invitation;
    
    const greeting = recipientName ? `Hi ${recipientName}` : 'Hello';
    const roleText = role === 'admin' ? 'administrator' : 'member';
    
    return `
${greeting},

${inviterName} has invited you to join their household "${householdName}" as ${role === 'admin' ? 'an' : 'a'} ${roleText} on ChoreCraft!

${customMessage ? `Personal message from ${inviterName}: "${customMessage}"\n` : ''}

WHAT IS CHORECRAFT?
ChoreCraft is a family chore management app that makes household tasks fun and rewarding:

• 📋 Manage and track household chores
• 🪙 Earn coins for completing tasks  
• 🎁 Redeem rewards with your earned coins
• 📊 See family progress and achievements
• 🏆 Build streaks and compete with family members

YOUR INVITATION DETAILS:
• Household: ${householdName}
• Role: ${roleText.charAt(0).toUpperCase() + roleText.slice(1)}
• Invited by: ${inviterName}

HOW TO JOIN:
1. Download ChoreCraft from the App Store or Google Play
2. Create an account using this email address (${invitation.recipientEmail})
3. Enter the invite code: ${inviteCode}
4. Start earning coins and completing chores!

If you already have ChoreCraft installed, just open the app and enter the invite code "${inviteCode}" in the "Join Household" section.

⏰ IMPORTANT: This invitation will expire in 14 days, so don't wait too long!

Welcome to the family! 🎉
The ChoreCraft Team

---
Need help? Contact us at support@chorecraft.app
Download ChoreCraft: https://chorecraft.app/download

This email was sent because ${inviterName} invited you to join their ChoreCraft household.
    `.trim();
  }

  private generateWelcomeHTML(householdName: string, inviterName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ChoreCraft!</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .tips {
            background: #f0fdf4;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .tip {
            display: flex;
            align-items: center;
            margin: 12px 0;
            font-size: 16px;
        }
        .tip-icon {
            margin-right: 12px;
            font-size: 20px;
        }
        .celebration {
            text-align: center;
            background: #fef3c7;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
        }
        .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }
        .footer a {
            color: #10b981;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to ChoreCraft!</h1>
            <p>You're now part of ${householdName}</p>
        </div>
        
        <div class="content">
            <div class="celebration">
                <h2 style="margin-top: 0; color: #374151;">🏠 Congratulations!</h2>
                <p style="font-size: 18px; margin-bottom: 0;">You've successfully joined "<strong>${householdName}</strong>" and you're ready to start earning coins and completing chores!</p>
            </div>
            
            <div class="tips">
                <h3 style="margin-top: 0; color: #374151;">🚀 Here are some tips to get started:</h3>
                
                <div class="tip">
                    <span class="tip-icon">📱</span>
                    <span>Check the <strong>Chores tab</strong> to see what tasks are available</span>
                </div>
                <div class="tip">
                    <span class="tip-icon">🪙</span>
                    <span>Complete chores to <strong>earn coins</strong> for your efforts</span>
                </div>
                <div class="tip">
                    <span class="tip-icon">🎁</span>
                    <span>Visit the <strong>Exchange tab</strong> to see available rewards</span>
                </div>
                <div class="tip">
                    <span class="tip-icon">📊</span>
                    <span>Track your progress on the <strong>Home screen</strong></span>
                </div>
                <div class="tip">
                    <span class="tip-icon">🏆</span>
                    <span>Build daily streaks and compete with family members</span>
                </div>
            </div>
            
            <p style="font-size: 18px; text-align: center; background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <strong>${inviterName}</strong> and your household are excited to have you aboard! 🎊
            </p>
            
            <p style="font-size: 18px; margin-top: 32px; text-align: center;">
                Happy chore-ing! 🧹✨<br>
                <em>The ChoreCraft Team</em>
            </p>
        </div>
        
        <div class="footer">
            <p>Need help getting started? Check out our guide: <a href="https://chorecraft.app/getting-started">Getting Started Guide</a></p>
            <p>Questions? Contact us at <a href="mailto:support@chorecraft.app">support@chorecraft.app</a></p>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  async sendInvitationEmail(invitation: EmailInvitation): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending invitation email via Resend to:', invitation.recipientEmail);
      
      const subject = `🏠 You're invited to join ${invitation.householdName} on ChoreCraft!`;
      const sanitizedHouseholdName = invitation.householdName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      console.log('📧 Email details:', {
        from: this.fromEmail,
        to: invitation.recipientEmail,
        subject: subject,
        householdTag: sanitizedHouseholdName
      });
      
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [invitation.recipientEmail],
        subject: subject,
        html: this.generateInvitationHTML(invitation),
        text: this.generateInvitationText(invitation),
        tags: [
          { name: 'type', value: 'invitation' },
          { name: 'household', value: sanitizedHouseholdName },
          { name: 'role', value: invitation.role }
        ]
      });

      if (error) {
        console.error('❌ Resend API error:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Unknown Resend API error' };
      }

      console.log('✅ Invitation email sent successfully via Resend:', data?.id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error sending invitation email via Resend:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send invitation email' 
      };
    }
  }

  async sendWelcomeEmail(recipientEmail: string, householdName: string, inviterName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending welcome email via Resend to:', recipientEmail);
      
      const subject = `🎉 Welcome to ${householdName}!`;
      const sanitizedHouseholdName = householdName.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      console.log('📧 Welcome email details:', {
        from: this.fromEmail,
        to: recipientEmail,
        subject: subject,
        householdTag: sanitizedHouseholdName
      });
      
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [recipientEmail],
        subject: subject,
        html: this.generateWelcomeHTML(householdName, inviterName),
        text: this.generateWelcomeText(householdName, inviterName),
        tags: [
          { name: 'type', value: 'welcome' },
          { name: 'household', value: sanitizedHouseholdName }
        ]
      });

      if (error) {
        console.error('❌ Resend API error:', JSON.stringify(error, null, 2));
        return { success: false, error: error.message || 'Unknown Resend API error' };
      }

      console.log('✅ Welcome email sent successfully via Resend:', data?.id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error sending welcome email via Resend:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send welcome email' 
      };
    }
  }

  private generateWelcomeText(householdName: string, inviterName: string): string {
    return `Welcome to ChoreCraft!

🎉 Congratulations! You've successfully joined "${householdName}"!

🚀 Tips to get started:
• 📱 Check the Chores tab for available tasks
• 🪙 Complete chores to earn coins
• 🎁 Visit Exchange tab for rewards
• 📊 Track progress on Home screen
• 🏆 Build streaks and compete with family!

${inviterName} and your household are excited to have you aboard! 🎊

Happy chore-ing! 🧹✨
The ChoreCraft Team

---
Need help? support@chorecraft.app
Getting started: https://chorecraft.app/getting-started`;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test the connection by sending a test email to a safe address
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: ['test@resend.dev'], // Resend's test email
        subject: 'ChoreCraft Email Service Test',
        text: 'This is a test email to verify the Resend email service is working correctly.',
        tags: [{ name: 'type', value: 'test' }]
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test email service' 
      };
    }
  }
}

export const resendEmailService = new ResendEmailService();
export default resendEmailService; 