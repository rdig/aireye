<?php
/*
- This is a simple glue code for fetching a cross origin JSON file.
- The interface relies on the data provided dump1090 which uses it's own built in
web server, who's options cannot be modified to allow cross origin data retrieval.
- The url is hardcoded for security concerns.
- WARNING: The follow script makes use of the curl_php library so make sure you have 
it installed on your web server
*/

$url = "http://aireye.logic.al/dump1090/data.json";
$curl_handler = curl_init();
$timeout = 5;
curl_setopt ($curl_handler, CURLOPT_URL, $url);
curl_setopt ($curl_handler, CURLOPT_RETURNTRANSFER, 1);
curl_setopt ($curl_handler, CURLOPT_CONNECTTIMEOUT, $timeout);
$data = curl_exec($curl_handler);
curl_close($curl_handler);
echo $data;

?>