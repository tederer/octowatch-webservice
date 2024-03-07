/* global octowatch, common, assertNamespace, setInterval */

assertNamespace('octowatch');

octowatch.InfoTab = function InfoTab(bus, cssSelector) {
   var TIMEOUT_IN_MS      = 10000;
   var initialized        = false;
   var lastMonitoringData = {};
   
   var updateMonitoringData = function updateMonitoringData() {
      var nowInMs = Date.now();
      
      if (lastMonitoringData.temperatures === undefined) {
         lastMonitoringData.temperatures = {};
      }
      
      ['cpu', 'gpu', 'env'].forEach(key => {
         var data        = lastMonitoringData.temperatures[key] ?? {};
         var temperature = data.value ?? 'n.a.';
         var timestamp   = data.timestamp ?? 0;
         
         if ((nowInMs - timestamp) >= TIMEOUT_IN_MS) {
            temperature = 'n.a.';
         } else {
            temperature = data.value.toFixed(1) + ' °C';
         }
         
         $(cssSelector + ' #' + key + 'Temperature').html(temperature);
         if (key === 'env') {
            var tooHigh = '' + (data.tooHigh ?? 'n.a.');
            $(cssSelector + ' #' + key + 'TemperatureTooHigh').html(tooHigh);
         }
      });
      
      var humidityTuple     = lastMonitoringData.humidity ?? {};
      var humidity          = humidityTuple.value ?? 'n.a.';         
      var humidityTimestamp = humidityTuple.timestamp ?? 0;
      
      if ((nowInMs - humidityTimestamp) >= TIMEOUT_IN_MS) {
         humidity = 'n.a.';
      } else {
         humidity = humidityTuple.value.toFixed(1) + ' %';
      }
      
      $(cssSelector + ' #humidity').html(humidity);
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
      lastMonitoringData = monitoringData ?? {};
      updateMonitoringData();
   };

   bus.subscribeToPublication(octowatch.client.topics.configuration, onConfigReceived);  
   bus.subscribeToPublication(octowatch.shared.topics.camera.monitoringData, onMonitoringDataReceived);
   
   setInterval(updateMonitoringData, 1000);
};