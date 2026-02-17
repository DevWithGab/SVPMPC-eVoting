# Implementation Plan: Bulk Member Import & Email Activation

## Overview

This implementation plan breaks down the Bulk Member Import & Email Activation feature into discrete, incremental tasks. Each task builds on previous work and includes both implementation and testing. The plan follows the MERN stack (React/TypeScript frontend, Node.js/Express backend, MongoDB database) and integrates with existing project patterns.

## Tasks

- [x] 1. Database Schema Updates and Models
  - [x] 1.1 Extend User model with import-related fields
    - Add temporary_password_hash, temporary_password_expires, activation_status, activation_method, import_id, sms_sent_at, email_sent_at, last_password_change fields
    - Update User model validation and indexes
    - _Requirements: 2.7, 2.8, 7.1, 10.3_
  
  - [x] 1.2 Create ImportOperation model
    - Define schema for tracking bulk import operations
    - Add indexes for admin_id, created_at for efficient queries
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 1.3 Extend ActivityLog model for import events
    - Add support for import, SMS, email, and password change actions
    - Ensure timestamps and details are captured
    - _Requirements: 3.6, 8.10, 12.10_

- [x] 2. Backend CSV Processing Service
  - [x] 2.1 Create CSV validation utility
    - Implement file format validation (.csv only)
    - Validate required columns (member_id, name, phone_number)
    - Validate optional email column
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [x] 2.2 Implement CSV data validation
    - Validate phone number format
    - Validate email format (if provided)
    - Detect duplicate member_ids
    - Report invalid rows with row numbers
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 1.9_
  
  - [x] 2.3 Create CSV parser and preview generator
    - Parse CSV into structured data
    - Generate preview with row count
    - Return validation errors with specific details
    - _Requirements: 1.10_

- [ ] 3. Backend Member Account Creation Service
  - [x] 3.1 Implement temporary password generation
    - Generate unique, random passwords (8+ chars, uppercase, lowercase, numbers, special chars)
    - Ensure each member gets a different password
    - Hash passwords before storage
    - _Requirements: 2.8, 2.9, 10.5_
  
  - [x] 3.2 Create bulk account creation logic
    - Create user accounts from validated CSV data
    - Set role to "member", status to "pending_activation"
    - Assign member_id, name, phone_number, email (if provided)
    - Handle duplicates (skip and report)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 3.3 Implement import operation tracking
    - Create ImportOperation record
    - Track successful/failed/skipped counts
    - Store error details for each failed row
    - _Requirements: 8.1, 8.4, 8.5_

- [ ] 4. Backend Notification Service
  - [x] 4.1 Implement SMS sending logic
    - Send SMS with member name, temporary password, login instructions, cooperative info
    - Log SMS send events in activity log
    - Handle SMS failures and mark member as "sms_failed"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 4.2 Implement email sending logic (backup)
    - Send email with activation link when email is provided
    - Include login instructions and cooperative info
    - Log email send events in activity log
    - Handle email failures gracefully
    - _Requirements: 3.9, 3.10_
  
  - [x] 4.3 Implement retry logic for failed notifications
    - Retry failed SMS/email with exponential backoff
    - Log retry attempts
    - Allow admin to manually retry
    - _Requirements: 3.8_

- [ ] 5. Backend Authentication and Password Management
  - [x] 5.1 Extend login endpoint for temporary passwords
    - Accept member_id and password (temporary or permanent)
    - Verify temporary password against hash
    - Check expiration (24 hours)
    - Return JWT token on success
    - _Requirements: 4.1, 4.2, 4.3, 7.2_
  
  - [x] 5.2 Implement password change endpoint
    - Verify current password
    - Validate new password meets requirements (8+ chars, uppercase, lowercase, number, special char)
    - Hash new password with bcryptjs (salt rounds: 10)
    - Update user record and invalidate temporary password
    - Log password change in activity log
    - _Requirements: 4.5, 4.6, 4.7, 12.3, 12.4, 12.5, 12.7, 12.10_
  
  - [x] 5.3 Implement activation status update logic
    - Update status to "activated" when permanent password is set
    - Invalidate temporary password
    - Record activation method (SMS or email)
    - Log activation event
    - _Requirements: 4.8, 4.9, 4.10, 12.13_

