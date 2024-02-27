/* global octowatch, common, assertNamespace, setInterval */

assertNamespace('octowatch');

//{
//  id: 444,
//  temperatures: {
//    gpu: { value: 45.1, timestamp: 1709058220615 },
//    cpu: { value: 45.084, timestamp: 1709058220629 },
//    env: { value: 19.6, timestamp: 1709058221541 }
//  },
//  humidity: { value: 65.3, timestamp: 1709058221541 }
//}


octowatch.InfoTab = function InfoTab(bus, cssSelector) {
   var TIMEOUT_IN_MS = 30000;
   var initialized = false;
   var lastMonitoringData;
   
   var updateMonitoringData = function updateMonitoringData() {
      if (lastMonitoringData === undefined) {
         return;
      }
      
      var nowInMs = Date.now();
      var atLeastOneValueIsValid = false;
      
      if (lastMonitoringData.temperatures === undefined) {
         lastMonitoringData.temperatures = {};
      }
      
      ['cpu', 'gpu', 'env'].forEach(key => {
         var tuple = lastMonitoringData.temperatures[key] ?? {};
         var temperature = tuple.value ?? 'n.a.';
         var timestamp   = tuple.timestamp ?? 0;
         if ((nowInMs - timestamp) >= TIMEOUT_IN_MS) {
            temperature = 'n.a.';
         } else {
            temperature = tuple.value.toFixed(1) + ' °C';
            atLeastOneValueIsValid = true;
         }
         $(cssSelector + ' #' + key + 'Temperature').html(temperature);
      });
      
      var humidityTuple     = lastMonitoringData.humidity ?? {};
      var humidity          = humidityTuple.value ?? 'n.a.';         
      var humidityTimestamp = humidityTuple.timestamp ?? 0;
      if ((nowInMs - humidityTimestamp) >= TIMEOUT_IN_MS) {
         humidity = 'n.a.';
      } else {
         humidity = humidityTuple.value.toFixed(1) + ' %';
         atLeastOneValueIsValid = true;
      }
      $(cssSelector + ' #humidity').html(humidity);
      
      if (!atLeastOneValueIsValid) {
         lastMonitoringData = undefined;
      }
   };
   
   var initializeTab = function initializeTab(config) {
      if (initialized) {
         return;
      }

      initialized = true;
      $(cssSelector + ' #version').html(config.version);
   };

   var onConfigReceived = function onConfigReceived(config) {
      if (config) {
         initializeTab(config);
      }
   };

   var onMonitoringDataReceived = function onMonitoringDataReceived(monitoringData) {
      lastMonitoringData = monitoringData;
      updateMonitoringData();
   };

   bus.subscribeToPublication(octowatch.client.topics.configuration, onConfigReceived);  
   bus.subscribeToPublication(octowatch.shared.topics.camera.monitoringData, onMonitoringDataReceived);
   
   setInterval(updateMonitoringData, 1000);
};