   FROM python:3.7
        COPY ./model-1710447975917.tar.gz /app/
        WORKDIR /app/
        RUN tar -xvf model-1710447975917.tar.gz && rm model-1710447975917.tar.gz
        EXPOSE 8080
        RUN pip install Flask transformers[torch]
        ENTRYPOINT ["python3", "api.py"]