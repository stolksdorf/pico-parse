let test = require('pico-check')

const parse = require('../picoparse.js');


//test = test.skip();

const parseProps = engine({
	doubleQuotes : [/([a-zA-Z0-9_]+)="([^"]+)"/, ([name, val])=>{

		return [name, val]
	}],
	singleQuotes : [/([a-zA-Z0-9_]+)='([^']+)'/, ([name, val])=>{
		return [name, val]
	}],
	noQuotes : [/([a-zA-Z0-9_]+)=([a-zA-Z0-9_]+)/, ([name, val])=>{
		return [name, val]
	}],
	simpleProp : [/([a-zA-Z0-9_]+)/, ([name])=>{
		return [name, true]
	}]
});

const closeTag = /<\/([a-zA-Z0-9_]+)>/


const parseXML = engine({
	selfClosingTag : [/<([a-zA-Z0-9_]+) ([^>]*)\/>/, ([tagName, props])=>{
		return {
			tag: tagName,
			props : parseProps(props),
		}
	}],
	openTag: [/<([a-zA-Z0-9_]+)>/, closeTag, ([tagName], ctx, [closeTag])=>{
		return {
			tag: tagName,
			close : closeTag,
			props : {},
			nodes : ctx
		}
	}],
	openTagWithProps: [/<([a-zA-Z0-9_]+) ([^>]*)>/, closeTag, ([tagName, props], ctx, [closeTag])=>{
		return {
			tag: tagName,
			close : closeTag,
			props : parseProps(props),
			nodes : ctx
		}
	}],
	default : (text)=>{
		console.log('TEXT', text, '|||');
		return text
	}
})


const temp3 = `<div class='yo hey there' hidden><a href='yo'>yo</a><h1>hello</h1></div><h1 />`




test('base xml parse', (t)=>{
	console.log('yo');
	const res = parseXML(temp3)

	console.log('---------');

	console.log(res);



	t.pass();
})


module.exports = test;