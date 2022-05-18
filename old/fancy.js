const picoparse = (rules, opts={})=>{
	let Rules = rules.map(([rgx,func])=>{return {rgx, func, match:{index:0}}});
	return (source)=>{
		if(opts.pre) source = opts.pre(source);
		let tokens = [], scope = opts.scope ? opts.scope(source):{}, lastIndex = 0;
		while(lastIndex <= source.length){
			const bestRule = Rules.reduce((best, rule)=>{
				if(rule.match?.index <= lastIndex){
					rule.rgx.lastIndex = lastIndex;
					rule.match = rule.rgx.exec(source);
				}
				if(rule.match?.index < (best?.match?.index??Number.MAX_VALUE)) return rule;
				return best;
			},false);
			if(!bestRule) break;
			const [match, ...groups] = bestRule.match;
			const index = bestRule.match.index, pre = source.substring(lastIndex,index);
			tokens.push(bestRule.func(groups, { match, scope, source, index, pre, tokens }));
			lastIndex = index + match.length;
		}
		if(opts.fallback) tokens.push(opts.fallback(source.substring(lastIndex), {scope, source, tokens, index: lastIndex}));
		tokens = tokens.flat().filter(token=>typeof token !== 'undefined');
		Object.defineProperties(tokens, {
			idx  : { writable: true, value: -1},
			next : { value(){ return this[++this.idx];} },
			done : { get(){ return this.idx>=this.length-1} }
		});
		return opts.final ? opts.final(tokens, {scope}) : tokens;
	};
};

picoparse.inline = (rules, opts={})=>{
	return (source)=>{
		if(opts.pre) source = opts.pre(source);
		let scope = opts.scope ? opts.scope(source):{};
		let result = rules.reduce((acc, [rgx,func])=>{
			return acc.replace(rgx, (...args)=>{
				const [match, ...groups] = args;
				return func(groups, {scope, match, source}) ?? '';
			})
		}, source);
		if(opts.fallback) result = opts.fallback(result, {scope});
		return opts.final ? opts.final(result, {scope}) : result;
	}
};

picoparse.removeComments = (source)=>source.replace(/[\s|^]\/\/[^\n]*/gm, '').replace(/\/\*(\*(?!\/)|[^*])*\*\//g, '');

