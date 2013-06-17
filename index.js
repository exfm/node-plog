"use strict";
// @todo (lucas) Fix file transport to just be a one liner.
// @todo (lucas) Log name block shouldnt include colors if in file mode.
// @todo (lucas) Tweak console format to be better.
var util = require('util'),
    defaultLevel = process.env.PLOG || 'crit',
    force = process.env.PLOG ? true : false;


// @todo (lucas) When creating new logger, check if it matches any expressions
// already run and apply those settings.
// @todo (lucas) Support group/groupEnd, time/timeEnd, etc
module.exports = function(name){
    var logger = new Logger(name),
        res = function(){
            return logger.log('debug');
        };

    ['debug', 'warn', 'error', 'info'].map(function(level){
        res[level] = function(){
            return logger.log(level);
        };
    });
    res.level = logger.level;
    return res;
};


module.exports.defaultLevel = process.env.PLOG || defaultLevel;
module.exports.loggers = process.loggers || {};

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
        var instance = logger.transports[transport];
          delete logger.transports[transport];
          logger._names = Object.keys(logger.transports);

          if(instance.close) {
            instance.close();
          }

          instance.removeListener('error', instance._onError);
    });
    return this;
};

List.prototype.file = function(path){
    var opts = {
            'filename': path,
            'level': module.exports.defaultLevel,
            'colorize': 'true'
        };

    this.loggers.forEach(function(logger){
        // logger.add(winston.transports.File, opts);
    });

    return this;
};

List.prototype.level = function(l){
    if(force){
        return self;
    }
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
    if(!force){
        module.exports.defaultLevel = l;
    }
    return module.exports;
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
    'error': 3
};

function Logger(name){
    this.name = name;
    this.transports = {
        'console': [new Console()]
    };
    this.level('crit');
}

Logger.prototype.log = function(level){
    if(level < this.level){
        return this;
    }

    var self = this;
    Object.keys(self.transports).map(function(t){
        t.map(function(handler){
            handler.write.apply(self, arguments);
        });
    });
    return this;
};

// Set level
Logger.prototype.level = function(l){};

// Log to file
Logger.prototype.file = function(dest){};


function Console(){}
Console.prototype.write = function(){
    process.stdout.write(util.format.apply(this, arguments) + '\n');
};

function File(){}
File.prototype.write = function(){};


