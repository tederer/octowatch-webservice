/* global octowatch, common, assertNamespace, setTimeout */

const net = require('node:net'); 

require('./common/logging/LoggingSystem.js');

assertNamespace('octowatch');

octowatch.LineBasedTcpConnection = function LineBasedTcpConnection(host, port) {
   var FIRST_RECONNECT_TIMEOUT_IN_MS = 100;
   
   var logger = common.logging.LoggingSystem.createLogger('LineBasedTcpConnection');
   var reconnectTimeoutInMs = FIRST_RECONNECT_TIMEOUT_IN_MS;
   var listener;
   var nextLine = '';
   var socket;
   
   var reconnect; // declaring the function here to avoid linter errors
   
   var ifListenerExists = function ifListenerExists(task) {
      if (listener !== undefined) {
         task(listener);
      }
   };
   
   var onError = function onError(error) {
      logger.logError(error);
      socket = undefined;
      ifListenerExists(listener => listener.onDisconnected());
      reconnect();
   };
   
   var onConnectionLost = function onConnectionLost() {
      logger.logInfo('connection lost');
      socket = undefined;
      ifListenerExists(listener => listener.onDisconnected());
      reconnect();
   };
   
   var onConnected = function onConnected() {
      logger.logInfo('connection established');
      reconnectTimeoutInMs = FIRST_RECONNECT_TIMEOUT_IN_MS;
      ifListenerExists(listener => listener.onConnected());
   };
   
   var onData = function onData(data) {
      logger.logInfo('IN: received ' + data.length + ' characters');
      var indexOfCr;
      
      do {
         indexOfCr = data.indexOf('\n');
         if (indexOfCr >= 0) {
            nextLine         += data.substring(0, indexOfCr + 1);
            data              = data.substring(indexOfCr + 1);
            var trimmedLine   = nextLine.trim();
              
            try {
               var jsonMessage = JSON.parse(trimmedLine);
               listener.onMessage(jsonMessage);
            } catch(err) {
               logger.logError('failed to convert message to object: ' + err);
               logger.logError('raw message: ' + nextLine);
            }
            nextLine = '';
         }
      } while (indexOfCr >= 0);
   };
   
   var connect = function connect() {
      logger.logDebug('connecting to ' + host + ':' + port);
      socket = net.connect(port, host);
      socket.setEncoding('utf8');
      socket.on('error',   onError);
      socket.on('end',     onConnectionLost);
      socket.on('connect', onConnected);
      socket.on('data',    onData);
   };
   
   reconnect = function reconnect() {
      nextLine = '';
      setTimeout(connect, reconnectTimeoutInMs);
      if (reconnectTimeoutInMs <= 1000) {
         reconnectTimeoutInMs *= 2;
      }
   };
   
   this.sendCommand = function sendCommand(command) {
      if (socket === undefined) {
         logger.logWarning('ignoring command because not connected');
         return;
      }
      
      var commandAsString = JSON.stringify(command);
      logger.logInfo('sending:' + commandAsString);
      if(!socket.write(commandAsString + '\n')) {
         logger.logError('failed to send command: ' + commandAsString);
      }
   };
   
   this.start = function start(newListener) {
      listener = newListener;
      connect();
   };
};
