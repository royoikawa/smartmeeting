//var SolrNode = require('solr-node');
var solr = require('solr-client');

// Create client
var client = solr.createClient({
    host: '127.0.0.1',
    port: '8983',
    core: 'new_core',
    protocol: 'http'
});

// var client = new SolrNode({
//     host: '127.0.0.1',
//     port: '8983',
//     core: 'new_core',
//     protocol: 'http'
// });

module.exports = client;