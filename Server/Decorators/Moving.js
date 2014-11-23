var vector = require('../Vector');

var applyTo = function(element, elementMoving)
{	
	console.log('Applying moving');	
	element.movingElement = new MovingElement(element, elementMoving);		
}		

var MovingElement = function(parent, elementMoving)
{	
	var element = this; // rewrite...
	element.parent = parent;
	element.movingSpeed = new vector.Vector( elementMoving.vx || 0, elementMoving.vy || 0);
	element.movingAcceleration = new vector.Vector( elementMoving.ax || 0,  elementMoving.ay || 0);
	element.omega = elementMoving.rotationSpeed || 0;
	
	element.movingLimits = {
		vMax: elementMoving.vMax || Infinity,
		xMin: elementMoving.xMin || -Infinity,
		yMin: elementMoving.yMin || -Infinity,
		xMax: elementMoving.xMax || Infinity,
		yMax: elementMoving.yMax || Infinity
	};
	
	element.lastUpdated = element.parent.controller.getTime();
	
	parent.controller.setInterval(
		function(){ element.move() },
		40);
};

MovingElement.prototype.move = function()
{
	var rollbackData;
	var element = this;

	var currentTime = element.parent.controller.getTime();
	var dt = currentTime - element.lastUpdated;

	if (dt < 0.001)
		return;

	element.lastUpdated = currentTime;
	
	if (element.targetElementX !== undefined && element.targetElementY !== undefined )
	{
		//overriding speed until we get there.
		if (!element.originalSpeed)
			element.originalSpeed = element.movingSpeed
	
			element.movingSpeed =  new vector.Vector( 
					(element.targetElementX - element.parent.elementX)/dt,
					(element.targetElementY - element.parent.elementY)/dt);

		var v = Math.sqrt(element.movingSpeed.x*element.movingSpeed.x + element.movingSpeed.y*element.movingSpeed.y);
		if (v > element.movingLimits.vMax)
		{
			element.movingSpeed.x *= element.movingLimits.vMax / v;
			element.movingSpeed.y *= element.movingLimits.vMax / v;
		}
	}
	else
	{
		element.movingSpeed.x += element.movingAcceleration.x * dt;
		element.movingSpeed.y += element.movingAcceleration.y * dt;			
	}
	
	

	if (element.movingSpeed.x == 0 &&
			element.movingSpeed.y == 0 &&
			element.omega == 0 &&
			(!element.elementScaleSpeed ||(
			element.elementScaleSpeed.x == 0 && element.elementScaleSpeed.y==0						
			)))
	{
		return;
	}
	

	dElementX = element.movingSpeed.x * dt; 
	dElementY = element.movingSpeed.y * dt; 
	dElementAngle = element.omega * dt;
	dElementScaleX = element.elementScaleSpeed?element.elementScaleSpeed.x * dt : 0;
	dElementScaleY = element.elementScaleSpeed?element.elementScaleSpeed.y * dt : 0;

	
	// check the rules for angle and scale... must correspond to about a point
	var discret = Math.ceil(
			Math.max(
					Math.abs(dElementX), 
					Math.abs(dElementY), 
					Math.abs(dElementAngle*180*Math.PI),
					Math.abs(dElementScaleX*10), 
					Math.abs(dElementScaleY*10) 
					)				
	);
	
	for (var inc=0; inc<discret; inc++)
	{			
		element.rollbackData = 
		{
				elementX: element.parent.elementX, 
				elementY:element.parent.elementY, 
				elementAngle:element.parent.elementAngle,
				elementScaleX:element.parent.elementScaleX,
				elementScaleY:element.parent.elementScaleY
		};

		element.parent.elementX += dElementX/discret; 
		element.parent.elementY += dElementY/discret; 
		element.parent.elementAngle += dElementAngle/discret;
		element.parent.elementScaleX += dElementScaleX/discret;
		element.parent.elementScaleY += dElementScaleY/discret;

		if (element.parent.preMove && !element.parent.preMove())
		{
//			console.log('Cannot move  '+ element.id);
			element.parent.elementX = element.rollbackData.elementX; 
			element.parent.elementY = element.rollbackData.elementY;
			element.parent.elementAngle = element.rollbackData.elementAngle;
			element.parent.elementScaleX = element.rollbackData.elementScaleX;
			element.parent.elementScaleY = element.rollbackData.elementScaleY;
			return;
		}

		if ( element.parent.elementX>element.movingLimits.xMax || element.parent.elementX<element.movingLimits.xMin)
		{
			element.parent.elementX = element.rollbackData.elementX; 
		}

		if (element.parent.elementY>element.movingLimits.yMax || element.parent.elementY<element.movingLimits.yMin) 				
		{
			element.parent.elementY = element.rollbackData.elementY; 
		}
		
		if (element.targetElementX !== undefined)
		{
			if ( 
			(element.targetElementX-element.parent.elementX)*(element.targetElementX-element.parent.elementX)<1
			&& (element.targetElementY-element.parent.elementY)*(element.targetElementY-element.parent.elementY) <1)
			{
				element.targetElementX = element.targetElementY = undefined;
				element.movingSpeed = element.oringalSpeed || new vector.Vector(0,0);
			}
		}

		element.parent.update('elementX', element.parent.elementX);
		element.parent.update('elementY', element.parent.elementY);				

		var newAngle = element.parent.elementAngle;
		while (newAngle > Math.PI)
			newAngle-= 2* Math.PI
		while (newAngle < -Math.PI)
			newAngle+= 2* Math.PI
		element.parent.update('elementAngle', newAngle );

		if (element.parent.elementScaleSpeed)
		{
			element.parent.update('elementScaleX', element.parent.elementScaleX);	
			element.parent.update('elementScaleY', element.parent.elementScaleY);	
		}
	}		
};

exports.applyTo = applyTo;