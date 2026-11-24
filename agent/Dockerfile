FROM python:3.12-slim

WORKDIR /app
COPY index.html ./index.html
COPY agent/retrieval.py agent/server.py ./agent/

ENV PYTHONUNBUFFERED=1 PORT=8000
EXPOSE 8000
CMD ["python", "agent/server.py"]