- [ ] 6. Backend Member Status Tracking and Resend
  - [x] 6.1 Create member status query endpoints
    - Get all imported members with status, dates, activation method
    - Support filtering by status
    - Support searching by member_id or phone_number
    - Support sorting by any column
    - _Requirements: 5.1, 5.2, 5.8, 5.9, 5.10_
  
  - [x] 6.2 Implement resend invitation logic
    - Generate new temporary password
    - Invalidate old temporary password
    - Send new SMS/email based on admin choice
    - Update invitation_sent_date
    - Log resend event
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.11_
  
  - [x] 6.3 Implement bulk resend functionality
    - Accept list of member IDs
    - Resend invitations to all selected members
    - Track success/failure for each
    - Return summary report
    - _Requirements: 6.7_

- [ ] 7. Backend Import History and Audit Trail
  - [ ] 7.1 Create import history query endpoints
    - Get all import operations with pagination
    - Get import details by ID
    - Get members from specific import
    - _Requirements: 8.1, 8.6, 8.7, 8.8, 8.9_
  
  - [ ] 7.2 Implement activity logging for all operations
    - Log import operations with admin name and timestamp
    - Log SMS/email send events
    - Log activation events
    - Log password changes
    - _Requirements: 8.10, 10.8, 10.9, 12.10_

- [ ] 8. Backend Error Handling and Recovery
  - [ ] 8.1 Implement comprehensive error handling
    - Handle CSV upload failures with specific error messages
    - Handle account creation failures and continue processing
    - Handle SMS/email failures and mark members appropriately
    - Handle database errors with rollback
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 8.2 Implement partial import recovery
    - Track which members were successfully imported
    - Allow retry of failed imports
    - Display which members succeeded before interruption
    - _Requirements: 9.5, 9.6_

- [ ] 9. Backend Security Implementation
  - [ ] 9.1 Implement data encryption
    - Encrypt sensitive data (email, member_id) at rest
    - Ensure HTTPS for all data transmission
    - Hash all passwords and tokens
    - _Requirements: 10.1, 10.2, 10.5, 10.10_
  
  - [ ] 9.2 Implement access control
    - Restrict member data access to authorized admins
    - Implement role-based access control for import operations
    - Validate admin permissions on all endpoints
    - _Requirements: 10.4_
  
  - [ ] 9.3 Implement data masking
    - Mask sensitive information in member lists
    - Show full details only in member detail view
    - _Requirements: 10.7_

- [ ] 10. Checkpoint - Backend API Complete
  - Ensure all backend endpoints are implemented and tested
  - Verify error handling works correctly
  - Test with sample CSV data
  - Ask the user if questions arise

- [ ] 11. Frontend CSV Upload Component
  - [ ] 11.1 Create BulkImportUpload component
    - File input with drag-and-drop support
    - Client-side CSV format validation
    - Display upload progress
    - _Requirements: 1.1, 1.2_
  
  - [ ] 11.2 Implement CSV preview functionality
    - Parse CSV and display preview table
    - Show row count and column headers
    - Display validation errors if any
    - _Requirements: 1.10_
  
  - [ ] 11.3 Implement confirmation dialog
    - Show summary of data to be imported
    - Allow admin to confirm or cancel
    - Call backend API to process import
    - Display import progress and results
    - _Requirements: 1.10, 2.1_

- [ ] 12. Frontend Member Status Dashboard
  - [ ] 12.1 Create MemberStatusDashboard component
    - Display table of imported members
    - Show member_id, name, phone_number, status, dates
    - Show activation method (SMS or email)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [ ] 12.2 Implement filtering and search
    - Filter by activation status
    - Search by member_id or phone_number
    - Sort by any column
    - _Requirements: 5.8, 5.9, 5.10_
  
  - [ ] 12.3 Implement member detail view
    - Display full member information
    - Show activation history
    - Show SMS/email send dates
    - _Requirements: 5.11_

