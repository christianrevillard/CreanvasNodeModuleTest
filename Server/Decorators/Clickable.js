var applyTo = function(element, clickableData) {

	var controller = element.controller;
		
	console.log("clickable.applyTo: " + element.id);				
					
	element.addEventListener(
		'click',
		function(eventData)
		{
			console.log('Clicked ' + element.id  + ' at (' + element.elementX +',' + element.elementY +')');

			return true;
		});
};

exports.applyTo = applyTo;