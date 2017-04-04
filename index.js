const util = require('util');
const fs = require('fs');
const Q = require('q');
const utils = require('./utils.js');

const annotationRegexTemplate = '(@%s\\([^(^)]*\\))';

function validateOptions(options) {
    return Q.promise((resolve, reject) => {
        if (!options.annotationKey)
            return reject(new Error('Option "annotationKey" is required'));
        if (!options.inputFile)
            return reject(new Error('Option "inputFile" is required'));
        if (!options.provider)
            return reject(new Error('Option "provider" is required'));
        if (typeof options.provider.getValues !== 'function')
            return reject(new Error('Supplied provider does not contain a "getValues" function'));

        return resolve(options);
    });
}

function prepareOptions(options) {
    return Q.promise((resolve) => {
        options.regex =
        new RegExp(util.format(annotationRegexTemplate, options.annotationKey),
                    options.regexFlags || 'g');

        options.outputFile = options.outputFile || options.inputFile;

        return resolve(options);
    });
}

function readInputFile(options) {
    return Q.promise((resolve, reject) => {
        fs.readFile(options.inputFile, (error, data)=>{
            if(error)
                return reject(utils.extendError(error, 'Error reading output file'));

            options.fileContents = data.toString();
            return resolve(options);
        });
    });
}

function extractAnnotations(options) {
    return Q.promise((resolve) => {

        var splitted = options.fileContents.split(options.regex);
        options.changes = [];

        for (var i = 0; i < splitted.length; i++) {

            if(options.regex.test(splitted[i])){
                options.changes.push({
                    token: extractToken(splitted[i], options.annotationKey),
                    index: i,
                    replace: function(value){
                        splitted[this.index] = value;
                    }
                });
            }
        }

        options.buildString = function(){
            return splitted.join('');
        };

        return resolve(options);
    });
}

/**
 * Remove the annotation
 * @param {String} str - string in this format: "@annotationKey(<Key>, <Property>)"
 * @param {String} annotationKey
 * @return {String} a string stripped from the annotation format
 */
function extractToken(str, annotationKey) {
    return str.substring(annotationKey.length+2).slice(0, -1);
}

function processInjections(options) {
    return Q.promise((resolve, reject) => {

        options.changes.forEach(change => {
          var injectionProperties = change.token.split(',');
            if (injectionProperties.length !== 2) {
                return reject(new Error('Invalid format at "' + chang.token + '".' ));
            }

            injectionProperties = injectionProperties.map(value => value.trim());

            change.id = utils.getString(injectionProperties[0]);
            change.field = utils.getString(injectionProperties[1]);
        });

        return resolve(options);
    });
}

function retrieveValuesFromProvider(options) {
    return Q.promise(resolve => {
        var context = {
            valuesIds: Array.from(new Set(options.changes.map(change => change.id)))
        };

        context.values = options.provider.getValues(context.valuesIds);

        return resolve(context);
    })
    .then(context  => {
        context.valuesIds.forEach(valueId => {
            options.changes
                .filter(change => change.id === valueId)
                .forEach(change => change.replace(context.values[valueId][change.field]));
        });

        return options;
    });
}

function createOutputFileContents(options) {
    return Q.promise((resolve) => {
        options.fileContents = options.buildString();
        return resolve(options);
    });
}

function writeOutputFile(options) {
    return Q.promise((resolve, reject) => {
        fs.writeFile(options.outputFile, options.fileContents, (error) => {
            if(error)
                return reject(utils.extendError(error, 'Error writing output file'));
            return resolve(options.outputFile);
        });
    });
}

function inject(options) {
    //keep original options object intact
    options = Object.create(options);
    return validateOptions(options)
        .then(prepareOptions)
        .then(readInputFile)
        .then(extractAnnotations)
        .then(processInjections)
        .then(retrieveValuesFromProvider)
        .then(createOutputFileContents)
        .then(writeOutputFile);
}

module.exports = inject;
