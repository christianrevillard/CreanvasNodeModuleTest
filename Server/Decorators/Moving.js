var applyTo = function(element, elementMoving)
{	
	console.log('Applying moving');	
	element.moving = new MovingElement(element, elementMoving);		
}		

var MovingElement = function(parent, elementMoving)
{	
	var moving = this;
	
	moving.parent = parent;
	
	elementMoving.speed = elementMoving.speed || {};
	
	moving.speed = {
		x: elementMoving.speed.x || 0, 
		y: elementMoving.speed.y || 0, 
		angle: elementMoving.speed.angle || 0
	};
	
	elementMoving.acceleration = elementMoving.acceleration || {};

	moving.acceleration = { 
		x: elementMoving.acceleration.x || 0, 
		y: elementMoving.acceleration.y || 0,
		angle: elementMoving.acceleration.angle || 0
	};

	elementMoving.scaleSpeed = elementMoving.scaleSpeed || {};

	moving.scaleSpeed = { 
		x: elementMoving.scaleSpeed.x || 0, 
		y: elementMoving.scaleSpeed.y || 0
	};

	elementMoving.movingLimits = elementMoving.movingLimits || {};

	moving.movingLimits = {
		vMax: elementMoving.movingLimits.vMax === 0 ? 0 : elementMoving.movingLimits.vMax || Infinity,
		xMin: elementMoving.movingLimits.xMin === 0 ? 0 : elementMoving.movingLimits.xMin || -Infinity,
		yMin: elementMoving.movingLimits.yMin === 0 ? 0 : elementMoving.movingLimits.yMin || -Infinity,
		xMax: elementMoving.movingLimits.xMax === 0 ? 0 : elementMoving.movingLimits.xMax || Infinity,
		yMax: elementMoving.movingLimits.yMax === 0 ? 0 : elementMoving.movingLimits.yMax || Infinity
	};
	
	moving.lastUpdated = moving.parent.controller.getTime();
	
	parent.controller.setInterval(
		function(){ moving.move() },
		40);
};

MovingElement.prototype.move = function()
{
	var rollbackData;
	var moving = this;

	var currentTime = moving.parent.controller.getTime();
	var dt = currentTime - moving.lastUpdated;

	if (dt < 0.001)
		return;

	moving.lastUpdated = currentTime;
	
	if (moving.targetElementX !== undefined && moving.targetElementY !== undefined )
	{
		//overriding speed until we get there.
		if (!moving.originalSpeed)
			moving.originalSpeed = moving.speed
	
			moving.speed =  {
				x: (moving.targetElementX - moving.parent.position.x)/dt,
				y: (moving.targetElementY - moving.parent.position.y)/dt,
				angle: 0
			};

		var v = Math.sqrt(moving.speed.x*moving.speed.x + moving.speed.y*moving.speed.y);
		if (v > moving.movingLimits.vMax)
		{
			moving.speed.x *= moving.movingLimits.vMax / v;
			moving.speed.y *= moving.movingLimits.vMax / v;
		}
	}
	else
	{
		moving.speed.x += moving.acceleration.x * dt;
		moving.speed.y += moving.acceleration.y * dt;			
	}
	
	

	if (moving.speed.x == 0 &&
			moving.speed.y == 0 &&
			moving.speed.angle == 0 &&
			(!moving.scaleSpeed ||(
					moving.scaleSpeed.x == 0 && moving.scaleSpeed.y==0						
			)))
	{
		return;
	}
	

	dElementX = moving.speed.x * dt; 
	dElementY = moving.speed.y * dt; 
	dElementAngle = moving.speed.angle * dt;
	dElementScaleX = moving.scaleSpeed?moving.scaleSpeed.x * dt : 0;
	dElementScaleY = moving.scaleSpeed?moving.scaleSpeed.y * dt : 0;

	
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
		moving.rollbackData = 
		{
				x: moving.parent.position.x, 
				y: moving.parent.position.y, 
				angle: moving.parent.position.angle,
				scaleX: moving.parent.scale.x,
				scaleY: moving.parent.scale.y
		};

		moving.parent.position.x += dElementX/discret; 
		moving.parent.position.y += dElementY/discret; 
		moving.parent.position.angle += dElementAngle/discret;
		moving.parent.scale.x += dElementScaleX/discret;
		moving.parent.scale.y += dElementScaleY/discret;

		if (moving.parent.solid && !moving.parent.solid.preMove())
		{
//			console.log('Cannot move  '+ element.id);
			moving.parent.position.x = moving.rollbackData.x; 
			moving.parent.position.y = moving.rollbackData.y;
			moving.parent.position.angle = moving.rollbackData.angle;
			moving.parent.scale.x = moving.rollbackData.scaleX;
			moving.parent.scale.y = moving.rollbackData.scaleY;
			return;
		}

		if ( moving.parent.position.x>moving.movingLimits.xMax || moving.parent.position.x<moving.movingLimits.xMin)
		{
			moving.parent.position.x = moving.rollbackData.x; 
		}

		if (moving.parent.position.y>moving.movingLimits.yMax || moving.parent.position.y<moving.movingLimits.yMin) 				
		{
			moving.parent.position.y = moving.rollbackData.y; 
		}
		
		if (moving.targetElementX !== undefined)
		{
			if ( 
			(moving.targetElementX-moving.parent.position.x)*(moving.targetElementX-moving.parent.position.x)<1
			&& (moving.targetElementY-moving.parent.position.y)*(moving.targetElementY-moving.parent.position.y) <1)
			{
				moving.targetElementX = moving.targetElementY = undefined;
				moving.speed = moving.originalSpeed || { x:0, y:0, angle:0};
			}
		}

		var newAngle = moving.parent.position.angle;
		while (newAngle > Math.PI) newAngle-= 2* Math.PI;
		while (newAngle < -Math.PI) newAngle+= 2* Math.PI;
		moving.parent.position.angle = newAngle;
	}		
};

exports.applyTo = applyTo;