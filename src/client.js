const { ipcRenderer } = require('electron')
const mapboxgl = require('mapbox-gl/dist/mapbox-gl');

mapboxgl.accessToken = 'pk.eyJ1Ijoicm1wIiwiYSI6ImNrMjgycGVsbzF0NzczZG1xbXIxdzhja2kifQ.x7x-0X7zQYIfJ7oJlRWdag';

const map = new mapboxgl.Map({
  container: "mapbox",
  style: "mapbox://styles/mapbox/streets-v11"
});

const data = {
    "type": "FeatureCollection",
    "features": [
    ]
};

map.on('load', () => {

    map.addSource('aprssource', { type: 'geojson', data });

    map.loadImage('https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Cat_silhouette.svg/400px-Cat_silhouette.svg.png', (error, image) => {
		if (error) throw error;
		//map.addImage('cat', image);
		map.addLayer({
			"id": "aprslayer",
			"type": "symbol",
			"source": 'aprssource',
			"layout": {
				"icon-image": "rocket-15"
			},
//			"filter": ["==", "$type", "Point"],

			/*			"layout": {
				"icon-image": "cat",
				"icon-size": 0.1
			}*/
		});
	});

	ipcRenderer.on('aprs', (event, obj) => {

		if(!obj.data || !obj.data.latitude || !obj.data.longitude) {
			return;
		}

		const { latitude, longitude } = obj.data;
		console.log(obj);
		data.features.unshift({
			id: `${obj.from.call}_${obj.from.ssid}`,
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [longitude, latitude],
				properties: {
					description: `${obj.from.call}`,
				}
			}
		});
		map.getSource('aprssource').setData(data);	
		/*	data {
			latitude: 33.642
			longitude: -96.6305
			msgEnabled: false
			symbol: "/#"
			symbolIcon: "Digi"
			}
		*/
	});
});

var popup = new mapboxgl.Popup({
	closeButton: false,
	closeOnClick: false
});

map.on('mouseenter', 'aprslayer', function(e) {
	// Change the cursor style as a UI indicator.
	map.getCanvas().style.cursor = 'pointer';

	var coordinates = e.features[0].geometry.coordinates.slice();
	var description = e.features[0].properties.description;

	// Ensure that if the map is zoomed out such that multiple
	// copies of the feature are visible, the popup appears
	// over the copy being pointed to.
	while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
		coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
	}

	// Populate the popup and set its coordinates
	// based on the feature found.
	popup.setLngLat(coordinates)
		.setHTML(description)
		.addTo(map);
});

map.on('mouseleave', 'aprslayer', function() {
	map.getCanvas().style.cursor = '';
	popup.remove();
});
