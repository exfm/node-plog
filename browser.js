"use strict";

var util = require('util'),
    colors = false;


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
    res.silly = res.debug;
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

var colors = {
    'debug': 'blue', // blue
    'info': 'cyan', // cyan
    'warn': 'yellow', // yellow
    'error': 'red', // red
    'critical': 'magenta' // magenta
};

module.exports.defaultLevel = 'critical';

function Logger(name){
    this.name = name;
    this.level(module.exports.defaultLevel);
    this.transports = {
        'console': [new Console(this, module.exports.defaultLevel)]
    };
    processSearches(this);
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
function colorize(hex) {
    if(window.chrome || window.console && (console.exception && console.table || console.colorized)) {
        return function (args, append, color){
            args.push('color:'+ (color || hex) +';');
            append && append.length && args.push(append);
            return '%c';
        };
    }
    else {
        return function (args, append){
            append && append.length && args.push(append);
            return '';
        };
    }
};

Transport.prototype.format = function(level, val){
    val = val instanceof Error ? val.stack || val.message : val;

    var args = Array.prototype.slice.call(arguments, 0),
        now = new Date(),
        name = this.logger.name,
        ms = now - (module.exports.timestamps[name] || now),
        color = colors[level],
        c = colorize(color);

    args.shift();
    args.shift();

    args = [];

    module.exports.timestamps[name] = now;

    if(colors && this.name !== 'file'){
        val = c(args) + ' [' + level.toUpperCase().charAt(0) + '] ' + name + ' ' + val + c(args, Array.prototype.slice.call(arguments, 2), 'black') + ' +' + relative(ms);
    }
    else {
        val = [level.toUpperCase().charAt(0), new Date().toUTCString(), name, val].join(' ');
    }

    args.unshift(val);
    return args;
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
        this.ws.write.apply(this, this.format.apply(this, args));
        return true;
    }
    return false;
};

function Console(logger, level){
    Console.super_.call(this, logger, level);
    this.ws = {'write': function(){
        Function.prototype.apply.call(console.log, console, arguments);
    }};
    this.name = 'console';
}
util.inherits(Console, Transport);

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

function List(loggers, expr){
    this.loggers = loggers;
    this.expr = expr;
    module.exports.searches[expr] = {
        'removes': [],
        'files': [],
        'levels': []
    };
}

List.prototype.remove = function(transport){
    this.loggers.map(function(logger){
        delete logger.transports[transport];
    });
    module.exports.searches[this.expr].removes.push(arguments);
    return this;
};

List.prototype.file = function(dest, level){
    this.loggers.map(function(logger){
        logger.file(dest, level);
    });
    module.exports.searches[this.expr].files.push(arguments);
    return this;
};

List.prototype.level = function(l){
    var self = this;
    self.loggers.forEach(function(logger){
        Object.keys(logger.transports).forEach(function(transport){
            logger.transports[transport].level(l);
        });
    });
    module.exports.searches[this.expr].levels.push(arguments);
    return self;
};

module.exports.all = function(){
    return new List(Object.keys(module.exports.loggers).map(function(name){
        return module.exports.loggers[name];
    }), new RegExp('.*'));
};

module.exports.find = function(expr){
    return new List(Object.keys(module.exports.loggers).filter(function(name){
        return expr.test(name);
    }).map(function(name){
        return module.exports.loggers[name];
    }), expr);
};

// Set all existing and newly created to be at some level.
module.exports.level = function(l){
    module.exports.all().level(l);
    module.exports.defaultLevel = l;
    return module.exports;
};

function processSearches(logger){
    Object.keys(module.exports.searches).map(function(expr){
        if(new RegExp(expr).test(logger.name)){
            module.exports.searches[expr].removes.map(function(r){
                logger.remove.apply(logger, r);
            });
            module.exports.searches[expr].levels.map(function(l){
                logger.level.apply(logger, l);
            });
            module.exports.searches[expr].files.map(function(f){
                logger.file.apply(logger, f);
            });
        }
    });
}

module.exports.searches = {}; // expr => {'removes': [], 'files': [], 'levels'}
module.exports.loggers = process.loggers || {};
module.exports.Logger = Logger;
module.exports.timestamps = {};

if(process.env.DEBUG){
    if(process.env.DEBUG === '*'){
        module.exports.level('debug');
    }
    else {
        module.exports.find(new RegExp(process.env.DEBUG)).level('debug');
    }
}