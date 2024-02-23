
var recursiveAssertObject = function recursiveAssertObject(parentObject, objects) {
   
   if (parentObject[objects[0]] === undefined) {
      parentObject[objects[0]] = {};  
   }
   
   var newParentObject = parentObject[objects[0]];
   
   if (objects.length > 1) {
      recursiveAssertObject(newParentObject, objects.slice(1));
   }
};

assertNamespace = function assertNamespace(namespace) {
   
   var rootObject = (typeof window === 'undefined') ? global : window;
   var objects = namespace.split('.');
   recursiveAssertObject(rootObject, objects);
};

assertNamespace('common.infrastructure.bus');

/**
 * A Bus enables components to communicate with each other by using publications and commands bound to topics. 
 * All the comminicating components need to know are the used topics -> they do not need to know each other.
 *
 * A topic (e.g. '/webapp/client/selectedCustomers') is a unique string that identifies the command and/or publication. 
 * The same topic can be used for commands and publications.
 *
 * When a component publishes some data on a topic, all components which subscribed to publications on that topic, will get
 * the published data. The bus remembers the last published data and provides them to components that subscribe later (late join).
 *
 * When a component sends a command on a topic, all components which subscribed to commands on that topic, will get
 * the data of the command. The bus does NOT remember command data -> later subscribing components will not get them (one shot).
 */
common.infrastructure.bus.Bus = (function () {

   var Bus = function Bus() {
      
      var publicationCallbacksPerTopic = {};
      var lastPublishedDataPerTopic = {};
      var commandCallbacksPerTopic = {};

      var add = function add(callback) {
         return { 
            relatedTo: function relatedTo(topic) {
               return {
                  to: function to(map) {
                     if (map[topic] === undefined) {
                        map[topic] = [];
                     }
                     var set = map[topic];
                     set[set.length] = callback;
                  }
               };
            }
         };
      }; 

      var invokeAllCallbacksOf = function invokeAllCallbacksOf(map) {
         return {
            ofType: function ofType(topic) {
               return {
                  withData: function withData(data) {
                     if (map[topic] !== undefined) {
                        map[topic].forEach(function(callback) {
                           callback(data);
                        });
                     }
                  }
               };
            }
         };
      };
      
      this.subscribeToPublication = function subscribeToPublication(topic, callback) {
         if(topic && (typeof callback === 'function')) {
            add(callback).relatedTo(topic).to(publicationCallbacksPerTopic);
            
            var lastPublishedData = lastPublishedDataPerTopic[topic];
            
            if (lastPublishedData) {
               callback(lastPublishedData);
            }
         }
      };
      
      this.subscribeToCommand = function subscribeToCommand(topic, callback) {
         if (topic && (typeof callback === 'function')) {
            add(callback).relatedTo(topic).to(commandCallbacksPerTopic);
         }
      };
      
      this.publish = function publish(topic, data) {
         lastPublishedDataPerTopic[topic] = data;
         invokeAllCallbacksOf(publicationCallbacksPerTopic).ofType(topic).withData(data);
      };
      
      this.sendCommand = function sendCommand(topic, data) {
         invokeAllCallbacksOf(commandCallbacksPerTopic).ofType(topic).withData(data);
      };
   };
   
   return Bus;
}());

assertNamespace('common.infrastructure.busbridge');

common.infrastructure.busbridge.CONNECTION_STATE_TOPIC = 'busbridge.connected';

/**
 * A BusBridge connects two busses by using a transport media (e.g. socket.io)
 * and it has the following responsibilities:
 *    1. transmit all commands and publications, the bridge is interested in, to the other bus
 *    2. publish all commands and publications received from the other bus
 *    3. publish the connection state of the bridge locally on the topic: 
 *            common.infrastructure.busbridge.CONNECTION_STATE_TOPIC
 */

/**
 * constructor for a BusBridge.
 *
 * bus                        the instance of the local common.infrastructure.bus.Bus
 * topicsToTransmit           an Array of topics that should get transmitted via the bridge
 * connectionFactoryFunction  a function that returns either a ClientSocketIoConnection or a ServerSocketIoConnection 
 *                              (located in common.infrastructure.busbridge.connection).
 */
