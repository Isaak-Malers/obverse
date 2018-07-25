//require in the obverse library
var obverse = require('../../../bin/lib/obverse');

//require in the test cases, by requiring a directory, we get the index.js by default.
var cases = require("./test-cases");
//get a list of all the names of the test cases:
var caseNames = Object.keys(cases);


//Jasmine describe to wrape all of the tests:
describe("a test", function(){

	//for every test case dataset:
	for(i in caseNames){
		//define a lambda function for the 
		(function(testData){

			//the it block for the individual test:
			it("should be able to run a test with the data specified by: " + caseNames[i] , function(done){


				//create a new obverse object.
				//the object will be destroyed at the end of the test when its "finalize" function is called.
				var ui = new obverse("demo");
				//set the log level to debug, which will print out every high level step:
				//log levels are": trace, debug, minor, critical
				ui.setLogLevel("debug");
				//supress dumping all logs from a step whenever a failure occurs.
				ui.supressDumps(true);
				//set the additional delay after each action to 80 milliseconds.
				//this can be set as low as one.
				ui.setDelay(80);
				//disable protractors built in waiting, which interferes with obverse's contextual waiting.
				browser.waitForAngularEnabled(false);
				
				//the first step in a test is usually to load the test URL:
				ui.step("Load the test URL: " + testData.url, function(){
					return browser.get("YOUR URL");
				});	

				//in order to compile results correctly, a call to finalize must be made.
				//without this call, tests will always pass (even if a step fails)
				ui.finalize(function(){
					done();
				});

			}, 50000);

		//this syncronously runs all the test cases with the lambda function above:
		})(cases[caseNames[i]]);
	}
});