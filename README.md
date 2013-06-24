# node-plog

Friendly logging for Javascript.


## Usage

    var plog = require('plog'),
        debug = plog('example');

    debug('just like good old debug');
    debug('args', ['get', 'expanded']);
    debug.error('but you can also have levels');

    // You can grab any loggers that have been created
    // and change their levels
    plog.all().level('debug');

    // Or by regex
    plog.find(/^example/).level('critical');

    // Which comes in handy for tests
    plog.all().level('debug').remove('console').file('./plog-example.log');

    // And in production
    plog.all().level('error').file('./plog.log');

    // You can even use the normal env variables
    process.env.DEBUG=* === plog.all().level('debug');


It also works in the browser thanks to browserify.

If you're working in chrome, you'll also get colored output in the console.

![Color in your console](http://cl.ly/image/341g2X1E3l3X/Screen%20Shot%202013-06-24%20at%204.36.08%20PM.png)

## Install

     npm install plog