common.infrastructure.busbridge.BusBridge = function BusBridge(bus, topicsToTransmit, connectionFactoryFunction) {

   var onConnectCallback = function onConnectCallback() {
      bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, true);
   };
   
   var onDisconnectCallback = function onDisconnectCallback() {
      bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, false);
   };
   
   var onMessageCallback = function onMessageCallback(message) {
      if (message.type === 'PUBLICATION') {
         bus.publish(message.topic, message.data);
      } else if (message.type === 'COMMAND') {
         bus.sendCommand(message.topic, message.data);
      }
   };

   var connection = connectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback);
   
   bus.publish(common.infrastructure.busbridge.CONNECTION_STATE_TOPIC, 'false');

   topicsToTransmit.forEach(function(topic) {
      bus.subscribeToPublication(topic, function(data) {
         var message = common.infrastructure.busbridge.MessageFactory.createPublicationMessage(topic, data);
         connection.send(message);
      });
      bus.subscribeToCommand(topic, function(data) {
         var message = common.infrastructure.busbridge.MessageFactory.createCommandMessage(topic, data);
         connection.send(message);
      });
   });
};
 

assertNamespace('common.infrastructure.busbridge');

/**
 * constructor for a bus bridge typically used in the browser.
 *
 * bus               the local bus instance
 * topicsToTransmit  an Array of topics that should get transmitted via the bridge
 * io                the socket.io instance
 */
common.infrastructure.busbridge.ClientSocketIoBusBridge = function ClientSocketIoBusBridge(bus, topicsToTransmit, io) {
   
   var clientConnectionFactoryFunction = function serverConnectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback) {
      return new common.infrastructure.busbridge.connection.ClientSocketIoConnection(io(), onConnectCallback, onDisconnectCallback, onMessageCallback);
   };

   this.prototype = new common.infrastructure.busbridge.BusBridge(bus, topicsToTransmit, clientConnectionFactoryFunction);
};


assertNamespace('common.infrastructure.busbridge.connection');

common.infrastructure.busbridge.connection.ClientSocketIoConnection = function ClientSocketIoConnection(socket, onConnectCallback, onDisconnectCallback, onMessageCallback) {
   
   var connected = false;
   
   var onMessage = function onMessage(rawMessage) {
      onMessageCallback(JSON.parse(rawMessage));
   };
   
   var onConnect = function onConnect() {
      connected = true;
      onConnectCallback();
   };
   
   var onDisconnect = function onDisconnect() {
      connected = false;
      onDisconnectCallback();
   };
   
   this.send = function send(data) {
      if (connected) {
         socket.emit('message', JSON.stringify(data));
      }
   };
   
   onDisconnectCallback();
   socket.on('connect', onConnect);
   socket.on('disconnect', onDisconnect);
   socket.on('message', onMessage);
};


assertNamespace('common.infrastructure.busbridge.connection');

common.infrastructure.busbridge.connection.ServerSocketIoConnection = function ServerSocketIoConnection(socketIoServer, onConnectCallback, onDisconnectCallback, onMessageCallback) {
   
   var sockets = [];
   var counter = 1;
   var latestPublicationMessagesByTopic = {};
   
   var Socket = function Socket(socketIoSocket, messageCallback, disconnectCallback) {
      
      this.id = counter++;
      var thisInstance = this;
      
      var onMessage = function onMessage(rawMessage) {
         messageCallback(rawMessage, thisInstance);
      };
      
      var onDisconnect = function onDisconnect() {
         socketIoSocket.removeListener('disconnect', onDisconnect);
         socketIoSocket.removeListener('message', onMessage);
         disconnectCallback(thisInstance);
      };
      
      this.send = function send(rawMessage) {
         socketIoSocket.emit('message', rawMessage);
      };
      
      socketIoSocket.on('disconnect', onDisconnect);
      socketIoSocket.on('message', onMessage);
   };
   
   var onMessage = function onMessage(rawMessage, sendingSocket) {
      var message = JSON.parse(rawMessage);
      onMessageCallback(message);
      
      if (message.type === 'PUBLICATION') {
         latestPublicationMessagesByTopic[message.topic] = message;
      }
   };
   
   var onDisconnect = function onDisconnect(disconnectedSocket) {
      var indexToDelete = sockets.indexOf(disconnectedSocket);
      
      if (indexToDelete >= 0) {
         sockets.splice(indexToDelete, 1);
      }
      
      if (sockets.length === 0) {
         onDisconnectCallback();
      }
   };
   
   var onConnection = function onConnection(newSocketIoSocket) {
      var newSocket = new Socket(newSocketIoSocket, onMessage, onDisconnect);
      sockets[sockets.length] = newSocket;
      
      if (sockets.length === 1) {
         onConnectCallback();
      }
      
      var topics = Object.keys(latestPublicationMessagesByTopic);
      topics.forEach(function(topic) {
         newSocket.send(JSON.stringify(latestPublicationMessagesByTopic[topic]));
      });
   };
   
   this.send = function send(message) {
      var serializedMessage = JSON.stringify(message);
      sockets.forEach(function(socket) { socket.send(serializedMessage); });
      
      if (message.type === 'PUBLICATION') {
         latestPublicationMessagesByTopic[message.topic] = message;
      }
   };

   socketIoServer.on('connection', onConnection);
};


