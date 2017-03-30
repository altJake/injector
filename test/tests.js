/*

1. no @annotations in file
2. multiple @annotations from the same value
3. multiple @annotations from different values
4. same for js files with single-quotes
5. games with spaced-values-ids or fields

*/

const assert = require('assert');
const fs = require('fs');
const injector = require('../index.js');
const utils = require('../utils.js');

describe('Injector', function() {
  describe('simple test', function() {
		beforeEach(() => {
			try {
				fs.unlinkSync('./test_files/processed.json');
			}
			catch(error) { }
		});

    it('inject values from an inline provider', function(done) {
			const simpleProvider = {
				getValues: function(ids) {
					return {
						db: {
							host: 'sheker.dom.com',
							'user name': 'me',
							password: 'root'
						},
						logz: {
							token: 'blA45vYBR'
						}
					};
				}
			};
			const options = {
				annotationKey: 'injekt',
				provider: simpleProvider,
				inputFile: './test/test_files/simple.json',
				outputFile: './test/test_files/processed.json'
			};

			injector(options)
				.then(output => {
					const processed = require('./test_files/processed.json');
					assert.equal(simpleProvider.getValues().db.host, processed.db.host);
					assert.equal(simpleProvider.getValues().db['user name'], processed.db.username);
					assert.equal(simpleProvider.getValues().db.password, processed.db.password);
					assert.equal(simpleProvider.getValues().logz.token, processed.logger.token);
					done();
				})
				.catch(err => done(err));
    });
  });
});

describe('Utils', function() {
  it('getString', function() {
	  assert.equal(utils.getString('"some value"'), 'some value');
	  assert.equal(utils.getString("'some-value'"), 'some-value');
	  assert.equal(utils.getString("'d\"q'"), 'd"q');
	  assert.equal(utils.getString('"s\'q"'), "s'q");
  });
});