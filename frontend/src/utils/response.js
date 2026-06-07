/**
 * Standard API Response Utility
 * Use this for ALL responses going forward
 */

class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message, code = 'ERROR', statusCode = 500) {
    return {
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data, total, page, perPage) {
    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = ApiResponse;