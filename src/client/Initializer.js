/* global octowatch, common, fetch, io */

$( document ).ready(async function() {
   const bus               = new common.infrastructure.bus.Bus();
   const topicsToTransmit  = [];
   
   new common.infrastructure.busbridge.ClientSocketIoBusBridge(bus, topicsToTransmit, io);

   var httpGet = async function httpGet(url) {
      return new Promise((resolve, reject) => {
         var options = {method: 'GET'};

         fetch(url, options)
            .then(response => {
               if (!response.ok) {
                  reject(new Error('HTTP GET request failed with status ' + response.status));
               }
               response.text()
                  .then(resolve)
                  .catch(err => {
                      reject(new Error('Failed to get text from response (URL=' + url + '): ' + err));
                  });
            })
            .catch(err => reject(new Error('Failed to fetch data from ' + url + ': ' + err)));
      });
   };

   var showTab = function showTab(event) {
      var targetId = event.target.id;

      var tabs = $('body > div');

      for(var i = 0; i < tabs.length; i++) {
         var tab = tabs[i];
         if (tab.id.endsWith('Tab')) {
            if(tab.id === targetId + 'Tab') {
               $(tab).removeClass('d-none');
            } else {
               $(tab).addClass('d-none');
            }
         }
      }

      $('.collapse').collapse('hide');
   };

   var loadConfiguration = async function loadConfiguration() {
      return new Promise((resolve, reject) => {
         httpGet('/configuration')
            .then(configAsString => {
               try {
                  resolve(JSON.parse(configAsString));
               } catch(err) {
                  reject(new Error('Failed to convert received configuration to JSON: ' + err));
               }
            })
            .catch(err => reject(new Error('Failed to download configuration: ' + err)));
      });
   };
   
   new octowatch.InfoTab(bus, '#infoTab');
   new octowatch.StatusDiv(bus, '#status');
   new octowatch.SettingsOverlay(bus);
   
   var config = await loadConfiguration();
   bus.publish(octowatch.client.topics.configuration, config);
   
   $('#navbarToggler a').click(showTab);
});
