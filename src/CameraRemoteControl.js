/* global octowatch, common, assertNamespace, setTimeout */

const net = require('node:net'); 

require('./common/logging/LoggingSystem.js');
require('./LineBasedTcpConnection.js');
require('./InfraredLight.js');

assertNamespace('octowatch');

octowatch.CameraRemoteControl = function CameraRemoteControl(bus, host, port) {
   const IR_LIGHT                   = 'InfraredLight';
   var logger                       = common.logging.LoggingSystem.createLogger('CameraRemoteControl');
   var infraredLight                = new octowatch.InfraredLight(0);
   var infraredLightLevel           = 0;
   var connected                    = false;
   var lastSentCurrentValuesMessage = {};
   var thisInstance                 = this;
   var connection;
   
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
         var extendedMessage = message.content ?? {};
         extendedMessage[IR_LIGHT] = { type: 'float', minimum: 0, maximum: 1, default: 0 };
         bus.publish(octowatch.shared.topics.camera.capabilities, extendedMessage);
      }
      if (messageTypeLowerCase === 'currentvalues') {
         var messageToSend = message.content ?? {};
         messageToSend[IR_LIGHT] = infraredLightLevel;
         bus.publish(octowatch.shared.topics.camera.currentValues, messageToSend);
         lastSentCurrentValuesMessage = messageToSend;
      }
   };
   
   var setInfraredLightLevel = function setInfraredLightLevel(levelToSet) {
      if ((levelToSet < 0) || (levelToSet > 1)) {
         return;
      }
      infraredLightLevel = levelToSet;
      infraredLight.setLevel(levelToSet);
      thisInstance.onMessage({type: 'currentvalues', content: lastSentCurrentValuesMessage});
   };
   
   var onSetValueCommand = function onSetValueCommand(command) {
      if (command.content.control === IR_LIGHT) {
         setInfraredLightLevel(command.content.value * 1);
      } else {
         connection.sendCommand(command);
      }
   };
   
   this.start = function start() {
      connection = new octowatch.LineBasedTcpConnection(host, port);
      connection.start(this);
   };
   
   bus.subscribeToCommand(octowatch.shared.topics.camera.setCurrentValueCommand, onSetValueCommand);
};