# Ghibli World

Studio Ghibli-inspired microsite built with **FastAPI** and vanilla frontend tech. Explore a curated film world, take a personality quiz, and ask the spirits for a movie night recommendation.

## ✨ Features

- **Ghibli World Hub** – hero spotlight, timeline, spirit statistics, and daily whisper quotes.
- **Movie Explorer** – filter and search the full catalogue with cozy paper-textured cards.
- **Spirit Guide** – mood-based oracle that suggests films with quotes and ambience.
- **Character Quiz** – answer six prompts to reveal your inner Ghibli character with tailored recommendations.
- **Ambient audio toggle** – soft background sounds with persistence across pages.
- **Mobile-friendly design** – responsive layout, scrollable filter chips, and touch-friendly controls.

## 🚀 Getting Started

```bash
pip install -r requirements.txt

uvicorn main:app --reload
```

Visit <http://127.0.0.1:8000> once the server is running.

## 🗂️ Project Structure

```
main.py              FastAPI entrypoint + API routes
templates/           Jinja2 views (home, explorer, quiz, oracle)
static/css/          Global styling, responsive rules
static/js/           Frontend interactions (explorer, quiz, oracle)
static/images/       Artwork and textures (including ghibli.png)
data/                JSON fallback data for characters/movies
```

## 📡 Data & APIs

- Primary film data from [Studio Ghibli API](https://ghibliapi.vercel.app/)
- Local fallbacks ensure recent titles like *The Boy and the Heron* always appear
- Quotes and mood mappings are handcrafted within the app

Enjoy wandering the skies! 🌥️
