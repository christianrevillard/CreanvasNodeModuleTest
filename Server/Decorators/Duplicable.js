var applyTo = function(element, duplicableData) {

	var controller = element.controller;
	
	element.isDuplicable = true;

	var isBlocked =  duplicableData["isBlocked"];
	var generatorCount = duplicableData["generatorCount"] || Infinity;
	
	console.log("duplicable.applyTo: generatorCount is " + generatorCount);				
				
	var makeCopy = function(e) {

		if (isBlocked && isBlocked(element, e.originSocketId)) 
			return;
		
		console.log('duplicable.makeCopy: GeneratorCount was: ' + generatorCount);

		if (generatorCount<=0) 
			return;

		generatorCount--;


		var copy = element.cloneElement(['duplicable']);
		copy.elementName+= " (duplicate)";

		copy.applyElementDecorator(
			"movable",
			{
				isBlocked : isBlocked,
			});
		
		copy.touchIdentifier =  e.touchIdentifier; 
		copy.startMoving();
	};
		

	element.addEventListener(
		'pointerDown',
		function(eventData)
		{
			console.log('Duplicating' + element.id  + ' at (' + element.elementX +',' + element.elementY +')');
			makeCopy(eventData);			
			return false;
		});	
};

exports.applyTo = applyTo;