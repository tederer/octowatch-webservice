/* global octowatch, common, assertNamespace */

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