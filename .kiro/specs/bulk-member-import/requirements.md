# Requirements Document: Bulk Member Import \& Email Activation

## Introduction

The Bulk Member Import \& Email Activation feature enables administrators to efficiently onboard 1000+ cooperative members through CSV bulk import. Members cannot self-register in the system; instead, administrators upload member data (member ID, name, phone number, and optional email) via CSV file. The system automatically creates member accounts and sends SMS invitations with temporary passwords to members' phones. Members activate their accounts by logging in with the temporary password and setting a permanent password. For members with email addresses on file, email invitations are sent as a backup method. Administrators can resend invitations to inactive members and monitor the overall activation progress.

## Glossary

* **Member**: A cooperative member who is eligible to vote in elections
* **Admin**: An administrator with permissions to manage members and elections
* **CSV File**: Comma-separated values file containing member data (member ID, name, email, phone\_number)
* **Activation Link**: A unique, time-limited URL sent via email that allows members to set their password
* **Activation Token**: A secure, unique token embedded in the activation link
* **Temporary Password**: A system-generated password sent via SMS that allows members to log in and set a permanent password
* **Activation Status**: The state of a member account (pending, activated, email\_failed, sms\_failed, token\_expired)
* **Bulk Import**: The process of uploading and processing multiple member records at once
* **Member ID**: A unique identifier assigned to each cooperative member
* **Email Invitation**: An automated email sent to a member containing their activation link and instructions
* **SMS Invitation**: An automated SMS text message sent to a member containing a temporary password and instructions

## Requirements

### Requirement 1: CSV File Upload and Validation

**User Story:** As an admin, I want to upload a CSV file containing member data, so that I can efficiently import multiple members into the system at once.

#### Acceptance Criteria

1. WHEN an admin accesses the member import interface THEN the system SHALL display a file upload form with clear instructions
2. WHEN an admin selects a CSV file THEN the system SHALL validate the file format (must be .csv)
3. WHEN a CSV file is uploaded THEN the system SHALL validate that it contains required columns: member\_id, name, phone\_number
4. WHEN a CSV file is uploaded THEN the system SHALL validate that it contains optional column: email
5. WHEN a CSV file contains missing required columns THEN the system SHALL reject the file and display a specific error message indicating which columns are missing
6. WHEN a CSV file contains rows with missing or empty values in required fields THEN the system SHALL reject those specific rows and report them with row numbers
7. WHEN a CSV file contains duplicate member\_id values THEN the system SHALL reject the file and report the duplicate member\_ids
8. WHEN a CSV file contains invalid phone numbers THEN the system SHALL reject those specific rows and report them with row numbers and invalid phone numbers
9. WHEN a CSV file contains invalid email addresses (if email column is provided) THEN the system SHALL reject those specific rows and report them with row numbers and invalid emails
10. WHEN a CSV file is valid THEN the system SHALL display a preview of the data to be imported with row count and allow the admin to confirm or cancel

### Requirement 2: Account Creation from CSV Data

**User Story:** As an admin, I want the system to automatically create member accounts from the CSV data, so that I don't have to manually create each account.

#### Acceptance Criteria

1. WHEN an admin confirms the CSV import THEN the system SHALL create a member account for each valid row in the CSV
2. WHEN creating a member account THEN the system SHALL assign a unique member\_id from the CSV data
3. WHEN creating a member account THEN the system SHALL set the member's name from the CSV data
4. WHEN creating a member account THEN the system SHALL set the member's phone\_number from the CSV data
5. WHEN creating a member account THEN the system SHALL set the member's email from the CSV data (if provided)
6. WHEN creating a member account THEN the system SHALL set the member's role to "member" (not admin or officer)
7. WHEN creating a member account THEN the system SHALL set the account status to "pending\_activation"
8. WHEN creating a member account THEN the system SHALL generate a unique, random temporary password for each member (different for every member)
9. WHEN creating a member account THEN the system SHALL ensure the temporary password is at least 8 characters and includes uppercase, lowercase, numbers, and special characters
10. WHEN a member\_id already exists in the system THEN the system SHALL skip that row and report it as a duplicate
11. WHEN a phone\_number already exists in the system THEN the system SHALL skip that row and report it as a duplicate phone number
12. WHEN an email already exists in the system (if email is provided) THEN the system SHALL skip that row and report it as a duplicate email
13. WHEN account creation is complete THEN the system SHALL display a summary report showing successful imports, skipped rows, and any errors

### Requirement 3: SMS Temporary Password Delivery (Primary Activation Method)

**User Story:** As an admin, I want members to receive SMS invitations with temporary passwords, so that they can activate their accounts and set their passwords.

#### Acceptance Criteria

