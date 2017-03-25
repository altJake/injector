function extendError(error, message){
    error.message = message + ': ' + error.message;
    return error;
}

const stringRegex = /["].+["]$|^['].+[']$/;

function getString(wrappedString){
    if(stringRegex.test(wrappedString)){
        try{
            return JSON.parse(wrappedString);        
        } catch(error){}
    }
    throw new Error('Error parsing string: "' + wrappedString + '".');
}

module.exports = {
    extendError: extendError,
    getString: getString
};