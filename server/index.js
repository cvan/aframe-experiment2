/**
 * SocketIO server should mostly only act as a dumb pipe.
 */

var wdio = require('webdriverio');

var io = require('socket.io')(3001);
var os = require('os');

////////////////////////////////////////////////////////////////////////////////

// Broadcasts

function onKBMouse(s, a) {
    console.log(a);
    s.broadcast.emit('kbmouse', a);
}

function onXY(s, a) {
    s.broadcast.emit('xy', a);
}

function onAngular(s, a) {
    s.broadcast.emit('angular', a);
}

function onTap(s, a) {
    s.broadcast.emit('tap', a);
}

function onGyronorm(s, a) {
    s.broadcast.emit('gyronorm', a);
}

////////////////////////////////////////////////////////////////////////////////

// Return to sender

function onNetworkAddressRequest(s, a) {
    var en0 = os.networkInterfaces()['en0'];

    var ipv4 = en0.filter(function (entry) {
        return entry.family === 'IPv4';
    })[0]['address'];

    s.emit('networkAddressResponse', ipv4);
}

var WDIO_REMOTE_CLIENT_SETTINGS = { desiredCapabilities : { browserName : 'chrome' } };

var wdioClients = {};

function onWDIOClientRequestFulfilled() {
    this.emit('wdioClientResponse', Array.prototype.slice.call(arguments));
}

function onWDIOClientRequest(s, a) {
    console.log(a);

    var client = wdioClients[a.clientId];

    if (!client) {
        wdioClients[a.clientId] = wdio.remote(WDIO_REMOTE_CLIENT_SETTINGS);
        client                  = wdioClients[a.clientId];
    }

    if (a.requestType === 'init') {
        client
            .init()
            .call(onWDIOClientRequestFulfilled.bind(s));
    } else if (a.requestType === 'setViewportSize') {
        client
            .setViewportSize(a.requestValue)
            .call(onWDIOClientRequestFulfilled.bind(s));
    } else if (a.requestType === 'url') {
        client
            .url(a.requestValue)
            .call(onWDIOClientRequestFulfilled.bind(s));
    } else if (a.requestType === 'end') {
        client
            .end()
            .call(onWDIOClientRequestFulfilled.bind(s));
    } else if (a.requestType === 'screenshot') {
        client
            .saveScreenshot('./screenshot.png')
            .call(onWDIOClientRequestFulfilled.bind(s,'screenshot'));
    }
}

////////////////////////////////////////////////////////////////////////////////

// Entry point

function onConnection(socket) {
    socket
        .on('gyronorm', onGyronorm.bind(null, socket))
        .on('tap', onTap.bind(null, socket))
        .on('kbmouse', onKBMouse.bind(null, socket))
        .on('xy', onXY.bind(null, socket))
        .on('angular', onAngular.bind(null, socket))

        .on('networkAddressRequest', onNetworkAddressRequest.bind(null, socket))
        .on('wdioClientRequest', onWDIOClientRequest.bind(null, socket));
}

io.on('connection', onConnection);