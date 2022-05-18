/* picoparse source code fully annoted */

const picoparse = (rules, text)=>{
	/* rules is an array of 2 value arrays. First being a regex, second being a handler function. */

	/* This array will track all the generated tokens from the handler functions */
	let tokens = [],

	/* matches will contain the regex match for each rule corresponding to the same index. picoparse
	   stores these matches between iterations to make sure it executes the regexes a minimal number of times.
	*/
	matches = [],

	/* lastIndex tracks where in the text the last rule matched, this is used to update our
	   rule regexes and slice out the text between matching rules */
	lastIndex = 0;

	/* Make sure we don't loop forever, however we will be breaking out of this loop more often than not */
	while(lastIndex <= text.length){

		/* Iterate over each rule to find the idex of the rule that matches the earliest within
		   the reamining text */
		const bestIdx = rules.reduce((best_idx, [rgx, func], idx)=>{

			/* If we haven't run the regex yet or where the last match happened has already been processed,
			   we want to re-run the regex to get a new match.
			   Note: if a regex does not match, it actually returns 'null', not 'undefined'.
			   So doing an explicit check for 'undefined' here let's us not re-run Rules that no longer
			   match the text, making picoparse more efficient
			*/
			if(typeof matches[idx] === 'undefined' || matches[idx]?.index <= lastIndex){

				/* regexes store a property called .lastIndex, which is the index in the text they should
				   should to run the regex from. We are updating it here to the regex won't match
				   on text we've already processed */
				rgx.lastIndex = lastIndex;

				/* Run the rule regex to update the rule match */
				matches[idx] = rgx.exec(text);
			}

			/* If a regex does not match, it returns 'null', so we have to use the ?. operator
			   to conditionally access the .index property if it did match. Same goes with 'best_idx'.
			   if 'best' does not have a value or index, we always want the current rule to become
			   	the 'best', so we use the MAX_VALUE here to make sure that happens */
			if(matches[idx]?.index < (matches[best_idx]?.index ?? Number.MAX_VALUE)) return idx;
			return best_idx;
		}, -1);

		/* If a rule did not match, or the matched rule does not have a match value, we're done processing */
		if(bestIdx === -1 || !matches[bestIdx]) break;

		/* Regex matches are weird in JS as they are a mix of array and objects. The first item in the array
		   is the full strng match, it's then followed by each capture group as another item in the array.
		   This array also has several useful properties attached to it. We mainly need the '.index'.
		   The captured groups are the most useful part of the regex, so we'll extract those.
		   'match' represents the entire string that matched the regex, not just the groups */
		const [match, ...groups] = matches[bestIdx];

		/* 'pre' is all of the unmatched text since the last rule match. Sometimes this is useful
		    to the parser */
		const index = matches[bestIdx].index, pre = text.substring(lastIndex,index);

		/* 'rules[bestIdx][1]' is the rule handler function, so we'll run that function with the groups
		   as the first parameter, and a bunch of useful data as the second; the full match, location
		   in the text, all the text between matches, and finally the current list of tokens */
		tokens = tokens.concat(rules[bestIdx][1](groups, { match, index, pre, tokens }));

		/* Update the 'lastIndex' to be the end of the current match, and do it all again! */
		lastIndex = index + match.length;
	}

	/* Rules that don't return anything add 'undefined' to our list, so let's remove those */
	tokens = tokens.filter(token=>typeof token !== 'undefined');

	/* Create an extended array to capture our tokens. This array has a built in index
	   variable that tracks where in the array we are. Very useful when parsing the tokens.
	   Check out the tutorial.md to see this in action */
	tokens = Object.defineProperties(tokens, {
		idx  : { writable: true, value: -1},
		next : { value(){ return this[++this.idx];} },
		done : { get(){ return this.idx>=this.length-1} }
	});

	return [
		tokens,
		/* The parser might want to use any remaining and unmatched text,
		   so we return it along with the tokens */
		text.substring(lastIndex)
	];
};