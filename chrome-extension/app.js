//file system required for interacting with the file system
const fs = require("fs");
//express required to build the REST endpoints.
const express = require('express');
//body-parser is required for JSON bodies on PUT and POST requests
const bodyParser = require('body-parser');



//set up a new express app isntance:
const app = express();
//set a larger JSON size limit
app.use(express.json({limit: '200mb'}));

//use the JSON body parser with this express instance.
app.use(bodyParser.json());
//specify a static directory:
app.use(express.static('./ui'));


var listDirectories = function(){
	var path = "../tests";
	var directories = fs.readdirSync(path).filter(function (file){
		return fs.statSync(path + "/" + file).isDirectory();
	});

	return directories;
}


//GET method for getting a list of all the app-maps.
app.get('/api/map-list', function(request, response){
	response.send(listDirectories());
});


//GET method for app-map doesn't really do anything other than read it in.
app.get('/api/:map/app-map', function(request, response){

	var mapName = request.params.map;
	if(listDirectories().indexOf(mapName) === -1){
		response.status(404).send(mapName + " Not found in the 'tests' directory on the server");
	}

	var path = "../tests/" + mapName + "/data-model/app-map.json";

	var content = fs.readFileSync(path);
	response.setHeader('Content-Type', "application/json");
	response.send(content);
});


//put method for app-map archives the old app-map and updates the "live" one.
app.put('/api/:map/app-map', function(request, response){
	var mapName = request.params.map;
	if(listDirectories().indexOf(mapName) === -1){
		response.status(404).send(mapName + " Not found in the 'tests' directory on the server");
	}

	var path = "../tests/" + mapName + "/data-model/app-map.json";

	//build a log object to return to the UI:
	var log = {};
	log.meta = "/api/app-map PUT";

	//first step is to archive the old copy:
	//get the date for the fileName:
	var now = dateString();
	var masterFile = "../tests/" + mapName + "/data-model/app-map.json";
	var fileName = "app-map.json." + now;
	var filePath = "../tests/" + mapName + "/data-model/app-map-backups/" + fileName;
	log.backupFileName = fileName;
	
	//read in the old file content.
	var oldContent = fs.readFileSync(masterFile);
	//check to see if the new and old content are the same.  If so don't save anything...
	//TODO!

	//write the old content to the backup filename:
	//TODO, wrap in try catch, return an error message on the catch:
	fs.writeFile(filePath, oldContent, (err) => {
		if(err){
			throw err;
		}
		console.log("app-map backed-up => " + now);
	});

	//overwrite the app-map file with the new content.
	fs.writeFile(masterFile, JSON.stringify(request.body, null, 2), (err) =>{
		if(err){
			throw err;
		}
		console.log("app-map Saved");
	})

	log.msg = "Saved: " + now;

	response.send(log);
});

app.get("/api/:map/image", function(request, response){

	//get the identifiying path that we will use to filter all the possible files:
	var mapName = request.params.map;
	if(listDirectories().indexOf(mapName) === -1){
		response.status(404).send(mapName + " Not found in the 'tests' directory on the server");
	}


	//get the list of all the possible files:
	var  files = fs.readdirSync("../tests/" + mapName + "/data-model/images");

	var path = request.query.path;
	var skip = request.query.skip || 0;//default skip to zero
	//create an array to store filter results:
	var filteredFiles = [];
	//loop through all the files, and add the correct ones to the filtered files:
	for(var i=0; i<files.length; i++){
		var dotSplit = files[i].split(".");
		//the last two will always be the timestamp.png
		dotSplit.pop();
		dotSplit.pop();

		var thisPath = dotSplit.join(".");

		if(thisPath === path){
			filteredFiles.push(files[i]);
		}
	}


	//now we will get the correct file, we want the newest one.
	//This should always be the last one in the array, so we will return that image:

	//figure out what the index will be:
	var index = filteredFiles.length - 1;
	//for some dumb reason JS fails if these are on the same line.
	index = index - skip;

	//if the index is less than 0, return a 404.
	if(index < 0){
		response.status(404).send("End of Records reached");
	}
	else{
		//toReturn is now set up correctly with our fileName:
		var toReturn = filteredFiles[index];
		//read the file, then send it out:
		fs.readFile("../tests/" + mapName + "/data-model/images/" + toReturn, function(err, data){
			if(err){
				response.status(500).send(err);
			}
			response.send(data);
		});
	}
	
});










app.listen(8001, () => console.log('Obverse Backend running on port 8001'));

//helper function, coppied from the web.
//handling dates is too much of a pain to do by hand.
//http://tylerfrankenstein.com/user/4/code/javascript-date-time-yyyy-mm-dd-hh-mm-ss
function dateString () {
  now = new Date();
  year = "" + now.getFullYear();
  month = "" + (now.getMonth() + 1); if (month.length == 1) { month = "0" + month; }
  day = "" + now.getDate(); if (day.length == 1) { day = "0" + day; }
  hour = "" + now.getHours(); if (hour.length == 1) { hour = "0" + hour; }
  minute = "" + now.getMinutes(); if (minute.length == 1) { minute = "0" + minute; }
  second = "" + now.getSeconds(); if (second.length == 1) { second = "0" + second; }
  return year + "-" + month + "-" + day + " " + hour + "_" + minute + "_" + second;
}