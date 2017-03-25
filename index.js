const util = require('util');
const fs = require('fs');
const Q = require('q');
const utils = require('./utils.js');

const EOL = require('os').EOL;
const annotationRegexTemplate = '@%s\\((.*)\\)';

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

function prepareOptions(options){
    return Q.promise((resolve) => {
        options.regex =
        new RegExp(util.format(annotationRegexTemplate, options.annotationKey),
                    options.regexFlags || 'ig');

        options.lineDelimiter = options.lineDelimiter || EOL;
        return resolve(options);
    });
}

function readInputFile(options){
    return Q.promise((resolve, reject) => {
        fs.readFile(options.inputFile, (error, data)=>{
            if(error)
                return reject(utils.extendError(error, 'Error reading output file'));

            options.fileContents = data.toString().split(options.lineDelimiter);
            return resolve(options);
        });
    });
}

function extractAnnotations(options) {
    return Q.promise((resolve) => {
        options.changes =
            options.fileContents
                .map((line, index) => {
                    const re = new RegExp(options.regex);
                    const results = re.exec(line);

                    if (results)
                        return {index: index, injectionProperties: results[1]};
                })
                .filter(change => !!change);

        return resolve(options);
    });
}

function processInjections(options) {
    return Q.promise((resolve, reject) => {
        const processedChanges = [];
        options.changes.forEach(change => {
            var injectionPropertiesSplitted = change.injectionProperties.split(',');
            if (injectionPropertiesSplitted.length !== 2){
                return reject(new Error('Unvalid format at line ' + change.index + '.' ))
            }

            injectionPropertiesSplitted = injectionPropertiesSplitted.map(value=> value.trim());

            var valueId = utils.getString(injectionPropertiesSplitted[0]);
            var valueField = utils.getString(injectionPropertiesSplitted[1]);

            change.injectionProperties = {
                id: valueId,
                field: valueField
            };

            processedChanges.push(change);
        });

        options.changes = processedChanges;

        return resolve(options);
    });
}

function retrieveValuesFromProvider(options) {
    var valuesIds = Array.from(new Set(options.changes.map(change => change.injectionProperties.id)));

    return Q(options.provider.getValues(valuesIds))
        .then(values => {
            valuesIds.forEach(valueId => {
                options.changes
                    .filter(change => change.injectionProperties.id === valueId)
                    .forEach(change => change.injectionProperties.value = values[valueId][change.injectionProperties.field]);
            });

            return options;
        });
}

function replaceAnnotations(options) {
    return Q.promise((resolve) => {
        options.changes.forEach(change => {
                options.fileContents[change.index] =
                    options.fileContents[change.index].replace(options.regex, change.injectionProperties.value);
            });

        return resolve(options);
    });
}

function writeOutputFile(options) {
    return Q.promise((resolve, reject) => {
        const fileContents = options.fileContents.join(options.lineDelimiter);
        const outputFile = options.outputFile || options.inputFile;

        fs.writeFile(outputFile, fileContents, (error)=>{
            if(error)
                return reject(utils.extendError(error, 'Error writing output file'));
            return resolve(outputFile);
        });
    });
}

function injectMe(options) {
    //keep original options object intact
    options = Object.create(options);
    return validateOptions(options)
        .then(prepareOptions)
        .then(readInputFile)
        .then(extractAnnotations)
        .then(processInjections)
        .then(retrieveValuesFromProvider)
        .then(replaceAnnotations)
        .then(writeOutputFile);
}

module.exports = injectMe;
