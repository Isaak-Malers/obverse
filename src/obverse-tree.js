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
		this.log.log("tree encountered a node without a hooks array: " + this.meta.name + ".  Setting it to empty", "trace");
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
	this.log.log("tree.node recursive lookup for: " + path, "trace");
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
	this.log.log("tree.serializeMeta called", "trace");
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
	this.log.log("tree.serialize called", "trace");

	var out = {};

	out.meta = this.serializeMeta();
	out.hooks = [];
	for(child in this.hooks){
		out.hooks.push(this.hooks[child].serialize());
	}
	return out;
}

tree.prototype.listHooks = function(){
	this.log.log("tree.listHooks called", "trace");

	out = [];
	for(child in this.hooks){
		out.push(this.hooks[child].meta.name);
	}
	return out;
}

tree.prototype.simpleMap = function(){
	var out = {};

	for(child in this.hooks){
		//set that things name to its calling of listTree:
		out[this.hooks[child]] = this.hooks[child].simpleMap();
	}
	return out;
}


tree.prototype.listElementHooks = function(){
	this.log.log("tree.listHooks called", "trace");

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

module.exports = tree;