var Tree = require('./obverse-tree');
var Logger = require('./obverse-logger');
var Util = require('./obverse-util');
// TODO: Require in the config file previously setup. This is super dirty, and needs to be fixed at some point

/**
 * The Obverse object constructor.
 * The obverse object is core to coordinating, logging, and debugging tests.  Its main responsibilities are as follows:
 *
 * 1. Providing a low level action API which is concise (click, type, clear, select, etc.)
 * 2. Replaces poor functionality from webdriverControlFlow and SeleniumPromiseManager, with bog standard promise chains.
 * 3. Replaces protractors Automatic Waiting with a less brittle, more controllable approach based on metadata about a page.
 * 4. Provides unified logging and debugging, with specific and helpful error messages instead of unhelpful truncated stack traces.
 * 5. Provides tools for standard protractor code to be used incrementally.
 * 6. Provides a DryRun feature, where tests that fail halfway through will still log unfinished steps, in order to make failure messages more helpfull to manual testers.
 *
 * @param {String} model obverse/tests/{directory-name}, this name is used to construct paths for logging, images, and importing the data model.
 *
 * @class Obverse - core API object
 * @constructor constructor for the Obverse API object.
 */
var Obverse = function (model) {

    // Set up logging and debugging first:
    // Log unhandled promise rejections:
    process.on('unhandledRejection', function(r) { console.log(r); });

    // Build the debugger first so it can be used everywhere else.
    this.log = new Logger("debug");

    // Print some debugging information:
    this.log.log("obverse running from path: " + process.cwd() + " with map: " + model, "trace");

    // Build the in memory tree objects:
    this.model = model;
    var mapJson = require("../tests/" + model + "/data-model/app-map.json");
    this.map = new Tree(mapJson, this.log);

    // Setup runtime data members:
    this.pathPrefix = "";
    this.screenshot = false;
    this.log.log("screenshotting is disabled by default", "trace");
    this.util = new Util(this.log);
    this.log.log("Util class loaded", "trace");

    //set up timing stuff:
    this.delay = 1000;//this delay happens after every action.  1 is the smallest, 0 causes errors.
    this.log.log("delay is set to 1000 milliseconds by default", "trace");

    this.autoWait = true;//enables automatic waiting based on page context (using ui.at);
    this.log.log("autoWait is enabled by default", "trace");

    this.autoWaitPadding = 25;//ads a little bit of extra padding to the wait, for extra digest cycles etc.
    this.log.log("autoWait padding (extra padding after the auto-wait) is set to 25 milliseconds by default", "trace");

    this.autoWaitTimeout = 12000;//this is the maximum amount of time obverse will automatically wait for pages to load.
    this.log.log("autoWait timeout is set to 12 seconds by default", "trace");

    // Every call into this API will record the timestamp of when it occurred. This serves two purposes:
    // 1: each API method can track how long it takes to return,
    // 2: timing between API methods can be handled
    this.stepTime = new Date().getTime();

    // Set up 'Dry-run' feature:
    this.dryRun = false;
    this.log.log("dryRun is set to false by default", "trace");

    this.pending = new Promise(function (resolve) {
        resolve(true);
    });
    this.log.log("pending promise built for test synchronization", "trace");
};

Obverse.prototype.simpleMap = function () {
    return JSON.stringify(this.map.simpleMap(), null, 2);
};

Obverse.prototype.setDelay = function (newDelay) {
    this.delay = newDelay;
};

Obverse.prototype.setLogLevel = function (lvl) {
    this.log.setLogLevel(lvl);
};

Obverse.prototype.setScreenshot = function (aBoolean) {
    if (typeof aBoolean !== "boolean") {
        throw "setScreenshot requires boolean arguments, got: " + aBoolean;
    }
    this.screenshot = aBoolean;
};

Obverse.prototype.setDryRun = function (aBoolean) {
    if (typeof aBoolean !== "boolean") {
        throw "setDryRun requires boolean arguments, got: " + aBoolean;
    }

    if (aBoolean !== this.dryRun) {
        this.dryRun = aBoolean;
        this.log.log("dryRun set to: " + aBoolean, "debug");
    }
};

