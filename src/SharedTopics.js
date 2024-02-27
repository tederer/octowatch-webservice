/* global octowatch, assertNamespace */

require('./common/NamespaceUtils.js');

assertNamespace('octowatch.shared.topics.camera');

//                PUBLICATIONS

octowatch.shared.topics.camera.capabilities = '/shared/camera/capabilities';

octowatch.shared.topics.camera.currentValues = '/shared/camera/currentValues';

octowatch.shared.topics.camera.monitoringData = '/shared/camera/monitoringData';


//                COMMANDS

octowatch.shared.topics.camera.setCurrentValueCommand = '/shared/camera/setCurrentValueCommand';
