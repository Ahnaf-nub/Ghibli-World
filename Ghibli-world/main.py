from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pathlib import Path
import time
from typing import Dict, Any, List, Set
from collections import Counter
from urllib.parse import quote, urlparse

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

QUIZ_ARCHETYPES: Dict[str, Dict[str, Any]] = {
    "calm": {
        "name": "Forest Guardian",
        "film": "My Neighbor Totoro",
        "quote": "Trees and people used to be good friends.",
        "recommended": [
            "When Marnie Was There",
            "Only Yesterday",
            "Spirited Away",
        ],
    },
    "curious": {
        "name": "Sky Courier",
        "film": "Kiki's Delivery Service",
        "quote": "We each need to find our own inspiration.",
        "recommended": [
            "Whisper of the Heart",
            "Castle in the Sky",
            "Arrietty",
        ],
    },
    "romantic": {
        "name": "Heart of Howl",
        "film": "Howl's Moving Castle",
        "quote": "A heart's a heavy burden.",
        "recommended": [
            "The Wind Rises",
            "From Up on Poppy Hill",
            "Ponyo",
        ],
    },
    "mysterious": {
        "name": "Bathhouse Dreamer",
        "film": "Spirited Away",
        "quote": "Once you've met someone you never really forget them.",
        "recommended": [
            "Princess Mononoke",
            "Ponyo",
            "Castle in the Sky",
        ],
    },
    "kind": {
        "name": "Whispering Artisan",
        "film": "Whisper of the Heart",
        "quote": "You have to write the story you want to read.",
        "recommended": [
            "The Cat Returns",
            "Only Yesterday",
            "When Marnie Was There",
        ],
    },
    "brave": {
        "name": "Spirit Warrior",
        "film": "Princess Mononoke",
        "quote": "The forest is not a place for men.",
        "recommended": [
            "Nausicaä of the Valley of the Wind",
            "Princess Mononoke",
            "The Boy and the Heron",
        ],
    },
    "determined": {
        "name": "Valley Pathfinder",
        "film": "Nausicaä of the Valley of the Wind",
        "quote": "You mustn't ever let anyone steal your dreams.",
        "recommended": [
            "Princess Mononoke",
            "Castle in the Sky",
            "The Boy and the Heron",
        ],
    },
}

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
_IMAGE_PROXY_CACHE: Dict[str, Dict[str, Any]] = {}
_IMAGE_PROXY_TTL = 60 * 60  # 1 hour
_IMAGE_PROXY_MAX_BYTES = 5 * 1024 * 1024  # 5 MB


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
        }

    films = [to_simple(f) for f in films_raw]

    _MOVIES_CACHE.update({"data": films, "at": now})
    return films


def _dominant_trait(answers: List[str]) -> str:
    filtered = [a for a in answers if isinstance(a, str) and a]
    if not filtered:
        return "curious"
    counts = Counter(filtered)
    winner, _ = max(
        counts.items(),
        key=lambda item: (item[1], -filtered.index(item[0]))
    )
    return winner if winner in QUIZ_ARCHETYPES else "curious"


def _normalize_title(value: str) -> str:
    return "".join(ch for ch in value.lower() if ch.isalnum())


def _to_proxy_url(url: str | None) -> str | None:
    if not url:
        return None
    return f"/proxy/image?url={quote(url, safe='')}"


def _build_recommendations(
    films: List[Dict[str, Any]],
    titles: List[str],
    skip_title: str,
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    seen: Set[str] = set()
    skip_key = skip_title.strip().lower()
    skip_norm = _normalize_title(skip_title) if skip_title else ""

    catalog: Dict[str, Dict[str, Any]] = {}
    for f in films:
        title = str(f.get("title") or "").strip()
        if not title:
            continue
        catalog[title.lower()] = f
        norm = _normalize_title(title)
        if norm:
            catalog.setdefault(norm, f)
    for raw_title in titles:
        title = (raw_title or "").strip()
        if not title:
            continue
        key = title.lower()
        norm = _normalize_title(title)
        if key in seen or key == skip_key or norm == skip_norm:
            continue
        match = catalog.get(key) or catalog.get(norm)
        if match:
            raw_image = (
                match.get("image")
                or match.get("poster")
                or match.get("movie_banner")
            )
            items.append(
                {
                    "title": match.get("title"),
                    "year": match.get("year"),
                    "director": match.get("director"),
                    "image": _to_proxy_url(raw_image),
                }
            )
        else:
            items.append({"title": title})
        seen.add(key)
        if norm:
            seen.add(norm)
    return items


async def _fetch_image_proxy(url: str) -> Dict[str, Any]:
    now = time.time()
    cached = _IMAGE_PROXY_CACHE.get(url)
    if cached and (now - cached["at"]) < _IMAGE_PROXY_TTL:
        return cached

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="failed to fetch image")

    content = resp.content
    if len(content) > _IMAGE_PROXY_MAX_BYTES:
        raise HTTPException(status_code=413, detail="image too large")

    content_type = resp.headers.get("content-type") or "application/octet-stream"
    record = {
        "content": content,
        "content_type": content_type.split(";")[0],
        "at": now,
    }
    _IMAGE_PROXY_CACHE[url] = record
    return record


@app.get("/proxy/image")
async def proxy_image(url: str):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="invalid image url")

    try:
        payload = await _fetch_image_proxy(url)
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=502, detail="image proxy failure") from exc

    return Response(content=payload["content"], media_type=payload["content_type"])


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


@app.post("/api/quiz")
async def api_quiz(payload: Dict[str, Any]):
    answers = payload.get("answers")
    if not isinstance(answers, list):
        raise HTTPException(status_code=400, detail="answers must be a list")
    parsed = [str(a).strip() for a in answers if isinstance(a, str) and str(a).strip()]
    if not parsed:
        raise HTTPException(status_code=400, detail="no answers provided")

    trait = _dominant_trait(parsed)
    profile = QUIZ_ARCHETYPES.get(trait) or QUIZ_ARCHETYPES["curious"]
    films = await fetch_ghibli_films()

    film_match = next(
        (
            f
            for f in films
            if str(f.get("title") or "").strip().lower()
            == profile["film"].strip().lower()
        ),
        None,
    )
    film_image_raw = profile.get("film_image")
    if not film_image_raw and film_match:
        film_image_raw = (
            film_match.get("image")
            or film_match.get("poster")
            or film_match.get("movie_banner")
        )

    film_image = _to_proxy_url(film_image_raw)
    avatar_image = _to_proxy_url(profile.get("image")) or film_image

    recs = _build_recommendations(films, profile.get("recommended", []), profile["film"])

    response = {
        "type": trait,
        "name": profile.get("name"),
        "film": profile.get("film"),
        "quote": profile.get("quote"),
        "image": avatar_image,
        "film_image": film_image,
        "recommended": recs,
    }
    return JSONResponse(content=response)


@app.get("/healthz")
async def healthz():
    return {"ok": True}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)