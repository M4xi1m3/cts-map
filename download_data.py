#!/bin/env python3

from dotenv import load_dotenv
import requests
import os
import json
import pathlib

import requests.auth

TO_DOWNLOAD = [
    ('https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/lignes_tram/records', 'lines_tram.json', 'LINES_TRAM'),
    ('https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/lignes_de_bus/records?refine=type_ligne%3A%22BHNS%22 ', 'lines_bhns.json', 'LINES_BHNS'),
]

TO_DOWNLOAD_CTS = [
    ('https://api.cts-strasbourg.eu/v1/siri/2.0/stoppoints-discovery?includeLinesDestinations=true', 'stoppoints.json', 'STOPPOINTS'),
    ('https://api.cts-strasbourg.eu/v1/siri/2.0/lines-discovery', 'lines.json', 'LINES'),
    ('https://api.cts-strasbourg.eu/v1/siri/2.0/estimated-timetable?LineRef=A&LineRef=B&LineRef=C&LineRef=D&LineRef=E&LineRef=F&GetStopIdInsteadOfStopCode=true', 'timetable.json', 'TIMETABLE')
]

load_dotenv()

CTS_TOKEN = os.getenv('CTS_TOKEN')

OUT = "client/data"
js_data = ""

os.makedirs(pathlib.Path(OUT), exist_ok=True)

for url, file, var in TO_DOWNLOAD:
    rep = requests.get(url)
    d = rep.json()
    with open(pathlib.Path(OUT) / file, 'w') as f:
        json.dump(d, f, indent=2)
        js_data += 'const ' + var + ' = ' + json.dumps(d) + '\n'

for url, file, var in TO_DOWNLOAD_CTS:
    rep = requests.get(url, auth=requests.auth.HTTPBasicAuth(CTS_TOKEN, ''))
    d = rep.json()
    with open(pathlib.Path(OUT) / file, 'w') as f:
        json.dump(d, f, indent=2)
        js_data += 'const ' + var + ' = ' + json.dumps(d) + '\n'

with open(pathlib.Path(OUT) / "data.js", 'w') as f:
    f.write(js_data)