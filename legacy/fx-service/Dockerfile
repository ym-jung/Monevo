FROM python:3.14-slim

WORKDIR /srv

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --uid 1000 --create-home --shell /usr/sbin/nologin fx
USER fx

EXPOSE 8000
ENV PYTHONUNBUFFERED=1 TZ=UTC

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
