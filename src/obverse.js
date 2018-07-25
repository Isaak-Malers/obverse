//require in stuff.
var fs = require('fs');
var path = require('path');

var tree = require('./obverse-tree.js');
var debug = require('./obverse-logger.js');
var utility = require('./obverse-util.js');
//require in the config file previously setup.  This is super dirty, and needs to be fixed at somepoint


/**
The Obverse object constructor.
The obverse object is core to coordinating, logging, and debugging tests.  Its main responsibilities are as follows:

1. Providing a low level action API which is consise (click, type, clear, select, etc.)
2. Replaces poor functionality from webdriverControllFlow and SeleniumPromiseManager, with bog standard promise chains.
3. Replaces protractors Automatic Waiting with a less brittle, more controllable approach based on metadata about a page.
4. Provides unified logging and debugging, with specific and helpfull error messages instead of unhelpfull minified stack traces.
5. Provides tools for standard protractor code to be used incrementally.
6. IN PROGRESS: Provide a "dry-run" test environment, where the data for the test can be used to generate instructions for a human to go duplicate the test.


@class Obverse - core API object
@constructor constructor for the Obverse API object.

@param {String} model obverse/tests/{directory-name}, this name is used to construct paths for logging, images, and importing the datamodel.
*/
var obverse = function obverse(model){
	//set up logging and debugging first:
	//log unhandled promise rejections:
	process.on('unhandledRejection', r => console.log(r));
	//build the debugger first so it can be used everywhere else.
	this.log = new debug("debug");
	//print some debugging information:
	this.log.log("obverse running from path: " + process.cwd() + " with map: " + model, "trace");

	//build the in memory tree objects:
	this.model = model;
	var mapJson = require("../../tests/" + model + "/data-model/app-map.json");
	this.map = new tree(mapJson, this.log);

	//setup runtime data members:
	this.pathPrefix = "";
	this.screenshot = false;
	this.log.log("screenshotting is disabled by default", "trace");
	this.util = new utility(this.log);
	this.log.log("utility class loaded", "trace");

	//set up timing stuff:
	this.delay = 1000;//this delay happens after every action.  1 is the smallest, 0 causes errors.
	this.log.log("delay is set to 1000 milliseconds by default", "trace");

	this.autoWait = true;//enables automatic waiting based on page context (using ui.at);
	this.log.log("autoWait is enabled by default", "trace");

	this.autoWaitPadding = 25;//ads a little bit of extra padding to the wait, for extra digest cycles etc.
	this.log.log("autoWait padding (extra padding after the auto-wait) is set to 25 milliseconds by default", "trace");

	this.autoWaitTimeout = 12000;//this is the maximum amount of time obverse will automatically wait for pages to load.
	this.log.log("autoWait timeout is set to 12 seconds by default", "trace");

	//every call into this API will record the timestamp of when it occured.
	//This serves two purposes.  1, each API method can track how long it takes to return, 
	//2, timing between API methods can be handled:
	this.stepTime = new Date().getTime();

	//set up 'Dry-run' feature:
	this.dryRun = false;
	this.log.log("dryRun is set to false by default", "trace");


	this.pending = new Promise(function(resolve, reject){
		resolve(true);
	});
	this.log.log("pending promise built for test syncronization", "trace");
}


obverse.prototype.simpleMap = function(){
	return JSON.stringify(this.map.simpleMap(), null, 2);
}


obverse.prototype.setDelay = function(newDelay){
	this.delay = newDelay;
}


obverse.prototype.setLogLevel = function(lvl){
	this.log.setLogLevel(lvl);
}

obverse.prototype.setScreenshot = function(aBoolean){
	if(typeof aBoolean !== "boolean"){
		throw "setScreenshot requires boolean arguments, got: " + aBoolean;
	}
	this.screenshot = aBoolean;
}

