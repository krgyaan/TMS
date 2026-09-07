FROM python:3.11-slim

# Set runtime environment variables
# Tuning to prevent PaddlePaddle from monopolizing CPU cores and starving FastAPI
ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    OMP_NUM_THREADS=1 \
    FLAGS_allocator_strategy=naive_best_fit \
    PADDLE_OCR_ENABLED=true

# Install tesseract-ocr, tesseract-ocr-hin, and libgomp1 via apt-get
# (tesseract is the fallback engine; libgomp1 is required for Paddle OpenMP CPU inference;
# libgl1 and libglib2.0-0 provide required graphics libraries for OpenCV / PaddleOCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-hin \
    libgomp1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-bake PaddleOCR's detection/recognition/angle-classifier models into the image
# so there is no live download attempt on first request in production
RUN python -c "from paddleocr import PaddleOCR; PaddleOCR(use_angle_cls=True, lang='en')"

# Copy application source code into the image
COPY app/ ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
