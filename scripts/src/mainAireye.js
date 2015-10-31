window.addEventListener('load', function() {
	interfaceDisplay.setUtcClock('timeDisplay');
	interfaceDisplay.showHideHeader('headerControl');
	try {
		ae.drawMap();
		setInterval(function() {
			ae.drawAirplanes();
		}, 2000);
	} catch(error) {
		// TODO
		// Popup an alert to the user informing him that something went wrong
		// Tell him also to check his console.
		console.log("The google maps object is not defined. " + error);
	}
}, false);

// If the window resizes bring us back to the center of the map
window.addEventListener('resize', function() {
	var centerCoordinates = ae.getTrackerCoordinates();
	ae.gMap.setCenter({lat: centerCoordinates.latitude, lng: centerCoordinates.longitude});
}, false);

// Object for dealing with Google Maps
var ae = {

	// The variable that will hold the new map instance so we can use it outside of the
	// drawMap() function
	gMap : null,

	// For holding airplanes markers instances
	airplanesMarkers : {},

	// Getter for tracker coordinates that are used in various places
	// This represents the ADS-B Tracker
	//
	// TODO
	// A way to deal with multiple trackers
	getTrackerCoordinates : function() {
		return gen.fetchJSONData('tracker.json');
	},

	// Getter for coordinates of local interest points that are going to be highlighted on the map
	// Size determines the radius of the circle around them
	getLocalAirports : function() {
		return gen.fetchJSONData('local-airports.json');
	},

	// Set Google Maps options (basically disable all controls)
	getMapOptions : function(coordObject) {
		return {
			backgroundColor : "#010101",
			center : new google.maps.LatLng(coordObject.latitude, coordObject.longitude),
			zoom : 11,
			maxZoom : 15,
			minZoom : 8,
			mapTypeControl : false,
			streetViewControl : false,
			zoomControl : false,
			panControl : false,
		}
	},

	// Getter for plane JSON data gennerated by the adsb tracker
	// We are using PHP glue code because of web server limitations (Check the php for details)
	//
	// TODO
	// Modify the dump1090 source and remove the built in web server
	// (or set it's Access-Control-Allow-Origin header
	getAirplanesData : function() {
		var rawAirplaneData = gen.fetchJSONData('getCorsJSON.php', 'functions/'),
			airplaneDataObject= {};
		for (var i=0; i<rawAirplaneData.length; i+=1) {
			if (rawAirplaneData[i]["hex"] !== 'undefined') {
				airplaneDataObject[rawAirplaneData[i]["hex"]] = rawAirplaneData[i];
			}
		}
		// return rawAirplaneData;
		return airplaneDataObject;
	},

	// Draw distance circles (since we are dealing with airplanes, they are in miles)
	drawDistanceCircles : function (mapInstance, nrCircles, coordObject) {
		for (var i=10; i<=nrCircles*10; i+=10) {
			var newCircle = new google.maps.Circle({
				map : mapInstance,
				center : {lat: coordObject.latitude, lng: coordObject.longitude},
				radius : i*1852,
				fillOpacity: 0,
				strokeWeight: 1,
				strokeOpacity: 0.2,
				strokeColor: '#2ECC71',
			});
		}
	},

	// Draw circles (highlights) around places of interest (airports - see above)
	drawAirportHighlight : function(mapInstance, airportsArray) {
		for (i in airportsArray) {
			var newHightlight = new google.maps.Circle({
				map : mapInstance,
				center : {lat: airportsArray[i].lat, lng: airportsArray[i].lon},
				radius : airportsArray[i].size * 1000,
				strokeColor: '#FFFFFF',
				strokeOpacity: 0,
				strokeWeight: 0,
				fillColor: '#27AF5F',
				fillOpacity: 0.1,
			});
		}
	},

	// Set map styles, options, instantiate a new map object, start drawing distance circles,
	// start drawing highlights
	drawMap : function() {
		var customMapType = new google.maps.StyledMapType(
			// Generated using Google's Maps Styling Wizard
			[ { "stylers": [ { "hue": "#22ff00" }, { "saturation": -62 }, { "visibility": "simplified" }, { "invert_lightness": true }, { "lightness": -64 } ] },{ "featureType": "administrative", "stylers": [ { "visibility": "simplified" }, { "color": "#333333" } ] },{ "featureType": "poi", "stylers": [ { "visibility": "off" } ] },{ "featureType": "road", "stylers": [ { "visibility": "on" }, { "lightness": -50 } ] },{ "featureType": "transit", "stylers": [ { "visibility": "off" } ] }, { "featureType": "transit.station.airport", "elementType": "geometry", "stylers": [ { "visibility": "on" },	{ "invert_lightness": true }, { "weight": 8 }, { "color": "#27AE60" } ] }, { "featureType": "water", "stylers": [ { "visibility": "off" } ] } ],
			{ name: 'Aireye Styled Map'}),
			customMapTypeId = 'ae_styled_map',
			localAirports = this.getLocalAirports(),
			trackerCoordinates = this.getTrackerCoordinates();

		this.gMap = new google.maps.Map(document.getElementById('googleMap'), this.getMapOptions(trackerCoordinates));
		this.gMap.mapTypes.set(customMapTypeId, customMapType);
		this.gMap.setMapTypeId(customMapTypeId);

		this.drawDistanceCircles(this.gMap, 20, trackerCoordinates);
		this.drawAirportHighlight(this.gMap, localAirports);
	},

	// Create a new plane marker which we will be updating with new data as we receive it
	drawSingleAirplane : function(planeObject) {
		return new google.maps.Marker({
			position: new google.maps.LatLng(planeObject.lat, planeObject.lon),
			icon: {
				path : "M 9 0 L 11 0 L 11 10 L 15 10 L 15 20 L 5 20 L 5 10 L 9 10 L 9 12 L 7 12 L 7 18 L 13 18 L 13 12 L 11 12 L 11 14 L 9 14 Z",
				strokeWeight : 0,
				fillColor : '#FFFFFF',
				fillOpacity: 1,
				size: new google.maps.Size(20, 20),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(10, 10),
				rotation : planeObject.track,
			},
			map: this.gMap,
		});
	},

	// Check if we are tracking the current airplane in the @param object
	// If we are, and it's not stale (last seen more than 30 seconds ago) update it with new data
	// If it's stale, remove it
	updateAirplanesMarkers : function(planeObject) {
		if (this.airplanesMarkers.hasOwnProperty(planeObject['hex'])) {
			if (planeObject['seen'] > 30) {
				this.removeStaleAirplaneMarker(this.airplanesMarkers[planeObject['hex']]);
				return true;
			} else {
				this.airplanesMarkers[planeObject['hex']].setPosition(new google.maps.LatLng(planeObject['lat'], planeObject['lon']));
				this.airplanesMarkers[planeObject['hex']]['lastSeen'] = 0;
				return true;
			}
		}
		return false;
	},

	// Remove the aiplane marker object.
	// Remove it from the map and also delete the object key (maybe a palne with the same hex number will appear again)
	removeStaleAirplaneMarker : function(planeObject) {
		planeObject.setMap(null);
		delete planeObject;
	},

	// Check if old plane data exists, if not add it
	// Update plane data and add new planes / remove old planes
	// Save new plane data
	// This method should be called in a loop / a interval / a timeout,
	// else the plane markers won't be updated
	drawAirplanes : function() {
		var newAirplanesData = this.getAirplanesData(),
			trackedAirplanes = this.airplanesMarkers
			airplaneDataValidator = function(planeObject) {
				if (planeObject['validposition'] === 0) { return false; }
				return true;
			};
		if (Object.keys(this.airplanesMarkers).length < 1) {
			for (var key in newAirplanesData) {
				if (airplaneDataValidator(newAirplanesData[key])) {
					this.airplanesMarkers[key] = this.drawSingleAirplane(newAirplanesData[key]);
				}
			}
		} else {
			for (var key in newAirplanesData) {
				if (airplaneDataValidator(newAirplanesData[key])) {
					if (!this.updateAirplanesMarkers(newAirplanesData[key])) {
						this.airplanesMarkers[key] = this.drawSingleAirplane(newAirplanesData[key]);
					}
				}
			}
		}
	}

};

