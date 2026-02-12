"""
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from app.config import settings

# Middleware to handle trailing slashes
class TrailingSlashMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Remove trailing slash from path (except for root)
        if len(request.url.path) > 1 and request.url.path.endswith("/"):
            # Redirect to path without trailing slash
            url = request.url.replace(path=request.url.path.rstrip("/"))
            # Instead of redirecting, just modify the request path
            request.scope["path"] = request.url.path.rstrip("/")

        response = await call_next(request)
        return response

# Create FastAPI app
# Disable docs in production for security
docs_url = "/docs" if settings.ENVIRONMENT == "development" else None
redoc_url = "/redoc" if settings.ENVIRONMENT == "development" else None

app = FastAPI(
    title="Schedule My Uni API",
    description="API for university schedule management Mini App",
    version="1.0.0",
    docs_url=docs_url,
    redoc_url=redoc_url,
    openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None
)

# Add trailing slash middleware first
app.add_middleware(TrailingSlashMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from app.api import auth, schedule, user, homework, feedback, custom_events

# Register routers
app.include_router(auth.router)
app.include_router(schedule.router)
app.include_router(user.router)
app.include_router(homework.router)
app.include_router(feedback.router)
app.include_router(custom_events.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Schedule My Uni API",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy"}