assertNamespace('common.infrastructure.busbridge');

common.infrastructure.busbridge.MessageFactory = {
   
   createPublicationMessage: function createPublicationMessage(topic, data) {
      return {
         type: 'PUBLICATION',
         topic: topic,
         data: data
      };
   },
   
   createCommandMessage: function createCommandMessage(topic, data) {
      return {
         type: 'COMMAND',
         topic: topic,
         data: data
      };
   }
};


assertNamespace('common.infrastructure.busbridge');

/**
 * constructor for a bus bridge used where the https server is running.
 *
 * bus               the local bus instance
 * topicsToTransmit  an Array of topics that should get transmitted via the bridge
 * io                the socket.io instance
 */
common.infrastructure.busbridge.ServerSocketIoBusBridge = function ServerSocketIoBusBridge(bus, topicsToTransmit, io) {
   
   var serverConnectionFactoryFunction = function serverConnectionFactoryFunction(onConnectCallback, onDisconnectCallback, onMessageCallback) {
      return new common.infrastructure.busbridge.connection.ServerSocketIoConnection(io, onConnectCallback, onDisconnectCallback, onMessageCallback);
   };

   this.prototype = new common.infrastructure.busbridge.BusBridge(bus, topicsToTransmit, serverConnectionFactoryFunction);
};


assertNamespace('common.logging');

/**
 * ConsoleLogger writes the log output to the console.
 */
common.logging.ConsoleLogger = function ConsoleLogger(name, minLogLevel) {
   var MESSAGE_SEPARATOR = ';';
   var logLevel = minLogLevel;

   var formatNumber = function formatNumber(expectedLength, number) {
      var result = number.toString();
      while(result.length < expectedLength) {
         result = '0' + result;
      }
      return result;
   };

   var log = function log(level, messageOrSupplier) {
      if (level.value >= logLevel.value) {
         var timestamp = (new Date()).toISOString();
         var message = typeof messageOrSupplier === 'function' ? messageOrSupplier() : messageOrSupplier;
         console.log([timestamp, level.description, name, message].join(MESSAGE_SEPARATOR));
      }
   };

   this.setMinLogLevel = function setMinLogLevel(minLogLevel) {
      logLevel = minLogLevel;
   };

   this.logDebug = function logDebug(messageOrSupplier) {
      log(common.logging.Level.DEBUG, messageOrSupplier);
   };
   
   this.logInfo = function logInfo(messageOrSupplier) {
      log(common.logging.Level.INFO, messageOrSupplier);
   };
   
   this.logWarning = function logWarning(messageOrSupplier) {
      log(common.logging.Level.WARNING, messageOrSupplier);
   };
   
   this.logError = function logError(messageOrSupplier) {
      log(common.logging.Level.ERROR, messageOrSupplier);
   };
};



assertNamespace('common.logging');

/**
 * Logger provides methods to log messages with differen log levels. 
 * Each message accepts a message (String) or a supplier (a function returning a String).
 * Suppliers should get used when the propability is high that the message will not get 
 * logged and building the message costs a lot of time.
 */