obverse.prototype.setDryRun = function(aBoolean){
	if(typeof aBoolean !== "boolean"){
		throw "setDryRun requires boolean arguments, got: " + aBoolean;
	}

	if(aBoolean !== this.dryRun){
		this.dryRun = aBoolean;
		this.log.log("dryRun set to: " + aBoolean, "debug");
	}
}

obverse.prototype.supressDumps = function(aBoolean){
	if(typeof aBoolean !== "boolean"){
		throw "supressDumps requires boolean argument, got: " + aBoolean;
	}
	this.log.supressDuplicates = aBoolean;
}






obverse.prototype.track = function(msg){
	this.stepStart();
	this.log.log(msg, "debug");
}



obverse.prototype.stepStart = function(){
	this.stepTime = new Date().getTime();
}



obverse.prototype.imageSavePath = function (name){
	var cwd = process.cwd();
	var prefix = cwd.split("obverse")[0];
	//perform a little check:
	if(cwd.split('obverse').length !== 2){
		var msg = "A test script was run from a directory not under the 'obverse' folder.  this is a fatal exception\ndirectory is: " + cwd;
		this.log.log(msg, "critical");
		throw msg;
	}
	var savePath = prefix + "obverse/tests/" + this.model + "/data-model/images/" + name + "." + new Date().getTime() + ".png";
	this.log.log("building image save path for: " + name, "trace");
	this.log.log(" -- " + savePath, "trace");
	return savePath;
}


obverse.prototype.getAbsolutePath = function(path){
	this.log.log("obverse.getAbsolutePath called with argument: " + path, "trace");

	//total will hold the absolute address after it is calculated.  path-prefix must be added:
	var total;
	if(this.pathPrefix === ""){
		//if pathPrefix is empty, then just return path so we don't have a preceding '.'
		total = path;
	}
	else{
		//if path prefix is not empty, return it + path seperated by a dot.
		total = this.pathPrefix + "." + path;
	}
	this.log.log("complete path is calculated as: " + total, "trace");
	return total;
}


obverse.prototype.node = function(path){
	//return the result from the root map object:
	path = this.getAbsolutePath(path);
	try{
		return this.map.node(path);
	}
	catch(e){
		this.log.log("obverse.node wrapper failed for path: " + path, "critical");
		this.log.log("this is a critical error that prevents test completion", "critical");
		throw e;
	}
}



obverse.prototype.el = function(path){

	if(this.dryRun){
		this.log.log("el was called while dryRun true, returning undefined", "trace");
		return undefined;
	}

	var node = this.node(path).meta;
	//now that we have the node, we can figure out the location strategy:

	this.log.log("element lookup found the following meta-data: ", "trace");
	this.log.log(JSON.stringify(node, null, "\t"), "trace");

	if("model" in node && node.model !== null && node.model !== ""){
		this.log.log(path + " is located by model", "trace");
		return element(by.model(node["model"]));
	}
	if("xpath" in node && node.xpath !== null && node.xpath !== ""){
		this.log.log(path + " is located by XPATH", "trace");
		return element(by.xpath(node["xpath"]));
	}
	if("css" in node && node.css !== null && node.css !== ""){
		this.log.log(path + " is located by CSS", "trace");
		return element(by.css(node["css"]));
	}
	//if none of those were found, we have a critical exception.  Throw an error.
	this.log.log("obverse.el was unable to locate: " + path, "critical");
	throw("obverse.el was unable to locate: " + path);
}



obverse.prototype.finalize = function(callback){

	//once the pending promises resolve/reject:
	this.pending.then(function(resolve){

		//if all the promises resolve, but we are in dry run mode, the test sould fail.
		if(this.dryRun === true){
			var reason = this.log.dumpAll("critical");
			//clean up the failure reason by removing double new-lines.
			reason = reason.replace(/^\s*\n/gm, "");

			fail(reason);
			callback();
		}
		//if all promises resolve and we are not in dry run, we exit the test without failing it:
		else{
			callback();
		}

	//if the promises reject, we can fail the test regardless of if we are in dry-run mode.
	}.bind(this), function(reject){
		var reason = this.log.dumpAll("critical");
		//clean up the failure reason by removing double new-lines.
		reason = reason.replace(/^\s*\n/gm, "");

		fail(reason);
		callback();
	}.bind(this));

}




