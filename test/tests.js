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
const rimraf = require('rimraf');
const parseXml = require('xml2js').parseString;

describe('Injector', function() {
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

	const defaultOptions = {
		annotationKey: 'injekt',
		provider: simpleProvider
	};

	beforeEach(() => {
		rimraf('./test_files/results', function (err) {
			if(err){
				console.log('Error deleting test files ', err);
			}
		});
	});

	it('xml', function() {
		const options = Object.create(defaultOptions); 
		options.inputFile = './test/test_files/simple.xml';
		options.outputFile = './test/test_files/processed.xml';

		injector(options)
			.then(outputFile => {
				var result = require('../test/test_files/processed.xml')
				parseXml(result, function (err, result) {
					if(err){
						return console.log('Not a valid xml', err);
					}
					testResult(result);
					done();
				});

			})
			.catch(err => done(err));
	});

    it('json', function(done) {
		const options = Object.create(defaultOptions); 
		options.inputFile = './test/test_files/simple.json';
		options.outputFile = './test/test_files/processed.json';

		injector(options)
			.then(outputFile => {
				testResult(require('../test/test_files/processed.json'));
				done();
			})
			.catch(err => done(err));
    });

	function testResult(result){
		assert.equal(simpleProvider.getValues().db.host, result.db.host);
		assert.equal(simpleProvider.getValues().db['user name'], result.db.username);
		assert.equal(simpleProvider.getValues().db.password, result.db.password);
		assert.equal(simpleProvider.getValues().logz.token, result.logger.token);
		
	}
});

describe('Utils', function() {
  it('getString', function() {
	  assert.equal(utils.getString('"some value"'), 'some value');
	  assert.equal(utils.getString("'some-value'"), 'some-value');
	  assert.equal(utils.getString("'d\"q'"), 'd"q');
	  assert.equal(utils.getString('"s\'q"'), "s'q");
  });
});