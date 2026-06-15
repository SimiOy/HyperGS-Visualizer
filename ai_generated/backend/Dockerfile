FROM python:3.11-slim

WORKDIR /app

# Install backend runtime dependencies
COPY ai_generated/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Application code and pretrained model artifacts
COPY backend ./backend
COPY models ./models
COPY data ./data

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]