# Ghibli World

Studio Ghibli inspired microsite built with **FastAPI** and vanilla frontend tech. Explore a curated film world, take a personality quiz, consult a spirit oracle, and light fortune lanterns for nightly guidance.
<img width="860" height="538" alt="image" src="https://github.com/user-attachments/assets/37bc19bb-e70f-42a8-a02b-23a07fa145d4" />
## ✨ Features

- **Ghibli World Hub** – A feature powered by cached film data, Spirit Ledger stats, and a daily whisper quote.
- **Movie Explorer** – filter and search the full catalogue with cozy paper-textured cards and CORS-safe poster proxying.
- **Spirit Guide** – mood-based oracle that responds with prompts, rituals, and ambient suggestions.
- **Character Quiz** – eight-step journey that reveals your related Ghibli character, prints personalized recommendations, and offers a downloadable keepsake.
- **Fortune Lanterns** – interactive fortune-telling page that blends moods, realms, and rituals for film inspiration.
- **Ambient audio toggle** – soft background sounds.

## 🚀 Getting Started

```bash
pip install -r requirements.txt

uvicorn main:app --reload
```

Visit <http://127.0.0.1:8000> once the server is running.

## 🗂️ Project Structure

```
main.py              FastAPI entrypoint + API routes
templates/           Jinja2 views (home, explorer, quiz, oracle, fortune)
static/css/          Global styling, responsive rules, lantern theming
static/js/           Frontend interactions (explorer, quiz, oracle, fortune)
static/images/       Artwork and textures (including ghibli.png)
data/                JSON fallback data for characters/movies
```

## 📡 Data & APIs

- Primary film data from [Studio Ghibli API](https://ghibliapi.vercel.app/)
- Quotes and mood mappings are handcrafted within the app