- [ ] 13. Frontend Resend Invitation Functionality
  - [ ] 13.1 Implement single resend button
    - Show "Resend Invitation" button for pending members
    - Allow admin to choose delivery method (SMS or email)
    - Display confirmation dialog
    - Show success/error message
    - _Requirements: 6.1, 6.2, 6.11_
  
  - [ ] 13.2 Implement bulk resend functionality
    - Allow multi-select of members
    - Show bulk resend button when members selected
    - Display confirmation with member count
    - Show progress indicator during resend
    - Display summary report after completion
    - _Requirements: 6.7, 6.8, 6.9, 6.10_

- [ ] 14. Frontend Import History View
  - [ ] 14.1 Create ImportHistoryView component
    - Display list of all import operations
    - Show date, admin name, member count, success/failure counts
    - Implement pagination
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 14.2 Implement import detail drill-down
    - Show detailed information about specific import
    - Display CSV file name and upload date
    - Show list of all members from that import
    - Show current activation status of each member
    - _Requirements: 8.6, 8.7, 8.8, 8.9_

- [ ] 15. Frontend Password Management
  - [ ] 15.1 Create PasswordChangeForm component
    - Add to member profile settings
    - Request current password
    - Validate new password meets requirements
    - Show password strength indicator
    - Display success/error messages
    - _Requirements: 12.1, 12.2, 12.5, 12.6_
  
  - [ ] 15.2 Implement password change logic
    - Call backend password change endpoint
    - Handle validation errors
    - Show specific error messages for each requirement
    - Log password change in activity log
    - _Requirements: 12.3, 12.4, 12.7, 12.8, 12.10_

- [ ] 16. Frontend Login Enhancement
  - [ ] 16.1 Update login component for temporary passwords
    - Accept member_id and password
    - Support both temporary and permanent passwords
    - Show error for expired temporary passwords
    - Offer to resend SMS on expiration
    - _Requirements: 4.1, 4.2, 4.3, 12.11_
  
  - [ ] 16.2 Implement password change prompt
    - Show optional prompt after login with temporary password
    - Allow member to change password or skip
    - Redirect to password change form if chosen
    - _Requirements: 4.4, 12.12_

- [ ] 17. Frontend Internationalization
  - [ ] 17.1 Add translation keys for bulk import feature
    - CSV upload interface strings
    - Status labels and messages
    - Error messages
    - Success messages
    - Add to both en.json and ph.json
    - _Requirements: All_
  
  - [ ] 17.2 Integrate i18n into all components
    - Use useTranslation hook in all new components
    - Ensure all user-facing text is translatable
    - Test with both English and Filipino

- [ ] 18. Frontend Accessibility
  - [ ] 18.1 Ensure accessibility compliance
    - Add ARIA labels to all form inputs
    - Ensure keyboard navigation works
    - Test with screen readers
    - Ensure color contrast meets standards
    - _Requirements: All_

- [ ] 19. Checkpoint - Frontend Complete
  - Ensure all frontend components are implemented
  - Verify integration with backend APIs
  - Test CSV upload workflow end-to-end
  - Test member status tracking
  - Test resend functionality
  - Ask the user if questions arise

- [ ] 20. Property-Based Tests - CSV Validation
  - [ ]* 20.1 Write property test for CSV validation completeness
    - **Property 1: CSV Validation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  
  - [ ]* 20.2 Write property test for duplicate detection
    - **Property 2: Duplicate Detection**
    - **Validates: Requirements 1.7**
  
  - [ ]* 20.3 Write property test for invalid data rejection
    - **Property 3: Invalid Data Rejection**
    - **Validates: Requirements 1.8, 1.9**

- [ ] 21. Property-Based Tests - Account Creation
  - [ ]* 21.1 Write property test for account creation consistency
    - **Property 4: Account Creation Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
  
  - [ ]* 21.2 Write property test for unique temporary passwords
    - **Property 5: Unique Temporary Passwords**
    - **Validates: Requirements 2.8, 2.9**

- [ ] 22. Property-Based Tests - Notifications
  - [ ]* 22.1 Write property test for SMS delivery logging
    - **Property 6: SMS Delivery Logging**
    - **Validates: Requirements 3.1, 3.6**
  
  - [ ]* 22.2 Write property test for SMS content completeness
    - **Property 7: SMS Content Completeness**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
  
  - [ ]* 22.3 Write property test for email backup delivery
    - **Property 8: Email Backup Delivery**
    - **Validates: Requirements 3.9, 3.10**

