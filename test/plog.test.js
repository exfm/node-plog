"use strict";

var plog = require('../'),
    assert = require('assert'),
    util = require('util');

describe('plog', function(){
    it('should have a console transport by default', function(){
        var log = new plog.Logger('plog:test');
        assert.deepEqual(Object.keys(log.transports), ['console']);
    });

    it('should cascade level setting to transports', function(){
        var log = plog('plog:test');
        assert.equal(log.transports.console[0].level(), 'critical');

        log.level('debug');
        assert.equal(log.transports.console[0].level(), 'debug');
    });

    it('should log crit to the console by default', function(){
        var log = plog('plog:test');
        assert(log.critical('yo'));
    });

    it('should be callable', function(){
        var log = plog('plog:test').level('debug');
        assert(log('yo'));
    });

    it('should be able to remove the console', function(){
        var log = plog('plog:test').remove('console');
        assert.deepEqual(Object.keys(log.transports), []);
    });

    it('should be able add a file logger', function(){
        var log = plog('plog:test').remove('console').file('./plog-test.log');
        assert.deepEqual(Object.keys(log.transports), ['file']);
    });

    it('should be able to log to a file', function(){
        var log = plog('plog:test').level('debug').remove('console').file('./plog-test.log');
        assert(log('yo'));
    });

    it('should be able to send different levels to different files', function(){
        var log = plog('plog:test')
            .file('./plog-test-errors.log', 'error')
            .file('./plog-test-debug.log', 'debug');

        log.error('im an error');
        log.debug('im a debug');
    });
    it('should use the DEBUG env var for setting all matching levels to debug');



    // it('should allow setting a default level right away', function(){
    //     var p = require('../').level('silly');
    //     assert.equal(p.defaultLevel, 'silly');
    //     assert.equal(p('test').transports.console.level, 'silly');
    // });

    // it('should allow getting all created loggers', function(){
    //     var one = plog('one'),
    //         two = plog('two');

    //     assert.equal(plog.all().loggers.length, 2);

    //     plog.all().level('debug');

    //     assert.equal(one.transports.console.level, 'debug');
    //     assert.equal(two.transports.console.level, 'debug');
    // });

    // it('should allow finding by regex, ie all by package', function(){
    //     plog('salsify');
    //     plog('salsify.backends');
    //     plog('salsify.backends.sqs');
    //     plog('plog');
    //     plog('dnode');

    //     var l = plog.find(/^salsify/);
    //     assert.deepEqual(l.loggers.map(function(logger){return logger.name;}),
    //         ["salsify","salsify.backends","salsify.backends.sqs"]);
    // });

});