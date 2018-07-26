var fs = require('fs');

/**
 * The utility class is functions that are utilities that are Exclusively useful in the test run environment.
 * this is primarily, taking screenshots, and enhancing the logging messages by collecting extra metadata.
 *
 * @param {Logger} logger
 * @constructor
 */
var Util = function (logger) {
    this.log = logger
};

/**
 * Given an webdriver element object, grabs the coordinates for that object from webdriver and
 * builds a div that will highlight that element on the page
 *
 * @param {Object} el Webdriver element
 * @returns {Promise<String>}
 */
Util.prototype.highlightTemplate = function (el) {

    // This HTML template is for 4 transparent blocks that will darken out everything except the portion of the page we want to see.
    // {x}, {y} and {x2}, {y2}  represent pixel coordinates for the top left and bottom right corners of the "un-darkend" areas.
    var template =
'<div id="obverse-test-highlight">' +
  	'<div style="left: 0;top: 0;width: {x}px;height: {y2}px;background:black;z-index:10000;display:block;position:absolute;opacity:.45;pointer-events:none;"></div>' +
  	'<div style="left: {x}px;top: 0;width: 100%;height: {y}px;background: black;z-index:10000;display:block;position:absolute;opacity:.45;pointer-events:none;"></div>' +
  	'<div style="left: 0;top: {y2}px;width: {x2}px;height: 100%;background:black;z-index:10000;display:block;position:absolute;opacity:.45;pointer-events:none;"></div>' +
  	'<div style="left: {x2}px;top: {y}px;width: 100%;height: 100%;background:black;z-index:10000;display:block;position:absolute;opacity:.45;pointer-events:none;"></div>' +
'</div>';

    // Create an object for promises from webdriver
    var meta = [];
    meta.push(el.getLocation());
    meta.push(el.getSize());

    // After resolving the promise to get the elements from selenium, calculate the X and Y coordinates for highlighting.
    return Promise.all(meta).then(function (res) {

        // The following 'Extra' Pixels will be applied to all the elements:
        var extra = 10;

        // Out will house the template above after it is processed.
        var out;

        // Build variables for the top left corner and bottom right corner of the element.
        var x = res[0].x - extra;
        var y = res[0].y - extra;
        var x2 = x + res[1].width + extra;
        var y2 = y + res[1].height + extra;

        this.log.log("coords for highlighting are: (" + x + ", " + y + ")  (" + x2 + ", " + y2 + ")", "trace");

        // TODO This Code sucks, but it works.
        // Hopefully JS implements String.replaceAll() like every other sane language at some point then this brutal hack can be replaced with something more elegant.
        out = template.split("{x}").join(x).split("{y}").join(y).split("{x2}").join(x2).split("{y2}").join(y2);
        return out;
    }.bind(this), function (rejection) {
        this.log.log("failed to build highlight overlay, Empty highlight will be applied to the DOM", "critical");
        this.log.log("Empty highlight will be applied to the DOM, to prevent errors while trying to remove it.", "critical");
        this.log.log(rejection, "critical");
        return '<div id="obverse-test-highlight"></div>';
    }.bind(this));
};

/**
 * Applies the highlighting overlay to the page.
 *
 * @param {Object} el Protractor element, which is used to locate and size the overlay.
 * @param {String} path Used to print helpful debugging messages.
 * @returns {Promise<String>}
 */
Util.prototype.highlight = function (el, path) {

    // First, indicate what is being highlighted.
    this.log.log("highlight called with path: " + path, "trace");

    // Get the highlight template, which will return a promise when it is calculated:
    return this.highlightTemplate(el)

	// Then apply the template to the dom:
    .then(function (dom) {

        // Script to add whatever the second argument is to the page.
        var script = "document.body.appendChild(function(newDom){" +
            "var out = document.createElement('div');" +
            "out.innerHTML=arguments[0];" +
            "return out;" +
            "}(arguments[0]))";

        // The second argument is dom, which is what was returned from the highlightTemplate function:
        return browser.driver.executeScript(script, dom);
    }.bind(this), function (rejection) {

        // Catch rejection even though it should never happen.
        this.log.log("The highlightTemplate() method has rejected, which shouldn't be possible.  Please submit a bug request to a developer", "critical");

        // Even when this promise rejects, we want to continue execution because this is just a logging failure and not an application failure.
        // Return a promise even if the script fails:
        return browser.sleep(1500);
    }.bind(this))

	// Instead of returning a largely useless browser promise, return the original element promise.
	// This will make promise chaining when the API is used much easier, because every function will return an element promise.
    .then(function (uselessBrowserPromise) {
		return el;
    }.bind(this), function (rejection) {
        this.log.log("An error occurred while executing the browser side script to apply the highlighting overlay: ", "critical");
        this.log.log(rejection);
        throw rejection;
    }.bind(this));
};

/**
 * Given a path (on the file-system) takes a screenshot of the browser and saves it to the specified path.
 * Returns null in every case, even if there are errors.
 *
 * @param el
 * @param path
 * @returns {PromiseLike<Object>}
 */
Util.prototype.screenshot = function (el, path) {

    // The write-screenshot method was lifted from stack-overflow and is mostly stock.
    // It does take the "path" argument from its parent scope.
    var writeScreenShot = function (data) {
        try {
            var stream = fs.createWriteStream(path);
            stream.write(new Buffer(data, 'base64'));
            stream.end();
        } catch (err) {
            throw err;
        }
    };

    // Take the screenshot, we will catch exceptions of this promise and return null in either case.
   	return browser.takeScreenshot()

   	// If it resolves, write the PNG, then return null.
   	.then(function (png) {
   	    writeScreenShot(png);

   	    // This promise will always return null
   	    return null;
   	}.bind(this), function (rejection) {

   	    // If it fails, ALSO return null, but log a critical error message first.
        this.log.log("screenshot failed to save", "critical");
   	    this.log.log(rejection, "critical");

   	    // Return a promise even if it rejects so that the promise chains are unbroken.
   	    return null;
   	}.bind(this))

   	// Instead of returning a largely useless "null", we will return the original element that was passed in.
   	// While not 'strictly' required in this method, If all methods take the element promise and also return it, it ensures that nothing steps on anything else.
   	.then(function (uselessAlwaysNull) {
   	    return el;
   	}.bind(this));
};

/**
 * Removes the highlighting overlay that the "highlight" method puts on the page.
 * the el and path arguments are used exclusively for helpful logging messages and to preserve a clean promise chain, should promise chain stack tracing ever become a feature of Node.js
 *
 * @param {Object} el
 * @param {String} path
 * @returns {Promise<Object>}
 */
Util.prototype.unHighlight = function (el, path) {

    // A script which removes the element with the "obverse-test-highlight" id.
    var script = "document.getElementById('obverse-test-highlight').parentNode.removeChild(document.getElementById('obverse-test-highlight'))";

    // Execute the script on the browser, we will catch exceptions and promise rejections from here and then return the element passed in.
    return browser.driver.executeScript(script)
    .then(function (result) {

    	// Return the element which was passed in.
        return el;
    }, function (rejection) {

    	// Return the element even if this fails, but log a critical error message.
        this.log.log("Failed to un-highlight path: " + path, "critical");
        this.log.log("This is very likely due to a previous failure preventing the 'Highlight' function from working.", "critical");
        this.log.log("It is impossible to remove the overlay which was never applied in the first place", "critical");
        this.log.log(rejection, "critical");
        return el;
    }.bind(this));
};

module.exports = Util;