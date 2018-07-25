exports.config =
{
  //define the tests to run at the top of the document:
  specs: ['./example.js'],



  //BACKEND RUNTIME ARGUMENTS:

  //required to disable webdrivercontrollflow which has major bugs and was depricated.
  SELENIUM_PROMISE_MANAGER: false,
  //required to get tests working on windows AND linux
  directConnect: true,
  //default timeout for an "it" block is 15 seconds.
  //as far as I can tell, when SELENIUM_PROMISE_MANAGER is set to false, this flag is broken and has no effects.
  //script timeouts must be manually set in the code.
  allScriptsTimeout: 15000,
  //specify options for jasmine:
  jasmineNodeOpts: {
    showColors: true//enable colored output on the terminal
  },
  //restart the browser between each test, this slows them down greatly:
  restartBrowserBetweenTests: true,


  //BROWSER RUNTIME ARGUMENTS:

  capabilities: {
    //test with chrome:
    browserName: 'chrome',
    //chrome command line options:
    chromeOptions: {
      /*UNCOMMENT THIS TO RUN HEADLESS*/
      //args:["--headless", "--disable-gpu", "window-size=1920, 1080", "--disable-browser-side-navigation"]
      /*UNCOMMENT THIS TO RUN IN A WINDOW*/
      args:["--start-maximized"]

      /*
        NOTES FOR CHROME OPTIONS:
        1. The "window-size" command line parameter is only for running headless.
        Use "--start-maximized" for running normally.
        2. The "disable-browser-side-navigation" is required when running headless due to a bug in protractor that remains unfixed.
        This may not be needed with the "direct-connect" variable set to true, but I haven't tested.
        The bug will cause tests to randomly fail in the middle as the promise chain completes unexpectedly fast.


      */
    }
  },


  //REPORTING ARGUMENTS:

  //this code will use the JUnitXmlReporter, which outputs to a standard format:
  onPrepare: function(){
    var reporters = require('jasmine-reporters');
    jasmine.getEnv().addReporter(
      new reporters.JUnitXmlReporter(null, true, true, "../results")
    );
  }

}
