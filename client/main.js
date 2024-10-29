
// Données qui seront chargées depuis l'API
let LINES_TRAM, LINES, STOPPOINTS, TIMETABLE;

const initial_load = () => {
    const lignes_tram = async () => {
        LINES_TRAM = await (await fetch("/api/lignes_tram")).json();
        console.log(LINES_TRAM)
    }

    const stoppoints = async () => {
        STOPPOINTS = await (await fetch("/api/stoppoints")).json();
    }

    const lines = async () => {
        LINES = await (await fetch("/api/lines")).json();
    }

    const timetable = async () => {
        TIMETABLE = await (await fetch("/api/timetable")).json();
    }

    Promise.all([
        lignes_tram(),
        stoppoints(),
        lines(),
        timetable()
    ]).then(() => {
        setInterval(lignes_tram, 24 * 60 * 60 * 1000);
        setInterval(stoppoints, 60 * 60 * 1000);
        setInterval(lines, 60 * 60 * 1000);
        setInterval(timetable, 15 * 1000);

        loading_done();
    });
}

const loading_done = () => {
    const LINES_OVERRIDE = {
        'Place d\'Islande': ['F'],
        'Gare Centrale': ['C', 'A'],
        'Homme de Fer': ['C', 'A']
    }

    const map = L.map('map');
    // https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}.png
    // https://tile.openstreetmap.org/{z}/{x}/{y}.png
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors<br/>Données issues de l\'<a href="https://www.cts-strasbourg.eu/fr/portail-open-data/">OpenData de la CTS</a><br/>Logiciel distribué sous <a href="https://www.gnu.org/licenses/gpl-3.0.html">Licence GPL</a>'
    }).addTo(map);

    const lignes = {};

    // Dessigner les lignes de tram
    LINES_TRAM.results.forEach(line => {
        // Récupération des points de la ligne
        const points = line.geo_shape.geometry.coordinates;
        // Récupération de la couleur
        const color = LINES.LinesDelivery.AnnotatedLineRef.filter(d => d.LineRef === line.ligne)[0].Extension.RouteColor;

        // Ligne extérieur
        const polyline = L.polyline(L.GeoJSON.coordsToLatLngs(points), {
            color: '#' + color,
            weight: 6,
        }).addTo(map);
        // Ligne blanche centrale
        const polyline_white = L.polyline(L.GeoJSON.coordsToLatLngs(points), {
            color: '#ffffff',
            weight: 2,
            opacity: 0.5
        }).addTo(map);

        // Stockage des points pour traitement ultérieur
        lignes[line.ligne] = points;
    });

    const stops = {}
    const stations = {}

    // Pre-parsing des arrêts pour dessin
    // (en gros on AVG les coordéonnes)
    STOPPOINTS.StopPointsDelivery.AnnotatedStopPointRef.filter(stop => stop.Lines.filter(line => line.Extension.RouteType === "tram").length > 0).forEach(stop => {
        stations[stop.StopPointRef] = [
            stop.Location.Longitude,
            stop.Location.Latitude
        ];

        if (!(stop.StopName in stops)) {
            stops[stop.StopName] = {
                name: stop.StopName,
                lines: new Set(stop.Lines.map(l => l.LineRef)),
                lat: stop.Location.Latitude,
                lng: stop.Location.Longitude,
                cnt: 1
            };
        } else {
            stops[stop.StopName].lat += stop.Location.Latitude;
            stops[stop.StopName].lng += stop.Location.Longitude;
            stops[stop.StopName].cnt += 1;
            stop.Lines.map(l => l.LineRef).forEach(stops[stop.StopName].lines.add, stops[stop.StopName].lines);
        }
    });

    /// Dessin des coordonnées
    for (const name in stops) {
        const stop = stops[name];
        let line_name;

        // On trouve sur quel ligne l'arrêt se trouve, pour snap sur la ligne
        if (name in LINES_OVERRIDE) {
            line_name = LINES_OVERRIDE[name]
        } else {
            for (const line of stop.lines) {
                if (line in lignes) {
                    line_name = [line];
                }
            }
        }

        stop.lat /= stop.cnt;
        stop.lng /= stop.cnt;

        // On place l'arrêt
        if (line_name !== undefined) {
            for (the_name of line_name) {
                const tramline = turf.lineString(lignes[the_name]);
                const pt = turf.point([stop.lng, stop.lat]);
                // Snap l'arrêt sur la ligne
                const snapped = turf.nearestPointOnLine(tramline, pt);

                const marker = L.circleMarker(L.latLng(snapped.geometry.coordinates[1], snapped.geometry.coordinates[0]), {
                    radius: 6,
                    color: "#1d1d1d",
                    fillColor: "#ffffff",
                    weight: 3,
                    fillOpacity: 1
                }).addTo(map);
                marker.bindPopup(stop.name);
            }
        }
    }

    // Trams en cours de circulation
    let trams = {};
    // Cache des segments de lignes
    // (parce que c'est lour à calculer donc autant le faire qu'une fois pôour chaque segment)
    const segments_cache = {}

    // Mise à jour périodique
    setInterval(() => {
        const current_date = new Date();
        const current_trams = new Set();
        // On parcours la delivery
        for (const delivery of TIMETABLE.ServiceDelivery.EstimatedTimetableDelivery) {
            const cycle_name = delivery.ShortestPossibleCycle;
            // Les timeframes
            for (const frame of delivery.EstimatedJourneyVersionFrame) {
                // Et les journeys
                for (const journey of frame.EstimatedVehicleJourney) {
                    let previous = undefined;
                    const tram_unique_id = cycle_name + ";;" + journey.LineRef + ";;" + journey.FramedVehicleJourneyRef.DatedVehicleJourneySAERef
                    // console.log(tram_unique_id)
                    // On parcours les différentes stations sur le chemin
                    for (const call of journey.EstimatedCalls) {
                        if (previous === undefined) {
                            previous = call;
                            continue;
                        }

                        // On récupère l'heure de départ de la stations précédente, l'heure d'arrivée à la stations actuelle
                        const previous_dep = new Date(previous.ExpectedDepartureTime);
                        const call_arrival = new Date(call.ExpectedArrivalTime);
                        const call_departure = new Date(call.ExpectedDepartureTime);

                        // Si l'heure actuelle est entre le départ de la station précédente et l'arrivée
                        // de la station actuelle on sait que le tram est sur ce tronçon
                        if (previous_dep.getTime() <= current_date.getTime() && current_date.getTime() <= call_arrival.getTime()) {
                            // On calcul le pourcentage d'avancement sur le tronçon
                            // (interpolation linéaire à la con)
                            const percent = (current_date.getTime() - previous_dep.getTime()) / (call_arrival.getTime() - previous_dep.getTime());

                            // On place le tram
                            if (previous.StopPointRef in stations && call.StopPointRef in stations && journey.LineRef in lignes) {
                                let seg;
                                const segments_cache_id = journey.LineRef + ';;' + previous.StopPointRef + ';;' + call.StopPointRef;
                                if (segments_cache_id in segments_cache) {
                                    seg = segments_cache[segments_cache_id];
                                } else {
                                    seg = turf.lineSlice(stations[previous.StopPointRef], stations[call.StopPointRef], turf.lineString(lignes[journey.LineRef]));
                                    segments_cache[segments_cache_id] = seg;
                                }
                                const len = turf.length(seg);
                                const position = turf.along(seg, len * percent);

                                if (tram_unique_id in trams) {
                                    const last_position = map.project(trams[tram_unique_id].getLatLng(), 5)
                                    const current_position = map.project(L.latLng(position.geometry.coordinates[1], position.geometry.coordinates[0]), 5)
                                    const x = current_position.x - last_position.x;
                                    const y = current_position.y - last_position.y;
                                    const angle = Math.atan2(y, x);

                                    const elem = document.getElementById(`tram;;${tram_unique_id}`)
                                    if (elem !== null) {
                                        elem.style.transform = `rotate(${angle}rad)`;
                                    }

                                    trams[tram_unique_id].setLatLng(L.latLng(position.geometry.coordinates[1], position.geometry.coordinates[0]));
                                } else {
                                    const color = LINES.LinesDelivery.AnnotatedLineRef.filter(d => d.LineRef === journey.LineRef)[0].Extension.RouteColor;
                                    /*const marker = L.circleMarker(L.latLng(position.geometry.coordinates[1], position.geometry.coordinates[0]), {
                                        radius: 4,
                                        color: "#1d1d1d",
                                        fillColor: "#" + color,
                                        weight: 2,
                                        fillOpacity: 1
                                    }).addTo(map);*/
                                    const content = `
                                <svg viewBox="-10 -10 20 20" width="15" height="15" xmlns="http://www.w3.org/2000/svg" id="tram;;${tram_unique_id}">
                                <polygon points="-7.5, 5 2.5, 5 7.5, 0 2.5, -5 -7.5, -5" fill="#${color}" stroke="#1d1d1b" stroke-width="2" class="tram"></polygon>
                                </svg>
                                `
                                    const myIcon = L.divIcon({ className: 'tram-icon', html: content });
                                    const marker = L.marker(L.latLng(position.geometry.coordinates[1], position.geometry.coordinates[0]), { icon: myIcon }).addTo(map);
                                    marker.bindPopup(tram_unique_id);
                                    trams[tram_unique_id] = marker;
                                    console.log("Added " + tram_unique_id);
                                }
                                current_trams.add(tram_unique_id);
                            }
                            // Si l'heure actuelle et entre l'heure d'arrivée et de départ à une station on place le tram sur cette station.
                        } else if (call_arrival.getTime() <= current_date.getTime() && current_date.getTime() <= call_departure.getTime()) {
                            if (tram_unique_id in trams) {
                                trams[tram_unique_id].setLatLng(L.latLng([stations[call.StopPointRef][1], stations[call.StopPointRef][0]]));
                            } else {
                                const color = LINES.LinesDelivery.AnnotatedLineRef.filter(d => d.LineRef === journey.LineRef)[0].Extension.RouteColor;
                                const content = `
                            <svg viewBox="-10 -10 20 20" width="15" height="15" xmlns="http://www.w3.org/2000/svg" id="tram;;${tram_unique_id}">
                            <polygon points="-7.5, 5 2.5, 5 7.5, 0 2.5, -5 -7.5, -5" fill="#${color}" stroke="#1d1d1b" stroke-width="2" class="tram"></polygon>
                            </svg>
                            `
                                const myIcon = L.divIcon({ className: 'tram-icon', html: content });
                                const marker = L.marker(L.latLng([stations[call.StopPointRef][1], stations[call.StopPointRef][0]]), { icon: myIcon }).addTo(map);
                                marker.bindPopup(tram_unique_id);
                                trams[tram_unique_id] = marker;
                                console.log("Added " + tram_unique_id);
                            }
                            current_trams.add(tram_unique_id);
                        }


                        previous = call;
                    }
                }
            }
        }

        // On vire les anciens trams
        for (const key of Object.keys(trams)) {
            if (!current_trams.has(key)) {
                console.log("Removed " + key);
                trams[key].remove();
                delete trams[key];
            }
        }

    }, 200);

    var latLngBounds = L.latLngBounds([[48.52343058579338, 7.681799380771575], [48.62985324979267, 7.820267901766859]]);
    map.fitBounds(latLngBounds);
};


initial_load();