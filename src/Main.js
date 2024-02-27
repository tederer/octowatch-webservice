/* global common, process, octowatch */

require('./common/infrastructure/bus/Bus.js');
require('./common/infrastructure/busbridge/ServerSocketIoBusBridge.js');
require('./common/logging/LoggingSystem.js');
require('./common/Version.js');
require('./CameraMonitoring.js');
require('./CameraRemoteControl.js');
require('./SharedTopics.js');

const express           = require('express');
          
const DEFAULT_PORT      = 8081;
                   
const LOGGER            = common.logging.LoggingSystem.createLogger('Main');
const VERSION           = common.getVersion();
                   
var port                = process.env.WEBSERVER_PORT   ?? DEFAULT_PORT;
const bus               = new common.infrastructure.bus.Bus();
    
LOGGER.logInfo('version:        ' + VERSION);
LOGGER.logInfo('webserver port: ' + port);

const app = express();

app.use((req, res, next) => {
   LOGGER.logDebug(req.method + ' ' + req.originalUrl);
   //res.append('Access-Control-Allow-Origin', '*');
   next();
});

app.get('/info', (req, res) => {
   res.json({version: VERSION});
});

app.get('/configuration', (req, res) => {
   res.json({version: VERSION});
});

app.use('/', express.static('webroot'));

var httpServer = app.listen(port, () => {
   LOGGER.logInfo(`Listening on port ${port}.`);
});

const topicsToTransmit  = [octowatch.shared.topics.camera.capabilities, 
                           octowatch.shared.topics.camera.currentValues,
                           octowatch.shared.topics.camera.monitoringData];
                           
const { Server }        = require('socket.io');
const io                = new Server(httpServer);
new common.infrastructure.busbridge.ServerSocketIoBusBridge(bus, topicsToTransmit, io);

var cameraRemoteControl = new octowatch.CameraRemoteControl(bus, '192.168.0.105', 8889);
cameraRemoteControl.start();

new octowatch.CameraMonitoring(bus);
