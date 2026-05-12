services:
  agent:
    container_name: {{projectName}}
    build: .
    env_file:
      - .env
    restart: unless-stopped
    # Mount the host waap-cli session so the container uses your wallet.
    # Comment out if you want a containerized-only session.
    volumes:
      # Path matches the non-root `node` user's home (Dockerfile uses USER node).
      - ~/.waap-cli:/home/node/.waap-cli:ro
