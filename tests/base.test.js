const test = require('pico-check')

const { engine, parse, rules } = require('../pico-parse.js');


test('basic matching', (t)=>{
	const res = parse([
		{
			regex : /aa/,
			resolve : ()=>'woo'
		},
		{
			regex : /bb(.)b/,
			resolve : ([letter])=>'foo' + letter
		},
	], `g bbtb aa aa   goo bbdb`);


	t.is(res, ['foot', 'woo', 'woo', 'food'])

});

test('nested matching', (t)=>{
	const res = parse([
		{
			regex : /\[(\w+)/,
			end : /(\w+)\]/,
			resolve : ([start], contents, [end])=>{
				return {
					start, end, contents
				}
			}
		},
		{
			regex : /(\w+)/,
			resolve : ([word])=>word
		},
	], `okay [lets go foo [nest wooo end] bar go]`);

	t.is(res, [
		"okay",
		{
			"start": "lets",
			"end": "go",
			"contents": [
				"go",
				"foo",
				{
					"start": "nest",
					"end": "end",
					"contents": [
						"wooo"
					]
				},
				"bar"
			]
		}
	])

})





test.group('rules parsing', (test)=>{
	test.skip('base object', (t)=>{
		const rules = parseRules({
			string : {
				rule : ''
			}
		})


	})
	test('array only', (t)=>{
		const rules = parseRules([
			{rule : 'a.a'},
			{rule : /foo*/},
			{rule : true},
			{rule : [/bb/, /\w/]},
		]);

		console.log(rules);
	})
})






module.exports = test;