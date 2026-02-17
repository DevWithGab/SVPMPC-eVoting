# Email Configuration with Nodemailer

This guide explains how to set up real email sending using Nodemailer for the bulk member import feature.

## Quick Start (Gmail)

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification if not already enabled

### Step 2: Generate App Password
1. Go to [Google Account App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer" (or your device)
3. Google will generate a 16-character password
4. Copy this password

### Step 3: Update .env File
Add these lines to `server/.env`:

```env
# Email Configuration (Gmail)
EMAIL_PROVIDER=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

Replace:
- `your-email@gmail.com` with your actual Gmail address
- `your-16-char-app-password` with the password generated in Step 2

### Step 4: Restart Server
```bash
npm run dev
```

The system will now send real emails when you import members!

---

## Alternative: Custom SMTP Server

If you want to use a different email provider (Outlook, custom SMTP, etc.):

### Update .env File
```env
# Email Configuration (Custom SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
EMAIL_FROM=your-email@example.com
```

### Common SMTP Servers
- **Gmail**: `smtp.gmail.com` (port 587, secure: false)
- **Outlook**: `smtp-mail.outlook.com` (port 587, secure: false)
- **SendGrid**: `smtp.sendgrid.net` (port 587, secure: false)
- **AWS SES**: `email-smtp.region.amazonaws.com` (port 587, secure: false)

---

## Testing Email Configuration

### Option 1: Use Mailtrap (Free Testing)
1. Sign up at [Mailtrap.io](https://mailtrap.io)
2. Create a new inbox
3. Copy SMTP credentials
4. Update .env with Mailtrap credentials
5. All emails will be captured in Mailtrap inbox (not sent to real addresses)

### Option 2: Check Server Logs
When you import members, check the server console for:
- ✅ `✅ Email sent successfully` - Email was sent
- ❌ `❌ Nodemailer error` - Email failed (check credentials)
- ⚠️ `⚠️ Email credentials not configured` - Using mock mode

---

## How It Works

### When Email Credentials Are Configured
1. Admin uploads CSV with member emails
2. System creates member accounts
3. **Real emails are sent** to each member with:
   - Activation link
   - Login instructions
   - Cooperative contact information

### When Email Credentials Are NOT Configured
1. System falls back to **mock mode**
2. Emails are simulated (not actually sent)
3. Useful for development/testing without real email setup

---

## Troubleshooting

### "Email credentials not configured"
- Add `EMAIL_USER` and `EMAIL_PASSWORD` to `.env`
- Restart the server

### "Invalid login credentials"
- For Gmail: Make sure you're using an **App Password**, not your regular password
- For custom SMTP: Verify username and password are correct

### "SMTP connection timeout"
- Check SMTP_HOST and SMTP_PORT are correct
- Verify firewall allows outbound SMTP connections

### "Email sent but not received"
- Check spam/junk folder
- Verify recipient email address is correct
- Check email provider's delivery logs

---

## Security Notes

⚠️ **Never commit .env file to version control**
- `.env` is already in `.gitignore`
- Keep email credentials private
- Use App Passwords instead of main account password

---

## Email Content

Members receive emails with:
- **Subject**: `SVMPC - Activate Your Account`
- **Content**:
  - Welcome message
  - Activation link
  - Login instructions
  - Cooperative contact information
  - HTML and plain text versions

---

## Next Steps

1. Configure email credentials in `.env`
2. Restart the server
3. Upload a CSV with real member emails
4. Check that emails are received
5. Members can click activation link to set permanent password

