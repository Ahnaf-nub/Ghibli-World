from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import time
from typing import Dict, Any, List, Set

import httpx

BASE = Path(__file__).parent

app = FastAPI(title="Ghibli World")

app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE / "templates"))

GHIBLI_WHISPERS = [
    {"quote": "Life is a winking light in the darkness.", "source": "The Tale of the Princess Kaguya"},
    {"quote": "You cannot change fate. However, you can rise to meet it.", "source": "Princess Mononoke"},
    {"quote": "Whenever someone creates something with all of their heart, then that creation is given a soul.", "source": "The Cat Returns"},
    {"quote": "See with eyes unclouded by hate.", "source": "Princess Mononoke"},
    {"quote": "Nothing that happens is ever forgotten, even if you can’t remember it.", "source": "Spirited Away"},
    {"quote": "Always believe in yourself. Do this and no matter where you are, you will have nothing to fear.", "source": "The Cat Returns"},
]

FALLBACK_FILMS: List[Dict[str, Any]] = [
    {
        "id": "the-boy-and-the-heron-2023",
        "title": "The Boy and the Heron",
        "release_date": "2023",
        "director": "Hayao Miyazaki",
        "description": "Mahito enters a hidden realm to reunite with his mother, guided by a mysterious heron and ancient spirits.",
        "running_time": "124",
        "rt_score": "96",
        "movie_banner": "https://s3.amazonaws.com/nightjarprod/content/uploads/sites/192/2023/10/06110031/zbMRm6P6wPe9SQ6qJ7ZTAvCMS6e-scaled.jpg",
        "image": "https://s3.amazonaws.com/nightjarprod/content/uploads/sites/192/2023/10/06110031/zbMRm6P6wPe9SQ6qJ7ZTAvCMS6e-scaled.jpg",
    }
]


_MOVIES_CACHE: Dict[str, Any] = {"data": None, "at": 0.0}
_CACHE_TTL_SECONDS = 60 * 10  # 10 min


def _to_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        if isinstance(value, int):
            return value
        s = str(value).strip()
        if not s:
            return None
        return int(s)
    except Exception:
        return None


async def build_world_snapshot() -> Dict[str, Any]:
    films = await fetch_ghibli_films()

    def rt_score(movie: Dict[str, Any]) -> int:
        score = _to_int(movie.get("rt_score"))
        return score if score is not None else -1

    def year_value(movie: Dict[str, Any]) -> int:
        year = _to_int(movie.get("year"))
        return year if year is not None else 0

    top_rated = max(films, key=rt_score, default=None)
    newest = max(films, key=year_value, default=None)
    oldest = min([f for f in films if year_value(f) != 0], key=year_value, default=None)

    timeline = [
        {
            "title": f.get("title"),
            "year": year_value(f),
            "rt_score": _to_int(f.get("rt_score")),
        }
        for f in films
        if year_value(f)
    ]
    timeline.sort(key=lambda item: item["year"])

    avg_score = None
    rt_values = [rt_score(f) for f in films if rt_score(f) >= 0]
    if rt_values:
        avg_score = round(sum(rt_values) / len(rt_values), 1)

    runtime_values = [_to_int(f.get("running_time")) for f in films]
    total_runtime = sum(rv for rv in runtime_values if rv is not None)
    first_year = timeline[0]["year"] if timeline else None
    latest_year = timeline[-1]["year"] if timeline else None

    return {
        "counts": {
            "films": len(films),
        },
        "topRated": top_rated,
        "newest": newest,
        "oldest": oldest,
        "timeline": timeline,
        "averageRtScore": avg_score,
        "totalRuntimeMinutes": total_runtime,
        "firstYear": first_year,
        "latestYear": latest_year,
        "quotes": GHIBLI_WHISPERS,
    }


@app.get("/api/world")
async def api_world():
    snapshot = await build_world_snapshot()
    return JSONResponse(content=snapshot)

async def fetch_ghibli_films() -> List[Dict[str, Any]]:

    # Cache
    now = time.time()
    if _MOVIES_CACHE["data"] and (now - _MOVIES_CACHE["at"]) < _CACHE_TTL_SECONDS:
        return _MOVIES_CACHE["data"]
    urls = ["https://ghibliapi.vercel.app/films"]
    films_raw: List[Dict[str, Any]] = []
    async with httpx.AsyncClient(timeout=10) as client:
        for url in urls:
            try:
                r = await client.get(url)
                if r.status_code == 200:
                    payload = r.json()
                    if isinstance(payload, dict) and "data" in payload:
                        payload = payload.get("data", [])
                    if isinstance(payload, list):
                        films_raw.extend(payload)
            except Exception:
                continue

    dedup: Dict[str, Dict[str, Any]] = {}
    titles_seen: Set[str] = set()
    for f in films_raw:
        raw_id = (f.get("id") or "").strip().lower()
        title_key = (f.get("title") or "").strip().lower()
        fid = raw_id or title_key
        if not fid:
            continue
        dedup[fid] = f
        if title_key:
            titles_seen.add(title_key)
    for extra in FALLBACK_FILMS:
        raw_id = (extra.get("id") or "").strip().lower()
        title_key = (extra.get("title") or "").strip().lower()
        fid = raw_id or title_key
        if not fid:
            continue
        if fid in dedup or (title_key and title_key in titles_seen):
            continue
        dedup[fid] = extra
        if title_key:
            titles_seen.add(title_key)
    films_raw = list(dedup.values())

    def to_simple(f: Dict[str, Any]) -> Dict[str, Any]:
        title = f.get("title") or f.get("name")
        year = f.get("release_date") or f.get("releaseDate") or f.get("year")
        desc = f.get("description") or f.get("desc") or ""
        director = f.get("director") or f.get("director_name") or ""
        poster = f.get("image") or f.get("movie_banner") or f.get("poster")
        image = f.get("image") or poster
        return {
            "id": f.get("id"),
            "title": title,
            "year": int(year) if str(year).isdigit() else year,
            "director": director,
            "description": desc,
            "image": image,
            "poster": poster,
            "running_time": f.get("running_time") or f.get("runningTime"),
            "rt_score": f.get("rt_score") or f.get("rtScore"),
            "movie_banner": f.get("movie_banner"),
        }

    films = [to_simple(f) for f in films_raw]

    _MOVIES_CACHE.update({"data": films, "at": now})
    return films


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/quiz", response_class=HTMLResponse)
async def quiz_page(request: Request):
    return templates.TemplateResponse("quiz.html", {"request": request})



@app.get("/explorer", response_class=HTMLResponse)
async def explorer_page(request: Request):
    return templates.TemplateResponse("explorer.html", {"request": request})


@app.get("/oracle", response_class=HTMLResponse)
async def oracle_page(request: Request):
    return templates.TemplateResponse("oracle.html", {"request": request})


@app.get("/api/movies")
async def api_movies():
    films = await fetch_ghibli_films()
    return JSONResponse(content=films)


@app.get("/healthz")
async def healthz():
    return {"ok": True}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)