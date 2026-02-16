/**
 * Bulk Account Creation Service
 * Handles creating member accounts from validated CSV data
 */

const { User, ImportOperation, Activity } = require('../models');
const { generateTemporaryPassword, hashTemporaryPassword } = require('./passwordGenerator');

/**
 * Creates bulk member accounts from validated CSV data
 * 
 * @param {object} params - Parameters object
 * @param {object[]} params.validRows - Array of validated CSV rows
 * @param {string} params.csvFileName - Original CSV file name
 * @param {string} params.adminId - Admin user ID performing the import
 * @param {string} params.adminName - Admin user name for audit trail
 * @returns {Promise<object>} - Import operation result with statistics
 */
async function createBulkAccounts({ validRows, csvFileName, adminId, adminName }) {
  const importOperation = new ImportOperation({
    admin_id: adminId,
    admin_name: adminName,
    csv_file_name: csvFileName,
    total_rows: validRows.length,
    status: 'pending',
  });

  let successfulImports = 0;
  let failedImports = 0;
  let skippedRows = 0;
  const importErrors = [];
  const createdUsers = [];

  // Process each validated row
  for (const row of validRows) {
    try {
      // Check for existing member_id
      const existingMemberId = await User.findOne({ member_id: row.member_id });
      if (existingMemberId) {
        skippedRows++;
        importErrors.push({
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: `Duplicate member_id "${row.member_id}" already exists in system`,
        });
        continue;
      }

      // Check for existing phone_number
      const existingPhone = await User.findOne({ phone_number: row.phone_number });
      if (existingPhone) {
        skippedRows++;
        importErrors.push({
          row_number: row._rowNumber,
          member_id: row.member_id,
          error_message: `Duplicate phone_number "${row.phone_number}" already exists in system`,
        });
        continue;
      }

      // Check for existing email (if provided)
      if (row.email) {
        const existingEmail = await User.findOne({ email: row.email });
        if (existingEmail) {
          skippedRows++;
          importErrors.push({
            row_number: row._rowNumber,
            member_id: row.member_id,
            error_message: `Duplicate email "${row.email}" already exists in system`,
          });
          continue;
        }
      }

      // Generate temporary password
      const tempPassword = generateTemporaryPassword();
      const hashedTempPassword = await hashTemporaryPassword(tempPassword);

      // Create new user account
      const newUser = new User({
        member_id: row.member_id,
        fullName: row.name,
        phone_number: row.phone_number,
        email: row.email || null,
        password: 'temp', // Will be hashed by pre-save hook, but we use temporary password for login
        role: 'member',
        activation_status: 'pending_activation',
        import_id: importOperation._id,
        temporary_password_hash: hashedTempPassword,
        temporary_password_expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await newUser.save();

      // Store the plain temporary password for return (will be sent via SMS)
      createdUsers.push({
        userId: newUser._id,
        member_id: newUser.member_id,
        name: newUser.fullName,
        phone_number: newUser.phone_number,
        email: newUser.email,
        temporary_password: tempPassword,
        rowNumber: row._rowNumber,
      });

      successfulImports++;
    } catch (error) {
      failedImports++;
      importErrors.push({
        row_number: row._rowNumber,
        member_id: row.member_id,
        error_message: `Failed to create account: ${error.message}`,
      });
    }
  }

  // Update import operation with final statistics
  importOperation.successful_imports = successfulImports;
  importOperation.failed_imports = failedImports;
  importOperation.skipped_rows = skippedRows;
  importOperation.import_errors = importErrors;
  importOperation.status = 'completed';

  await importOperation.save();

  // Log the bulk import operation
  await Activity.create({
    userId: adminId,
    action: 'BULK_IMPORT',
    description: `Bulk imported ${successfulImports} members from CSV file "${csvFileName}"`,
    metadata: {
      import_id: importOperation._id,
      total_rows: validRows.length,
      successful_imports: successfulImports,
      failed_imports: failedImports,
      skipped_rows: skippedRows,
    },
  });

  return {
    importOperation: importOperation.toJSON(),
    createdUsers,
    statistics: {
      total_rows: validRows.length,
      successful_imports: successfulImports,
      failed_imports: failedImports,
      skipped_rows: skippedRows,
      import_errors: importErrors,
    },
  };
}

module.exports = {
  createBulkAccounts,
};
