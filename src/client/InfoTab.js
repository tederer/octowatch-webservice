/* global octowatch, common, assertNamespace, setInterval, setTimeout, clearTimeout */

assertNamespace('octowatch');

octowatch.InfoTab = function InfoTab(bus, cssSelector) {
   const TIMEOUT_IN_MS    = 10000;
   const NOT_AVAILABLE    = 'n.a.';
   
   var initialized        = false;
   var lastMonitoringData = {};
   var timeout;
   
   var onMonitoringDataTimeout = function onMonitoringDataTimeout() {
      timeout = undefined;
      ['cpu', 'gpu', 'env'].forEach(key => {
         $(cssSelector + ' #' + key + 'Temperature').html(NOT_AVAILABLE);
         if (key === 'env') {
            $(cssSelector + ' #' + key + 'TemperatureTooHigh').html(NOT_AVAILABLE);
         }
      });
      $(cssSelector + ' #humidity').html(NOT_AVAILABLE);
   };
   
   var updateMonitoringData = function updateMonitoringData() {
      if (timeout !== undefined) {
         clearTimeout(timeout);
         timeout = undefined;
      }
      
      if (lastMonitoringData.temperatures === undefined) {
         lastMonitoringData.temperatures = {};
      }
      
      ['cpu', 'gpu', 'env'].forEach(key => {
         var data        = lastMonitoringData.temperatures[key] ?? {};
         var temperature = data.value ?? NOT_AVAILABLE;
         
         if (temperature !== NOT_AVAILABLE) {
            temperature = data.value.toFixed(1) + ' °C';
         }
         
         $(cssSelector + ' #' + key + 'Temperature').html(temperature);
         
         if (key === 'env') {
            var tooHigh = '' + (data.tooHigh ?? NOT_AVAILABLE);
            $(cssSelector + ' #' + key + 'TemperatureTooHigh').html(tooHigh);
         }
      });
      
      var humidityTuple = lastMonitoringData.humidity ?? {};
      var humidity      = humidityTuple.value ?? NOT_AVAILABLE;         
      
      if(humidity !== NOT_AVAILABLE) {
         humidity = humidityTuple.value.toFixed(1) + ' %';
      }
      
      $(cssSelector + ' #humidity').html(humidity);
      
      timeout = setTimeout(onMonitoringDataTimeout, TIMEOUT_IN_MS);
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

   updateMonitoringData();
   
   bus.subscribeToPublication(octowatch.client.topics.configuration, onConfigReceived);  
   bus.subscribeToPublication(octowatch.shared.topics.camera.monitoringData, onMonitoringDataReceived);
};