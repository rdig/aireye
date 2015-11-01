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
		console.log("Sorry but an error occured: " + error + " .I'm afraid you are on your own. Good luck.");
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
		};
	},

	// Getter for plane JSON data gennerated by the adsb tracker
	// We are using PHP glue code because of web server limitations (Check the php for details)
	//
	// TODO
	// - Modify the dump1090 source and remove the built in web server
	// (or set it's Access-Control-Allow-Origin header
	// - Optimize data fetching, right now we are hitting the server a little too hard
	getAirplanesData : function(testMode) {
		testMode = testMode || false;
		if (testMode) {
			var rawAirplaneData = gen.fetchJSONData('test-data.json');
		} else {
			var rawAirplaneData = gen.fetchJSONData('getCorsJSON.php', 'functions/');
		}
		var airplaneDataObject= {};
		for (var i=0; i<rawAirplaneData.length; i+=1) {
			if (rawAirplaneData[i]["hex"] !== 'undefined') {
				airplaneDataObject[rawAirplaneData[i]["hex"]] = rawAirplaneData[i];
			}
		}
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
		for (var i in airportsArray) {
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

	// Copy current icon object from @param planeMarker and update it's @param iconAttribute
	// with @param attributeValue
	updateMarkerIcon : function(planeMarker, iconAttribute, attributeValue) {
		var updatedMarkerIcon = JSON.parse(JSON.stringify(planeMarker.icon));
		iconAttribute = iconAttribute || 'fillColor';
		attributeValue = attributeValue || '#9B59B6';
		updatedMarkerIcon[iconAttribute] = attributeValue;
		planeMarker.setIcon(updatedMarkerIcon);
	},

	// Create a new plane marker which we will be updating with new data as we receive it
	// Also sets it's onclick event to handle the selection event of the plane
	//
	// TODO
	// - Better airplane data storage (the way we are doing it now is suboptimal, as google's map api may interfere with it)
	// - Aircraft tail (line that shows where the plane went)
	drawSingleAirplane : function(planeObject) {
		var markerIcon = {
				path : "M 9 0 L 11 0 L 11 10 L 15 10 L 15 20 L 5 20 L 5 10 L 9 10 L 9 12 L 7 12 L 7 18 L 13 18 L 13 12 L 11 12 L 11 14 L 9 14 Z",
				strokeWeight : 0,
				fillColor : '#FFFFFF',
				fillOpacity: 1,
				size: new google.maps.Size(20, 20),
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(10, 10),
				rotation : planeObject.track
			},
			newMarker = new google.maps.Marker({
				position: new google.maps.LatLng(planeObject.lat, planeObject.lon),
				icon: markerIcon,
				title : planeObject.flight,
				airplaneDisplayData : {
					hex : planeObject.hex,
					flight : planeObject.flight,
					position : planeObject.lat + ", " + planeObject.lon,
					squawk : planeObject.squawk,
					altitude : planeObject.altitude,
					track : planeObject.track,
					speed : planeObject.speed,
					isMarkerSelected : false
				},
				map: this.gMap
			});
		google.maps.event.addListener(newMarker, 'click', function() {
			if (this.airplaneDisplayData.isMarkerSelected) {
				ae.updateMarkerIcon(this, 'fillColor', '#FFFFFF');
				this.airplaneDisplayData.isMarkerSelected = false;
				interfaceDisplay.hidePlaneData('planeData');
			} else {
				for (var i in ae.airplanesMarkers) {
					ae.updateMarkerIcon(ae.airplanesMarkers[i], 'fillColor', '#FFFFFF');
					ae.airplanesMarkers[i].airplaneDisplayData.isMarkerSelected = false;
					interfaceDisplay.hidePlaneData('planeData');
				}
				ae.updateMarkerIcon(this, 'fillColor', '#08e008');
				this.airplaneDisplayData.isMarkerSelected = true;
				interfaceDisplay.updatePlaneData(this, 'planeData');
				ae.gMap.setCenter({lat: planeObject.lat, lng: planeObject.lon});
			}
		});
		return newMarker;
	},

	// Check if we are tracking the current airplane in the @param object
	// If we are, and it's not stale (last seen more than 30 seconds ago) update it with new data
	// If it's stale, remove it
	//
	// TODO
	// - Create a system that check each plane's validity so we can stop relying on dump1090's seen attribute
	updateAirplanesMarkers : function(planeObject) {
		if (this.airplanesMarkers.hasOwnProperty(planeObject['hex'])) {
			if (planeObject['seen'] > 30) {
				this.removeAirplaneMarker(this.airplanesMarkers[planeObject['hex']]);
				return true;
			} else {
				if (planeObject['validtrack'] === 1) {
					this.updateMarkerIcon(this.airplanesMarkers[planeObject['hex']], 'rotation', planeObject['track']);
				}
				this.airplanesMarkers[planeObject['hex']].setPosition(new google.maps.LatLng(planeObject['lat'], planeObject['lon']));
				this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.position = planeObject.lat + ", " + planeObject.lon;
				this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.squawk = planeObject.squawk;
				this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.altitude = planeObject.altitude;
				this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.track = planeObject.track;
				this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.speed = planeObject.speed;
				if (this.airplanesMarkers[planeObject['hex']].airplaneDisplayData.isMarkerSelected) {
					interfaceDisplay.updatePlaneData(this.airplanesMarkers[planeObject['hex']], 'planeData');
					this.gMap.setCenter({lat: planeObject.lat, lng: planeObject.lon});
				}
				return true;
			}
		}
		return false;
	},

	// Remove the aiplane marker object.
	// Remove it from the map and also delete the object key (maybe a palne with the same hex number will appear again)
	removeAirplaneMarker : function(planeObject) {
		planeObject.setMap(null);
		if (planeObject.airplaneDisplayData.isMarkerSelected) {
			interfaceDisplay.hidePlaneData('planeData');
		}
		delete this.airplanesMarkers[planeObject.airplaneDisplayData.hex];
	},

	// Check if old plane data exists, if not add it
	// Update plane data and add new planes / remove old planes
	// Save new plane data
	// This method should be called in a loop / a interval / a timeout,
	// else the plane markers won't be updated
	drawAirplanes : function() {
		var newAirplanesData = this.getAirplanesData(), // set to true for test mode
			airplaneDataValidator = function(planeObject) {
				if (planeObject['validposition'] === 0) { return false; }
				if (planeObject['seen'] > 30) { return false; }
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
				if (!this.updateAirplanesMarkers(newAirplanesData[key])) {
					if (airplaneDataValidator(newAirplanesData[key])) {
						this.airplanesMarkers[key] = this.drawSingleAirplane(newAirplanesData[key]);
					}
				}
			}
		}
		interfaceDisplay.updateTrackedPlanes(Object.keys(this.airplanesMarkers).length, 'trackedPlanes');
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
			if (cl.indexOf('open') > -1) {
				document.getElementsByTagName('header')[0].style.marginLeft = '100%';
				this.childNodes[1].className = cl.replace(' open', '');
			} else {
				document.getElementsByTagName('header')[0].style.marginLeft = '0px';
				this.childNodes[1].className = cl + " open";
			}
		});
	},

	// Update the element that displays the number of currently tracked airplanes
	updateTrackedPlanes : function(nrPlanes, divId) {
		document.getElementById(divId).innerHTML = parseInt(nrPlanes, 10);
	},

	// return the currently selected airplane's tracked data from the @param plane object
	setPlaneData : function(data) {
		var newPlaneData = "<p>";
		newPlaneData += "Flight: <span>" + data.flight + "</span>";
		newPlaneData += "ICAO: <span>" + data.hex.toUpperCase() + "</span>";
		newPlaneData += "Altitude: <span>" + data.altitude + " ft</span>";
		newPlaneData += "Heading: <span>" + data.track + "&#176;</span>";
		newPlaneData += "Lat / Lon: <span>" + data.position + "</span>";
		newPlaneData += "Speed: <span>" + data.speed + " kt</span>";
		if (data.squawk !== '0000') {
			if (data.squawk === '7500' || data.squawk === '7600' || data.squawk === '7700') {
				newPlaneData += "Squawk: <span class=\"warning\">" + data.squawk + "</span>";
			} else {
				newPlaneData += "Squawk: <span>" + data.squawk + "</span>";
			}
		}
		newPlaneData += "</p>";
		return newPlaneData;

	},

	// Update the element that displays the currently selected airplanes data with
	// the elements created by the setPlaneData() function
	// TODO
	// Find a better way to hide / animate the element, not this -150px crap
	updatePlaneData : function(planeObject, divId) {
		divId = divId || "planeData";
		var dataDiv = document.getElementById(divId);
		dataDiv.innerHTML = this.setPlaneData(planeObject.airplaneDisplayData);
		dataDiv.style.bottom = "-150px";
		dataDiv.style.display = "block";
		dataDiv.style.bottom = (-1 * dataDiv.offsetHeight) + "px";
		dataDiv.style.bottom = "0px";
	},

	// If we deselect the airplane (or it is deleted), hide the element that displays it's data
	//
	// TODO
	// Find a better way to hide / animate the element, not this -150px crap
	hidePlaneData : function(divId) {
		divId = divId || "planeData";
		document.getElementById(divId).style.bottom = "-150px";
	}

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