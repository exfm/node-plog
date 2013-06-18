"use strict";
// @todo (lucas) Fix file transport to just be a one liner.
// @todo (lucas) Log name block shouldnt include colors if in file mode.
var util = require('util'),
    fs = require('fs'),
    stream = require('stream');


// @todo (lucas) When creating new logger, check if it matches any expressions
// already run and apply those settings.
// @todo (lucas) Support group/groupEnd, time/timeEnd, etc
module.exports = function(name){
    var logger = new Logger(name),
        res = function(){
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift('debug');
            return logger.log.apply(logger, args);
        };

    Object.keys(Logger.prototype).map(function(fn){
        res[fn] = logger[fn];
    });

    ['debug', 'warn', 'error', 'info', 'critical'].map(function(level){
        res[level] = function(){
            var args = Array.prototype.slice.call(arguments, 0);
            args.unshift(level);
            return logger.log.apply(logger, args);
        };
    });

    res.transports = logger.transports;

    return res;
};

// var debug = require('debug')('mott:deploy');
// to
// var debug = require('plog')('mott:deploy');
// var log = require('plog')('mott:deploy');
// debug('msg') === debug.debug('msg');
// log('msg') === log.debug('msg');

// DEBUG=mott:* -> plog.find(/mott\:*/).level('debug');

var levels = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'critical': 4
};

module.exports.defaultLevel = 'critical';

function Logger(name){
    this.name = name;
    this.level(module.exports.defaultLevel);
    this.transports = {
        'console': [new Console(this, module.exports.defaultLevel)]
    };
}

Logger.prototype.transports = {};

Logger.prototype.log = function(){
    var args = Array.prototype.slice.call(arguments, 0),
        self = this;

    return Object.keys(self.transports).some(function(t){
        return self.transports[t].some(function(handler){
            return handler.log.apply(handler, args);
        });
    });
};

// Set level
Logger.prototype.level = function(l){
    var self = this;
    // Setting a top level level should cascade to transports.
    Object.keys(this.transports).map(function(transport){
        self.transports[transport].map(function(t){
            t.level(l);
        });
    });

    this.levelNumber = levels[l];

    return this;
};

// Log to file
Logger.prototype.file = function(dest, level){
    if(!level){
        // If no level, use the last level set for this logger.
        level = Object.keys(levels)[this.levelNumber];
    }
    if(!this.transports.file){
        this.transports.file = [];
    }
    this.transports.file.push(new File(this, dest, level));
    return this;
};

Logger.prototype.console = function(level){
    return this;
};

Logger.prototype.remove = function(transport){
    delete this.transports[transport];
    return this;
};

function Console(logger, level){
    this.level(level);
}

Console.prototype.log = function(){
    var args = Array.prototype.slice.call(arguments, 0),
        level = args.shift();

    if(levels[level] >= this.levelNumber){
        process.stdout.write(util.format.apply(this, args) + '\n');
        return true;
    }
    return false;
};

Console.prototype.level = function(l){
    if(l === undefined){
        return Object.keys(levels)[this.levelNumber];
    }
    this.levelNumber = levels[l];
    return this;
};

function File(logger, dest, level){
    this.level(level);
    this.dest = dest;

    // Open file for writing
    this.ws = fs.createWriteStream(this.dest, {'flags': 'a'});
}
File.prototype.log = function(){
    var args = Array.prototype.slice.call(arguments, 0),
        level = args.shift();

    if(levels[level] >= this.levelNumber){
        this.ws.write(util.format.apply(this, args) + '\n');
        return true;
    }

    return false;
};

File.prototype.level = function(l){
    if(l === undefined){
        return Object.keys(levels)[this.levelNumber];
    }
    this.levelNumber = levels[l];
    return this;
};

module.exports.loggers = process.loggers || {};
module.exports.Logger = Logger;

// var plog = require('plog'),
// log = plog('song');
// app.configure('production', function(){
//     log.file('log/song.log');
// });
// app.configure('testing', function(){
//     plog.all()
//         .remove('console')
//         .file('log/song.testing.log')
//         .level('silly');
// });

function List(loggers){
    this.loggers = loggers;
}

List.prototype.remove = function(transport){
    this.loggers.map(function(logger){
        delete logger.transports[transport];
    });
    return this;
};

List.prototype.file = function(dest){
    this.loggers.map(function(logger){
        if(!logger.transports.file){
            logger.transports.file = [];
        }
        logger.transports.file.push(new File(dest));
    });
    return this;
};

List.prototype.level = function(l){
    var self = this;
    self.loggers.forEach(function(logger){
        Object.keys(logger.transports).forEach(function(transport){
            logger.transports[transport].level = l;
        });
    });
    return self;
};

module.exports.all = function(){
    return new List(Object.keys(module.exports.loggers).map(function(name){
        return module.exports.loggers[name];
    }));
};

module.exports.find = function(expr){
    return new List(Object.keys(module.exports.loggers).filter(function(name){
        return expr.test(name);
    }).map(function(name){
        return module.exports.loggers[name];
    }));
};

// Set all existing and newly created to be at some level.
module.exports.level = function(l){
    module.exports.all().level(l);
    module.exports.defaultLevel = l;
    return module.exports;
};