obverse.prototype.step = function(comment, functionToRun){
	//do some logging:
	this.log.log("step planned: " + comment, "trace");


	//oldPending will house the previous promise
	var oldPending = this.pending;

	//try to add the new step:
	try{
		this.pending = new Promise(function(resolve, reject){
			//after whatever was pending finishes:
			oldPending.then(
				//if the previous step resolves:
				function(resolved){
					//before doing anything, make a new logging segment:
					this.log.new(comment);
					// if a function throws an exception, we need to set the object to dry run and do something else:
					try{
						var promiseOrNull = functionToRun();
					}catch(e){
						this.log.log("exception in step: " + comment + ", " + e, "critical");
						this.dryRun = true;
					}
					//if the step is a blocking step, and returns a promise:
					if(promiseOrNull instanceof Promise){
						//pass our resolve/rejections into the returned promises.
						promiseOrNull.then(resolve, reject);
						this.log.log("processing blocking step", "trace");
					}else{
						this.log.log("processing non-blocking step", "trace");
						resolve(true);
					}

				}.bind(this)

				//if the previous promise rejects:
				, function(rejected){
					this.dryRun = true;
					resolve(true);
				}.bind(this)
			)

		}.bind(this));	
	}catch(e){
		this.log.log("Unable to execute step: " + comment, "critical");
		this.log.log("cause: " + e, "critical");
		this.log.log("test execution cannot continue:")
	}
};



//at function provides a nice way to start a promise chain, all relative to a particular "node" of the UI.
//todo, add a second parameter to this to specify exactly what elements need to be present before the page is considered loaded.
obverse.prototype.at = function(prefix){

	if(this.dryRun){
		return new Promise(function(resolve, reject){
			this.log.log("* At: " + prefix, "debug");
			resolve(true);
		}.bind(this));
	}



	//variable to store load time metrics:
	var metric = this.stepTime;
	this.stepStart();

	return new Promise(function(resolve, reject){
		this.log.log("At: " + prefix, "debug");
		this.pathPrefix = prefix;
		resolve(true);
	}.bind(this))
	//decide if we need to automatically wait:
	.then(function(alwaysTrue){
		this.log.log("autoWait is set to: " + this.autoWait, "trace");

		//nodeChildren will contain a list of all of the children that we CAN wait for:
		var nodeChildren = this.node("").listElementHooks();
		this.log.log("waiting for children elements: " + nodeChildren, "trace");
		
		//build an array of all of the promises that will resolve once those elements are present:
		var racers = [];
		for(i in nodeChildren){
			var element = this.el(nodeChildren[i]);
			var expected = protractor.ExpectedConditions;
			racers.push(expected.elementToBeClickable(element), this.autoWaitTimeout);
		}
		//Promise.race will resolve once the fastest promise resolves:
		return Promise.all(racers);
	}.bind(this))
	//assuming at least one element came back, we can now wait for the correct time:
	.then(function(winningRacer){
		//record the end time:
		metric = new Date().getTime() - metric;
		this.log.log("\t(page should load in ~  " + metric + " milliseconds)", "debug");
		return browser.sleep(this.autoWaitPadding);
	}.bind(this),
	//catch the rejection where all of the racers time out:
	function(allRacersCrashed){
		this.log.log("ui.at was unable to verify a page was loaded before autoWaitTimeout: " + this.autoWaitTimeout, "minor");
		this.setDryRun(true);
		return browser.sleep(this.autoWaitPadding);
	}.bind(this))


	//the above will ALWAYS resolve true:
	.then(function(winningRacer){
		//build some useful variables:

		//decide if we need to save a screenshot or not:
		if(this.screenshot === true){
			var saveDirectory = this.imageSavePath(prefix);
    		this.log.log("screenshotting is enabled, saving to: " + saveDirectory, "trace");
    		try{
    			//screenshot returns its first argument once it is done.  This means that in order to continue to return true, we need to enter that as its first argument.
    			//this is dumb, and really TODO should be split up into two functions?  I'm not sure how to clean that API up while keeping the code DRY.
    			//That argument should potentially be removed from the screenshot function, and then when screenshot is used otherwise it would need to be wrapped in a lambda function.
    			var screenshotPromise = this.util.screenshot(true, saveDirectory);
    			return screenshotPromise;	
    		}catch(error){
    			this.log.log('screenshot failed to save for path: ' + saveDirectory, "critical");
    			return true;
    		}
		}
		else{
			this.log.log("screenshotting is disabled", "trace");
			return true;
		}
		//no need to handle a rejection here, The promise always returns null as any rejection isn't critical.	
	}.bind(this));
}


