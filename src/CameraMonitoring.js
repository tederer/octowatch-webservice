/* global octowatch, common, assertNamespace, setTimeout */

require('./common/Http.js');
require('./common/logging/LoggingSystem.js');

assertNamespace('octowatch');

octowatch.CameraMonitoring = function CameraMonitoring(bus) {
   var POLLING_INTERVAL_IN_MS = 5000;
   var LOGGER = common.logging.LoggingSystem.createLogger('CameraMonitoring');
   var http   = new common.Http();
   var lastMonitoringData;
   
   var getMonitoringData; // declaring it here to avoid linter error
   
   var onNewMonitoringData = function onNewMonitoringData(jsonData) {
      if (jsonData === undefined) {
         return;
      }
      
      if ((lastMonitoringData ?? {}).id !== jsonData.id) {
         lastMonitoringData = jsonData;
         bus.publish(octowatch.shared.topics.camera.monitoringData, jsonData);
      }
   };
   
   var scheduleNextRead = function scheduleNextRead(startOfReadOperation) {
      var timeoutInMs = 0;
      if (startOfReadOperation !== undefined) {
         var readDuration = Date.now() - startOfReadOperation;
         timeoutInMs = Math.max(0, POLLING_INTERVAL_IN_MS - readDuration);
      }
      setTimeout(getMonitoringData, timeoutInMs);
   };
   
   getMonitoringData = async function getMonitoringData() {
      var startOfReadOperation = Date.now();
      http.get('http://localhost:9090/jsonData')
         .then(jsonData => {
            LOGGER.logDebug('JSON data: ' + JSON.stringify(jsonData));
            onNewMonitoringData(jsonData);
            scheduleNextRead(startOfReadOperation);
         })
         .catch(error => {
            LOGGER.logError('failed to read temperature file: ' + error);
            scheduleNextRead(startOfReadOperation);
         });
   };
   
   scheduleNextRead(); 
};