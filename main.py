from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, Optional

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.decorator import cache

import requests

from dotenv import load_dotenv
import os

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    FastAPICache.init(InMemoryBackend())
    yield

load_dotenv()

CTS_TOKEN = os.getenv('CTS_TOKEN')

app = FastAPI(lifespan=lifespan)

# Récupérer les lignes de tram depuis l'opendata de l'eurométropole
# 24h de cache c'est largement suffisant pour ça
@app.get("/api/lignes_tram")
@cache(expire=(60 * 60 * 24))
async def lignes_tram():
    return requests.get('https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/lignes_tram/records').json()

# Récupérer les arrêts de tram depuis l'opendata de la CTS
# 1h de cache
@app.get("/api/stoppoints")
@cache(expire=(60 * 60))
async def stoppoints():
    return requests.get('https://api.cts-strasbourg.eu/v1/siri/2.0/stoppoints-discovery?includeLinesDestinations=true', auth=requests.auth.HTTPBasicAuth(CTS_TOKEN, '')).json()

# Récupérer les lignes de tram depuis l'opendata de la CTS
# 1h de cache
@app.get("/api/lines")
@cache(expire=(60 * 60))
async def lines():
    return requests.get('https://api.cts-strasbourg.eu/v1/siri/2.0/lines-discovery', auth=requests.auth.HTTPBasicAuth(CTS_TOKEN, '')).json()

# Récupérer les timetables des trams depuis la CTS
# 15s de cache
@app.get("/api/timetable")
@cache(expire=15)
async def timetable():
    return requests.get('https://api.cts-strasbourg.eu/v1/siri/2.0/estimated-timetable?LineRef=A&LineRef=B&LineRef=C&LineRef=D&LineRef=E&LineRef=F&GetStopIdInsteadOfStopCode=true', auth=requests.auth.HTTPBasicAuth(CTS_TOKEN, '')).json()

app.mount("/", StaticFiles(directory="client", html=True), name="static")