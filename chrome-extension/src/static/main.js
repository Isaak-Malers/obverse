
//the tree object is the core of the recursive structure that houses all the XPATH information.
//There are no functional algorithms for walking the tree.
//the tree object is designed to be used on the frontend and backend.
tree = function tree(object, logger, parrent){
	this.log = logger || null;
	if(this.log === null){
		console.log("obverse-tree was constructed without a logging object");
		console.log("it will be difficult to debug this program without propper logging");
	}

	this.meta = {};
	this.hooks = [];

	this.parrent = parrent || null;

	//perform input validation on the meta object:
	this.meta.UIpath = object.meta.UIpath || "";
	this.meta.UIdetails = object.meta.UIdetails || false;
	this.meta.UIshow = object.meta.UIshow || false;

	this.meta.name = object.meta.name;
	this.meta.description = object.meta.description || "";

	//here are the 3 location strategies we can use:
	this.meta.xpath = object.meta.xpath || "";
	this.meta.css = object.meta.css || "";
	this.meta.model = object.meta.model || "";
	
	//the evil bits here.  Implementing XPATH inheritance is a pain:
	this.meta.inherit = object.meta.inherit || "";
	this.meta.relative = object.meta.relative || false;

	//other meta-data related to addressing:
	this.meta.select = object.meta.select || false;

	//throw exceptions if needed:
	if(this.meta.name === null){
		var msg = "tree encountered a node without a name, this is a fatal error, prefix is: " + prefix;
		this.log.log(msg, "critical");
		throw msg;
	}

	if("hooks" in object === false || object.hooks === null){
		this.log.log("tree encountered a node without a hooks array: " + this.meta.name + ".  Setting it to empty", "info");
		object.hooks = [];
	}

	if(object.hooks instanceof Array === false){
		var msg = "tree encountered a node with a non-array hooks key: " + this.meta.name + ".  This is a fatal error";
		this.log.log(msg, "critical");
		throw msg;
	}

	//Build all of the children:
	for(var i=0; i<object.hooks.length; i++){
		this.hooks.push(new tree(object.hooks[i], logger, this));
	}
};

tree.prototype.getFullName = function(){

	if(this.parrent === null){
		return this.meta.name;
	}
	return this.parrent.getFullName() + "." + this.meta.name;


}


tree.prototype.node = function(path){
	this.log.log("tree.node recursive lookup for: " + path, "info");
	//base case:
	if(path === ""){
		return this;
	}
	//recursive case:
	var addr = path.split(".");//split by .
	var step = addr[0];//get the next item

	//remove the next item from the addr array, and re-combine it.
	addr.shift();
	var next = addr.join(".");

	var nodes = [];
	//get the correct child and return its node method.
	for(var i=0; i<this.hooks.length; i++){
		var childName = this.hooks[i].meta.name;		
		if(childName === step){
			nodes.push(childName);
			return this.hooks[i].node(next);
		}
	}
	var msg = "tree.node failed to find a tree node at step: " + path;
	var msg2 = "Available nodes are: " + nodes;
	this.log.log(msg, "critical");
	this.log.log(msg2, "critical");
	throw msg + "\n" +  msg2;
};


tree.prototype.serializeMeta = function(){
	this.log.log("tree.serializeMeta called", "info");
	/*meta consists of the following:
		required:
			name
		optional:
			model
			xpath
			css
			description
		transient:
			uiPath
			uiDetails
			uiShow
		removed:
			url
			inherit
			relative
			select
	*/

	var out = {};
	//handle the required fields:
	out.name = this.meta.name;
	//handle the optional fields:
	if(this.meta.model !== null && this.meta.model !== ""){
		out.model = this.meta.model;
	}
	if(this.meta.xpath !== null && this.meta.xpath !== ""){
		out.xpath = this.meta.xpath;
	}
	if(this.meta.css !== null && this.meta.css !== ""){
		out.css = this.meta.css;
	}
	if(this.meta.description !== null && this.meta.description !== ""){
		out.description = this.meta.description;
	}
	//nothing else should be serialized...
	return out;
}

tree.prototype.serialize = function(){
	this.log.log("tree.serialize called", "info");

	var out = {};

	out.meta = this.serializeMeta();
	out.hooks = [];
	for(child in this.hooks){
		out.hooks.push(this.hooks[child].serialize());
	}
	return out;
}

tree.prototype.listHooks = function(){
	this.log.log("tree.listHooks called", "info");

	out = [];
	for(child in this.hooks){
		out.push(this.hooks[child].meta.name);
	}
	return out;
}

tree.prototype.listElementHooks = function(){
	this.log.log("tree.listHooks called", "info");

	out = [];
	for(child in this.hooks){

		var temp = this.hooks[child];
		//listElementHooks, Only returns names of children who have a locator stored with them.
		if(temp.meta.xpath !== null && temp.meta.xpath !== ""){
			out.push(temp.meta.name);
			continue;
		}
		if(temp.meta.model !== null && temp.meta.model !== ""){
			out.push(temp.meta.name);
			continue;
		}
		if(temp.meta.css !== null && temp.meta.css !== ""){
			out.push(temp.meta.name);
			continue;
		}
	}

	return out;
}






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
	$scope.settings.version = "0.1.0";
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

	//function to load settings, and options from the server.
	//So far this is just the maps array.
	$scope.loadSettings = function(){
		$http.get($scope.urls.maps()).then(function(response){
			console.log(response.data);
			$scope.settings.maps = $scope.settings.maps.concat(response.data);
			console.log($scope.settings.maps);
		});
	};
	//fire this right after definition:
	$scope.loadSettings();



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