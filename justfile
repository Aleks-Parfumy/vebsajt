# Port the dev server listens on
port := "8000"

# List all available commands
default:
    @just --list

# Serve the website locally in the background (logs to server.log, PID in server.pid)
dev:
    @nohup python3 -m http.server {{port}} > server.log 2>&1 & echo $! > server.pid
    @echo "Serving on http://localhost:{{port}} (PID $(cat server.pid), logs: server.log)"

# Stop the background dev server
down:
    @kill $(cat server.pid) 2>/dev/null && rm -f server.pid && echo "Stopped." || echo "No running server."
