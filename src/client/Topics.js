/* global octowatch, assertNamespace */

require('./common/NamespaceUtils.js');

assertNamespace('octowatch.client.topics.account');

//                PUBLICATIONS

/**
 * The server publishes on this topic the clients configuration.
 */
octowatch.client.topics.configuration = '/client/configuration';
