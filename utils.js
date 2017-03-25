function extendError(error, message){
    error.message = message + ': ' + error.message;
    return error;
}

const stringRegex = /^["].*["]$|^['].*[']$/;
const doubleQuote = new RegExp('\\"', 'g');

function getString(wrappedString){
    if(wrappedString && wrappedString.length >= 2 && stringRegex.exec(wrappedString)){
        var strToParse = wrappedString;

        if(strToParse[0] !== '"'){ //JSON.parse supports only double-quote
            var char = strToParse[0];
            var regexChar = new RegExp('\\'+char, 'g');
            strToParse = strToParse.substring(1, strToParse.length-1);
            strToParse = strToParse.replace(regexChar, char);
            strToParse = '"' +strToParse.replace(doubleQuote, '\\"') + '"';
        }
        
        try{
            return JSON.parse(strToParse);
        } catch(error){
            //ignored
        }
    }
    throw new Error('Error parsing: "' + wrappedString + '".');
}

module.exports = {
    extendError: extendError,
    getString: getString
};