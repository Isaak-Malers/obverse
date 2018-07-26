var Obverse = require('../../../bin/lib/obverse');








//data for tests here.  It could also be read in from an external file:
var states = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
	"Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
	"Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
	"Missouri","Montana", "Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
	"New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
	"Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
	"Virginia","Washington","West Virginia","Wisconsin","Wyoming"];












//global test variables can go here, or they could be read in from an external file.
var url = "https://www.wikipedia.org/";


describe("Basic Language selection tests for wikipedia", function(){

	it("should be able to change the language from default to polish", function(done){
		//construct an obverse object for this test case.
		var ui = new Obverse("example");
		ui.setLogLevel("debug");
		ui.suppressDumps(true);//failure reasons will not be automatically logged to console.
		ui.setDelay(1);//additionall delay between actions, setting to 0 breaks protractor.
		browser.waitForAngularEnabled(false);//disable protractors built in waiting methods.

		ui.step("load the test url: " + url, function(){
			return browser.get(url);
		});

		ui.step("change the language from default to polish", function(){
			return ui.at("search-page")
			.then(ui.select("language", "Polski"));
		});

		//this assertion should pass
		ui.step("verify the link to the english version is labled 'English'", function(){
			return expect(ui.el("english").getText()).toBe("English");
		});

		//this assertion should fail to showcase error reporting.
		ui.step("verify the link to the english version is labled 'PL', this should fail", function(){
			return expect(ui.el("english").getText()).toBe("PL");
		});

		//compile results, then call jasmines (done) function to complete the test.
		ui.finalize(function(){
			done();
		});

	});





















	/*



	//Loop through all the states:
	for(var i=0; i<states.length; i++){
		//note that we are passing the state into this function at the bottom
		//this function will run once for each state in the array.
		(function (state){

			it("should search for some state colleges and make sure the search results are helpfull", function(done){
				
				//beforeEach doesn't execute this code syncronously.
				var ui = new Obverse("example");
				ui.setLogLevel("debug");
				ui.suppressDumps(true);
				ui.setDelay(120);
				browser.waitForAngularEnabled(false);
				

				//load the wikipedia URL
				ui.step("should load the page", function(){
					return browser.get(url);
				});

				//search for the state:
				ui.step("should search for: " + state + " state", function(){
					return ui.at("search-page")
					.then(ui.type("search-text", state + " state"))
					.then(ui.click("search-button"));
				});

				//wait for the search results to load:
				ui.step("wait for search results to load", function(){
					return ui.at("article-page");
				});

				//expect an article with a certain title:
				ui.step("should find the page titled " + state + " University or the page titled: ", function(){
					return expect(ui.el("heading").getText()).toBe(state + " State University");
				});

				//finalize the results:
				ui.finalize(function(){
					done();
				});

			}.bind(this));

		})(states[i]);//this last bit required to force syncronous operation.
	};
	*/
});