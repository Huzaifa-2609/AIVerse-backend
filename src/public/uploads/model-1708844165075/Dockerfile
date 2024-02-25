   FROM python:3.7
            COPY ./model-1708844165081.tar.gz /app/
            RUN tar -xvf /app/model-1708844165081.tar.gz
            EXPOSE 8080
            WORKDIR /app
            RUN pip install Flask
            ENTRYPOINT ["python3", "/app/api.py"]