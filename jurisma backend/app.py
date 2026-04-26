from flask import Flask, request
from flask_cors import CORS
from config import config
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ],
    force=True # Ensure this configuration is applied even if logging was already configured
)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    # Allow all origins for now, with explicit support for Authorization header
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Load configuration
    app.config.from_object(config)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.social import social_bp
    from routes.student import student_bp
    from routes.legal import legal_bp
    from routes.counsel import counsel_bp
    from routes.workspace import workspace_bp
    from routes.ai import ai_bp
    from routes.notifications import notifications_bp
    from routes.curriculum import curriculum_bp
    from routes.gamification import gamification_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(social_bp, url_prefix='/api/social')
    app.register_blueprint(student_bp, url_prefix='/api/student')
    app.register_blueprint(legal_bp, url_prefix='/api/legal')
    app.register_blueprint(counsel_bp, url_prefix='/api/counsel')
    app.register_blueprint(workspace_bp, url_prefix='/api/workspace')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(curriculum_bp, url_prefix='/api/curriculum')
    app.register_blueprint(gamification_bp, url_prefix='/api/gamification')
    
    @app.route('/health')
    def health_check():
        return {"status": "healthy", "service": "jurisma-backend"}

    @app.before_request
    def log_request_info():
        logging.info(f"Request: {request.method} {request.url}")
        if request.data:
            # Only log small bodies to avoid flooding console
            body = request.get_data()
            if len(body) < 1000:
                logging.info(f"Body: {body}")

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=config.PORT, debug=config.DEBUG)
