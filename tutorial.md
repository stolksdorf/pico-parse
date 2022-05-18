# `pico-parse` Tutorial

> Before diving in, make sure you've read the `readme.md` and understand how `picoparse` generally works. Also you can read the annotated source to really understand whats going on under the hood.


In this tutorial we will be writing a parsing for our own [YAML-esque](https://www.wikiwand.com/en/YAML) data mark-up language. We'll call it `trnp`, because turnips are like yams, right?


Our toy [DSL](https://www.wikiwand.com/en/Domain-specific_language) will have the following properties:
- Indentation matters, and we'll handle both tabs and spaces
- Supports numbers and strings
- Numbers can be negative, decimal, and have optional underscores in them, eg. `-45_000.23`
- Strings can be multiline as long as they have the same indentation
- Lists (arrays) will use markdown-style notation, `-`
- Dictionaries (objects) will use JSON-style notation, `key : value`
- Support Javascript-style comments, `/* Comment */` and `// Comment`


**Example trnp text**
```
game_date : 2022-05-17 // Tuesday
notes: This is an
       interesting game!

players:
	- name   : Scott
	  points : -12_000
	  team : blue

	- name   : Alice
	  points : 3_200.5
	  team: red

/* Bob was going to play, but backed out
	- name : Bob
	  points : 0
	  team: yellow
*/
```

We want it to produce this JSON data

```json
{
	"game_date" : "2022-05-17",
	"notes": "This is an interesting game!",
	"players": [
		{
			"name" : "Scott",
			"points" : -12000,
			"team" : "blue"
		},
		{
			"name"   : "Alice",
			"points" : 3200.5,
			"team": "red"
		}
	]
}
```

Feel free to jump to the bottom if you want to see the final code for more context while going through this tutorial. Don't worry, we'll go step by step.


### General Parser structure

Our general structure starts with a function that takes our input text and outputs our result. In the function we need to write 5 steps:

1. Do any pre-processing of the text
1. Set up any shared context between rules
1. Get a list of tokens using `picoparse` and our rules
1. Iterate over each token and update a result
1. Do any last processing on the result

```js
const trnp = (text)=>{
	// 1. pre-process text

	// 2. Setup any shared variables between rules

	const [tokens, leftover] = picoparse([
		// 3. Our rules go here
	], text);

	// 4. Handle each token

	// 5. post-process result

	return result;
};
```

For each of the following steps we are going to update this code snippet above and also see what happens to the input string. We're going to tackle this in 5 steps:

1. Numbers and Strings
1. Lists and Dictionaries
1. Indentation
1. Token Parser
1. Comments



### 1. Strings and Numbers

Our first step is to write rules to grab out our strings and numbers. The regex for any string is easy, `/(.+)/g`.

Numbers are a bit trickier, `/(-?[\d|_]+(\.[\d|_]+)?)/g`.
- `-?` optional negative sign
- `[\d|_]+` 1 or more digits or underscores
- `(\.[\d|_]+)?` an optional decimal group that starts with a `.` then is followed by 1 or more of digits or underscores


```js
const trnp = (text)=>{
	const [tokens, leftover] = picoparse([
		[/(-?[\d|_]+(\.[\d|_]+)?)/g, ([num])=>{
			return { val: Number(num.replaceAll('_','')) };
		}],
		[/(.+)/g, ([str])=>{
			return { val: str };
		}],
	], text);

	// For now we'll just return the raw tokens
	result = tokens;
	return result;
};
```
And running this on our sample text...

```js
[
  { val: 'game_date : 2022-05-17 // Tuesday' },
  { val: 'notes: This is an' },
  { val: '       interesting game!' },
  { val: 'players:' },
  { val: '\t- name   : Scott' },
  { val: '\t  points : -12_000' },
  ...
]
```

Not too exciting yet. Since `picoparse`s rules are greedy our string rule keeps matching before our number rule, but that will change as soon as we add more logic.

If we pass a number input to our parser we can see that we'll get out the right token

```js
trnp('-34_000.5') // -> [ { val: -34000.5 } ]
```



### 2. Lists and Dictionaries

Lets now handle lists and dictionaries.

For lists we want them to start with exactly `- `, we're adding a space in there to make sure we don't accidentally match with negative numbers.

For dictionaries we only want keys that have alphanumeric and underscore characters, and from the above example we don't care about the amount of whitespace between the key and the `:`

Remember that `picoparse` chooses the rule that matches _earliest_ in the text. If there's a tie, it chooses the rule that's earliest in our Rule array, so in general we want to place our more specific rules (like lists) above our more general rules (like strings).

```js
const trnp = (text)=>{
	const [tokens, leftover] = picoparse([
		[/- /g, ()=>{
			return { list: true };
		}],
		[/([a-zA-Z0-9_]+)\s*:/g, ([key])=>{
			return { key };
		}],
		[/(-?[\d|_]+(\.[\d|_]+)?)/g, ([num])=>{
			return { val: Number(num.replaceAll('_','')) };
		}],
		[/(.+)/g, ([str])=>{
			return { val: str };
		}],
	], text);

	result = tokens;
	return result;
};
```

and this produce these tokens...

```js
[
  { key: 'game_date' },
  { val: ' 2022-05-17 // Tuesday' },
  { key: 'notes' },
  { val: ' This is an' },
  { val: '       interesting game!' },
  { key: 'players' },
  { val: '\t- name   : Scott' },
  ...
]
```

Getting there, but notice how we aren't matching on any lists? Also this token `{ val: '       interesting game!' }` has all of the indentation in it.

We're going to add one more rule to capture all of this indentation. For now we won't do anything with it, but we will later.

```js
const trnp = (text)=>{
	const [tokens, leftover] = picoparse([
		[/([\t| ]+)/g, ()=>{
			//TODO: This matches the indentation, but does nothing with it
		}],
		[/- /g, ()=>{
			return { list: true };
		}],
		[/([a-zA-Z0-9_]+)\s*:/g, ([key])=>{
			return { key };
		}],
		[/(-?[\d|_]+(\.[\d|_]+)?)/g, ([num])=>{
			return { val: Number(num.replaceAll('_','')) };
		}],
		[/(.+)/g, ([str])=>{
			return { val: str };
		}],
	], text);

	result = tokens;
	return result;
};
```

```js
[
  { key: 'game_date' },
  { val: 2022 },
  { val: -5 },
  { val: -17 },
  { val: '// Tuesday' },
  { key: 'notes' },
  { val: 'This is an' },
  { val: 'interesting game!' },
  { key: 'players' },
  { list: true },
  { key: 'name' },
  { val: 'Scott' },
  ...
]
```

Uh-oh! We're getting our `key` and `list` matching now, but it looks like our logic for numbers isn't working how we expect. How should we fix this?

Well it looks like the Number rule is partially matching which isn't ideal. What we actually want is that if we have a string value, we want to check if it looks like a number, then return a number. So we'll remove the Number rule, and move that logic into our String rule.


```js
const trnp = (text)=>{
	const [tokens, leftover] = picoparse([
		[/([\t| ]+)/g, ()=>{
			//TODO
		}],
		[/- /g, ()=>{
			return { list: true };
		}],
		[/([a-zA-Z0-9_]+)\s*:/g, ([key])=>{
			return { key };
		}],
		// Removed our Number rule
		[/(.+)/g, ([str])=>{
			// Adding ^ and $ to the regex to check for a "complete" match
			if(/^(-?[\d|_]+(\.[\d|_]+)?)$/gm.test(str)){
				str = Number(str.replaceAll('_',''));
			}
			return { val: str };
		}],
	], text);
	result = tokens;
	return result;
};
```

```js
[
  { key: 'game_date' },
  { val: '2022-05-17 // Tuesday' },
  { key: 'notes' },
  { val: 'This is an' },
  { val: 'interesting game!' },
  { key: 'players' },
  { list: true },
  { key: 'name' },
  { val: 'Scott' },
  { key: 'points' },
  { val: -12000 },
  ...
]
```

Whew! This is looking much much better. Okay let's start handling indentation...


### 3. Indentation

For each token we want to know how much it's indented, that way when we go and process each token we know all subsequent tokens with a _greater_ indentation "belong" to that token, `players:` is indented `0`, so we know all tokens after it with an indentation greater than `0` should be a part of it's value with the key of `players`.

We know that our indentation value resets with each new line, and that we can have several tokens on a single line. We need to track how many characters we've seen while parsing each line. Sounds complicated, but ends up being pretty straight forward.

We'll add a local variable to track the current indentation amount, and a new rule to reset this counter each new line. We'll also have to update all of our rules to include an indentation number in the returned token, and lastly our list and dictionary rules to also increase the indentation counter based on their value.


```js
const trnp = (text)=>{
	let current_indent = 0;

	const [tokens, leftover] = picoparse([
		[/([\t| ]+)/g, ([indent])=>{
			current_indent += indent.length;
		}],
		[/\n/g, ()=>{ // Reset counter on new line
			current_indent = 0;
		}],
		[/- /g, ()=>{
			let indent = current_indent;
			current_indent += 2; //since our rule always matches two characters
			return { list: true, indent };
		}],
		[/([a-zA-Z0-9_]+)\s*:/g, ([key], { match })=>{
			let indent = current_indent;
			// picoparse gives us a bunch of useful info in the second parameter (see the docs)
			// here we are getting the complete string match, and using it's total length to update
			// the indentation counter.
			current_indent += match.length;
			return { key, indent };
		}],
		[/(.+)/g, ([str])=>{
			if(/^(-?[\d|_]+(\.[\d|_]+)?)$/gm.test(str)){
				str = Number(str.replaceAll('_',''));
			}
			return { val: str, indent : current_indent };
		}],
	], text);
	result = tokens;
	return result;
};
```


```js
[
  { key: 'game_date', indent: 0 },
  { val: '2022-05-17 // Tuesday', indent: 12 },
  { key: 'notes', indent: 0 },
  { val: 'This is an', indent: 7 },
  { val: 'interesting game!', indent: 7 },
  { key: 'players', indent: 0 },
  { list: true, indent: 1 },
  { key: 'name', indent: 3 },
  { val: 'Scott', indent: 12 },
  { key: 'points', indent: 3 },
  { val: -12000, indent: 12 },
  { key: 'team', indent: 3 },
  { val: 'blue', indent: 10 },
  ...
]
```

A quick check shows that this is looking good. Take a moment to compare these tokens back to our original example and see how everything is lining up.

Notice that because we put our Indentation rule first it matches even on the space between the `:` after a key and the beginning of a string, so we don't have to write additional logic to capture that, neat! Also since our newline and indentation rule don't return anything, they don't add tokens.

We are capturing all of the tokens we wanted to, so lets move onto processing them now.


### 4. Token Parsing

The array of tokens that `picoparse` returns looks like a normal array, but it's been spiced up to make this step a fair bit easier. It's been extended using [`Object.defineProperties()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties) to track the current index on the array. Why? This way we can pass the array between functions and various bits of logic can use this index to get the current token, or update the index to "consume" or "reject" tokens. This could be accomplished by also passing around an index number with the token array, but coupling the two into one single variable reduces the chance for bugs and errors, so that's why it's built-in.

There's three properties we can use, `.idx` is a settable number of the current idx (starts at `-1`), `.next()` increments the `.idx` and returns the value in the array at that index, `.done` is a boolean that is true when the `.idx` is beyond the array size.

Using this we're going to write a function that takes the array of tokens, and an indentation threshold number. This function will process each token and update it's result, it returns this result when it either runs out of tokens, or it encounters a token that's under it's indentation threshold.

Lots of words, so let see some code.


```js
const trnp = (text)=>{
	let current_indent = 0;

	// Hiding the rules for now since we're done working on them
	const [tokens, leftover] = picoparse(RULES, text);

	const handleTokens = (tokens, threshold=-1)=>{
		let result;

		while(!tokens.done){
			let token = tokens.next();
			if(token.indent < threshold){
				tokens.idx -= 1; // "unconsume" this token
				break;
			}
			// TODO
		}
		return result;
	};
	result = handleTokens(tokens); // We're done with just tokens
	return result;
};
```

Right now this just returns `undefined` since we didn't write any logic to handle tokens. We can see that `handleTokens` will while loop over the tokens until it runs out (`.done` being `false`). In the loop we're grabbing the next token, and checking that it's within our `threshold`, if not we "add" that token back to the list that needs to be processed by reducing the `.idx`, and then it breaks out of the loop and returns our result.

For example if we take a look at our list of tokens, our first array has an indent value of 1, so we want to process the value of that first array element as every token with an indent greater than 1, as soon as we see an indent of 1 or less we know that either there's going to be another array entry, or the array is done.

Let's add some logic for our token types. If it's a list or dictionary, we want to make our `result` an array/object respectively, then recursively call `handleTokens` with the threshold set our that token's indent value (plus one), this will return what value should go into our array/object. If the token is a string or number, just make it the result.

```js
const trnp = (text)=>{
	let current_indent = 0;
	const [tokens, leftover] = picoparse(RULES, text);

	const handleTokens = (tokens, threshold=-1)=>{
		let result;
		while(!tokens.done){
			let token = tokens.next();
			if(token.indent < threshold){
				tokens.idx -= 1;
				break;
			}
			if(token.list){
				// Make sure our result is the right type
				if(!Array.isArray(result)) result = [];

				//Capture everything more indented than this token
				result.push(handleTokens(tokens, token.indent+1));
			}else if(token.key){
				if(typeof result !== 'object') result = {};
				result[token.key] = handleTokens(tokens, token.indent+1);
			}else{
				result = token.val;
			}
		}
		return result;
	};
	result = handleTokens(tokens);
	return result;
};
```


If you're following along you'll notice that our `trnp` function just returns `"*/"` which is definitely not ideal. Take a moment to see if you can guess why this might be happening.

Okay, good? Two things are going on. Firstly the way we are handling tokens is pretty loosey-goosey, if we've seen a bunch of `key` tokens to build an object, and then we come across a string token, we throw all of that object away and make `result` become just our string. Secondly, we aren't handling comments yet, so the comment at the end of our example is being parsed like a string and completely overwriting our `result`.

If we wanted to, we could add some checks that throw errors if the type of `result` changes, which souldn't happen if the input is in valid `trnp` notation. We aren't going to do this for this tutorial, but a good way to emit useful errors is to add the location index within the text for each token (aka the `index` via the second parameter), using that you can report the exact line number and character column of the token that produced the error for the user to debug.

If we remove the comment at the end of our example, we get this result:

```js
{
  game_date: '2022-05-17 // Tuesday',
  notes: 'interesting game!',
  players: [
    { name: 'Scott', points: -12000, team: 'blue' },
    { name: 'Alice', points: 3200.5, team: 'red' }
  ]
}
```

So close! We still need to handle comments, and if you notice, `notes` is missing `"This is an"`, since we haven't added multiline support yet. So let's do that now.

```js
const trnp = (text)=>{
	let current_indent = 0;
	const [tokens, leftover] = picoparse(RULES, text);

	const handleTokens = (tokens, threshold=-1)=>{
		let result;
		while(!tokens.done){
			let token = tokens.next();
			if(token.indent < threshold){
				tokens.idx -= 1;
				break;
			}
			if(token.list){
				if(!Array.isArray(result)) result = [];
				result.push(handleTokens(tokens, token.indent+1));
			}else if(token.key){
				if(typeof result !== 'object') result = {};
				result[token.key] = handleTokens(tokens, token.indent+1);

			// If the token we are looking at is a string, and the current value of `result` is also a string,
			// instead of over writing it, we want to concatenate it.
			}else if(typeof token.val === 'string' && typeof result === 'string'){
				result += ' ' + token.val;

			}else{
				result = token.val;
			}
		}
		return result;
	};
	result = handleTokens(tokens);
	return result;
};
```

There are probably cleaner ways to write these checks, such as including a `type` parameter on each token and maybe using a `switch`, instead of duck-typing the `val`, but I'll leave that up to the reader.


### 5. Comments

Last step, which might be the easiest, is to handle comments. We could add a comment rule that we pass into `picoparse`, however when you have a simple goal such as "just remove all comments", it's much cleaner and simpler to just pre-process the text before we parse. We write some more regex to match everything that looks like a comment and replace it with an empty string.


```js
const trnp = (text)=>{
	text = text
		.replace(/[\s|^]\/\/[^\n]*/gm, '')          // Single line comment
		.replace(/\/\*(\*(?!\/)|[^*])*\*\//g, '');  // Block comment

	let current_indent = 0;
	const [tokens, leftover] = picoparse(RULES, text);
	const handleTokens = (tokens, threshold=-1)=>{ ... };
	result = handleTokens(tokens);
	return result;
};
```

With these three lines of code, lets see what our result is:

```js
{
  game_date: '2022-05-17',
  notes: 'This is an interesting game!',
  players: [
    { name: 'Scott', points: -12000, team: 'blue' },
    { name: 'Alice', points: 3200.5, team: 'red' }
  ]
}
```

We did it! 🎉🎉🎉


Let's clean up our code and take a look at the final result.



```js
const trnp = (text)=>{
	text = text
		.replace(/[\s|^]\/\/[^\n]*/gm, '')
		.replace(/\/\*(\*(?!\/)|[^*])*\*\//g, '');

	let current_indent = 0;
	const [tokens] = picoparse([
		[/([\t| ]+)/g, ([indent])=>{ current_indent += indent.length; }],
		[/\n/g,                ()=>{ current_indent = 0; }],
		[/- /g, ()=>{
			let indent = current_indent;
			current_indent += 2;
			return { list: true, indent };
		}],
		[/([a-zA-Z0-9_]+)\s*:/g, ([key], { match })=>{
			let indent = current_indent;
			current_indent += match.length;
			return { key, indent };
		}],
		[/(.+)/g, ([str])=>{
			if(/^(-?[\d|_]+(\.[\d|_]+)?)$/gm.test(str)){
				str = Number(str.replaceAll('_',''));
			}
			return { val: str, indent: current_indent };
		}],
	], text);

	const handleTokens = (tokens, threshold=-1)=>{
		let result;
		while(!tokens.done){
			let token = tokens.next();
			if(token.indent < threshold){ tokens.idx -= 1; break; }
			if(token.list){
				if(!Array.isArray(result)) result = [];
				result.push(handleTokens(tokens, token.indent+1));
			}else if(token.key){
				if(typeof result !== 'object') result = {};
				result[token.key] = handleTokens(tokens, token.indent+1);
			}else if(typeof token.val === 'string' && typeof result === 'string'){
				result += ' ' + token.val;
			}else{
				result = token.val;
			}
		}
		return result;
	};
	return handleTokens(tokens);
};
```


In just about 50 lines of code we've written a parser for a little data markup language. I've found these kind of parsers really easy to debug and update compared to more formal ones.

`picoparse` lowers the barrier of entry for designing and playing around with DSLs in your projects. It helps set up the groundwork to understand how more formal parsers work, without throwing you into the deep end.  I've personally used `picoparse` to write CSS and Markdown parsers with slight flavour changes to the spec to make them fit my use cases.


## Home Work Challenges

1. Add `true` and `false` as a supported type (easy)
1. Add Dates as a supported type (easy)
1. Add a syntax for a simple single line list, eg. `[23, true, foobar]`
1. Throw errors when the `result` type in `handleTokens` changes (medium)
1. The errors have the line and column number of the problem token within the input text, without having comments mess this location up (very hard, will have to change how we handle comments)
1. Create a parser for CSS -> JSON (hard)
1. Create a parser for Markdown -> HTML (very very hard)

