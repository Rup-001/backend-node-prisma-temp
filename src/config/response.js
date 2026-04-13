/**
 * Standard API response formatter
 * @param {Object} options
 * @param {string} options.message - Success message
 * @param {string} options.status - Status string (e.g., "OK")
 * @param {number} options.statusCode - HTTP status code
 * @param {Object} [options.data] - Data object to return
 * @returns {Object}
 */
const response = ({ message, status, statusCode, data = {} }) => {
  return {
    message,
    status,
    statusCode,
    data,
  };
};

module.exports = response;
