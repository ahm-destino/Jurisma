from flask import jsonify

def success_response(data=None, message=None, pagination=None, status_code=200, **extra):
    response = {
        "success": True
    }
    if message is not None:
        response["message"] = message
    if data is not None:
        response["data"] = data
    if pagination is not None:
        response["pagination"] = pagination
    
    response.update(extra)
    return jsonify(response), status_code

_json_success = success_response # Alias for internal patterns

def error_response(message, code="INTERNAL_SERVER_ERROR", status_code=500, details=None):
    response = {
        "success": False,
        "message": message,
        "error": {
            "code": code,
        }
    }
    if details:
        response["error"]["details"] = details
        
    return jsonify(response), status_code

# Common error responses
def bad_request(message="Bad Request", details=None):
    return error_response(message, "BAD_REQUEST", 400, details)

def unauthorized(message="Unauthorized"):
    return error_response(message, "UNAUTHORIZED", 401)

def forbidden(message="Forbidden"):
    return error_response(message, "FORBIDDEN", 403)

def not_found(message="Resource Not Found"):
    return error_response(message, "NOT_FOUND", 404)

def internal_error(message="An unexpected error occurred"):
    return error_response(message, "INTERNAL_SERVER_ERROR", 500)
