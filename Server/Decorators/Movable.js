var applyTo = function(element, movableData)
{
	var controller = element.controller;
	var isBlocked =  movableData["isBlocked"];

	element.isMovable = true;

	element.isMoving = false;
	
	element.startMoving = function()
	{
		console.log('startMoving: ' + this.id  + ' from (' + this.elementX +',' + this.elementY +')');
		this.isMoving = true;
		this.originalZ = this.elementZ;
		this.update('elementZ', this.elementZ + 100);
	};
	
	element.addEventListener(
		'pointerDown',
		function(eventData)
		{
			if (isBlocked && isBlocked(element, eventData.originSocketId)) 
				return;

			element.startMoving();

			if (eventData.identifierElement)
				eventData.identifierElement.touchIdentifier = null;
			
			if (element.dropZone)
			{
				element.dropZone.drag(element);
			}
			
			element.touchIdentifier = eventData.touchIdentifier;
			return false;
		});

	element.addEventListener(
		'pointerMove',
		function(eventData)
		{
			if (isBlocked && isBlocked(element, eventData.originSocketId)) 
				return;

			if (!element.isMoving)
			{
				return true;
			};
			
			// will need a real one here !
			var updatedElement = {
					elementX: eventData.x, 
					elementY: eventData.y, 
					elementAngle:element.elementAngle,
					elementScaleX:element.elementScaleX,
					elementScaleY:element.elementScaleY,
					typeName: element.typeName,
					getEdges: element.getEdges,
					controller:element.controller,
					getRealXYFromElementXY:element.getRealXYFromElementXY};
			
			if (element.preMove && !element.preMove(updatedElement))
			{	
				return false;
			}
						
			element.update('elementX', eventData.x);
			element.update('elementY', eventData.y);

			return false;
		});

	element.addEventListener(
		'pointerUp',
		function(eventData)
		{
			if (isBlocked && isBlocked(element, eventData.originSocketId)) 
				return;

			element.isMoving = false;
			element.update('elementZ', element.originalZ);
			element.touchIdentifier = null;

			console.log('StopMoving' + element.id  + ' at (' + element.elementX +',' + element.elementY +',' + element.elementZ +')');
			return false;
		});
};

exports.applyTo = applyTo;