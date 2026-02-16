# Design Document: Bulk Member Import & Email Activation

## Overview

The Bulk Member Import & Email Activation feature provides administrators with a streamlined workflow to onboard 1000+ cooperative members. The system accepts CSV files containing member data (member ID, name, phone number, optional email), validates the data, creates member accounts, and sends SMS invitations with temporary passwords. Members can immediately log in with their temporary passwords and vote, with the option to set a permanent password anytime from their profile. The system tracks activation status, supports resending invitations, and maintains comprehensive audit trails for compliance.

### Key Design Principles

1. **SMS-First Approach**: SMS is the primary activation method, accommodating older members without email
2. **Immediate Access**: Members can vote immediately with temporary passwords
3. **Flexible Activation**: Password change is optional but encouraged
4. **Comprehensive Tracking**: All operations are logged for audit and compliance
5. **Error Resilience**: Failures in one member's processing don't block others
6. **Security First**: Passwords are hashed, tokens are secure, data is encrypted

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CSV Upload Interface                                │   │
│  │  - File selection and validation                     │   │
│  │  - Preview and confirmation                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Member Status Dashboard                             │   │
│  │  - Activation status tracking                        │   │
│  │  - Filtering, searching, sorting                     │   │
│  │  - Resend invitation functionality                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Import History & Audit Trail                        │   │
│  │  - Import operation history                          │   │
│  │  - Detailed import records                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  CSV Processing Service                              │   │
│  │  - File validation                                   │   │
│  │  - Data parsing and validation                       │   │
│  │  - Duplicate detection                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Member Account Service                              │   │
│  │  - Account creation                                  │   │
│  │  - Temporary password generation                     │   │
│  │  - Password management                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Notification Service                                │   │
│  │  - SMS delivery (primary)                            │   │
│  │  - Email delivery (backup)                           │   │
│  │  - Retry logic                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Activity Logging Service                            │   │
│  │  - Import operations                                 │   │
│  │  - Account activations                               │   │
│  │  - Password changes                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MongoDB Collections                                 │   │
│  │  - users (extended with import metadata)             │   │
│  │  - import_operations (new)                           │   │
│  │  - activity_logs (existing, extended)                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

#### 1. BulkImportUpload Component
- CSV file upload interface
- File format validation (client-side)
- Preview of parsed data
- Confirmation dialog

#### 2. MemberStatusDashboard Component
- Table of imported members with status
- Filtering by status, search by member_id/phone
- Sorting by any column
- Resend invitation button (single and bulk)
- Member detail view

#### 3. ImportHistoryView Component
- List of all import operations
- Import metadata (date, admin, count, success/failure)
- Drill-down to import details
- Member list from specific import

#### 4. PasswordChangeForm Component
- Current password verification
- New password input with validation
- Password strength indicator
- Success/error messages

### Backend API Endpoints

#### Import Operations
- `POST /api/imports/upload` - Upload and validate CSV file
- `POST /api/imports/confirm` - Confirm and process import
- `GET /api/imports` - List all imports with pagination
- `GET /api/imports/:importId` - Get import details
- `GET /api/imports/:importId/members` - Get members from import

#### Member Management
- `GET /api/members/imported` - List imported members with status
- `GET /api/members/:memberId` - Get member details
- `POST /api/members/:memberId/resend-invitation` - Resend SMS/email
- `POST /api/members/bulk-resend` - Bulk resend invitations
- `PUT /api/members/:memberId/password` - Change password

#### Authentication (Existing, Extended)
- `POST /api/auth/login` - Login with member_id and password (temp or permanent)
- `POST /api/auth/change-password` - Change password from profile

## Data Models

### User Model (Extended)