Obverse.prototype.suppressDumps = function (aBoolean) {
    if (typeof aBoolean !== "boolean") {
        throw "suppressDumps requires boolean argument, got: " + aBoolean;
    }
    this.log.supressDuplicates = aBoolean;
};

Obverse.prototype.track = function (msg) {
    this.stepStart();
    this.log.log(msg, "debug");
};

Obverse.prototype.stepStart = function () {
    this.stepTime = new Date().getTime();
};

Obverse.prototype.imageSavePath = function (name) {
    var cwd = process.cwd();
    var prefix = cwd.split("obverse")[0];

    // Perform a little check:
    if (cwd.split('obverse').length !== 2) {
        var msg = "A test script was run from a directory not under the 'obverse' folder.  this is a fatal exception\ndirectory is: " + cwd;
        this.log.log(msg, "critical");
        throw msg;
    }
    var savePath = prefix + "obverse/tests/" + this.model + "/data-model/images/" + name + "." + new Date().getTime() + ".png";
    this.log.log("building image save path for: " + name, "trace");
    this.log.log(" -- " + savePath, "trace");
    return savePath;
};

Obverse.prototype.getAbsolutePath = function (path) {
    this.log.log("obverse.getAbsolutePath called with argument: " + path, "trace");

    // Total will hold the absolute address after it is calculated.  path-prefix must be added:
    var total;
    if (this.pathPrefix === "") {
        // If pathPrefix is empty, then just return path so we don't have a preceding '.'
        total = path;
    } else {
        // If path prefix is not empty, return it + path separated by a dot.
        total = this.pathPrefix + "." + path;
    }
    this.log.log("complete path is calculated as: " + total, "trace");
    return total;
};

Obverse.prototype.node = function (path) {
    // Return the result from the root map object:
    path = this.getAbsolutePath(path);
    try {
        return this.map.node(path);
    } catch (e) {
        this.log.log("obverse.node wrapper failed for path: " + path, "critical");
        this.log.log("this is a critical error that prevents test completion", "critical");
        throw e;
    }
};

Obverse.prototype.el = function (path) {

    if (this.dryRun) {
        this.log.log("el was called while dryRun true, returning undefined", "trace");
        return undefined;
    }

    var node = this.node(path).meta;

    // Now that we have the node, we can figure out the location strategy:
    this.log.log("element lookup found the following meta-data: ", "trace");
    this.log.log(JSON.stringify(node, null, "\t"), "trace");

    try{
	    if ("model" in node && node.model !== null && node.model !== "") {
	        this.log.log(path + " is located by model", "trace");
	        return element(by.model(node["model"]));
	    }
	    if ("xpath" in node && node.xpath !== null && node.xpath !== "") {
	        this.log.log(path + " is located by XPATH", "trace");
	        return element(by.xpath(node["xpath"]));
	    }
	    if ("css" in node && node.css !== null && node.css !== "") {
	        this.log.log(path + " is located by CSS", "trace");
	        return element(by.css(node["css"]));
	    }
    } catch (e) {
    	this.log.log("obverse.el failed to build protractor element for: " + path, "critical");
    	this.log.log("this is a fatal exception", "critical");
    	throw e;
    }

    //if none of those were found, we have a critical exception.  Throw an error.
    this.log.log("obverse.el was unable to find a locator for: " + path, "critical");
    this.log.log("Does the app-map entry for this path have an XPATH, NG-MODEL, or CSS Selector?", "critical");
    throw("obverse.el was unable find a locator for: " + path);
};

Obverse.prototype.finalize = function (callback) {

    // Once the pending promises resolve/reject:
    this.pending.then(function () {

        // If all the promises resolve, but we are in dry run mode, the test should fail.
        if (this.dryRun === true) {
            var reason = this.log.dumpAll("critical");

            // Clean up the failure reason by removing double new-lines.
            reason = reason.replace(/^\s*\n/gm, "");

            fail(reason); // TODO: Use this.fail();
            callback();
        } else {

            // If all promises resolve and we are not in dry run, we exit the test without failing it:
            callback();
        }

    }.bind(this), function () {

        // If the promises reject, we can fail the test regardless of if we are in dry-run mode.
        var reason = this.log.dumpAll("critical");

        // Clean up the failure reason by removing double new-lines.
        reason = reason.replace(/^\s*\n/gm, "");

        fail(reason); // TODO: Use this.fail();
        callback();
    }.bind(this));
};

