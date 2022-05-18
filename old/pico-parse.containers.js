const parseRules = (rulesObj)=>{
	return Object.entries(rulesObj).map(([id, rule])=>{
		if(typeof rule === 'function') return {id, resolve:rule, exit : true, regex : /(.*)/};
		if(!Array.isArray(rule)) return {id, ...rule};
		if(rule.length == 2){
			const [regex, resolve] = rule;
			return { id, regex, resolve };
		}
		if(rule.length == 3){
			const [regex, end, resolve] = rule;
			return { id, regex, end, resolve };
		}
	})
};

const execute = (rule, input)=>{
	const match = rule.regex.exec(input);
	if(!match) return {index : Infinity};
	const [text, ...groups] = match;
	return {text,groups,rule,index:match.index};
}

const defaultExitMatch = {
	index : Infinity,
	rule : {},
	exit : true
}

const bestMatch = (rules, text, exitMatch = defaultExitMatch)=>{
	return rules.reduce((best, rule)=>{
		const match = execute(rule, text);
		return (best.index > match.index) ? match : best;
	}, exitMatch);
};

const parse = (rules, baseText, exitRule = undefined)=>{
	let exitMatch;
	let text = baseText;
	let result = [], remainingText;

	while(1){
		if(exitRule){
			exitMatch = execute({regex: exitRule}, text);
			exitMatch.exit = true;
		}
		const best = bestMatch(rules, text, exitMatch);
		let afterText = best.text ? text.substring(best.index + best.text.length) : '';
		if(best.exit){
			if(exitRule){
				result = {
					endGroups     : best.groups,
					content       : result,
					remainingText : afterText
				}
			}
			break;
		}
		if(best.rule.end){
			const { endGroups, content, remainingText } = parse(rules, afterText, best.rule.end);
			result.push(best.rule.resolve(best.groups, content, endGroups, best.match));
			text = remainingText;
		}else{
			result.push(best.rule.resolve(best.groups, best.match));
			text = afterText;
		}
		if(!text) break;
	}
	return result;
}

const engine = (rules)=>{
	const Rules = parseRules(rules);
	return (text)=>parse(Rules, text);
}

module.exports = {
	execute,
	parseRules,
	parse,
	engine
}