```typescript
interface User {
  _id: ObjectId;
  member_id: string;                    // Unique member ID from CSV
  name: string;
  email?: string;                       // Optional
  phone_number: string;                 // Required, unique
  password_hash: string;                // Hashed password (bcryptjs)
  temporary_password_hash?: string;     // Hashed temporary password
  temporary_password_expires?: Date;    // 24 hours from creation
  role: "member" | "admin" | "officer"; // Always "member" for imports
  activation_status: "pending_activation" | "activated" | "sms_failed" | "email_failed" | "token_expired";
  activation_method?: "sms" | "email";  // How they activated
  activated_at?: Date;                  // When they set permanent password
  import_id: ObjectId;                  // Reference to import operation
  sms_sent_at?: Date;                   // When SMS was sent
  email_sent_at?: Date;                 // When email was sent
  last_password_change?: Date;          // Track password changes
  created_at: Date;
  updated_at: Date;
}
```

### ImportOperation Model (New)

```typescript
interface ImportOperation {
  _id: ObjectId;
  admin_id: ObjectId;                   // Admin who performed import
  admin_name: string;                   // Admin name for audit
  csv_file_name: string;                // Original CSV filename
  total_rows: number;                   // Total rows in CSV
  successful_imports: number;           // Successfully created accounts
  failed_imports: number;               // Failed to create accounts
  skipped_rows: number;                 // Duplicates or invalid rows
  import_errors: Array<{                // Detailed error info
    row_number: number;
    member_id?: string;
    error_message: string;
  }>;
  sms_sent_count: number;               // SMS successfully sent
  sms_failed_count: number;             // SMS failed to send
  email_sent_count: number;             // Email successfully sent
  email_failed_count: number;           // Email failed to send
  status: "pending" | "completed" | "failed";
  created_at: Date;
  updated_at: Date;
}
```

### Activity Log Entry (Extended)