Obverse.prototype.step = function (comment, functionToRun) {

    // Do some logging:
    this.log.log("step planned: " + comment, "trace");

    // oldPending will house the previous promise
    var oldPending = this.pending;

    // Try to add the new step:
    try {
        this.pending = new Promise(function (resolve, reject) {

            // After whatever was pending finishes:
            oldPending.then(

                // If the previous step resolves:
                function () {

                    // Before doing anything, make a new logging segment:
                    this.log.new(comment);

                    // If a function throws an exception, we need to set the object to dry run and do something else:
                    try {
                        var promiseOrNull = functionToRun();
                    } catch (e) {
                        this.log.log("exception in step: " + comment + ", " + e, "critical");
                        this.dryRun = true;
                    }

                    // If the step is a blocking step, and returns a promise:
                    if (promiseOrNull instanceof Promise) {

                        // Pass our resolve/rejections into the returned promises.
                        promiseOrNull.then(resolve, reject);
                        this.log.log("processing blocking step", "trace");
                    } else {
                        this.log.log("processing non-blocking step", "trace");
                        resolve(true);
                    }

                }.bind(this), function () {

                    // If the previous promise rejects:
                    this.dryRun = true;
                    resolve(true);
                }.bind(this)
            )

        }.bind(this));
    } catch (e) {
        this.log.log("Unable to execute step: " + comment, "critical");
        this.log.log("cause: " + e, "critical");
        this.log.log("test execution cannot continue:")
    }
};

/**
 * Provides a nice way to start a promise chain, all relative to a particular "node" of the UI.
 * TODO: add a second parameter to this to specify exactly what elements need to be present before the page is considered loaded.
 *
 * @param prefix
 * @returns {Promise<Boolean>}
 */
Obverse.prototype.at = function (prefix) {

    if (this.dryRun) {
        return new Promise(function (resolve) {
            this.log.log("* At: " + prefix, "debug");
            resolve(true);
        }.bind(this));
    }

    // Variable to store load time metrics:
    var metric = this.stepTime;
    this.stepStart();

    return new Promise(function (resolve) {
        this.log.log("At: " + prefix, "debug");
        this.pathPrefix = prefix;
        resolve(true);
    }.bind(this))

    // Decide if we need to automatically wait:
    .then(function (alwaysTrue) {
        this.log.log("autoWait is set to: " + this.autoWait, "trace");

        // nodeChildren will contain a list of all of the children that we CAN wait for:
        var nodeChildren = this.node("").listElementHooks();
        this.log.log("waiting for children elements: " + nodeChildren, "trace");

        // Build an array of all of the promises that will resolve once those elements are present:
        var racers = [];
        var i;
        for (i in nodeChildren) {
            if (nodeChildren.hasOwnProperty(i)) {
                var element = this.el(nodeChildren[i]);
                var expected = protractor.ExpectedConditions;
                racers.push(expected.elementToBeClickable(element), this.autoWaitTimeout);
            }
        }

        // Promise.race will resolve once the fastest promise resolves:
        return Promise.all(racers);
    }.bind(this))

    // Assuming at least one element came back, we can now wait for the correct time:
    .then(function (winningRacer) {

        // Record the end time:
        metric = new Date().getTime() - metric;
        this.log.log("\t(page should load in ~  " + metric + " milliseconds)", "debug");
        return browser.sleep(this.autoWaitPadding);
    }.bind(this), function (allRacersCrashed) {

        // Catch the rejection where all of the racers time out:
        this.log.log("ui.at was unable to verify a page was loaded before autoWaitTimeout: " + this.autoWaitTimeout, "minor");
        this.setDryRun(true);
        return browser.sleep(this.autoWaitPadding);
    }.bind(this))

    // The above will ALWAYS resolve true:
    .then(function (winningRacer) {
        // Build some useful variables:

        // Decide if we need to save a screenshot or not:
        if (this.screenshot === true) {
            var saveDirectory = this.imageSavePath(prefix);
            this.log.log("screenshotting is enabled, saving to: " + saveDirectory, "trace");
            try {
                // screenshot returns its first argument once it is done.  This means that in order to continue to return true, we need to enter that as its first argument.
                // this is dumb, and really TODO should be split up into two functions?  I'm not sure how to clean that API up while keeping the code DRY.
                // That argument should potentially be removed from the screenshot function, and then when screenshot is used otherwise it would need to be wrapped in a lambda function.
                var screenshotPromise = this.util.screenshot(true, saveDirectory);
                return screenshotPromise;
            } catch (error) {
                this.log.log('screenshot failed to save for path: ' + saveDirectory, "critical");
                return true;
            }
        } else {
            this.log.log("screenshotting is disabled", "trace");
            return true;
        }

        // No need to handle a rejection here, The promise always returns null as any rejection isn't critical.
    }.bind(this));
};

