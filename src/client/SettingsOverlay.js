/* global octowatch, common, assertNamespace */

assertNamespace('octowatch');

octowatch.Control = function Control(name, type, minimumValue, maximumValue, defaultValue) {
   var currentValue;
   
   this.setCurrentValue = function setCurrentValue(value) {
      currentValue = value;
   };
   
   this.getCurrentValue = function getCurrentValue() {
      return currentValue;
   };
   
   this.getMinimumValue = function getMinimumValue() {
      return minimumValue;
   };
   
   this.getMaximumValue = function getMaximumValue() {
      return maximumValue;
   };
   
   this.getDefaultValue = function getDefaultValue() {
      return defaultValue;
   };
   
   this.getType = function getType() {
      return type;
   };
   
   this.getRange = function getRange() {
      return '[' + minimumValue + ', ' + maximumValue + ']';
   };
   
   this.isValidValue = function isValidValue(value) {
      return (!Number.isNaN(value) && (value !== '') && (value >= minimumValue) && (value <= maximumValue));
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
         var control = controls[selectedControlKey];
         $(cssSelectorPrefix + '#currentValueLabel').html(control.getCurrentValue() ?? 'n.a');
         $(cssSelectorPrefix + '#newValueInput').attr('min', control.getMinimumValue());
         $(cssSelectorPrefix + '#newValueInput').attr('max', control.getMaximumValue());
         $(cssSelectorPrefix + '#newValueInput').val('');
         $(cssSelectorPrefix + '#typeLabel').html(controls[selectedControlKey].getType());
         $(cssSelectorPrefix + '#defaultValueLabel').html(controls[selectedControlKey].getDefaultValue());
      }
   };
   
   var onControlSelected = function onControlSelected(event) {
      var key = event.target.id;
      $(cssSelectorPrefix + '#controlButton').html(key);
      $(cssSelectorPrefix + '#rangeLabel').html(controls[key].getRange());
      selectedControlKey = key;
      updateDisplayedCurrentValue();
   };
   
   var onSetValueButtonClicked = function onSetValueButtonClicked() {
      if (selectedControlKey === undefined) {
         return;
      }
      
      var newValue = $(cssSelectorPrefix + '#newValueInput').val() * 1;
      
      if (!controls[selectedControlKey].isValidValue(newValue)) {
         console.log('ignoring request to set value because new value (' + newValue + ') is invalid');
         return;
      }
      
      var command =  {  type: 'setControl', 
                        content: {
                           'control': selectedControlKey, 
                           'value':   newValue
                     }};
                     
      bus.sendCommand(octowatch.shared.topics.camera.setCurrentValueCommand, command);
   };
   
   var onCurrentValuesReceived = function onCurrentValuesReceived(currentValues) {
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
      var htmlContent = '';
      
      for(var key in (capabilities ?? {})) {
         var capability = capabilities[key];
         controls[key] = new octowatch.Control(key, capability.type, capability.minimum, capability.maximum, capability.default);
         htmlContent += '<li><a id="' + key + '" class="dropdown-item" href="#">' + key + '</a></li>';
         if (pendingCurrentValues !== undefined) {
            controls[key].setCurrentValue(pendingCurrentValues[key]);
         }
      }
      
      pendingCurrentValues = undefined;
      
      $(cssSelectorPrefix + '#controlDropDown').html(htmlContent);
   };
   
   $(cssSelectorPrefix + '#controlDropDown').on('click', onControlSelected);
   $(cssSelectorPrefix + '#setValueButton').on('click', onSetValueButtonClicked);
   
   bus.subscribeToPublication(octowatch.shared.topics.camera.capabilities,  onCapabilitiesReceived);  
   bus.subscribeToPublication(octowatch.shared.topics.camera.currentValues, onCurrentValuesReceived);
};