//gets an element promise via tha "el" function.  This is then highlighted, screenshot if needed, and then returned so that other methods can use it
//this is the "originator" of all of the promise chains that are executed at each test step.
//By doing ALL element locating through this method, we can ensure that everything that is used in the tests is logged, screenshot, and handled the same.
//This also allows "dry-runs" so that we can generate a script of what the automated test would look like if it were run manually.
obverse.prototype.getElement = function(path){
	if(this.dryRun){
		return new Promise(function(resolve, reject){
			resolve(true);
		}.bind(this));
	}


	this.log.log("obverse.getElement: " + path, "trace");
	var hPath = this.getAbsolutePath(path);
	var savePath = this.imageSavePath(hPath);

	//we need to return a promise eventually:
	//start off by resolving the promise returned by this.el:

	return new Promise(function(resolve, reject){
		resolve(this.el(path));
	}.bind(this))
	//then we will highlight that:
	.then(function(elementAfterResolving){
		return this.util.highlight(elementAfterResolving, hPath);
		//in the event that that promise rejects, we have encountered a critical error:
	}.bind(this), function(rejection){
		this.log.log("obverse.getElement failed to lookup element for: " + hPath, "critical");
		throw rejection;
	}.bind(this))

	//util.highlight will return the element promise.
	.then(function(elementAfterHighlighting){
		if(this.screenshot === true){
			this.log.log("screenshotting is enabled, saving to: " + savePath, "trace");
			try{
				return this.util.screenshot(elementAfterHighlighting, savePath);
			}catch(error){
				this.log.log("screenshot failed to save for path: " + savePath, "minor");
				return elementAfterHighlighting;
			}
		}else{
			this.log.log("screenshotting is disabled", "trace");
			return elementAfterHighlighting;
		}
	}.bind(this))

	.then(function(elementAfterScreenShotting){
		return this.util.unHighlight(elementAfterScreenShotting, hPath);
	}.bind(this))

	.then(function(elementAfterUnHighlighting){
		return elementAfterUnHighlighting;
	});
}


//given a path and some text, types the text into that element.  Optional parameter to delay.
//path takes the form login.username (to type into the username field)
//text must be a string.
obverse.prototype.type = function(path, text, time){

	if(this.dryRun){
		return function(){
			return new Promise(function(resolve, reject){
				this.log.log('* type : ' + text + " into: " + path, "debug");
				resolve(true);
			}.bind(this));
		}.bind(this);
	}



	//set the delay to dfeault if it is falsy
	time=time || this.delay;
	this.stepStart();

	//return a function, that returns a promise chain.
	return function(){
		this.log.log("type " + text + " into: " + path, "debug");
		//this will return the element, which has been logged and screenshot.
		return this.getElement(path)
		//return a function, that will return a promise eventually.  An instance of browser.sleep is always returned.
		.then(function(el){
			return el.sendKeys(text)
			.then(function(resolution){
				this.log.log("obverse.type sucessful for: " + path, "trace");
				return browser.sleep(time);
			}.bind(this), function(rejection){
				this.log.log("obverse.type failed for: " + path, "critical");
				this.setDryRun(true);
				return browser.sleep(time);
			}.bind(this));
		}.bind(this));
	}.bind(this);
}


