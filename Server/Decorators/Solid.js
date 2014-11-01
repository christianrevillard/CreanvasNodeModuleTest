var applyTo = function(element, solidData) {
	var controller = element.controller;
	
	element.isSolid = true;
	
	console.log('Applying solid');
	
	// TODO: can other type than Solid implement a Premove: change stuff here...
	element.preMove = function(updatedElement)
	{
		if (element.isDuplicable)
			return true;		
		
		var realEdges = element.getRealEdges.call(updatedElement);					

		return element
			.controller
			.elements
			.filter(function(e){return e.id != element.id && e.isSolid && !e.isDuplicable;})
			.every(
			function(other)
			{				 
				return realEdges
					.every(function(realEdge){ 
						return !other.isPointInElementEdges(realEdge.x, realEdge.y);});
			});
	};
};

exports.applyTo = applyTo;