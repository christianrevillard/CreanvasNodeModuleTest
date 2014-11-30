var ClickableElement = function(clickableData)
{	
	this.onClick = clickableData.onClick;	
};

var applyTo = function(element, clickableData) {
	
	console.log("clickable.applyTo: " + element.id);				

	element.clickable = new ClickableElement(clickableData);						
	
	element.addEventListener(
		'click',
		function(eventData)
		{
			element.clickable.onClick(eventData);	
			return true;
		});	
};

exports.applyTo = applyTo;