/**
 * Gets an element promise via tha "el" function. This is then highlighted, screenshot if needed, and then returned so that other methods can use it
 * This is the "originator" of all of the promise chains that are executed at each test step.
 * By doing ALL element locating through this method, we can ensure that everything that is used in the tests is logged, screenshot, and handled the same.
 * This also allows "dry-runs" so that we can generate a script of what the automated test would look like if it were run manually.
 *
 * @param {String} path
 * @returns {Promise<Object>} Resolved with the webdriver element or true if dryRun
 */
Obverse.prototype.getElement = function (path) {
    if (this.dryRun) {
        return new Promise(function (resolve) {
            resolve(true); // TODO: Resolve with null?
        }.bind(this));
    }

    this.log.log("obverse.getElement: " + path, "trace");
    var hPath = this.getAbsolutePath(path);
    var savePath = this.imageSavePath(hPath);

    // We need to return a promise eventually:
    // Start off by resolving the promise returned by this.el:

    return new Promise(function (resolve) {
        resolve(this.el(path));
    }.bind(this))

    // Then we will highlight that:
    .then(function (elementAfterResolving) {
        return this.util.highlight(elementAfterResolving, hPath);
    }.bind(this), function (rejection) {

        // In the event that that promise rejects, we have encountered a critical error:
        this.log.log("obverse.getElement failed to lookup element for: " + hPath, "critical");
        throw rejection;
    }.bind(this))

    // util.highlight will return the element promise.
    .then(function (elementAfterHighlighting) {
        if (this.screenshot === true) {
            this.log.log("screenshotting is enabled, saving to: " + savePath, "trace");
            try {
                return this.util.screenshot(elementAfterHighlighting, savePath);
            } catch (error) {
                this.log.log("screenshot failed to save for path: " + savePath, "minor");
                return elementAfterHighlighting;
            }
        } else {
            this.log.log("screenshotting is disabled", "trace");
            return elementAfterHighlighting;
        }
    }.bind(this))

    .then(function (elementAfterScreenShotting) {
        return this.util.unHighlight(elementAfterScreenShotting, hPath);
    }.bind(this))

    .then(function (elementAfterUnHighlighting) {
        return elementAfterUnHighlighting;
    });
};

/**
 * Types the provided text into an element located by path.
 *
 * @param {String} path In the form 'login.username' (to type into the username field)
 * @param {String} text The text to enter
 * @param {Number} [time=this.delay] Optional parameter for time to delay after entering text.
 * @returns {Function} On call, the function will return a promise
 */
Obverse.prototype.type = function (path, text, time) {

    if (this.dryRun) {
        return function () {
            return new Promise(function (resolve) {
                this.log.log('* type : ' + text + " into: " + path, "debug");
                resolve(true);
            }.bind(this));
        }.bind(this);
    }

    // Set the delay to default if it is not provided
    time = time || this.delay;
    this.stepStart();

    // Return a function, that returns a promise chain.
    return function () {
        this.log.log("type " + text + " into: " + path, "debug");

        // This will return the element, which has been logged and screenshot.
        return this.getElement(path)

        // Return a function, that will return a promise eventually.  An instance of browser.sleep is always returned.
        .then(function (el) {
            return el.sendKeys(text)
            .then(function (resolution) {
                this.log.log("obverse.type successful for: " + path, "trace");
                return browser.sleep(time);
            }.bind(this), function (rejection) {
                this.log.log("obverse.type failed for: " + path, "critical");
                this.setDryRun(true);
                return browser.sleep(time);
            }.bind(this));
        }.bind(this));
    }.bind(this);
};

