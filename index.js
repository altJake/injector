const util = require('util');
const fs = require('fs');
const Q = require('q');

const EOL = require('os').EOL;
const annotationRegexTemplate = '@%s\\((.*)\\)';

function ensureOptions(options) {
    return Q.promise((resolve, reject) => {
        if (!options.annotationKey)
            reject('no "annotationKey" option supplied');
        if (!options.inputFile)
            reject('no "inputFile" option supplied');
        if (!options.provider)
            reject('no "provider" option supplied');
        if (typeof options.provider.getValues !== 'function')
            reject('the supplied provider does not contain a "getValues" function');
        if (!fs.existsSync(options.inputFile))
            reject('the input file does not exist');

        options.regex =
            new RegExp(util.format(annotationRegexTemplate, options.annotationKey),
                       options.regexFlags || 'ig');

        return resolve(options);
    });
}

function extractAnnotations(options) {
    return Q.promise((resolve) => {
        options.fileContents = fs.readFileSync(options.inputFile).toString().split(EOL);
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
    return Q.promise((resolve) => {
        const processedChanges = [];
        options.changes.forEach(change => {
            var injectionPropertiesSplitted = change.injectionProperties.split(',');
            if (injectionPropertiesSplitted.length !== 2)
                return;

            var valueId = injectionPropertiesSplitted[0].trim();
            if (valueId[0] === '\'' || valueId[0] === '"')
                valueId = valueId.slice(1);
            if (valueId[valueId.length - 1] === '\'' || valueId[valueId.length - 1] === '"')
                valueId = valueId.slice(0, -1);

            var valueField = injectionPropertiesSplitted[1].trim();
            if (valueField[0] === '\'' || valueField[0] === '"')
                valueField = valueField.slice(1);
            if (valueField[valueField.length - 1] === '\'' || valueField[valueField.length - 1] === '"')
                valueField = valueField.slice(0, -1);

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

function writeOutput(options) {
    return Q.promise((resolve) => {
        const fileContents = options.fileContents.join(EOL);
        const output = options.outputFile || options.inputFile;

        fs.writeFile(output, fileContents, err => {
            if (err) reject(err);

            return resolve(output);
        });
    });
}

function injectMe(options) {
    return Q(options)
        .then(ensureOptions)
        .then(extractAnnotations)
        .then(processInjections)
        .then(retrieveValuesFromProvider)
        .then(replaceAnnotations)
        .then(writeOutput);
}

module.exports = (options) => injectMe(options);
