const picoparse = (rules, fallback=false, flatten=true)=>{
	return (source, initScope={})=>{
		let remaining = source, result = [], pos=0, scope=initScope;
		while(remaining.length > 0){
			let ruleMatch = rules.reduce((best, [rgx, fn], idx)=>{
				let match = rgx.exec(remaining);
				if(match && (!best || match.index < best.index)){ match.func = fn; return match; }
				return best;
			}, false);
			if(!ruleMatch) break;
			const [match, ...groups] = ruleMatch;
			pos += ruleMatch.index;
			result.push(ruleMatch.func(groups, {match, pos, scope, source, pre:remaining.substring(0,ruleMatch.index)}));
			remaining = remaining.substring(ruleMatch.index + match.length);
		}
		if(fallback) result.push(fallback(remaining, {scope, pos, source}));
		if(flatten) result = result.flat();
		result = result.filter(token=>typeof token !== 'undefined');
		Object.defineProperties(result, {
			idx  : { writable: true, value: false },
			next : { value(){this.idx = (this.idx===false ? 0 : this.idx+1); return this[this.idx];} },
			done : { get(){ return this.idx>=this.length-1} }
		});
		return result;
	}
};


/* A simpler parser where the rules don't depend on eachother. Spot replaces within the source text */
picoparse.inline = (rules, final=(result, scope)=>result)=>{
	return (source, initScope={})=>{
		const scope = initScope;
		return final(rules.reduce((acc, [rgx, func])=>{
			return acc.replace(rgx, (match, ...groups)=>func(groups, {scope, match}) ?? '');
		}, source), scope);
	};
}


/* Returns column and line number of a specific position in text */
picoparse.loc = (text, pos)=>{
	const sel = text.substring(0,pos);
	return {
		line: sel.match('\n').length,
		col : sel.length - sel.lastIndexOf('\n')
	}
};




module.exports = picoparse;

/** Example **/
// const rules = [
// 	[/\/\*/,  ()=>true],
// 	[/\*\//, ()=>false],
// 	[/\/\/.*/, ()=>null],
// 	[/`(.+?)`/g, ([code], {scope})=>{
// 		scope.code = (scope.code||[]).concat(code)
// 		return `code`;
// 	}],
// 	[/_(.+?)_/g, ([txt])=>`<em>${txt}</em>`],
// 	[/code/g, (_, {scope})=>{
// 		scope.idx = (scope.idx||0) + 1;
// 		return `<code>${scope.code[scope.idx-1]}</code>`;

// 	}]
// ];

// console.log(picoparse.inline(rules)(`

// 	oh _hello_, \`_there_ ye ye \`

// `))
