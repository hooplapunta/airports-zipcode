const fs = require('fs');

const throttledQueue = require('throttled-queue')
let throttle = throttledQueue(10, 1000) // 10 times per second

const Client = require("@googlemaps/google-maps-services-js").Client;

// we are connecting to the Google Places Geocoding and Places APIs
const client = new Client({});

// open the airports json database
let airportsIcaoData = require('../data/airports.json');
let airportsIcaoToZipcode = new Object();

fs.appendFileSync('../data/airportsPostalCode.json', '{');
var stream = fs.createWriteStream("../data/airportsPostalCode.json", { flags: 'a' });
stream.on('close', function () {
    fs.appendFileSync('../data/airportsPostalCode.json', '}');
});

var sep = "";

// load our airport data
for (const icao in airportsIcaoData) {
    if (airportsIcaoData.hasOwnProperty(icao)) {
        const airport = airportsIcaoData[icao];

        throttle(function () {
            getPostalCode(airport);
        });
    }
}

function getPostalCode(airport) {
    // split here
    var foundPostalCode = "";
    var geocodeLat = "";
    var geocodeLng = "";

    // for each airport, we will do an async lookup.
    client
        .reverseGeocode({
            params: {
                latlng: airport.lat + "," + airport.lon,
                key: "AIzaSyD_XAr5aphInAPf9XrNcOC5rszHHyzStw4",
            },
            timeout: 5000 // milliseconds
        })
        .then(r => {
            //console.log(r.data);

            if (r.data.status != "ZERO_RESULTS") {
                // iterate through the results to check for a postal code component
                r.data.results.forEach(result => {
                    result.address_components.forEach(component => {
                        if (component.types.includes("postal_code")) {
                            foundPostalCode = component.long_name;
                            foundLevel = 1;
                        }
                    });
                });
            } else {
                console.log("ALERT: No results found for reverse geocode of " + icao + "'s latlon !");
            }

            // check if we found a postal code from the reverse geocode
            if (foundPostalCode != "") {
                // add the found postal code to our lookup list
                var result = new Object();
                result.icao = {
                    zipcode: foundPostalCode,
                    foundLevel: foundLevel
                };

                var data = JSON.stringify(result);
                data.slice(1, -1);
                stream.write(sep + data);
                if (!sep) sep = ",\n";
                console.log(1);
            } else {
                // we did not find a postal code
                // try checking the geocode of the name of the airport
                client
                    .geocode({
                        params: {
                            address: airport.name,
                            key: "AIzaSyD_XAr5aphInAPf9XrNcOC5rszHHyzStw4",
                        },
                        timeout: 5000 // milliseconds
                    })
                    .then(r => {

                        if (r.data.status != "ZERO_RESULTS") {

                            r.data.results.forEach(result => {
                                result.address_components.forEach(component => {
                                    if (component.types.includes("postal_code")) {
                                        foundPostalCode = component.long_name;
                                        foundLevel = 2;
                                    }
                                });
                            });

                            // still no results
                            if (foundPostalCode != "") {
                                // add the found postal code to our lookup list
                                var result = new Object();
                                result.icao = {
                                    zipcode: foundPostalCode,
                                    foundLevel: foundLevel
                                };

                                var data = JSON.stringify(result);
                                data.slice(1, -1);
                                stream.write(sep + data);
                                if (!sep) sep = ",\n";
                                console.log(2);
                            } else {
                                // last ditch effort to use the geocoded latlng to find a result
                                geocodeLat = results[0].geometry.location.lat;
                                geocodeLon = results[0].geometry.location.lon;

                                client
                                    .reverseGeocode({
                                        params: {
                                            latlng: geocodeLat + "," + geocodeLng,
                                            key: "AIzaSyD_XAr5aphInAPf9XrNcOC5rszHHyzStw4",
                                            result_type: "postal_code"
                                        },
                                        timeout: 5000 // milliseconds
                                    })
                                    .then(r => {
                                        if (r.data.status != "ZERO_RESULTS") {
                                            r.data.results.forEach(result => {
                                                result.address_components.forEach(component => {
                                                    if (component.types.includes("postal_code")) {
                                                        foundPostalCode = component.long_name;
                                                        foundLevel = 3;
                                                    }
                                                });
                                            });

                                            if (foundPostalCode != "") {
                                                // add the found postal code to our lookup list
                                                var result = new Object();
                                                result.icao = {
                                                    zipcode: foundPostalCode,
                                                    foundLevel: foundLevel
                                                };

                                                var data = JSON.stringify(result);
                                                data.slice(1, -1);
                                                stream.write(sep + data);
                                                if (!sep) sep = ",\n";
                                                console.log(3);
                                            } else {
                                                console.error("ERROR: No postal code found for " + airport.icao + "on all levels!");
                                            }

                                        } else {
                                            console.log("ERROR: No results found for reverse geocode of " + airport.icao + "'s Google latlng!");
                                        }
                                    })
                                    .catch(e => {
                                        console.log(e);
                                    });

                            }

                        } else {
                            console.log("ALERT: No results found for geocode of " + airport.icao + "'s name!");
                        }
                    })
                    .catch(e => {
                        console.log(e);
                    });
            }
        })
        .catch(e => {
            console.log(e);
        });
}