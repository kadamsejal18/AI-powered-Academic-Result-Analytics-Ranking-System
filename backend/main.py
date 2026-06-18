import os
import uuid
import time
import logging
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pdf_uploader")

# Load environment variables from Next.js root .env file
dotenv_path = os.path.join(os.path.dirname(__file__), '../.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    logger.info(f"Loaded environment variables from: {dotenv_path}")
else:
    logger.warning(f"Root .env file not found at: {dotenv_path}. Using system env variables.")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
# Prefer service role key for backend actions, fallback to publishable/anon key
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "pdfs")

app = FastAPI(title="Result Intelligence PDF Uploader API")

# Configure CORS policies strictly to allow Next.js frontend on port 3001
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Supabase URL or Key environment variables are missing.")
        raise HTTPException(
            status_code=500, 
            detail="Server configuration error: Supabase credentials are not set."
        )

    # 1. Validate file extension
    filename = file.filename or "document.pdf"
    if not filename.lower().endswith('.pdf') or file.content_type != 'application/pdf':
        logger.warning(f"Rejected upload: invalid content type/extension ({file.content_type}, {filename})")
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    # Read file content safely
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error reading uploaded file content.")

    # 2. Validate file size (limit to 5MB to prevent DoS)
    max_size = 5 * 1024 * 1024
    if len(content) > max_size:
        logger.warning(f"Rejected upload: file size exceeds limit ({len(content)} bytes)")
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")

    # 3. Validate magic bytes of PDF to confirm file type structure (%PDF = 25 50 44 46)
    if len(content) < 4 or content[:4] != b'%PDF':
        logger.warning("Rejected upload: File header is not a valid PDF signature.")
        raise HTTPException(status_code=400, detail="Invalid PDF file content signature.")

    # 4. Generate unique filename (using UUID to prevent path traversal/overwrites)
    unique_id = uuid.uuid4().hex[:8]
    timestamp = int(time.time())
    # Strip path traversal sequences from original filename
    base_name = os.path.basename(filename)
    safe_name = "".join(c for c in base_name if c.isalnum() or c in ['.', '_', '-']).strip()
    safe_name = safe_name.replace('__', '_')
    new_filename = f"{timestamp}_{unique_id}_{safe_name}"

    # TODO(security): Integrate malware scanner / antivirus API (e.g. ClamAV) on the buffer.
    # TODO(security): Integrate Content Disarm and Reconstruction (CDR) to strip active content/macros from PDF.

    # 5. Upload to Supabase Storage REST API
    # Endpoint: {supabase_url}/storage/v1/object/{bucket_name}/{file_path}
    upload_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{SUPABASE_BUCKET}/{new_filename}"
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/pdf"
    }

    logger.info(f"Uploading file '{new_filename}' to Supabase bucket '{SUPABASE_BUCKET}'")
    try:
        response = requests.post(upload_url, data=content, headers=headers)
        if response.status_code != 200:
            try:
                error_response = response.json()
                error_message = error_response.get('error', 'Unknown storage error')
            except Exception:
                error_message = response.text or 'Unknown storage error'
            logger.error(f"Supabase Storage Upload failed with status {response.status_code}: {error_message}")
            raise HTTPException(
                status_code=500, 
                detail=f"Supabase Storage upload failed: {error_message}. Ensure the bucket '{SUPABASE_BUCKET}' exists."
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Connection to Supabase Storage failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect to Supabase Storage.")

    # 6. Generate the public URL
    # Public URL: {supabase_url}/storage/v1/object/public/{bucket_name}/{file_path}
    public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{SUPABASE_BUCKET}/{new_filename}"
    logger.info(f"File uploaded successfully. Public URL: {public_url}")

    return {
        "message": "Upload successful",
        "fileName": new_filename,
        "filePath": f"{SUPABASE_BUCKET}/{new_filename}",
        "fileUrl": public_url
    }

if __name__ == "__main__":
    import uvicorn
    # Bind strictly to localhost/127.0.0.1 on port 8001 for development security
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)
