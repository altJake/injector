function extendError(error, message){
    error.message = message + ': ' + error.message;
    return error;
}

module.exports = {
    extendError: extendError
};