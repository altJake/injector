const util = require('util');
const fs = require('fs');
const Q = require('q');
const utils = require('./utils.js');

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
                    options.regexFlags || 'g');

        return resolve(options);
    });
}

function readInputFile(options){
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
        var changes = [];
        options.regex = new RegExp(options.regex);
        var results = options.regex.exec(options.fileContents);

        while (results != null) {
          changes.push(results[1]);
          results = options.regex.exec(options.fileContents)
        }

        options.changes = changes;

        return resolve(options);
    });
}

function processInjections(options) {
    return Q.promise((resolve, reject) => {
        const processedChanges = [];
        options.changes.forEach(change => {
          var injectionProperties = change.split(',');
            if (injectionProperties.length !== 2){
                return reject(new Error('Invalid format at line ' + change + '.' ))
            }

            injectionProperties = injectionProperties.map(value=> value.trim());

            var valueId = utils.getString(injectionProperties[0]);
            var valueField = utils.getString(injectionProperties[1]);

            processedChanges.push({
                id: valueId,
                field: valueField
            });
        });

        options.changes = processedChanges;

        return resolve(options);
    });
}

function retrieveValuesFromProvider(options) {
    var valuesIds = Array.from(new Set(options.changes.map(change => change.id)));

    return Q(options.provider.getValues(valuesIds))
        .then(values => {
            valuesIds.forEach(valueId => {
                options.changes
                    .filter(change => change.id === valueId)
                    .forEach(change => change.value = values[valueId][change.field]);
            });

            return options;
        });
}

function replaceAnnotations(options) {
    return Q.promise((resolve) => {
      options.regex = new RegExp(options.regex);
      var results = options.regex.exec(options.fileContents);

      while (results != null) {
        // TODO insert right injection for each change
        options.fileContents = options.fileContents.replace(results[0], options.changes[0].value);
        results = options.regex.exec(options.fileContents);
      }

        return resolve(options);
    });
}

function writeOutputFile(options) {
    return Q.promise((resolve, reject) => {
        const outputFile = options.outputFile || options.inputFile;

        fs.writeFile(outputFile, options.fileContents, (error) => {
            if(error)
                return reject(utils.extendError(error, 'Error writing output file'));
            return resolve(outputFile);
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
        .then(replaceAnnotations)
        .then(writeOutputFile);
}

module.exports = inject;
