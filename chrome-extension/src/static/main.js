var app = angular.module('obverse-ui', []);


//The map directive is a little tricky, because it calls itself recursivly.
//the "node" attribute of the map element needs to point towards a node in the json
//for the root case, this is just "$scope.map"
//the directive will call itself on all the elements of node.hooks untill there are none.
app.directive('map', function(){

	var url = "/static/directive-templates/map.html";
	if(window.chrome && chrome.runtime && chrome.runtime.id){
		url = chrome.extension.getURL("static/directive-templates/map.html");
	}

	return {
		restrict: "E",
		replace: true,
		templateUrl: url,
		scope: {
			node: "="
		}
	}
});


//nav directive runs the bar at the top of the obverse UI
app.directive('nav', function(){

	var url = "/static/directive-templates/nav.html";
	if(window.chrome && chrome.runtime && chrome.runtime.id){
		url = chrome.extension.getURL("static/directive-templates/nav.html");
	}

	return {
		restrict: "E",
		replace: true,
		templateUrl: url
	}
});

//details directive runs the pop ups that hold:
//		node details
//		image of node
//		other stuff?
app.directive('details', function(){

	var url = "/static/directive-templates/details.html";
	if(window.chrome && chrome.runtime && chrome.runtime.id){
		url = chrome.extension.getURL("static/directive-templates/details.html");
	}


	return {
		restrict: 'E',
		replace: true,
		templateUrl: url,
		scope: {
			node: "="
		}
	}
});


