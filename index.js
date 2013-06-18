"use strict";
// @todo (lucas) Fix file transport to just be a one liner.
// @todo (lucas) Log name block shouldnt include colors if in file mode.
var util = require('util'),
    fs = require('fs'),
    stream = require('stream'),
    colors = require('tty').isatty(2) || process.env.DBEUG_COLORS;


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

module.exports.timestamps = {};

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

var colors = {
    'debug': 0, // gray
    'info': 6, // cyan
    'warning': 3, // yellow
    'error': 1, // red
    'critical': 5 // magenta
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

function Transport(logger, level){
    this.logger = logger;
    this.level(level);
}

function relative(ms) {
    var sec = 1000,
        min = 60 * 1000,
        hour = 60 * min;

    if (ms >= hour){
        return (ms / hour).toFixed(1) + 'h';
    }
    if (ms >= min){
        return (ms / min).toFixed(1) + 'm';
    }
    if (ms >= sec){
        return (ms / sec | 0) + 's';
    }
    return ms + 'ms';
}

Transport.prototype.format = function(level, val){
    val = val instanceof Error ? val.stack || val.message : val;

    var args = Array.prototype.slice.call(arguments, 0),
        now = new Date(),
        name = this.logger.name,
        ms = now - (module.exports.timestamps[name] || now),
        color = colors[level];

    args.shift();
    args.shift();

    module.exports.timestamps[name] = now;

    if(colors && this.name !== 'file'){
        val = '  \u001b[9' + color + 'm [' + level.toUpperCase().charAt(0) + '] ' + name + ' ' +
            '\u001b[3' + color + 'm\u001b[90m' +
            val + '\u001b[3' + color + 'm' +
            ' +' + relative(ms) + '\u001b[0m';
    }
    else {
        val = [level.toUpperCase().charAt(0), new Date().toUTCString(), name, val].join(' ');
    }
    args.unshift(val);
    return util.format.apply(this, args);
};

Transport.prototype.level = function(l){
    if(l === undefined){
        return Object.keys(levels)[this.levelNumber];
    }
    this.levelNumber = levels[l];
    return this;
};

Transport.prototype.log = function(level){
    var args = Array.prototype.slice.call(arguments, 0);

    if(levels[level] >= this.levelNumber){
        this.ws.write(this.format.apply(this, args) + '\n');
        return true;
    }
    return false;
};

function Console(logger, level){
    Console.super_.call(this, logger, level);
    this.ws = process.stdout;
    this.name = 'console';
}
util.inherits(Console, Transport);

function File(logger, dest, level){
    File.super_.call(this, logger, level);
    this.dest = dest;
    this.ws = fs.createWriteStream(this.dest, {'flags': 'a'});
    this.name = 'file';
}
util.inherits(File, Transport);

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
