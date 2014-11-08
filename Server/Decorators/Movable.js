var applyTo = function(element, movableData)
{
	var controller = element.controller;
	var isBlocked =  movableData["isBlocked"];

	element.omega = element.omega || 0;
	
	element.isMovable = true;

	element.isMoving = false;
	element.suspendMoving = false;
	
	element.startMoving = function()
	{
		console.log('startMoving: ' + this.id  + ' from (' + this.elementX +',' + this.elementY +') ' + element.movingSpeed.x);
		this.isMoving = true;
		this.originalZ = this.elementZ;
		this.originalSpeed = this.movingSpeed;
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

			var previousMoved = element.lastMoved || element.controller.getTime();
			
			element.lastMoved = element.controller.getTime();
			var dt = element.lastMoved  - previousMoved;
			if (dt==0)
				dt = Infinity;
			
			element.rollbackData = 
			{
					elementX: element.elementX, 
					elementY:element.elementY, 
					elementAngle:element.elementAngle,
					elementScaleX:element.elementScaleX,
					elementScaleY:element.elementScaleY,
					movingSpeed:{
						x: element.movingSpeed?element.movingSpeed.x:0,
						y: element.movingSpeed?element.movingSpeed.y:0
					}
			};

			element.movingSpeed = {
					x: (eventData.x - element.elementX)/dt,
					y:(eventData.y - element.elementY)/dt
				};

			element.elementX = eventData.x; 
			element.elementY = eventData.y;
			
			console.log("movable speed: " + JSON.stringify(element.movingSpeed ));
			
			if (element.preMove && !element.preMove())
			{	
				console.log('Cannot move ' + element.id  + ' to (' + eventData.x +',' + eventData.y +')');
				element.elementX = element.rollbackData.elementX; 
				element.elementY = element.rollbackData.elementY;
				element.elementAngle = element.rollbackData.elementAngle;
				element.movingSpeed = element.rollbackData.movingSpeed;
				
				element.suspendMoving = true;
				return false;
			}
			
			element.movingSpeed = element.rollbackData.movingSpeed;
			element.elementAngle = element.rollbackData.elementAngle;						
			element.update('elementX', eventData.x);
			element.update('elementY', eventData.y);

			return false;
		});
	
	var stopMoving = function(eventData)
	{
		if (isBlocked && isBlocked(element, eventData.originSocketId)) 
			return;

		element.isMoving = false;
		element.lastMoved = null;
		element.update('elementZ', element.originalZ);
		this.movingSpeed = this.originalSpeed;
		element.touchIdentifier = null;

		console.log('StopMoving' + element.id  + ' at (' + element.elementX +',' + element.elementY +',' + element.elementZ +') ' + element.movingSpeed.x);
		return false;
	};

	element.addEventListener(
		'pointerUp',
		stopMoving
		);
};

exports.applyTo = applyTo;