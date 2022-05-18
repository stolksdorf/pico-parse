const picoparse = require('../');


module.exports = {
	meta : t=>{

		const [res] = picoparse([
			[/world/g, (_, meta)=>meta]
		], `hello world`);

		const meta = res[0];
		t.is(meta.pre, 'hello ');
		t.is(meta.index, 6);
		t.is(meta.match, 'world');
		t.is(meta.tokens.length, 1);

	},


	last_index : t=>{

		const counters = [0,0];
		const res = picoparse([
			[/hey/g, ()=>{
				counters[0]++;
			}],
			[/hello/g, ()=>{
				counters[1]++;
			}],
		], `hey hey hey`);

		t.is(counters[0], 3);
		t.is(counters[1], 0);
	},


}