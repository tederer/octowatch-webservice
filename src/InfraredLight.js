/* global octowatch, common, assertNamespace, setTimeout */

const net = require('node:net'); 

require('./common/logging/LoggingSystem.js');
require('./LineBasedTcpConnection.js');
require('./InfraredLight.js');

assertNamespace('octowatch');

octowatch.InfraredLight = function InfraredLight(initialLightLevel) {
   const IR_LIGHT_CONTROL_HOST = '127.0.0.1';
   const IR_LIGHT_CONTROL_PORT = 8886;
   
   var logger       = common.logging.LoggingSystem.createLogger('InfraredLight');
   var connected    = false;
   var lightLevel   = initialLightLevel;
   var thisInstance = this;
   var connection;
   
   this.setLevel = function setLevel(levelInPercent) {
      lightLevel = levelInPercent;
      if (connected) {
         logger.logInfo('setting level ' + levelInPercent);
         connection.sendCommand(levelInPercent);
      }
   };
   
   this.onConnected = function onConnected() {
      if (!connected) {
         connected = true;
         logger.logInfo('connected');
         thisInstance.setLevel(lightLevel);
      }
   };
   
   this.onDisconnected = function onDisconnected() {
      if (connected) {
         connected = false;
         logger.logInfo('disconnected');
      }
   };
   
   connection = new octowatch.LineBasedTcpConnection(IR_LIGHT_CONTROL_HOST, IR_LIGHT_CONTROL_PORT);
   connection.start(this);
};
