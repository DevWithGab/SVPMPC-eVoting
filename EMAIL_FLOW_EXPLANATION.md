# Email Sending Flow - Complete Explanation

## 🔄 How Email Sending Works Now

### Before (What Was Happening)
```
CSV Upload
    ↓
Account Created
    ↓
SMS Sent ← Only SMS was sent
    ↓
Import Complete ← Email was NOT sent
```

### After (What's Happening Now)
```
CSV Upload
    ↓
Account Created
    ↓
SMS Sent
    ↓
Email Sent ← NOW EMAIL IS SENT!
    ↓
Import Complete
```

---

## 📧 Email Sending Process

### 1. Member Import Starts
```
Admin uploads CSV with:
- member_id: GABRIEL001
- name: Gabriel Salirungan
- phone_number: 09553019548
- email: gabrielsalirungan04@gmail.com
```

### 2. System Creates Account
```javascript
newUser = new User({
  member_id: 'GABRIEL001',
  fullName: 'Gabriel Salirungan',
  phone_number: '09553019548',
  email: 'gabrielsalirungan04@gmail.com',
  temporary_password_hash: hashedPassword,
  activation_status: 'pending_activation'
})
```

### 3. SMS Sent (Existing)
```javascript
await sendSMSAndLog({
  userId: newUser._id,
  adminId: adminId,
  temporaryPassword: tempPassword,
  cooperativeName: 'SVMPC',
  cooperativePhone: '+1-800-SVMPC-1'
})
```

### 4. Email Sent (NEW!)
```javascript
if (row.email && row.email.trim() !== '') {
  const emailResult = await sendEmailAndLog({
    userId: newUser._id,
    adminId: adminId,
    cooperativeName: 'SVMPC',
    cooperativePhone: '+1-800-SVMPC-1'
  })
}
```

### 5. Email Delivered
```
From: gabrielsalirungan16@gmail.com
To: gabrielsalirungan04@gmail.com
Subject: SVMPC - Activate Your Account

Content:
- Welcome message
- Activation link
- Login instructions
- Cooperative info
```

---

## 🔧 Technical Details

### Email Service Function
**File:** `server/services/emailService.js`

```javascript
async function sendEmailAndLog({
  userId,
  adminId,
  cooperativeName,
  cooperativePhone
}) {
  // 1. Fetch user from database
  const user = await User.findById(userId)
  
  // 2. Generate activation token
  const activationToken = generateActivationToken(userId)
  
  // 3. Generate activation link
  const activationLink = generateActivationLink(activationToken)
  
  // 4. Format email content
  const emailContent = formatEmailMessage({
    memberName: user.fullName,
    activationLink: activationLink,
    cooperativeName: cooperativeName,
    cooperativePhone: cooperativePhone
  })
  
  // 5. Send email via Nodemailer
  const emailResult = await sendEmailViaNodemailer({
    email: user.email,
    subject: `${cooperativeName} - Activate Your Account`,
    htmlContent: emailContent.html,
    textContent: emailContent.text
  })
  
  // 6. Log activity
  await Activity.create({
    userId: adminId,
    action: 'EMAIL_SENT',
    description: `Email sent to ${user.email}`,
    metadata: { member_id: user.member_id }
  })
  
  return emailResult
}
```

### Nodemailer Integration
**File:** `server/config/nodemailer.js`

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // gabrielsalirungan16@gmail.com
    pass: process.env.EMAIL_PASSWORD   // App Password
  }
})

// Send email
const info = await transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: recipientEmail,
  subject: 'SVMPC - Activate Your Account',
  html: htmlContent,
  text: textContent
})
```

---

## 📊 Email Content Example

### HTML Email
```html
<html>
  <body style="font-family: Arial, sans-serif;">
    <h1>Welcome to SVMPC</h1>
    
    <p>Hello Gabriel Salirungan,</p>
    
    <p>Your account has been created successfully!</p>
    
    <p>
      <strong>To activate your account:</strong><br>
      <a href="http://localhost:5173/activate?token=...">
        Click here to activate
      </a>
    </p>
    
    <p>
      <strong>Login Instructions:</strong><br>
      1. Visit the voting portal<br>
      2. Enter your Member ID and temporary password<br>
      3. Set a permanent password from your profile
    </p>
    
    <p>
      <strong>For assistance:</strong><br>
      Contact: +1-800-SVMPC-1
    </p>
  </body>
</html>
```

### Plain Text Email
```
Welcome to SVMPC

Hello Gabriel Salirungan,

Your account has been created successfully!

To activate your account:
http://localhost:5173/activate?token=...

Login Instructions:
1. Visit the voting portal
2. Enter your Member ID and temporary password
3. Set a permanent password from your profile

For assistance:
Contact: +1-800-SVMPC-1
```

---

## ✅ Error Handling

### If Email Sending Fails
```javascript
try {
  const emailResult = await sendEmailAndLog({...})
  
  if (!emailResult.success) {
    console.warn(`⚠️ Email failed: ${emailResult.message}`)
    // Don't fail the import
  }
} catch (emailError) {
  console.error(`❌ Email error: ${emailError.message}`)
  // Don't fail the import
}
```

### Graceful Degradation
- ✅ Account is created
- ✅ SMS is sent
- ⚠️ Email fails (logged)
- ✅ Import continues
- ✅ Member can still login

---

## 🔐 Security

### Email Credentials
- Stored in `.env` (not in code)
- Uses App Password (not main password)
- `.env` is in `.gitignore` (not committed)
- HTTPS recommended for production

### Email Content
- No sensitive data in email body
- Activation link is temporary
- Member must click link to activate
- Password not sent in email

---

## 📈 Activity Logging

### What Gets Logged
```javascript
{
  userId: adminId,
  action: 'EMAIL_SENT',
  description: 'Email sent to gabrielsalirungan04@gmail.com',
  metadata: {
    member_id: 'GABRIEL001',
    email: 'gabrielsalirungan04@gmail.com',
    sms_id: 'SMS_...',
    import_id: 'IMPORT_...'
  }
}
```

### Where to View Logs
1. Server console (real-time)
2. Activity log in database
3. Admin dashboard (future feature)

---

## 🎯 Complete Flow Example

### Step 1: Admin Uploads CSV
```csv
member_id,name,phone_number,email
GABRIEL001,Gabriel Salirungan,09553019548,gabrielsalirungan04@gmail.com
```

### Step 2: System Processes
```
✅ CSV validated
✅ Account created (GABRIEL001)
✅ Temporary password generated
✅ SMS sent to 09553019548
✅ Email sent to gabrielsalirungan04@gmail.com
✅ Activity logged
✅ Import completed
```

### Step 3: Member Receives Email
```
From: gabrielsalirungan16@gmail.com
To: gabrielsalirungan04@gmail.com
Subject: SVMPC - Activate Your Account

Content includes:
- Activation link
- Login instructions
- Temporary password info
- Cooperative contact
```

### Step 4: Member Activates Account
```
1. Member clicks activation link
2. Member sets permanent password
3. Account status changes to "activated"
4. Member can now login
```

---

## 📝 Summary

**Email sending is now fully integrated into the bulk import process:**

- ✅ Emails sent automatically during import
- ✅ Only sent if email provided in CSV
- ✅ Uses real Nodemailer with Gmail SMTP
- ✅ Graceful error handling
- ✅ All events logged
- ✅ No disruption if email fails

**Your member will now receive an activation email when imported!**
