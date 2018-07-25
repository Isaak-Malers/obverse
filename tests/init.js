//require in the proccess library:
var system = require("child_process");

//the usage string to print in the event of errors:

let usage =
`Usage: node init.js [newTestAreaName]

newTestAreaName is optional, if supplied an empty test area will be created with that name.

after creating or not creating a new test area, the obverse backend will be started up.
`;




//log all the arguments out to console:
for(arg in process.argv){
	console.log("\t" + arg + ": " + process.argv[arg]);
}

//if there was a 3rd argument, we need to create a new test area for that:
if(process.argv.length === 3){
	var newTestArea = process.argv[2];
	console.log("\ncreating test container for: " + newTestArea);
}





//       the following stackoverflow was very helpfull for this code:
//       https://stackoverflow.com/questions/10232192/exec-display-stdout-live

//afterwords, start the app for the backend.

console.log("\n\n---------------------------------------------------------------------");
var server = system.exec("node ../bin/app.js");


server.stdout.on('data', function (data) {
  console.log(data);
});