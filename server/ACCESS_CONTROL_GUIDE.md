# Access Control Implementation Guide

## Overview

This document describes the role-based access control (RBAC) implementation for the Bulk Member Import feature. The system enforces strict access controls to ensure only authorized administrators can access member data and perform import operations.

## Architecture

### Access Control Layers

1. **Authentication Layer**: Verifies user identity via JWT token
2. **Authorization Layer**: Validates user role (admin, officer, member)
3. **Resource Layer**: Validates access to specific resources (members, imports)
4. **Data Layer**: Masks sensitive information in responses

### Middleware Stack

```
Request
  ↓
verifyToken (auth.middleware.js)
  ↓
requireAdminForImport / requireAdminForMemberAccess / etc.
  ↓
maskSensitiveData (optional, for list views)
  ↓
Controller
  ↓
Response
```

## Access Control Middleware

### 1. requireAdminForImport

**Purpose**: Validates that the user is an authenticated admin before allowing import operations.

**Usage**: Applied to endpoints that perform import operations (upload, confirm, bulk retry, etc.)

**Behavior**:
- Allows: Admin users
- Rejects: Member users, Officer users, Unauthenticated users
- Response: 403 Forbidden for non-admins, 401 Unauthorized for unauthenticated

**Example**:
```javascript
router.post('/upload', requireAdminForImport, csvUpload.single('file'), uploadCSVPreview);
```

### 2. requireAdminForMemberAccess

**Purpose**: Validates that the user is an admin before allowing access to member data.

**Usage**: Applied to endpoints that retrieve member lists or details.

**Behavior**:
- Allows: Admin users
- Rejects: Member users, Officer users, Unauthenticated users
- Response: 403 Forbidden for non-admins, 401 Unauthorized for unauthenticated

**Example**:
```javascript
router.get('/members', requireAdminForMemberAccess, maskSensitiveData, getImportedMembers);
```

### 3. requireAdminForImportAccess

**Purpose**: Validates that the user is an admin AND that the import operation exists.

**Usage**: Applied to endpoints that access specific import operations by ID.

**Behavior**:
- Allows: Admin users with valid import operation ID
- Rejects: Non-admin users, invalid import operation IDs
- Response: 403 Forbidden for non-admins, 404 Not Found for invalid imports, 401 Unauthorized for unauthenticated

**Example**:
```javascript
router.get('/history/:importId', requireAdminForImportAccess, getImportDetails);
```

### 4. requireAdminForMemberDetail

**Purpose**: Validates that the user is an admin AND that the member exists and is imported.

**Usage**: Applied to endpoints that access specific member details.

**Behavior**:
- Allows: Admin users with valid member ID
- Rejects: Non-admin users, invalid member IDs, non-imported members
- Response: 403 Forbidden for non-admins, 404 Not Found for invalid members, 401 Unauthorized for unauthenticated

**Example**:
```javascript
router.get('/members/:memberId', requireAdminForMemberDetail, getImportedMemberDetails);
```

### 5. maskSensitiveData

**Purpose**: Masks sensitive information in list view responses to prevent exposure of personal data.

**Usage**: Applied to endpoints that return lists of members or imports.

**Behavior**:
- Masks email addresses: Shows only first character and domain (e.g., `j***@example.com`)
- Masks member IDs: Shows only first and last 2 characters (e.g., `ME***BC`)
- Does NOT mask data in detail views (single resource responses)

**Example**:
```javascript
router.get('/members', requireAdminForMemberAccess, maskSensitiveData, getImportedMembers);
```

## Protected Endpoints

### CSV Upload and Processing

| Endpoint | Method | Access Control | Purpose |
|----------|--------|-----------------|---------|
| `/api/imports/upload` | POST | Admin only | Upload and validate CSV file |
| `/api/imports/confirm` | POST | Admin only | Confirm and process import |

### Member Management

| Endpoint | Method | Access Control | Purpose |
|----------|--------|-----------------|---------|
| `/api/imports/members` | GET | Admin only + Masking | List all imported members |
| `/api/imports/members/:memberId` | GET | Admin only | Get member details (no masking) |
| `/api/imports/resend-invitation/:userId` | POST | Admin only | Resend invitation to member |
| `/api/imports/bulk-resend-invitations` | POST | Admin only | Bulk resend invitations |
| `/api/imports/retry-sms/:userId` | POST | Admin only | Retry SMS for member |
| `/api/imports/retry-email/:userId` | POST | Admin only | Retry email for member |
| `/api/imports/retry-status/:userId` | GET | Admin only | Get member retry status |

### Import History and Operations

| Endpoint | Method | Access Control | Purpose |
|----------|--------|-----------------|---------|
| `/api/imports/history` | GET | Admin only + Masking | List all import operations |
| `/api/imports/history/:importId` | GET | Admin only | Get import details |
| `/api/imports/history/:importId/members` | GET | Admin only + Masking | Get members from import |
| `/api/imports/recovery/:importId` | GET | Admin only | Get recovery information |
| `/api/imports/retry/:importId` | POST | Admin only | Retry failed import |

