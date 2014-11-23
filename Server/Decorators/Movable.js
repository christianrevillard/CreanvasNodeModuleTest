var applyTo = function(element, movableData)
{
	var controller = element.controller;
	var isBlocked =  movableData["isBlocked"];
	var alwaysMoving = movableData["alwaysMoving"];

	element.omega = element.omega || 0;
	
	element.isMovable = true;
//	element.isMoving = alwaysMoving;
	element.suspendMoving = false;
	
	element.startMoving = function()
	{
		console.log('startMoving: ' + this.id  + ' from (' + this.elementX +',' + this.elementY +') ');
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

			element.suspendMoving = false;
			element.lastMoved = element.controller.getTime();

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
						
			if (element.suspendMoving)
			{
				if (element.isPointInElementEdges(eventData.x, eventData.y))
				{element.suspendMoving = false;}
				else
					{return false;}
			}

			element.movingElement.targetElementX = eventData.x;  
			element.movingElement.targetElementY = eventData.y;

			return false;
		});
	
	var stopMoving = function(eventData)
	{
		if (alwaysMoving)
			return;
		
		if (isBlocked && isBlocked(element, eventData.originSocketId)) 
			return;

		element.isMoving = false;
		element.lastMoved = null;
		element.update('elementZ', element.originalZ);
		element.touchIdentifier = null;

//		console.log('StopMoving' + element.id  + ' at (' + element.elementX +',' + element.elementY +',' + element.elementZ +') ' + element.movingSpeed.x);
		return false;
	};

	element.addEventListener(
		'pointerUp',
		stopMoving
		);
};

exports.applyTo = applyTo;