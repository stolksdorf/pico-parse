let test = require('pico-check');

const {engine } = require('../pico-parse.js');

test = test.only();


const parseCss = (css)=>{
	const tokens = engine({
		comments : [/\/\*/, /\*\//, ()=>false],
		rule : [/(\w+)\s*:\s*(.+);/, ([key, val])=>{
			return {key, val};
		}],
		selector : [
			/(\w+)\s*{/,
			/}/,
			([key], val)=>{
				return {key, val};
			}
		],
	})(css);

	const parse = (list)=>{
		let res = {}
		list.filter(x=>x).map(({key, val})=>{
			res[key] = Array.isArray(val) ? parse(val) : val;
		})
		return res;
	}
	return parse(tokens)
}




test('basic', (t)=>{
	const res = parseCss(`
		body{
			color : red;
			margin-right : 5px;
		}
	`)

	t.type(res.body, 'object');

	t.is(res.body.color, 'red');
	t.is(res.body.right, '5px');
})


module.exports = test;