/* global octowatch, assertNamespace */

const net = require('node:net'); 

assertNamespace('octowatch');

octowatch.CameraRemoteControl = function CameraRemoteControl(bus, host, port) {
   var socket;
   
   var onError = function onError(error) {
      console.log(error);
   };
   
   var onConnectionLost = function onConnectionLost() {
      console.log('connection lost');
   };
   
   var onConnected = function onConnected() {
      console.log('connection established');
   };
   
   var onData = function onData(data) {
      console.log('IN: ' + data);
   };
   
   this.start = function start() {
      console.log('connecting to ' + host + ':' + port);
      socket = net.connect(port, host);
      socket.on('error',   onError);
      socket.on('end',     onConnectionLost);
      socket.on('connect', onConnected);
      socket.on('data',    onData);
   };
};