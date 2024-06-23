# Use the node:18-alpine image as the base
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the rest of the application code
COPY . .

# Install dependencies needed for AWS CLI and Docker
RUN apk --no-cache add \
    curl \
    unzip \
    py3-pip \
    openrc \
    docker \
    shadow \
    python3

# Install AWS CLI using pip
RUN pip3 install awscli --upgrade --user

RUN export PATH=$PATH:~/.local/bin

# Enable Docker service
RUN rc-update add docker boot

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["npm","run", "prod"]
