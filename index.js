"use strict";

require('es6-shim');

var INDEX_NAME = "espg";
var TYPE_NAME = "espg_doc";

var clientP = require('./src/prepareIndex');


clientP
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