app.controller('obverse-ctrl', function($scope, $http){
	//SETTINGS AND DISPLAY TYPE STUFF
	//EVERYTHING UNDER HERE IS MOSTLY OUTSIDE THE DATA MODEL
	//THIS IS STUFF LIKE IP ADDRESS, UI STATE, AVAILABLE DATA MODELS
	$scope.settings = {};
	$scope.settings.show = true;
	$scope.settings.ip = "127.0.0.1";
	$scope.settings.maps = [];
	$scope.settings.map = null;

	$scope.settings.error = null;
	//URLS here:
	$scope.urls = {};
	$scope.urls.map = function(){
		console.log($scope.settings.map);
		var url = "http://" + $scope.settings.ip + ":8001/api/" + $scope.settings.map + "/app-map";
		return url;
	};
	$scope.urls.maps = function(){
		var url = "http://" + $scope.settings.ip + ":8001/api/map-list";
		return url;
	};

	//function to load the list of mapnames from the server:
	$scope.loadSettings = function(){
		$http.get($scope.urls.maps()).then(function(response){
			console.log(response.data);
			$scope.settings.maps = $scope.settings.maps.concat(response.data);
			console.log($scope.settings.maps);
		});
	};
	//fire this right after definition:
	$scope.loadSettings();
	//imediatly after that, set map to whatever the first one is:
	$scope.settings.map = $scope.settings.maps[0];


	//CODE HAVING TO DO WITH THE ACTUAL DATA MODEL GOES HERE:
	//THIS INCLUDES
	//FETCHING IT FROM THE SERVER
	//

	$scope.map = {};


	$scope.tree = {};

	$scope.treeBootstrapper = function(){
		$http.get($scope.urls.map()).then(function(response){
			$scope.tree = new tree(response, null, null);
			console.log("tree successfully built");
		}, function(rejection){
			console.log("tree failed to build successfully");
		});
	}();



	$scope.loadData = function(){
		$http.get($scope.urls.map()).then(function(response){
			$scope.map = response.data;
			$scope.tree = new tree(response.data, null, null);
			$scope.uiSetup(".", $scope.map);
			console.log("loaded app-map");
			var hooks = $scope.tree.listHooks();
			console.log(hooks);
		});
	};


	$scope.newNode = function(){
		var obj = JSON.parse(JSON.stringify($scope.mapNode));
		console.log(obj);
		return obj;
	};

	$scope.save = function(){
		$http.put($scope.urls.map(), $scope.map).then(function(response){
			$http.get($scope.urls.map()).then(function(response){
				$scope.map = response.data;
				$scope.uiSetup(".", $scope.map);
			});
		});
	};






	//Convienience method.  Because there are multiple layers of seperation and organization
	//the following replaces the "in" javascript keyword with a similarly convienient tool
	//  if(key in node)   << fails
	//  if(key === getName(node))  << works
	//This is used in a few places below:
	$scope.getName = function(pointer){
		return pointer.meta.name;
	};

	//recursivly builds some of the stuff in the meta objects that the UI needs.
	//UI specific fields include:
	//UIshow - not pre-built in this function.  This is used to collapse tree nodes.
	//UIpath - contains an absolute dot delimited "address" for that particular object
	//         for example: "circuits.delete-menu.delete-search"
	//		   This needs to be built on startup.
	// NOTE**** THE FIRST ARGUMENT SHOULD ALWYAS BE "." WHEN CALLED EXTERNALLY.
	// NOTE**** THIS ARGUMENT IS VESTIGIAL SO I DON"T NEED A "RECURSION HELPER" FUNCTION
	// additionally, this function will force all the objects to conform to the "standard"
	$scope.uiSetup = function(prefix, pointer){
		//FIRST step is to figure out what the UIpath should be for THIS node:
		if(prefix === "."){
			//if the prefix is a dot, we are at the root level and don't need to do anything
			pointer.meta.UIpath = "";
		}
		else if(prefix === ""){
			//if the prefix is empty, all we have to do is set the UIPath to the name
			pointer.meta.UIpath = pointer.meta.name;
		}
		else{
			//prefix isn't empty, so we can append it and then a dot separator.
			pointer.meta.UIpath = prefix + "." + pointer.meta.name;
		}
		//SECOND step is to recursivly call this function on all the children of THIS node:
		for(object in pointer.hooks){
			$scope.uiSetup(pointer.meta.UIpath, pointer.hooks[object]);
		}
		//lastly, perform a second action, add UIroot point to map on every object:

		//additionally, force all the nodes to conform to the below standard:
		if(("name" in pointer.meta) == false){
			pointer = null;
			return;
		}
		if(("description" in pointer.meta) == false){
			pointer.meta.description = null;
		}
		if(("xpath" in pointer.meta) == false){
			pointer.meta.xpath = null;
		}
		if(("css" in pointer.meta) == false){
			pointer.meta.css = null;
		}
		if(("model" in pointer.meta) == false){
			pointer.meta.model = null;
		}
		if(("url" in pointer.meta) == false){
			pointer.meta.url = null;
		}
		if(("hooks" in pointer) == false){
			pointer.hooks = [];
		}
	}


	//object template here:
	//this is basically just a referance for the above function:
	$scope.mapNode = {
		meta:{
			name: "new-node",
			description: null,
			xpath: null,
			css: null,
			model: null,
			url: null,
			inherit: null,
			relative: false,

			UIpath: null,
			UIshow: true
		},
		hooks:[]
	};



	//Takes an argument PATH which will look something like:
	//"circuits.delete-menu.delete-selected"
	//Which is a dot delimited identifier for a particular object in the tree heirarchy.
	//It hunts through the tree, finds that particular object, and returns it.
	$scope.lookup = function(path){
		console.log("lookup: " + path);
		//helper function, returns true if a node has a child with the requeset name:
		var holds = function(parrentObject, childName){
			//for every object in the parrents hooks array:
			for(j in parrentObject.hooks){
				//if that objects meta.name field matches the childname we're looking for
				if(parrentObject.hooks[j].meta.name === childName){
					return true;
				}
			}
			//if we loop through everything and don't find it, return
			return false;
		};

		//take the path and split by dot, to give us the names of every node:
		var nodeList = path.split(".");
		//start out looking at the entire map variable:
		var pointer = $scope.map
		//loop through all the names in the nodeList array:
		for(i=0; i<nodeList.length; i++){
			//if nte node-list directely contains the next thing to decend into:
			if(holds(pointer, nodeList[i])){
				//set the pointer variable to the child we just found.
				//next loop we will decend into searching ITS children.
				pointer = pointer.hooks[i];
				continue;
			}
			//if we don't find it, we need to handle inheritance:
			if("inherit" in pointer.meta){

				pointer = $scope.lookup(pointer.meta.inherit);
				continue;
			}			
			//if neither of those happen, we need to handle the error:
			console.log("lookup failed to find an object by path: " + path);
			return;
		}
		console.log("lookup result:");
		console.log(pointer);
		return pointer;
	};
});