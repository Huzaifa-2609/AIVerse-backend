FROM python:3.8
WORKDIR /app/
COPY ./${req.file.filename} /app/
WORKDIR /app/
RUN tar -xvf ${req.file.filename} && rm ${req.file.filename}
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install Flask
ENTRYPOINT ["python3", "api.py"]