```typescript
interface ActivityLog {
  _id: ObjectId;
  user_id: ObjectId;                    // Admin or member
  action: string;                       // "bulk_import", "sms_sent", "activation", "password_change", etc.
  resource_type: string;                // "import", "user", "password"
  resource_id: ObjectId;                // ID of affected resource
  details: {
    import_id?: ObjectId;
    member_id?: string;
    activation_method?: string;
    error?: string;
  };
  timestamp: Date;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: CSV Validation Completeness
*For any* CSV file, if it contains all required columns (member_id, name, phone_number) with valid data, then the system SHALL accept it for import.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Duplicate Detection
*For any* CSV file, if it contains duplicate member_id values, then the system SHALL reject the file and report all duplicate member_ids.
**Validates: Requirements 1.7**

### Property 3: Invalid Data Rejection
*For any* CSV file, if a row contains invalid phone numbers or emails, then the system SHALL reject that specific row and report it with the row number and invalid value.
**Validates: Requirements 1.8, 1.9**

### Property 4: Account Creation Consistency
*For any* valid CSV row, when an admin confirms the import, the system SHALL create a user account with member_id, name, phone_number, email (if provided), role="member", and status="pending_activation".
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

### Property 5: Unique Temporary Passwords
*For any* set of imported members, each member SHALL receive a unique, randomly generated temporary password that is different from all other members' passwords.
**Validates: Requirements 2.8, 2.9**

### Property 6: SMS Delivery Logging
*For any* member account created, the system SHALL send an SMS invitation and log the send event in the activity log.
**Validates: Requirements 3.1, 3.6**

### Property 7: SMS Content Completeness
*For any* SMS invitation sent, the message SHALL include the member's name, temporary password, login instructions, and cooperative contact information.
**Validates: Requirements 3.2, 3.3, 3.4, 3.5**

### Property 8: Email Backup Delivery
*For any* member with an email address in the CSV, the system SHALL also send an email invitation as a backup method and log both events.
**Validates: Requirements 3.9, 3.10**

### Property 9: Temporary Password Login
*For any* member with a valid temporary password, the system SHALL allow login with member_id and temporary password.
**Validates: Requirements 4.1, 4.2**

### Property 10: Expired Password Rejection
*For any* member with an expired temporary password (>24 hours old), the system SHALL reject login attempts and offer to resend the SMS.
**Validates: Requirements 4.3, 7.2, 7.3**

### Property 11: Password Security Requirements
*For any* new password entered, the system SHALL validate it contains at least 8 characters, includes uppercase, lowercase, numbers, and special characters.
**Validates: Requirements 4.5, 12.5**

### Property 12: Password Hashing
*For any* password stored in the database, the system SHALL hash it using bcryptjs with salt rounds of 10, never storing plain text.
**Validates: Requirements 4.7, 10.3, 10.5**

### Property 13: Activation Status Update
*For any* member who successfully sets a permanent password, the system SHALL update their status to "activated" and invalidate the temporary password.
**Validates: Requirements 4.8, 4.9**

### Property 14: Status Tracking Accuracy
*For any* imported member, the system SHALL display their current activation status (pending_activation, activated, sms_failed, email_failed, token_expired) with associated dates.
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**

### Property 15: Filtering and Search
*For any* status filter or search query, the system SHALL return only members matching the filter criteria.
**Validates: Requirements 5.8, 5.9**

### Property 16: Resend Invitation Consistency
*For any* member with pending_activation status, when an admin clicks "Resend Invitation", the system SHALL generate a new temporary password, invalidate the old one, send a new SMS, and update the invitation_sent_date.
**Validates: Requirements 6.2, 6.3, 6.4, 6.5**

### Property 17: Bulk Resend Operation
*For any* set of selected members, the system SHALL resend invitations to all selected members and report success/failure for each.
**Validates: Requirements 6.7**

### Property 18: Temporary Password Expiration
*For any* temporary password, the system SHALL set expiration to 24 hours from creation and reject login attempts after expiration.
**Validates: Requirements 7.1, 7.2**

### Property 19: Password Invalidation
*For any* temporary password that is used successfully or invalidated, the system SHALL prevent reuse of that password.
**Validates: Requirements 7.4, 7.5, 7.6**

### Property 20: Import History Completeness
*For any* import operation, the system SHALL record the admin name, date/time, number of successful/failed imports, and maintain a list of all imported members.
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9**

### Property 21: Activity Logging
*For any* significant operation (import, SMS send, activation, password change), the system SHALL create an activity log entry with timestamp and details.
**Validates: Requirements 8.10, 10.8, 10.9, 12.10**

### Property 22: Error Handling Resilience
*For any* member whose account creation fails, the system SHALL log the error and continue processing remaining members without interruption.
**Validates: Requirements 9.2**

### Property 23: Partial Import Reporting
*For any* interrupted import operation, the system SHALL display which members were successfully imported before the interruption.
**Validates: Requirements 9.6**

### Property 24: Data Encryption
*For any* sensitive data (email, member_id, passwords), the system SHALL encrypt it at rest and transmit it over HTTPS.
**Validates: Requirements 10.1, 10.2**

### Property 25: Access Control
*For any* member data access request, the system SHALL only allow authorized admins to view the data.
**Validates: Requirements 10.4**

### Property 26: Data Masking
*For any* member list display, the system SHALL mask or partially hide sensitive information (email, member_id) unless viewing member details.
**Validates: Requirements 10.7**

### Property 27: Password Change Verification
*For any* password change request, the system SHALL verify the current password matches before allowing the change.
**Validates: Requirements 12.3, 12.4**

### Property 28: Permanent Password Activation
*For any* member who changes their password from a temporary password, the system SHALL mark the account as fully activated with a permanent password.
**Validates: Requirements 12.13**

## Error Handling

### CSV Upload Errors
- **Invalid file format**: Display "File must be in CSV format"
- **Missing required columns**: Display "Missing required columns: [list]"
- **Duplicate member_ids**: Display "Duplicate member_ids found: [list]"
- **Invalid phone numbers**: Display "Invalid phone numbers in rows: [list]"
- **Invalid emails**: Display "Invalid emails in rows: [list]"

### Account Creation Errors
- **Duplicate member_id**: Skip row, report in summary
- **Duplicate phone_number**: Skip row, report in summary
- **Duplicate email**: Skip row, report in summary
- **Database error**: Rollback transaction, display error, allow retry

### SMS/Email Delivery Errors
- **SMS failed**: Log failure, mark member as "sms_failed", allow admin retry
- **Email failed**: Log failure, mark member as "email_failed", allow admin retry
- **Network error**: Retry with exponential backoff (3 attempts)

### Authentication Errors
- **Invalid credentials**: Display "Invalid member ID or password"
- **Expired temporary password**: Display "Your temporary password has expired. Request a new one."
- **Account not activated**: Display "Your account is pending activation. Check your SMS for instructions."

### Password Change Errors
- **Incorrect current password**: Display "Current password is incorrect"
- **Password doesn't meet requirements**: Display specific requirement failures
- **Database error**: Display "Unable to update password. Please try again."

## Testing Strategy

### Unit Testing

**CSV Validation Tests**
- Test file format validation (CSV vs other formats)
- Test required column detection
- Test duplicate member_id detection
- Test phone number validation
- Test email validation
- Test preview generation

**Account Creation Tests**
- Test account creation with valid data
- Test duplicate detection (member_id, phone_number, email)
- Test role assignment (always "member")
- Test status assignment (always "pending_activation")
- Test temporary password generation

**Password Management Tests**
- Test password hashing with bcryptjs
- Test password strength validation
- Test current password verification
- Test password update

**Notification Tests**
- Test SMS message formatting
- Test email message formatting
- Test activity log entry creation
- Test retry logic for failed sends

**Status Tracking Tests**
- Test status display accuracy
- Test filtering by status
- Test search by member_id/phone
- Test sorting by columns

### Property-Based Testing

**CSV Validation Properties**
- Property 1: CSV Validation Completeness
- Property 2: Duplicate Detection
- Property 3: Invalid Data Rejection

**Account Creation Properties**
- Property 4: Account Creation Consistency
- Property 5: Unique Temporary Passwords

**Notification Properties**
- Property 6: SMS Delivery Logging
- Property 7: SMS Content Completeness
- Property 8: Email Backup Delivery

**Authentication Properties**
- Property 9: Temporary Password Login
- Property 10: Expired Password Rejection

**Password Properties**
- Property 11: Password Security Requirements
- Property 12: Password Hashing
- Property 27: Password Change Verification

**Status Tracking Properties**
- Property 13: Activation Status Update
- Property 14: Status Tracking Accuracy
- Property 15: Filtering and Search

**Resend Properties**
- Property 16: Resend Invitation Consistency
- Property 17: Bulk Resend Operation

**Expiration Properties**
- Property 18: Temporary Password Expiration
- Property 19: Password Invalidation

**Audit Properties**
- Property 20: Import History Completeness
- Property 21: Activity Logging

**Error Handling Properties**
- Property 22: Error Handling Resilience
- Property 23: Partial Import Reporting

**Security Properties**
- Property 24: Data Encryption
- Property 25: Access Control
- Property 26: Data Masking

**Activation Properties**
- Property 28: Permanent Password Activation

### Test Configuration

- Minimum 100 iterations per property test
- Each property test tagged with: `Feature: bulk-member-import, Property {number}: {property_text}`
- Unit tests focus on specific examples and edge cases
- Property tests focus on universal correctness across all inputs

## Implementation Notes

### SMS Integration
- Use existing SMS provider (configure in .env)
- Implement retry logic with exponential backoff
- Log all SMS events in activity log
- Handle SMS failures gracefully

### Email Integration
- Use existing email provider (configure in .env)
- Send as backup when email is provided in CSV
- Include activation link for email-based activation
- Log all email events in activity log

### Security Considerations
- Use cryptographically secure random generation for temporary passwords
- Hash all passwords with bcryptjs (salt rounds: 10)
- Hash temporary passwords before storing
- Use HTTPS for all data transmission
- Implement rate limiting on login attempts
- Validate all CSV data server-side (not just client-side)

### Performance Considerations
- Process CSV imports asynchronously (background job)
- Batch SMS/email sending to avoid rate limits
- Index member_id, phone_number, email for fast lookups
- Paginate member list display (50 per page)
- Cache import history for quick access

### Database Migrations
- Add temporary_password_hash field to User model
- Add temporary_password_expires field to User model
- Add activation_status field to User model
- Add activation_method field to User model
- Add import_id field to User model
- Create ImportOperation collection
- Extend ActivityLog with import-related actions

