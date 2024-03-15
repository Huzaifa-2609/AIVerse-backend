   FROM python:3.7
        COPY ./model-1710447598804.tar.gz /app/
        WORKDIR /app/
        RUN tar -xvf model-1710447598804.tar.gz && rm model-1710447598804.tar.gz
        EXPOSE 8080
        RUN pip install Flask
        ENTRYPOINT ["python3", "api.py"]