"use strict";

var plog = require('../'),
    assert = require('assert'),
    util = require('util');

describe('plog', function(){
    var startLevel = plog.defaultLevel;
    afterEach(function(){
        plog.loggers = {};
        plog.defaultLevel = startLevel;
    });

    it('should make Logger.prototype.level into a useful function...', function(){
        var log = plog('plog').level('silly');
        assert.equal(log.transports.console.level, 'silly');
    });

    it('should allow setting a default level right away', function(){
        var p = require('../').level('silly');
        assert.equal(p.defaultLevel, 'silly');
        assert.equal(p('test').transports.console.level, 'silly');
    });

    it('should allow getting all created loggers', function(){
        var one = plog('one'),
            two = plog('two');

        assert.equal(plog.all().loggers.length, 2);

        plog.all().level('debug');

        assert.equal(one.transports.console.level, 'debug');
        assert.equal(two.transports.console.level, 'debug');
    });

    it('should allow finding by regex, ie all by package', function(){
        plog('salsify');
        plog('salsify.backends');
        plog('salsify.backends.sqs');
        plog('plog');
        plog('dnode');

        var l = plog.find(/^salsify/);
        assert.deepEqual(l.loggers.map(function(logger){return logger.name;}),
            ["salsify","salsify.backends","salsify.backends.sqs"]);
    });

});