- [ ] 23. Property-Based Tests - Authentication
  - [ ]* 23.1 Write property test for temporary password login
    - **Property 9: Temporary Password Login**
    - **Validates: Requirements 4.1, 4.2**
  
  - [ ]* 23.2 Write property test for expired password rejection
    - **Property 10: Expired Password Rejection**
    - **Validates: Requirements 4.3, 7.2, 7.3**

- [ ] 24. Property-Based Tests - Password Security
  - [ ]* 24.1 Write property test for password security requirements
    - **Property 11: Password Security Requirements**
    - **Validates: Requirements 4.5, 12.5**
  
  - [ ]* 24.2 Write property test for password hashing
    - **Property 12: Password Hashing**
    - **Validates: Requirements 4.7, 10.3, 10.5**
  
  - [ ]* 24.3 Write property test for password change verification
    - **Property 27: Password Change Verification**
    - **Validates: Requirements 12.3, 12.4**

- [ ] 25. Property-Based Tests - Status Tracking
  - [ ]* 25.1 Write property test for activation status update
    - **Property 13: Activation Status Update**
    - **Validates: Requirements 4.8, 4.9**
  
  - [ ]* 25.2 Write property test for status tracking accuracy
    - **Property 14: Status Tracking Accuracy**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7**
  
  - [ ]* 25.3 Write property test for filtering and search
    - **Property 15: Filtering and Search**
    - **Validates: Requirements 5.8, 5.9**

- [ ] 26. Property-Based Tests - Resend and Expiration
  - [ ]* 26.1 Write property test for resend invitation consistency
    - **Property 16: Resend Invitation Consistency**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5**
  
  - [ ]* 26.2 Write property test for bulk resend operation
    - **Property 17: Bulk Resend Operation**
    - **Validates: Requirements 6.7**
  
  - [ ]* 26.3 Write property test for temporary password expiration
    - **Property 18: Temporary Password Expiration**
    - **Validates: Requirements 7.1, 7.2**
  
  - [ ]* 26.4 Write property test for password invalidation
    - **Property 19: Password Invalidation**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [ ] 27. Property-Based Tests - Audit and Error Handling
  - [ ]* 27.1 Write property test for import history completeness
    - **Property 20: Import History Completeness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8, 8.9**
  
  - [ ]* 27.2 Write property test for activity logging
    - **Property 21: Activity Logging**
    - **Validates: Requirements 8.10, 10.8, 10.9, 12.10**
  
  - [ ]* 27.3 Write property test for error handling resilience
    - **Property 22: Error Handling Resilience**
    - **Validates: Requirements 9.2**
  
  - [ ]* 27.4 Write property test for partial import reporting
    - **Property 23: Partial Import Reporting**
    - **Validates: Requirements 9.6**

- [ ] 28. Property-Based Tests - Security
  - [ ]* 28.1 Write property test for data encryption
    - **Property 24: Data Encryption**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 28.2 Write property test for access control
    - **Property 25: Access Control**
    - **Validates: Requirements 10.4**
  
  - [ ]* 28.3 Write property test for data masking
    - **Property 26: Data Masking**
    - **Validates: Requirements 10.7**
  
  - [ ]* 28.4 Write property test for permanent password activation
    - **Property 28: Permanent Password Activation**
    - **Validates: Requirements 12.13**

- [ ] 29. Final Checkpoint - All Tests Pass
  - Ensure all property-based tests pass (minimum 100 iterations each)
  - Ensure all unit tests pass
  - Verify end-to-end workflows
  - Test error scenarios
  - Ask the user if questions arise

- [ ] 30. Integration and Documentation
  - [ ] 30.1 Update API documentation
    - Document all new endpoints
    - Include request/response examples
    - Document error codes
  
  - [ ] 30.2 Update database documentation
    - Document new User fields
    - Document ImportOperation schema
    - Document ActivityLog extensions
  
  - [ ] 30.3 Create admin guide
    - Document CSV import workflow
    - Document member status tracking
    - Document resend invitation process
    - Document troubleshooting

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code should follow existing project patterns (async/await, error handling, response format)
- All new components should be accessible and internationalized
- All sensitive operations should be logged in activity log

