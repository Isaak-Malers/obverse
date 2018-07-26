/**
 * Logger class compiles debugging statements.
 *
 * @param {String} [levelIn="critical"] The default log level
 * @constructor
 */
var Logger = function (levelIn) {
    this.supressDuplicates = false;

    this.level = levelIn || "critical";
    this.logs = [];
    this.segment = [];

    if (this.isValidLevel(this.level) === false) {
        throw "obverse logging requires a valid log level, got: " + this.level;
    }
    this.new("obverse internal setup", false);

    // autoDump will be set to true to denote that the previous log section should dump out all of its contents
    // when new() is called to start a new log block.
    this.autoDump = false;
    this.log("logger class instantiated with level: " + levelIn, "trace");
};

Logger.prototype.setLogLevel = function (level) {
    if (this.isValidLevel(level)) {
        this.level = level;
    }
};

Logger.prototype.isValidLevel = function (level) {
    if (level === "critical") {
        return true;
    }
    if (level === "minor") {
        return true;
    }
    if (level === "Logger") {
        return true;
    }
    if (level === "trace") {
        return true;
    }
    return false;
};

Logger.prototype.shouldPrint = function (level, overRide) {
    var compareTo = overRide || this.level;

    // If this.level is set to info, print everything
    if (compareTo === "trace") {
        return true;
    }

    // If this.level is debug, print everything EXCEPT info statements.
    if (compareTo === "debug" && level !== "trace") {
        return true;
    }

    // If the level of this message is minor, print it as long as the log level isn't set to critical only.
    if (level === "minor" && compareTo !== "critical") {
        return true;
    }

    // Always print critical error messages.
    if (level === "critical") {
        return true;
    }

    return false;
};

/**
 * Makes a new logging segment with the message, prints to console if the boolean is true.
 *
 * @param {String} msg
 * @param {Boolean} [printToConsole=false]
 */
Logger.prototype.new = function (msg, printToConsole) {
    if (printToConsole !== true && printToConsole !== false) {
        printToConsole = true;
    }

    if (this.autoDump === true && this.supressDuplicates === false) {
        process.stdout.write("\n\n\n");
        process.stdout.write("A CRITICAL OR MINOR LOG MESSAGE TRIGGERED A LOG DUMP FOR THE PAST LOG-BLOCK:\n");
        process.stdout.write("THIS IS A DUPLICATE OF THE LOGS FROM THE SECTION ABOVE, BUT WITH ALL MESSAGES PRINTED:\n\n");
        for (var i = 0; i < this.segment.length; i++) {
            process.stdout.write("\n\t" + this.segment[i]);
        }
        process.stdout.write("\n\nEND OF DUPLICATE LOGS\n\n\n");
        this.autoDump = false;

    }
    var totalMsg = "-----  " + msg + "  -----";
    if (printToConsole === true) {
        process.stdout.write("\n\n" + totalMsg);
    }
    this.logs.push(this.segment);
    this.segment = [totalMsg];
};

/**
 * Add the statement to the most up to date
 *
 * @param {String} msg
 * @param {String} [level="critical"]
 */
Logger.prototype.log = function (msg, level) {

    // Set default level to 0 (always show)
    level = level || "critical";

    if (level === "critical" || level === "minor") {
        this.autoDump = true;
    }

    if (this.isValidLevel(level) === false) {
        throw "obverse logging requires a valid log level, got: " + level + " for message: " + msg;
    }

    msg = level + ":   " + msg;

    this.segment.push(msg);

    if (this.shouldPrint(level)) {
        process.stdout.write("\n\t" + msg);
        //console.log(msg);
    }
};

Logger.prototype.dump = function () {
    process.stdout.write(this.segment);
};

Logger.prototype.dumpAll = function (lvl) {
    if (this.isValidLevel(lvl) === false) {
        var msg = "dumpAll requires a valid log level, got: " + lvl;
        console.log(msg);
        throw(msg);
    }

    var output = "";

    var sect;
    var log;
    var level;
    for (sect in this.logs) {
        for (log in this.logs[sect]) {
            if (this.logs[sect].hasOwnProperty(log)) {
                log = this.logs[sect][log];
                level = log.split(":")[0].trim();
                if (this.shouldPrint(level, lvl) === true) {
                    output = output + "\n" + log;
                }
            }
        }
        output = output + "\n";
    }

    return output.trim();
};

module.exports = Logger;