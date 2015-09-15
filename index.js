"use strict";

require('es6-shim');

var INDEX_NAME = "espg";
var TYPE_NAME = "espg_doc";

var prepareIndex = require('./src/prepareIndex');

var settings = {
    "settings": {
        "analysis": {
            "filter": {
                "english_stop": {
                    "type": "stop",
                    "stopwords": "_english_"
                },
                "english_more_stem_stop": {
                    "type": "stop",
                    //"stopwords": []
                    "stopwords": ["web", "pattern", "book", "we"]
                },
                /*"english_keywords": {
                    "type": "keyword_marker",
                    "keywords": []
                },*/
                "english_stemmer": {
                    "type": "stemmer",
                    "language": "english"
                },
                "english_possessive_stemmer": {
                    "type": "stemmer",
                    "language": "possessive_english"
                }
            },
            "analyzer": {
                "english_more_stop": {
                    "tokenizer": "standard",
                    "filter": [
                        "english_possessive_stemmer",
                        "lowercase",
                        "english_stop",
                        //"english_keywords",
                        "english_stemmer",
                        "english_more_stem_stop" // after stemmer so it applies to stemmed items
                      ]
                }
            }
        }
    },

    "mappings": {
        "espg_doc": {
            properties: {
                "text": {
                    "type": "string",
                    "analyzer": "english_more_stop"
                }
            }
        }
    }
};


prepareIndex(INDEX_NAME, TYPE_NAME, settings)
    .then(function (client) {
        setTimeout(function tryAnalyze(){
            return client.termvector({
                index: INDEX_NAME,
                type: TYPE_NAME,
                id: 'web design.txt',
                fields: 'text'
            }).then(function (resp) {
                console.log('resp', resp);
                var esterms = resp.term_vectors.text.terms;
                
                var terms = Object.keys(esterms);
                var termsWithFreq = terms.map(function(t){
                    var freq = esterms[t].term_freq;

                    return {
                        word: t,
                        freq: freq
                    };
                });

                termsWithFreq.sort(function(tf1, tf2){
                    return tf2.freq - tf1.freq;
                });
                // now they're sorted

                var relevantTerms = termsWithFreq.slice(0, 20);


                console.log('termsWithFreq', JSON.stringify(relevantTerms, null, 3));


            }, function (err) {
                console.trace(err);
            });
        }, 1000)


    })
    .then(function () {
        console.log('all went well');
    })
    .catch(function (err) {
        console.log('es err', err, err.stack);
    })