"use strict";

var fs = require('fs');
var join = require('path').join;

var promisify = require('es6-promisify');

var elasticsearch = require('elasticsearch');



var client = new elasticsearch.Client({
    host: 'elasticsearch:9200',
    log: 'error',
    apiVersion: '1.7'
});





function connect() {
    return new Promise(function (resolve) {
        (function tryConnect() {
            client.ping({
                requestTimeout: 2000
            }, function (err) {
                if (err) {
                    //console.log(err);
                    tryConnect();
                } else {
                    resolve(client);
                }
            });
        })();
    });
};

function deleteIndex(client, name) {
    return new Promise(function (resolve, reject) {
        client.indices.delete({
            index: name
        }, function (err, res) {
            if (err) {
                if (err.status === '404') // index does not exist. Whatev's, just means another one can be created with this name
                    resolve()
                else
                    reject(err);
            } else
                resolve(res);
        })
    })
}


function createIndex(client, name, mapping) {
    return new Promise(function (resolve, reject) {
        client.indices.create({
            index: name,
            body: mapping
        }, function (err, res) {
            if (err) {
                reject(err);
            } else resolve(res);
        })
    });
}

function indexDocument(client, indexName, typeName, id, data) {
    return new Promise(function (resolve, reject) {
        client.index({
            index: indexName,
            type: typeName,
            id: id,
            body: data
        }, function (error, res) {
            if (error) reject(error);
            else {
                resolve(res);
            }
        });
    })
}

function getAllTexts() {
    return new Promise(function (resolve, reject) {
        fs.readdir(join(__dirname, '..', 'documents'), function (err, files) {
            if (err) return reject(err);

            console.log('files', files);

            Promise.all(files.map(function (f) {
                    return new Promise(function (res, rej) {
                        fs.readFile(join(__dirname, '..', 'documents', f), function (err, buf) {
                            if (err) return rej(err);
                            res({
                                name: f,
                                text: buf.toString()
                            })
                        });
                    })
                }))
                .then(resolve)
                .catch(reject);

        })
    })
}

function loadAllDocuments(client, indexName, typeName) {
    return getAllTexts()
        .then(function (docs) {
            return Promise.all(docs.map(function (d) {
                return indexDocument(client, indexName, typeName, d.name, {
                    text: d.text
                })
            }))
        })
}

function refreshIndex(client, name) {
    return new Promise(function (resolve, reject) {
        client.indices.refresh({
            index: name
        }, function (err, res) {
            if (err) {
                reject(err);
            } else
                resolve(res);
        })
    })

}

var U = undefined;

module.exports = function(indexName, docType, settings){
    
    return connect().then(function (client) {
        console.log('Connected to ES');
        return deleteIndex(client, indexName)
            .then(createIndex.bind(U, client, indexName, settings))
            .then(loadAllDocuments.bind(U, client, indexName, docType))
            .then(refreshIndex.bind(U, client, indexName))
            .then(function () {
                return client;
            })
    })
}