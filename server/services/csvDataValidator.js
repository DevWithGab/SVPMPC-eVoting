/**
 * CSV Data Validation Utility
 * Validates individual row data for phone numbers, emails, and duplicates
 */

const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,}$/; // Basic phone validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation

/**
 * Validates phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }
  return PHONE_REGEX.test(phoneNumber.trim());
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates a single CSV row
 * @param {object} row - Row data from CSV
 * @param {number} rowNumber - Row number in CSV (for error reporting)
 * @param {boolean} hasEmailColumn - Whether email column exists in CSV
 * @returns {object} - { isValid: boolean, errors?: string[] }
 */
function validateRow(row, rowNumber, hasEmailColumn) {
  const errors = [];

  // Validate member_id
  if (!row.member_id || typeof row.member_id !== 'string' || row.member_id.trim() === '') {
    errors.push(`Row ${rowNumber}: member_id is required and cannot be empty`);
  }

  // Validate name
  if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
    errors.push(`Row ${rowNumber}: name is required and cannot be empty`);
  }

  // Validate phone_number
  if (!row.phone_number || typeof row.phone_number !== 'string' || row.phone_number.trim() === '') {
    errors.push(`Row ${rowNumber}: phone_number is required and cannot be empty`);
  } else if (!isValidPhoneNumber(row.phone_number)) {
    errors.push(`Row ${rowNumber}: invalid phone number format "${row.phone_number}"`);
  }

  // Validate email if column exists and email is provided
  if (hasEmailColumn && row.email && row.email.trim() !== '') {
    if (!isValidEmail(row.email)) {
      errors.push(`Row ${rowNumber}: invalid email format "${row.email}"`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Detects duplicate member_ids in a set of rows
 * @param {object[]} rows - Array of row data
 * @returns {object} - { hasDuplicates: boolean, duplicates?: string[] }
 */
function detectDuplicateMemberIds(rows) {
  const memberIds = new Map();
  const duplicates = [];

  rows.forEach((row, index) => {
    const memberId = row.member_id ? row.member_id.trim() : null;
    if (memberId) {
      if (memberIds.has(memberId)) {
        if (!duplicates.includes(memberId)) {
          duplicates.push(memberId);
        }
      } else {
        memberIds.set(memberId, index);
      }
    }
  });

  return {
    hasDuplicates: duplicates.length > 0,
    duplicates: duplicates.length > 0 ? duplicates : undefined
  };
}

/**
 * Validates all rows in CSV data
 * @param {object[]} rows - Array of row data from CSV
 * @param {boolean} hasEmailColumn - Whether email column exists
 * @returns {object} - { isValid: boolean, validRows: object[], invalidRows: object[], errors: string[] }
 */
function validateAllRows(rows, hasEmailColumn) {
  const validRows = [];
  const invalidRows = [];
  const errors = [];

  // Check for duplicate member_ids
  const duplicateCheck = detectDuplicateMemberIds(rows);
  if (duplicateCheck.hasDuplicates) {
    errors.push(`Duplicate member_ids found: ${duplicateCheck.duplicates.join(', ')}`);
  }

  // Validate each row
  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because row 1 is headers, index starts at 0
    const validation = validateRow(row, rowNumber, hasEmailColumn);

    if (validation.isValid && !duplicateCheck.duplicates?.includes(row.member_id?.trim())) {
      validRows.push({ ...row, _rowNumber: rowNumber });
    } else {
      const rowErrors = validation.errors || [];
      if (duplicateCheck.duplicates?.includes(row.member_id?.trim())) {
        rowErrors.push(`Row ${rowNumber}: duplicate member_id "${row.member_id}"`);
      }
      invalidRows.push({
        rowNumber,
        member_id: row.member_id,
        errors: rowErrors
      });
    }
  });

  return {
    isValid: invalidRows.length === 0 && errors.length === 0,
    validRows,
    invalidRows,
    errors: errors.length > 0 ? errors : undefined
  };
}

module.exports = {
  isValidPhoneNumber,
  isValidEmail,
  validateRow,
  detectDuplicateMemberIds,
  validateAllRows
};
