FROM listmonk/listmonk:latest

# Install postgresql-client for Neon wakeup ping
RUN apk add --no-cache postgresql16-client curl

# Copy entrypoint that wakes Neon before starting Listmonk
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/entrypoint.sh"]