1. WHEN a member account is created THEN the system SHALL send an SMS invitation to the member's phone number
2. WHEN an SMS invitation is sent THEN the system SHALL include the member's name in the message
3. WHEN an SMS invitation is sent THEN the system SHALL include a temporary password (6-8 alphanumeric characters)
4. WHEN an SMS invitation is sent THEN the system SHALL include clear instructions on how to log in and set a permanent password
5. WHEN an SMS invitation is sent THEN the system SHALL include the cooperative name and contact information
6. WHEN an SMS invitation is sent THEN the system SHALL log the SMS send event in the activity log
7. WHEN an SMS fails to send THEN the system SHALL log the failure and mark the member's activation status as "sms\_failed"
8. WHEN an SMS fails to send THEN the system SHALL allow the admin to retry sending the SMS later
9. WHEN a member has an email address in the CSV THEN the system SHALL also send an email invitation as a backup method
10. WHEN both SMS and email are sent THEN the system SHALL log both send events in the activity log

### Requirement 4: Member Activation Flow via SMS Temporary Password

**User Story:** As a member, I want to log in with my temporary password and set a permanent password, so that I can access the voting system.

#### Acceptance Criteria

1. WHEN a member logs in with their member\_id and temporary password THEN the system SHALL verify the credentials
2. WHEN the temporary password is valid THEN the system SHALL allow the member to log in and access the system
3. WHEN the temporary password is invalid or expired THEN the system SHALL display an error message and offer to resend the SMS
4. WHEN a member with a temporary password logs in THEN the system SHALL display a prompt to change their password (optional, not required)
5. WHEN a member enters a permanent password THEN the system SHALL validate the password meets security requirements (minimum 8 characters, includes uppercase, lowercase, number, special character)
6. WHEN a member enters a password that does not meet requirements THEN the system SHALL display specific error messages for each requirement not met
7. WHEN a member enters a valid permanent password THEN the system SHALL hash the password using bcryptjs with salt rounds of 10
8. WHEN a member successfully sets a permanent password THEN the system SHALL update the account status to "activated"
9. WHEN a member successfully sets a permanent password THEN the system SHALL invalidate the temporary password
10. WHEN a member successfully activates THEN the system SHALL log the activation event in the activity log
11. IF a member has an email address THEN the system SHALL also allow activation via email link as an alternative method

### Requirement 5: Activation Status Tracking

**User Story:** As an admin, I want to track the activation status of imported members, so that I can monitor progress and identify members who need follow-up.

#### Acceptance Criteria

1. WHEN viewing the member import dashboard THEN the system SHALL display a list of all imported members with their activation status
2. WHEN displaying member status THEN the system SHALL show the following statuses: pending\_activation, activated, sms\_failed, email\_failed, token\_expired
3. WHEN displaying member status THEN the system SHALL show the date the member was imported
4. WHEN displaying member status THEN the system SHALL show the date the member activated (if applicable)
5. WHEN displaying member status THEN the system SHALL show the date the SMS invitation was sent
6. WHEN displaying member status THEN the system SHALL show the date the temporary password expires
7. WHEN displaying member status THEN the system SHALL show the activation method used (SMS or email)
8. WHEN an admin filters by status THEN the system SHALL display only members matching the selected status
9. WHEN an admin searches by member\_id or phone\_number THEN the system SHALL display matching members
10. WHEN an admin sorts by any column THEN the system SHALL sort the member list accordingly
11. WHEN viewing member details THEN the system SHALL display all member information and activation history

### Requirement 6: Resend Invitation Functionality

**User Story:** As an admin, I want to resend invitations to members who haven't activated, so that I can help members who missed or lost the original SMS or email.

#### Acceptance Criteria

1. WHEN an admin selects a member with pending\_activation status THEN the system SHALL display a "Resend Invitation" button
2. WHEN an admin clicks "Resend Invitation" THEN the system SHALL generate a new temporary password
3. WHEN an admin clicks "Resend Invitation" THEN the system SHALL invalidate the previous temporary password
4. WHEN an admin clicks "Resend Invitation" THEN the system SHALL send a new SMS invitation with the new temporary password
5. WHEN an admin clicks "Resend Invitation" THEN the system SHALL update the "invitation\_sent\_date" to the current date and time
6. WHEN an admin clicks "Resend Invitation" THEN the system SHALL log the resend event in the activity log
7. WHEN an admin selects multiple members THEN the system SHALL allow bulk resend of invitations to all selected members
8. WHEN bulk resending invitations THEN the system SHALL display a confirmation dialog showing the number of members
9. WHEN bulk resending invitations THEN the system SHALL display a progress indicator during the resend process
10. WHEN bulk resending is complete THEN the system SHALL display a summary report of successful resends and any failures
11. WHEN an admin resends an invitation THEN the system SHALL allow the admin to choose the delivery method (SMS or email if available)

### Requirement 7: Temporary Password Expiration and Security

**User Story:** As a system administrator, I want temporary passwords to expire after a reasonable time, so that the system remains secure and prevents unauthorized account access.

#### Acceptance Criteria