common.logging.Logger = function Logger() {
   
   var createErrorFor = function createErrorFor(functionName) {
      return new Error('implementation of common.logging.Logger did not implement the method \"' + functionName + '\"');
   };
   
   this.setMinLogLevel = function setMinLogLevel(level) {
      throw createErrorFor('setMinLogLevel');
   };

   this.logDebug = function logDebug(messageOrSupplier) {
      throw createErrorFor('logDebug');
   };
   
   this.logInfo = function logInfo(messageOrSupplier) {
      throw createErrorFor('logInfo');
   };
   
   this.logWarning = function logWarning(messageOrSupplier) {
      throw createErrorFor('logWarning');
   };
   
   this.logError = function logError(messageOrSupplier) {
      throw createErrorFor('logError');
   };
};

assertNamespace('common.logging');

common.logging.Level = {
   DEBUG:   {value:1, description:'DEBUG'},
   INFO:    {value:2, description:'INFO'},
   WARNING: {value:3, description:'WARNING'},
   ERROR:   {value:4, description:'ERROR'},
   OFF:     {value:5, description:'OFF'}
};

var LoggingSystemImpl = function LoggingSystemImpl() {

   var loggers = [];

   this.logLevel = common.logging.Level.INFO;

   this.setMinLogLevel = function setMinLogLevel(level) {
      this.logLevel = level;
      loggers.forEach(logger => logger.setMinLogLevel(level));
   };

   this.createLogger = function createLogger(name) {
      var logger = new common.logging.ConsoleLogger(name, this.logLevel);
      loggers.push(logger);
      return logger;
   };
};

common.logging.LoggingSystem = new LoggingSystemImpl();

assertNamespace('common');

var fs = common.getVersion = function getVersion() {
    var result;
    try {
        var fileContent = fs.readFileSync('./package.json', 'utf8');
        var packageJson = JSON.parse(fileContent);
        result = packageJson.version;
    } catch(e) {
        result = e;
    }
    return result;
};

assertNamespace('octowatch');

octowatch.InfoTab = function InfoTab(bus, cssSelector) {
   var initialized = false;

   var initializeTab = function initializeTab(config) {
      if (initialized) {
         return;
      }

      initialized = true;

      var htmlContent = 'version = ' + config.version;

      $(cssSelector).html(htmlContent);
   };

   var onConfigReceived = function onConfigReceived(config) {
      if (config) {
         initializeTab(config);
      }
   };

   bus.subscribeToPublication(octowatch.client.topics.configuration, onConfigReceived);    
};

$( document ).ready(async function() {
   const bus               = new common.infrastructure.bus.Bus();
   const topicsToTransmit  = [octowatch.shared.topics.camera.setCurrentValueCommand];
   
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

assertNamespace('octowatch');

octowatch.StatusDiv = function StatusDiv(bus, cssSelector) {
    var initialized     = false;
    var configAvailable = false;

    var initializeTab = function initializeTab(config) {
        if (initialized) {
            return;
        }

        initialized = true;
        $(cssSelector).html('<p id="message" class="text-light"></p>');
    };

    var showStatusMessage = function showStatusMessage(message) {
        initializeTab();
        $(cssSelector + ' #message').text(message);
        $(cssSelector).removeClass('d-none');
    };

    var hideStatusMessage = function hideStatusMessage() {
        initializeTab();
        $(cssSelector + ' #message').text('');
        $(cssSelector).addClass('d-none');
    };

    var updateStatus = function updateStatus() {
        if (configAvailable) {
            hideStatusMessage();
        } else {
            showStatusMessage('Loading configuration ...');
        }
    };

    var onConfigReceived = function onConfigReceived(newConfig) {
        configAvailable = newConfig !== undefined;
        updateStatus();
    };

    bus.subscribeToPublication(octowatch.client.topics.configuration, onConfigReceived);    
};

assertNamespace('octowatch.client.topics.account');

//                PUBLICATIONS

/**
 * The server publishes on this topic the clients configuration.
 */
octowatch.client.topics.configuration = '/client/configuration';


assertNamespace('octowatch.shared.topics.camera');

//                PUBLICATIONS

octowatch.shared.topics.camera.capabilities = '/shared/camera/capabilities';

octowatch.shared.topics.camera.currentValues = '/shared/camera/currentValues';


//                COMMANDS

octowatch.shared.topics.camera.setCurrentValueCommand = '/shared/camera/setCurrentValueCommand';

common.logging.ConsoleLogger.prototype = new common.logging.Logger();