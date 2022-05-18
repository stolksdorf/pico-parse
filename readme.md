# 📑 pico-parse

> An incredibly simple parser using regex-based rules


`pico-parse` is a small utility for writing a general purpose lexer/parser using regular expressions.


Inspired by [NearleyJS](https://nearley.js.org/) and [Backus–Naur Form Parsers](https://gist.github.com/caudamus/1294f197cbb3fc16c1a82e7e2f1d0ec4)


I've found writing parsers and lexers to be quite a difficult process with a steep learning curve. "Serious" parsers also tend to be rather strict, needing all edge cases defined or they won't run. And in the end the parser you create is usually quite hard to follow and even harder to update or change without doing a complete overhaul.

While these attributes are needed for serious language parsers, sometimes you want to parse something simple and small, like [CSS Selectors](https://www.w3schools.com/cssref/css_selectors.asp), or maybe a lightweight data markup language. Maybe you want your parser to be a bit more loosey-goose, a bit more error tolerant, and easy to create and keep updated. If so `pico-parse` might be for you!



- [Tutorial.md](/tutorial.md) is a walk-through where we create a parser together
- [Annotated Source](/picoparse.annotated.js) for heavily commented source code to understand what's happening under the hood.




### How to use


### `picoparse(rules, text) -> [tokenArray, leftoverText]`

`picparse` takes an array of "rules" and text to parse. It returns an array where the first parameter is an array of all tokens produced by the rules, and the second parameter is any leftover text that was not matched.

A rule is a two item array where the first item is a regular expression, and the second is a function that is executed on the regex match, which returns token(s). The function is given the capture groups from the regex match, as well as some useful data as a second parameter.

Example of a rule:

```js
[/(\w+):(\w+)/g, (captureGroups, { match, index, pre, tokens})=>{
	// captureGroups -> An array of all capture groups in the regex

	// match -> Full string match of the regex, eg. 'test:foo'
	// index -> The character index in the 'text' where this match occured, eg. 45
	// pre -> Any unmatched text since the last match to this match
	// tokens -> Array of all tokens produced so far

	// Returns a token
	return { key: captureGroups[0], value: captureGroups[1] };
}]
```

Rule functions can return multiple tokens as an array, `picoparse` will flatten these into the `tokens` array. Rule functions can also return nothing or `undefined` and `picoparse` will filter these out.




### Example
This is a _very_ crude CSS parser, only for demo purposes (please don't use!).

```js
const picoparse = require('./picoparse.js');

const cssToObj = (cssString)=>{
	const [tokens, leftoverText] = picoparse([
		[/(\w+)\s*:\s*(.+);/g, ([rule, value])=>{
			return {rule, value};
		}],
		[/(\w+)\s*{/g, ([selector])=>{
			return {selector};
		}],
		[/}/g, ()=>{
			return {close:true};
		}]
	], cssString);

	let result = {};
	let currentSelector;
	while(!tokens.done){
		const token = tokens.next();

		if(token.selector){
			currentSelector = token.selector;
			result[currentSelector] = result[currentSelector] || {};
		}else if(token.rule){
			if(!currentSelector){
				throw `'${token.rule}: ${token.value}' not within a selector`;
			}
			result[currentSelector][token.rule] = token.value;
		}else if(token.close){
			currentSelector = false;
		}
	}
	return result;
}
```



### How it works

1. Provide a list of rules; each a pair of a regular expression and a token generating function from the regex match
1. `pico-parse` iterates of the text, executing each regex on the text, and runs the function associated with the earliest matching regex. This function produces token(s) which are added to a list
1. This process repeats until no rule matches, or it runs out of input text.
1. It then returns the array of all the collected tokens, as well as any leftover, unmatched text.

Full more details you can review the [fully annotated source code here](/picoparse.annotated.js).