1. WHEN a temporary password is generated THEN the system SHALL set an expiration time of 24 hours from creation
2. WHEN a member attempts to use an expired temporary password THEN the system SHALL reject the password and display an error message
3. WHEN a member attempts to use an expired password THEN the system SHALL offer to resend the SMS invitation
4. WHEN a temporary password is used successfully THEN the system SHALL invalidate the password immediately
5. WHEN a temporary password is invalidated THEN the system SHALL prevent reuse of that password
6. WHEN a member activates their account THEN the system SHALL not allow the same temporary password to be used again
7. WHEN viewing member details THEN the system SHALL display the temporary password expiration date and time
8. WHEN a temporary password expires THEN the system SHALL automatically update the member's status to "token\_expired"

### Requirement 8: Import History and Audit Trail

**User Story:** As an admin, I want to view the history of all member imports and track who performed each import, so that I can maintain an audit trail for compliance.

#### Acceptance Criteria

1. WHEN an admin accesses the import history THEN the system SHALL display a list of all bulk import operations
2. WHEN displaying import history THEN the system SHALL show the date and time of each import
3. WHEN displaying import history THEN the system SHALL show the admin who performed the import
4. WHEN displaying import history THEN the system SHALL show the number of members imported in each operation
5. WHEN displaying import history THEN the system SHALL show the number of successful imports and failures
6. WHEN an admin clicks on an import record THEN the system SHALL display detailed information about that import
7. WHEN displaying import details THEN the system SHALL show the CSV file name and upload date
8. WHEN displaying import details THEN the system SHALL show a list of all members imported in that operation
9. WHEN displaying import details THEN the system SHALL show the current activation status of each imported member
10. WHEN an import operation is performed THEN the system SHALL log the operation in the activity log with admin name and timestamp

### Requirement 9: Error Handling and Recovery

**User Story:** As an admin, I want clear error messages and recovery options when issues occur during import, so that I can resolve problems quickly.

#### Acceptance Criteria

1. WHEN a CSV file upload fails THEN the system SHALL display a specific error message explaining the reason
2. WHEN account creation fails for a member THEN the system SHALL log the error and continue processing other members
3. WHEN email sending fails THEN the system SHALL log the failure and mark the member for manual follow-up
4. WHEN a database error occurs during import THEN the system SHALL rollback the transaction and display an error message
5. WHEN an import operation is interrupted THEN the system SHALL allow the admin to retry the import
6. WHEN an import operation is interrupted THEN the system SHALL display which members were successfully imported before the interruption
7. WHEN an error occurs THEN the system SHALL provide a clear explanation of what went wrong
8. WHEN an error occurs THEN the system SHALL suggest corrective actions when applicable

### Requirement 10: Data Privacy and Security

**User Story:** As a system administrator, I want member data to be handled securely, so that I protect member privacy and comply with data protection requirements.

#### Acceptance Criteria

1. WHEN member data is imported THEN the system SHALL encrypt sensitive data (email, member\_id) at rest
2. WHEN member data is transmitted THEN the system SHALL use HTTPS for all data transmission
3. WHEN a member activates their account THEN the system SHALL hash the password using bcryptjs with salt rounds of 10
4. WHEN displaying member data in the admin interface THEN the system SHALL only show data to authorized admins
5. WHEN a member's password is stored THEN the system SHALL never store plain text passwords
6. WHEN an activation token is generated THEN the system SHALL use cryptographically secure random generation
7. WHEN member data is displayed in lists THEN the system SHALL mask or partially hide sensitive information (email, member\_id) unless specifically viewing member details
8. WHEN an admin exports member data THEN the system SHALL log the export event in the activity log
9. WHEN member data is deleted THEN the system SHALL maintain audit logs for compliance purposes
10. WHEN activation tokens are stored THEN the system SHALL hash the tokens in the database

### Requirement 12: Member Password Management

**User Story:** As a member, I want to change my password anytime from my profile settings, so that I can update my password whenever I need to.

#### Acceptance Criteria

1. WHEN a member accesses their profile settings THEN the system SHALL display a "Change Password" option
2. WHEN a member clicks "Change Password" THEN the system SHALL display a password change form
3. WHEN a member enters their current password THEN the system SHALL verify it matches their stored password
4. WHEN a member enters an incorrect current password THEN the system SHALL display an error message and reject the change
5. WHEN a member enters a new password THEN the system SHALL validate it meets security requirements (minimum 8 characters, includes uppercase, lowercase, number, special character)
6. WHEN a member enters a password that does not meet requirements THEN the system SHALL display specific error messages for each requirement not met
7. WHEN a member enters a valid new password THEN the system SHALL hash the new password using bcryptjs with salt rounds of 10
8. WHEN a member successfully changes their password THEN the system SHALL update the stored password
9. WHEN a member successfully changes their password THEN the system SHALL display a success message
10. WHEN a member successfully changes their password THEN the system SHALL log the password change event in the activity log
11. WHEN a member with a temporary password logs in THEN the system SHALL allow them to use the temporary password to access the system
12. WHEN a member with a temporary password accesses their profile THEN the system SHALL display a prompt to change their password
13. WHEN a member changes their password from a temporary password THEN the system SHALL mark the account as fully activated with a permanent password
