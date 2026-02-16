/**
 * CSV Parser and Preview Generator
 * Parses CSV files and generates preview data with validation results
 */

const fs = require('fs');
const csv = require('csv-parser');
const csvValidator = require('./csvValidator');
const csvDataValidator = require('./csvDataValidator');

/**
 * Parses a CSV file and returns structured data
 * @param {string} filePath - Path to the CSV file
 * @returns {Promise<object>} - { headers: string[], rows: object[] }
 */
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (parsedHeaders) => {
        headers = parsedHeaders;
      })
      .on('data', (row) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({ headers, rows });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Generates a preview of CSV data with validation results
 * @param {string} filePath - Path to the CSV file
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - Preview data with validation results
 */
async function generatePreview(filePath, filename) {
  try {
    // Validate file format
    const formatValidation = csvValidator.validateFileFormat(filename);
    if (!formatValidation.isValid) {
      return {
        success: false,
        error: formatValidation.error
      };
    }

    // Parse CSV file
    const { headers, rows } = await parseCSVFile(filePath);

    // Validate headers
    const headerValidation = csvValidator.validateHeaders(headers);
    if (!headerValidation.isValid) {
      return {
        success: false,
        error: headerValidation.error,
        missingColumns: headerValidation.missingColumns
      };
    }

    // Check for optional columns
    const optionalCheck = csvValidator.validateOptionalColumns(headers);

    // Validate all rows
    const dataValidation = csvDataValidator.validateAllRows(rows, optionalCheck.hasEmail);

    // Build preview response
    const preview = {
      success: dataValidation.isValid,
      fileName: filename,
      totalRows: rows.length,
      validRows: dataValidation.validRows.length,
      invalidRows: dataValidation.invalidRows.length,
      headers,
      hasEmailColumn: optionalCheck.hasEmail,
      previewData: dataValidation.validRows.slice(0, 10), // First 10 valid rows for preview
      errors: {
        fileErrors: [],
        headerErrors: [],
        dataErrors: dataValidation.errors || [],
        invalidRowDetails: dataValidation.invalidRows
      }
    };

    return preview;
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV file: ${error.message}`
    };
  }
}

/**
 * Parses CSV and returns all validated data (for actual import)
 * @param {string} filePath - Path to the CSV file
 * @param {string} filename - Original filename
 * @returns {Promise<object>} - Parsed and validated data
 */
async function parseAndValidateCSV(filePath, filename) {
  try {
    // Validate file format
    const formatValidation = csvValidator.validateFileFormat(filename);
    if (!formatValidation.isValid) {
      return {
        success: false,
        error: formatValidation.error
      };
    }

    // Parse CSV file
    const { headers, rows } = await parseCSVFile(filePath);

    // Validate headers
    const headerValidation = csvValidator.validateHeaders(headers);
    if (!headerValidation.isValid) {
      return {
        success: false,
        error: headerValidation.error,
        missingColumns: headerValidation.missingColumns
      };
    }

    // Check for optional columns
    const optionalCheck = csvValidator.validateOptionalColumns(headers);

    // Validate all rows
    const dataValidation = csvDataValidator.validateAllRows(rows, optionalCheck.hasEmail);

    return {
      success: dataValidation.isValid,
      fileName: filename,
      totalRows: rows.length,
      validRows: dataValidation.validRows,
      invalidRows: dataValidation.invalidRows,
      hasEmailColumn: optionalCheck.hasEmail,
      errors: {
        dataErrors: dataValidation.errors || [],
        invalidRowDetails: dataValidation.invalidRows
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV file: ${error.message}`
    };
  }
}

module.exports = {
  parseCSVFile,
  generatePreview,
  parseAndValidateCSV
};