### Bulk Operations

| Endpoint | Method | Access Control | Purpose |
|----------|--------|-----------------|---------|
| `/api/imports/bulk-retry` | POST | Admin only | Bulk retry notifications |

## Error Responses

### 401 Unauthorized

**Scenario**: User is not authenticated or token is invalid.

**Response**:
```json
{
  "message": "Authentication required",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No user found in request"
  }
}
```

### 403 Forbidden

**Scenario**: User is authenticated but does not have admin role.

**Response**:
```json
{
  "message": "Insufficient permissions",
  "error": {
    "code": "FORBIDDEN",
    "message": "Only admins can perform import operations"
  }
}
```

### 404 Not Found

**Scenario**: Requested resource (member, import) does not exist.

**Response**:
```json
{
  "message": "Member not found",
  "error": {
    "code": "NOT_FOUND",
    "message": "Imported member with ID member-123 does not exist"
  }
}
```

## Data Masking Examples

### List View (Masked)

```json
{
  "data": {
    "members": [
      {
        "id": "123",
        "member_id": "ME***BC",
        "name": "John Doe",
        "email": "j***@example.com",
        "phone_number": "+1-555-0123",
        "activation_status": "activated"
      }
    ]
  }
}
```

### Detail View (Not Masked)

```json
{
  "data": {
    "id": "123",
    "member_id": "MEM-001-ABC",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1-555-0123",
    "activation_status": "activated"
  }
}
```

## Implementation Details

### Middleware Location

- **File**: `server/middleware/importAccess.middleware.js`
- **Exports**: 
  - `requireAdminForImport`
  - `requireAdminForMemberAccess`
  - `requireAdminForImportAccess`
  - `requireAdminForMemberDetail`
  - `maskSensitiveData`

### Route Configuration

- **File**: `server/routes/import.routes.js`
- **Pattern**: Each route applies appropriate middleware based on operation type

### CSV Upload Configuration

- **File**: `server/config/csvUpload.js`
- **Features**:
  - Validates file format (CSV only)
  - Enforces file size limit (10MB)
  - Stores files in `server/uploads/csv/`

## Security Considerations

### 1. Defense in Depth

Multiple layers of access control ensure that even if one layer is bypassed, others remain:
- Authentication (JWT verification)
- Authorization (role checking)
- Resource validation (member/import existence)
- Data masking (sensitive information protection)

### 2. Principle of Least Privilege

- Only admins can access member data
- Officers and members cannot access import operations
- Sensitive data is masked in list views

### 3. Audit Trail

All access attempts are logged in the activity log:
- Successful operations
- Failed authorization attempts
- Data access events

### 4. Data Protection

- Sensitive fields (email, member_id) are encrypted at rest
- Sensitive data is masked in list responses
- Full details only shown in authorized detail views

## Testing

### Unit Tests

**File**: `server/middleware/importAccess.middleware.test.js`

Tests cover:
- Admin access allowed
- Non-admin access rejected
- Data masking functionality
- Error responses

### Integration Tests

**File**: `server/controllers/import.controller.access.test.js`

Tests cover:
- End-to-end access control on all endpoints
- Role-based access validation
- Data masking in responses
- Error handling

## Usage Examples

### Accessing Member List (Admin)

```bash
curl -X GET http://localhost:3000/api/imports/members \
  -H "Authorization: Bearer <admin-token>"
```

**Response**: 200 OK with masked member data

### Accessing Member List (Member)

```bash
curl -X GET http://localhost:3000/api/imports/members \
  -H "Authorization: Bearer <member-token>"
```

**Response**: 403 Forbidden

### Accessing Member Details (Admin)

```bash
curl -X GET http://localhost:3000/api/imports/members/member-123 \
  -H "Authorization: Bearer <admin-token>"
```

**Response**: 200 OK with full member details (not masked)

### Uploading CSV (Admin)

```bash
curl -X POST http://localhost:3000/api/imports/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@members.csv"
```

**Response**: 200 OK with preview data

### Uploading CSV (Member)

```bash
curl -X POST http://localhost:3000/api/imports/upload \
  -H "Authorization: Bearer <member-token>" \
  -F "file=@members.csv"
```

**Response**: 403 Forbidden

## Compliance

This implementation validates **Requirement 10.4**:

> WHEN displaying member data in the admin interface THEN the system SHALL only show data to authorized admins

The access control ensures:
- ✅ Only authenticated users can access endpoints
- ✅ Only admin users can access member data
- ✅ Only admin users can perform import operations
- ✅ Sensitive data is masked in list views
- ✅ Full details shown only in authorized detail views
- ✅ All access attempts are logged

## Future Enhancements

1. **Granular Permissions**: Support for more fine-grained permissions (e.g., "can view members" vs "can import members")
2. **Audit Logging**: Enhanced logging of all access attempts
3. **Rate Limiting**: Prevent brute force attacks on protected endpoints
4. **IP Whitelisting**: Restrict access to specific IP addresses
5. **Two-Factor Authentication**: Additional security for admin operations
