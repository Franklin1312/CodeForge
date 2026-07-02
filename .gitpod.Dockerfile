FROM gitpod/workspace-full:latest

# Install Node 20
RUN bash -c ". ~/.nvm/nvm.sh && nvm install 20 && nvm alias default 20"

# Install Docker Compose v2
RUN curl -fsSL "https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
