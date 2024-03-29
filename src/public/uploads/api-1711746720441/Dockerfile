   
            FROM nvcr.io/nvidia/tensorflow:21.04-tf2-py3
            RUN apt-get update
            COPY ./api-1711746720445.tar.gz /app/
            WORKDIR /app/
            RUN tar -xvf api-1711746720445.tar.gz && rm api-1711746720445.tar.gz
            EXPOSE 8080
            RUN pip install --no-cache-dir -r requirements.txt
            ENTRYPOINT ["python3", "api.py"]