// Object for dealing with interface interactions
var interfaceDisplay = {

	// Simple function to update a clock (int UTC time)
	setUtcClock : function(el, timer) {
		(timer) ? clearTimeout(timer) : null;
		var t = new Date(),
			h = t.getUTCHours(),
			m = t.getUTCMinutes(),
			s = t.getUTCSeconds();
		if (h < 10) { h = '0' + h; }
		if (m < 10) { m = '0' + m; }
		if (s < 10) { s = '0' + s; }
		document.getElementById(el).innerHTML = h+":"+m+"."+s;
		var timer = setInterval(function() { interfaceDisplay.setUtcClock(el, timer); }, 1000);
	},

	// Click event handler for the button that shows / hides the header bar
	showHideHeader : function(el) {
		var c = document.getElementById(el);
		c.addEventListener('click', function() {
			var cl = this.childNodes[1].className;
			// console.log(cl);
			if (cl.indexOf('open') > -1) {
				document.getElementsByTagName('header')[0].style.marginLeft = '100%';
				this.childNodes[1].className = cl.replace(' open', '');
			} else {
				document.getElementsByTagName('header')[0].style.marginLeft = '0px';
				this.childNodes[1].className = cl + " open";
			}
		});
	},

};

// Object for general actions
var gen = {

	// Wrapper method for *syncronous* request of (json) files
	fetchJSONData : function(filename, location) {
		location = location || 'data/';
		request = new XMLHttpRequest();
		request.open('GET', location + filename, false);
		request.send(null);
		return JSON.parse(request.responseText);
	},

};