"use strict";

var winston = require('winston'),
    old = winston.Logger.prototype.log,
    defaultLevel = 'crit';

// Patch log func to use an actually helpful format.
winston.Logger.prototype.log = function(level, msg){
    if(this.name){
        return old.apply(this, [level, "\x1B[90m["+this.name + ": " + new Date().toUTCString() + "]\x1B[39m " + msg]);
    }
    return old.apply(this, [level, msg]);
};

module.exports = function(name){
    if(winston.loggers.loggers.hasOwnProperty(name)){
        return winston.loggers.get(name);
    }

    var log = winston.loggers.add(name,
        {'console': {'level': module.exports.defaultLevel, 'colorize': 'true'}});
    log.name = name;

    log.level = function(l){
        Object.keys(log.transports).forEach(function(t){
            log.transports[t].level = l;
        });
        return this;
    };

    module.exports.loggers[name] = log;
    return log;
};

module.exports.defaultLevel = defaultLevel;
module.exports.loggers = {};

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
    this.loggers.forEach(function(logger){
        delete logger.transports[transport];
    });
    return this;
};

List.prototype.file = function(path){
    var self = this;
    new winston.transports.File({
        'filename': path,
        'level': module.exports.defaultLevel,
        'colorize': 'true'
    });
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

// require('plog').level('silly');
//
// Set a default level for all subsequently created loggers.
// Useful for when you're debugging and you just want everything to show
// debugging.
module.exports.level = function(l){
    module.exports.defaultLevel = l;
    return module.exports;
};