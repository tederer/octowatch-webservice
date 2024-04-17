/* global octowatch, common, assertNamespace, setTimeout */

const childprocess = require('node:child_process');

require('./common/logging/LoggingSystem.js');

assertNamespace('octowatch');

octowatch.InfraredLight = function InfraredLight(initialLightLevel) {
   var LOGGER         = common.logging.LoggingSystem.createLogger('InfraredLight');
   var thisInstance   = this;
   var lightLevel     = initialLightLevel;
   var pythonProcess;
   var startPythonProcess; // declaring it here to satisfy linter
   
   this.setLevel = function setLevel(levelInPercent) {
      lightLevel = levelInPercent;
      if (pythonProcess !== undefined) {
         pythonProcess.stdin.write(levelInPercent + '\n');
      } else {
         LOGGER.logDebug('ignoring request to set level to ' + levelInPercent + ' because python process is not alive');
      }
   };
   
   var restartPythonProcess = function restartPythonProcess() {
      setTimeout(() => {
         LOGGER.logInfo('trying to restart python process in 1000 ms');
         startPythonProcess();
      }, 1000);
   };   
   
   startPythonProcess = function startPythonProcess() {
      pythonProcess = childprocess.exec('sudo ./setIrLightLevel', (error, stdout, stderr) => {
         if (error) {
            LOGGER.logError('failed to start python code: ' + error);
            LOGGER.logError('stderr: ' + stderr);
         }
      });
      
      pythonProcess.on('spawn', () => {
         LOGGER.logInfo('python process spawned successfully');
         thisInstance.setLevel(lightLevel);  
      });
      
      pythonProcess.on('close', code => {
         LOGGER.logInfo('python process closed with exit code ' + code);
         restartPythonProcess();      
      });
      
      pythonProcess.on('exit', code => {
         LOGGER.logInfo('python process exited with exit code ' + code);
         restartPythonProcess();      
      });
      
      pythonProcess.on('error', error => {
         LOGGER.logError('error in python process: ' + error);
         restartPythonProcess();      
      });
   };
   
   startPythonProcess();
};