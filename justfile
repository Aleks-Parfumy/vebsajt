# Port the dev server listens on
port := "8000"

# List all available commands
default:
    @just --list

# Serve the website locally in the background (logs to server.log, PID in server.pid)
dev:
    @nohup python3 -m http.server {{port}} -d . > server.log 2>&1 & echo $! > server.pid
    @echo "Serving on http://localhost:{{port}} (PID $(cat server.pid), logs: server.log)"

# Bake a piece of the intro model into a silhouette mask in assets
shape piece="Curve002" out="shape-flower.png":
    @tools/bake-shape.sh {{piece}} {{out}}

# Bake an outline drawing (the ring artefact) into a mask in assets
artwork src="wetransfer_ap-materijali-za-www_2026-08-13_1949/RING_AP_ARTEFAKT_.png" out="shape-ring.png":
    @tools/bake-artwork.sh {{src}} {{out}}

# Turn the ring drawing into the coloured sprite the sidebar wears
ring src="assets/RING_OVAJJJJJ_DUGAAA.png" out="shape-ring-colour-horizontal.png":
    @tools/colour-artwork.sh {{src}} {{out}} 300

# Turn the bloom drawing into the coloured sprite the scents page hangs
bloom src="krilo_duga.png" out="shape-flower-colour.png":
    @tools/colour-artwork.sh {{src}} {{out}} 300 2

# Bake the artefact the Parfum Finder's invitation is flanked by, left as drawn
finder-glyph src="krilo-artefakt-duga-SCENT.FINDER.png" out="shape-finder-artefact.png":
    @tools/colour-artwork.sh "{{src}}" {{out}} 420 0 0

# Stop the background dev server
down:
    @kill $(cat server.pid) 2>/dev/null && rm -f server.pid && echo "Stopped." || echo "No running server."