//given a path, clicks it.  Optional parameter for time to delay after clicking it.
//path takes the from login.ok (to click the ok button)
obverse.prototype.click = function(path, time){

	if(this.dryRun){
		return function(){
			return new Promise(function(resolve, reject){
				this.log.log('* click : ' + path, "debug");
				resolve(true);
			}.bind(this));
		}.bind(this);
	}



	time=time || this.delay;
	this.stepStart();

	//return a function, that returns a promise chain.
	return function(){
		this.log.log("click " + path, "debug");
		//this.getElement will return a promise which will eventually resolve to an element on the page which has been successfully screenshot and logged.
		return this.getElement(path)
		//return a function, that will return a promise eventually.  An instance of browser.sleep is always returned.
		.then(function(el){
			return el.click()
			.then(function(resolution){
				this.log.log("obverse.click sucessful for: " + path, "trace");
				return browser.sleep(time);
			}.bind(this), function(rejection){
				this.log.log("obverse.click failed for: " + path, "critical");
				this.setDryRun(true);
				return browser.sleep(time);
			}.bind(this));
		}.bind(this));
	}.bind(this);
}

//given the path to a dropdown, and the text of a particular option on the dropdown.
//clicks to open up the dropdown, then clicks the correct option.

//This Stack Overflow thread was helpfull in building this:
//https://stackoverflow.com/questions/19599450/how-to-select-option-in-drop-down-protractorjs-e2e-tests
obverse.prototype.select = function(path, text, time){


	if(this.dryRun){
		return function(){
			return new Promise(function(resolve, reject){
				this.log.log('* select : ' + text + "from the " + path + " dropdown", "debug");
				resolve(true);
			}.bind(this));
		}.bind(this);
	}


	time = time || this.delay;
	this.stepStart();

	return function(){
		this.log.log("select " + text + " from " + path + " dropdown", "debug");
		//this.getElement will return a promise which will eventually resolve to an element on the page which has been succssfully screenshot and logged.
		return this.getElement(path)

		//return a function, that will return a promise eventually.
		//the original element will be returned so it can be used next.
		.then(function(el){
			return el.click()
			.then(function(resolution){
				this.log.log("obverse.select opened Dropdown: " + path, "trace");
				return el;
			}.bind(this), function(rejection){
				this.setDryRun(true);
				this.log.log("obverse.select failed to open Dropdown: " + path, "critical");
				return el;
			}.bind(this));
		}.bind(this))

		//select the correct menu item:
		.then(function(openedDropdownElement){
			//click the correct dropdown element:
			return browser.sleep(50)
			.then(function(){
				return openedDropdownElement.all(by.xpath('option[.="' + text + '"]')).click();
			});
		})

		//wait for the correct amount of time:
		.then(function(clickedElement){
			return browser.sleep(time);
		});
	}.bind(this);
}


//TODO, bring this fucntion up to the level of the others.
obverse.prototype.clear = function(path, time){

	if(this.dryRun){
		return function(){
			return new Promise(function(resolve, reject){
				this.log.log('* clear : ' + path, "debug");
				resolve(true);
			}.bind(this));
		}.bind(this);
	}

	time = time || this.delay;
	this.stepStart();


	this.stepStart();

	try{
		var element = this.el(path);
	}catch(error){
		this.log.log("obverse.clear failed to lookup element for: " + path, "critical");
		this.setDryRun(true);
		throw error;
	}
	return function(){
		return element.clear();
	}
}


//this is a little crummy utility class.  It really should be cleaner.
obverse.prototype.fail = function(e){
	throw e;
}



module.exports = obverse;