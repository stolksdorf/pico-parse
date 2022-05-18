let test = require('pico-check')

const { engine, parse, parseRules } = require('../pico-parse.js');

test('simple rules', (t)=>{
	const rules = parseRules({
		a : [/aa/, ()=>'a'],
		b : [/bb/, ()=>'b']
	});

	t.is(rules[0].id, 'a');
	t.is(rules[0].regex, /aa/);
	t.type(rules[0].resolve, 'function');

	t.is(rules[1].id, 'b');
	t.is(rules[1].regex, /bb/);
	t.type(rules[1].resolve, 'function');
});

test('default rule', (t)=>{
	const rules = parseRules({
		default : ()=>'foo'
	});

	t.is(rules[0].id, 'default');
	t.is(rules[0].regex, /(.*)/);
	t.is(rules[0].exit, true);
	t.type(rules[0].resolve, 'function');
});


test('nested rules', (t)=>{
	const rules = parseRules({
		a : [/aa/, ()=>'a'],
		b : [/bb/, ()=>'b'],
		container : [
			/(.+){/,
			/}/,
			([name], contents)=>[name, contents]
		]
	});

	t.is(rules[0].id, 'a');
	t.is(rules[0].regex, /aa/);
	t.type(rules[0].resolve, 'function');

	t.is(rules[1].id, 'b');
	t.is(rules[1].regex, /bb/);
	t.type(rules[1].resolve, 'function');

	t.is(rules[2].id, 'container');
	t.is(rules[2].regex, /(.+){/);
	t.is(rules[2].end, /}/);
	t.type(rules[2].resolve, 'function');
});


module.exports = test;