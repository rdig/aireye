window.addEventListener('load', function() {
	ae.drawMap();
	interfaceDisplay.setUtcClock('timeDisplay');
	interfaceDisplay.showHideHeader('headerControl');
}, false);

// If the window / screen resizes bring us back to the center of the map
window.addEventListener('resize', function() {
	ae.gMap.setCenter({lat: ae.trackerCoordinates.lat, lng: ae.trackerCoordinates.lon});
}, false);

// Object for dealing with Google Maps
var ae = {

	// Tracker coordinates that are used in various places
	// This represents the ADS-B Tracker
	// TODO: A way to deal with multiple trackers
	trackerCoordinates : {
		lat : 46.552345,
		lon : 24.568242,
	},

	// Coordinates for local interest points that are going to be highlighted on the map
	// Size determines the radius of the circle around them
	localAirports : {
		lrtm : {
			size: 3,
			lat: 46.468018,
			lon: 24.413123,
		},
		aerodromTgm : {
			size : 1,
			lat : 46.534964,
			lon : 24.532018,
		},
		lrcl : {
			size: 4,
			lat: 46.785082,
			lon: 23.686362,
		},
		topaz : {
			size: 4,
			lat: 46.503075,
			lon: 23.888277,
		},
		ghindari : {
			size: 1,
			lat: 46.519267,
			lon: 24.944874,
		},
		luncani : {
			size: 1,
			lat: 46.480782,
			lon: 23.934334,
		}
	},

	// The variable that will hold the new map instance so we can use it outside of the 
	// drawMap() function
	gMap : null,

	// Draw distance circles (since we are dealing with airplanes, they are in miles)
	drawDistanceCircles : function (mapInstance, nrCircles) {
		for (var i=10; i<=nrCircles*10; i+=10) {
			var newCircle = new google.maps.Circle({
				map : mapInstance,
				center : {lat: this.trackerCoordinates.lat, lng: this.trackerCoordinates.lon},
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

	// Set Google Maps options (basically disable all controls)
	mapOptions : function() {
		return {
			backgroundColor : "#010101",
			center : new google.maps.LatLng(this.trackerCoordinates.lat, this.trackerCoordinates.lon),
			zoom : 11,
			maxZoom : 15,
			minZoom : 8,
			mapTypeControl : false,
			streetViewControl : false,
			zoomControl : false,
			panControl : false,
		}
	},

	// Set map styles, options, instantiate a new map object, start drawing distance circles,
	// start drawing highlights
	drawMap : function() {
		var customMapType = new google.maps.StyledMapType(
			[ { "stylers": [ { "hue": "#22ff00" }, { "saturation": -62 }, { "visibility": "simplified" }, { "invert_lightness": true }, { "lightness": -64 } ] },{ "featureType": "administrative", "stylers": [ { "visibility": "simplified" }, { "color": "#333333" } ] },{ "featureType": "poi", "stylers": [ { "visibility": "off" } ] },{ "featureType": "road", "stylers": [ { "visibility": "on" }, { "lightness": -50 } ] },{ "featureType": "transit", "stylers": [ { "visibility": "off" } ] }, { "featureType": "transit.station.airport", "elementType": "geometry", "stylers": [ { "visibility": "on" },	{ "invert_lightness": true }, { "weight": 8 }, { "color": "#27AE60" } ] }, { "featureType": "water", "stylers": [ { "visibility": "off" } ] } ],
			{ name: 'Aireye Styled Map'}),
			customMapTypeId = 'ae_styled_map';

		this.gMap = new google.maps.Map(document.getElementById('googleMap'), this.mapOptions());
		this.gMap.mapTypes.set(customMapTypeId, customMapType);
		this.gMap.setMapTypeId(customMapTypeId);

		this.drawDistanceCircles(this.gMap, 20);
		this.drawAirportHighlight(this.gMap, this.localAirports);
	},

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
			console.log(cl);
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