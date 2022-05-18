const picoparse = (rules, text)=>{
	let tokens = [], matches = [], lastIndex = 0;
	while(lastIndex <= text.length){
		const bestIdx = rules.reduce((best_idx, [rgx, func], idx)=>{
			if(typeof matches[idx] === 'undefined' || matches[idx]?.index <= lastIndex){
				rgx.lastIndex = lastIndex;
				matches[idx] = rgx.exec(text);
			}
			if(matches[idx]?.index < (matches[best_idx]?.index ?? Number.MAX_VALUE)) return idx;
			return best_idx;
		}, -1);
		if(bestIdx === -1 || !matches[bestIdx]) break;
		const [match, ...groups] = matches[bestIdx];
		const index = matches[bestIdx].index, pre = text.substring(lastIndex,index);
		tokens = tokens.concat(rules[bestIdx][1](groups, { match, index, pre, tokens }));
		lastIndex = index + match.length;
	}
	return [
		Object.defineProperties(tokens.filter(token=>typeof token !== 'undefined'), {
			idx  : { writable: true, value: -1},
			next : { value(){ return this[++this.idx];} },
			done : { get(){ return this.idx>=this.length-1} }
		}),
		text.substring(lastIndex)
	];
};



/* Simple function for applying rules all at once on a target string
   Useful for when your parser does not need tokens or if your rules
   do not interact with each other */
picoparse.inline = (rules, text)=>{
	return rules.reduce((acc, [rgx,func])=>{
		return acc.replace(rgx, (...args)=>{
			const [match, ...groups] = args;
			return func(groups, { match, index: args.index }) ?? '';
		});
	}, text);
};

/* Utility for converting a string index and text into a line and column number
   Used for reporting locations of errors */
picoparse.loc = (text, idx)=>{
	return {
		line: (text.match(/\n/g)||[]).length,
		col: text.substring(text.lastIndexOf('\n')).length
	};
};

module.exports = picoparse;