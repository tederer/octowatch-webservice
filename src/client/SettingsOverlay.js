/* global octowatch, common, assertNamespace */

assertNamespace('octowatch');

octowatch.Control = function Control(name, minimumValue, maximumValue, defaultValue) {
   var currentValue;
   
   this.setCurrentValue = function setCurrentValue(value) {
      currentValue = value;
      console.log(name + ' = ' + currentValue);
   };
   
   this.getCurrentValue = function getCurrentValue() {
      return currentValue;
   };
   
   this.getRange = function getRange() {
      return '[' + minimumValue + ', ' + maximumValue + ']';
   };
};

octowatch.SettingsOverlay = function SettingsOverlay(bus) {
   var cssSelectorPrefix = '#settingsOverlay ';
   var controls = {};
   var instance = this;
   var pendingCurrentValues;
   var selectedControlKey;
   
   var updateDisplayedCurrentValue = function updateDisplayedCurrentValue() {
      if (selectedControlKey !== undefined) {
         $(cssSelectorPrefix + '#currentValueLabel').html(controls[selectedControlKey].getCurrentValue() ?? 'n.a');
      }
   };
   
   var onControlSelected = function onControlSelected(event) {
      var key = event.target.id;
      $(cssSelectorPrefix + '#controlButton').html(key);
      $(cssSelectorPrefix + '#rangeLabel').html(controls[key].getRange());
      selectedControlKey = key;
      updateDisplayedCurrentValue();
   };
   
   var onCurrentValuesReceived = function onCurrentValuesReceived(currentValues) {
      console.log(currentValues);
      
      if (Object.keys(controls).length === 0) {
         pendingCurrentValues = currentValues;
         return;
      }
      
      for(var key in (currentValues ?? {})) {
         controls[key].setCurrentValue(currentValues[key]);
      }
      
      updateDisplayedCurrentValue();
   };
   
   var onCapabilitiesReceived = function onCapabilitiesReceived(capabilities) {
      console.log(capabilities);
      
      var htmlContent = '';
      
      for(var key in (capabilities ?? {})) {
         var capability = capabilities[key];
         controls[key] = new octowatch.Control(key, capability.minimum, capability.maximum, capability.default);
         htmlContent += '<li><a id="' + key + '" class="dropdown-item" href="#">' + key + '</a></li>';
         if (pendingCurrentValues !== undefined) {
            controls[key].setCurrentValue(pendingCurrentValues[key]);
         }
      }
      
      pendingCurrentValues = undefined;
      
      $(cssSelectorPrefix + '#controlDropDown').html(htmlContent);
   };
   
   $(cssSelectorPrefix + '#controlDropDown').on('click', onControlSelected);
   
   bus.subscribeToPublication(octowatch.shared.topics.camera.capabilities,  onCapabilitiesReceived);  
   bus.subscribeToPublication(octowatch.shared.topics.camera.currentValues, onCurrentValuesReceived);
};