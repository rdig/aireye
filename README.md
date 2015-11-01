### purpose

This is a simple web interface for plotting aircrafts tracked through ADS-B with an RTLSDR dongle

### demo

A live version can be found here [http://aireye.glogovetan.com](http://aireye.glogovetan.com)

### dump1090

This whole interface relies on the data given out by [antirez's dump1090](https://github.com/antirez/dump1090) through a .json file

### installation

If you want to get the interface to work you have to:
- setup your dump1090 decoder with the `--net` option (I will write a guide for that at some point)
- edit `functions/getCorsJSON.php` and set your tracker's data.json location. It should be in `http://<your_tracker_station_ip>/dump1090/data.json`. (This is a glue code to overcome dump1090's internal web server, and it's lack of header configurations)

### personalisation

- Update your trackers's latitude / longitude location in `data/tracker.json`
- Set your local airports in `data/local-airports.json` so that they will be highlighted on the map

### still in development

While it is functioning, this piece of code is still in development and may contain bugs or have pieces of functionality still missing

### credits

[Dump1090](https://github.com/antirez/dump1090) was written by [Salvatore Sanfilippo](https://github.com/antirez) <antirez@gmail.com> and is released under the BSD three clause license.

This was inspired from [Malcolm Robb](https://github.com/MalcolmRobb)'s [fork of dump1090](https://github.com/MalcolmRobb/dump1090), and the way he built the web interface for it. (see gmap.html)

### licensing

This piece of code is licensed under the [MIT License](https://github.com/rdig/aireye/blob/master/LICENSE)