/**
 * Clicks the element located by path
 *
 * @param {String} path In the from 'login.ok' (to click the ok button)
 * @param {Number} [time=this.delay] Optional parameter for time to delay after clicking it.
 * @returns {Function} On call, the function will return a promise
 */
Obverse.prototype.click = function (path, time) {

    if (this.dryRun) {
        return function () {
            return new Promise(function (resolve) {
                this.log.log('* click : ' + path, "debug");
                resolve(true);
            }.bind(this));
        }.bind(this);
    }

    time = time || this.delay;
    this.stepStart();

    // Return a function, that returns a promise chain.
    return function () {
        this.log.log("click " + path, "debug");

        // this.getElement will return a promise which will eventually resolve to an element on the page which has been successfully screenshot and logged.
        return this.getElement(path)

        // Return a function, that will return a promise eventually.  An instance of browser.sleep is always returned.
        .then(function (el) {
            return el.click()
            .then(function (resolution) {
                this.log.log("obverse.click successful for: " + path, "trace");
                return browser.sleep(time);
            }.bind(this), function (rejection) {
                this.log.log("obverse.click failed for: " + path, "critical");
                this.setDryRun(true);
                return browser.sleep(time);
            }.bind(this));
        }.bind(this));
    }.bind(this);
};

/**
 * Given the path to a <select> element, and the text of a particular option in the element.
 * Clicks to open up the select, then clicks the correct option.
 *
 * This Stack Overflow thread was helpful in building this:
 * https://stackoverflow.com/q/19599450
 *
 * @param {String} path The path the to select element
 * @param {String} text The option's value
 * @param {Number} [time=this.delay] Optional parameter for time to delay after clicking the option.
 * @returns {Function} On call, the function will return a promise
 */
Obverse.prototype.select = function (path, text, time) {

    if (this.dryRun) {
        return function () {
            return new Promise(function (resolve) {
                this.log.log('* select : ' + text + "from the " + path + " dropdown", "debug");
                resolve(true);
            }.bind(this));
        }.bind(this);
    }

    time = time || this.delay;
    this.stepStart();

    return function () {
        this.log.log("select " + text + " from " + path + " dropdown", "debug");

        // this.getElement will return a promise which will eventually resolve to an element on the page which has been successfully screenshot and logged.
        return this.getElement(path)

        // Return a function, that will return a promise eventually.
        // The original element will be returned so it can be used next.
        .then(function (el) {
            return el.click()
            .then(function (resolution) {
                this.log.log("obverse.select opened Dropdown: " + path, "trace");
                return el;
            }.bind(this), function (rejection) {
                this.setDryRun(true);
                this.log.log("obverse.select failed to open Dropdown: " + path, "critical");
                return el;
            }.bind(this));
        }.bind(this))

        // Select the correct menu item:
        .then(function (openedDropdownElement) {

            // Click the correct dropdown element:
            return browser.sleep(50)
            .then(function () {
                return openedDropdownElement.all(by.xpath('option[.="' + text + '"]')).click();
            });
        })

        // Wait for the correct amount of time:
        .then(function (clickedElement) {
            return browser.sleep(time);
        });
    }.bind(this);
};

// TODO: bring this function up to the level of the others.
Obverse.prototype.clear = function (path, time) {

    if (this.dryRun) {
        return function () {
            return new Promise(function (resolve) {
                this.log.log('* clear : ' + path, "debug");
                resolve(true);
            }.bind(this));
        }.bind(this);
    }

    time = time || this.delay;
    this.stepStart();

    this.stepStart();

    try {
        var element = this.el(path);
    } catch (error) {
        this.log.log("obverse.clear failed to lookup element for: " + path, "critical");
        this.setDryRun(true);
        throw error;
    }
    return function () {
        return element.clear();
    }
};

// TODO: This is a little crummy utility class. It really should be cleaner.
Obverse.prototype.fail = function (e) {
    throw e;
};

module.exports = Obverse;