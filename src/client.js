const { ipcRenderer } = require('electron')
const mapboxgl = require('mapbox-gl/dist/mapbox-gl');

mapboxgl.accessToken = 'pk.eyJ1Ijoicm1wIiwiYSI6ImNrMjgycGVsbzF0NzczZG1xbXIxdzhja2kifQ.x7x-0X7zQYIfJ7oJlRWdag';

const map = new mapboxgl.Map({
	container: "mapbox",
	style: "mapbox://styles/mapbox/streets-v11",
	zoom: 8,
});


fetch('https://freegeoip.app/json/')
	.then(response => response.json())
	.then(blob => {
		const { latitude, longitude } = blob;
		console.log("GeoIP says you are at", latitude, longitude);

		map.flyTo({
			center: [longitude, latitude]
		});

		map.on('moveend', function() {
			const centre = map.getBounds().getCenter();
			console.log(`requesting new position r/${centre.lat}/${centre.lng}/50`);
			ipcRenderer.send('location', JSON.stringify({longitude: centre.lng, latitude: centre.lat}));
		});
	});

const data = {
    "type": "FeatureCollection",
    "features": []
};

map.on('load', () => {

    map.addSource('aprssource', { type: 'geojson', data });

	const imagePromises = [];
	for (let i=33; i<=128; i++) {
		imagePromises.push(new Promise((resolve, reject) => {
			map.loadImage(`gfx/${i}.png`, (error, image) => {
				if(error) { reject(error); return; }
				map.addImage(i, image);
				resolve();
			});
		}));
	}

	Promise
		.all(imagePromises)
		.then(() => {
			map.addLayer({
				"id": "aprslayer",
				"type": "symbol",
				"source": 'aprssource',
				"layout": {
					"icon-image": ['get', 'symbol'], //"rocket-15"
				},
			})
		})
		.catch(error => {
			throw error;
		});
});

ipcRenderer.on('aprs', (event, obj) => {

	if(!obj.data || !obj.data.latitude || !obj.data.longitude) {
		return;
	}

	const { latitude, longitude } = obj.data;
	console.log(obj);
	const chr = obj.data.symbol.charCodeAt(1); // two-char symbol e.g. "/_" or "/#"

	data.features.unshift({
		id: `${obj.from.call}_${obj.from.ssid}`,
		type: 'Feature',
		geometry: {
			type: 'Point',
			coordinates: [longitude, latitude],
		},
		properties: {
			description: `${obj.from.call}`,
			symbol: chr,
		}
	});

	map.getSource('aprssource').setData(data);	
});

const popup = new mapboxgl.Popup({
	closeButton: false,
	closeOnClick: false,
});

map.on('mouseenter', 'aprslayer', function(e) {
	// Change the cursor style as a UI indicator.
	map.getCanvas().style.cursor = 'pointer';

	const coordinates = e.features[0].geometry.coordinates.slice();
	const description = e.features[0].properties.description;

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
