"use strict";

require('es6-shim');

var INDEX_NAME = "espg";
var TYPE_NAME = "espg_doc";
var FILLER_TOKEN = '_';


var prepareIndex = require('./src/prepareIndex');

var settings = {
    "settings": {
        "analysis": {
            "filter": {
                "english_stop": {
                    "type": "stop",
                    "stopwords": "_english_"
                },
                "english_stemmer": {
                    "type": "stemmer",
                    "language": "english"
                },
                "english_possessive_stemmer": {
                    "type": "stemmer",
                    "language": "possessive_english"
                },
                shingle_bi: {
                    type: "shingle",
                    min_shingle_size: 2,
                    max_shingle_size: 2,
                    output_unigrams: false,
                    filler_token: FILLER_TOKEN
                },
                shingle_more: {
                    type: "shingle",
                    min_shingle_size: 3,
                    max_shingle_size: 5,
                    output_unigrams: false,
                    filler_token: FILLER_TOKEN
                }
            },
            "analyzer": {
                "english_shingles_bi": {
                    "tokenizer": "standard",
                    "filter": [
                        "english_possessive_stemmer",
                        "lowercase",
                        "english_stop",
                        "english_stemmer",
                        "shingle_bi"
                      ]
                },
                "english_shingles_more": {
                    "tokenizer": "standard",
                    "filter": [
                        "english_possessive_stemmer",
                        "lowercase",
                        "english_stop", // don't remove stop words for 3-4-5-grams
                        "english_stemmer",
                        "shingle_more"
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
                    "fields": {
                        bi: {
                            type: 'string',
                            analyzer: "english_shingles_bi"
                        },
                        more: {
                            type: 'string',
                            analyzer: "english_shingles_more"
                        }
                    }
                }
            }
        }
    }
};


prepareIndex(INDEX_NAME, TYPE_NAME, settings)
    .then(function (client) {
        setTimeout(function tryAnalyze(){
            console.time('espg');
            
            return client.termvector({
                index: INDEX_NAME,
                type: TYPE_NAME,
                id: 'wikip-x-men.txt',
                fields: ['text.bi', 'text.more']
            }).then(function (resp) {
                console.log('resp', resp);
                var estermsbi = resp.term_vectors['text.bi'].terms;
                var estermsmore = resp.term_vectors['text.more'].terms;
                
                var biterms = Object.keys(estermsbi);
                var moreterms = Object.keys(estermsmore);
                
                var biTermsWithFreq = biterms
                    .filter(function(t){
                        return !t.includes(FILLER_TOKEN) && estermsbi[t].term_freq >= 2;
                    })
                    .map(function(t){
                        var freq = estermsbi[t].term_freq;

                        return {
                            word: t,
                            freq: freq
                        };
                    });
                var moreTermsWithFreq = moreterms
                    .filter(function(t){
                        return !t.includes(FILLER_TOKEN) && estermsmore[t].term_freq >= 2;
                    })
                    .map(function(t){
                        var freq = estermsmore[t].term_freq;

                        return {
                            word: t,
                            freq: freq
                        };
                    });
                
                var termsWithFreq = [].concat(biTermsWithFreq).concat(moreTermsWithFreq);

                termsWithFreq.sort(function(tf1, tf2){
                    return tf2.freq - tf1.freq;
                });
                // now they're sorted

                var importantTerms = termsWithFreq.slice(0, 30);


                console.log('termsWithFreq', JSON.stringify(importantTerms, null, 3));
                console.timeEnd('espg');

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