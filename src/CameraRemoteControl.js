/* global octowatch, common, assertNamespace, setTimeout */

const net = require('node:net'); 

require('./common/logging/LoggingSystem.js');
require('./LineBasedTcpConnection.js');

assertNamespace('octowatch');

octowatch.CameraRemoteControl = function CameraRemoteControl(bus, host, port) {
   var logger = common.logging.LoggingSystem.createLogger('CameraRemoteControl');
   var connection;
   var connected = false;
   
   this.onConnected = function onConnected() {
      if (!connected) {
         connected = true;
         logger.logInfo('connected');
      }
   };
   
   this.onDisconnected = function onDisconnected() {
      if (connected) {
         connected = false;
         logger.logInfo('disconnected');
      }
   };
   
   this.onMessage = function onMessage(message) {
      if (message === undefined) {
         return;
      }
      logger.logInfo(message.type + ' message received');
      
      var messageTypeLowerCase = (message.type ?? '').toLowerCase();
      
      if (messageTypeLowerCase === 'capabilities') {
         bus.publish(octowatch.shared.topics.camera.capabilities, message.content ?? {});
      }
      if (messageTypeLowerCase === 'currentvalues') {
         bus.publish(octowatch.shared.topics.camera.currentValues, message.content ?? {});
      }
   };
   
   var onSetValueCommand = function onSetValueCommand(command) {
      connection.sendCommand(command);
   };
   
   this.start = function start() {
      connection = new octowatch.LineBasedTcpConnection(host, port);
      connection.start(this);
   };
   
   bus.subscribeToCommand(octowatch.shared.topics.camera.setCurrentValueCommand, onSetValueCommand);
};