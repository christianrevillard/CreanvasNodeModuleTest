var vector = require('../Vector');

var applyTo = function(element, elementMoving)
{	

	console.log('Applying moving');

	var vx = elementMoving["vx"];
	var vy = elementMoving["vy"];
	var ax = elementMoving["ax"];
	var ay = elementMoving["ay"];
	var omega = elementMoving["rotationSpeed"];


	var lastUpdated, currentTime, dt, rollbackData;
	
	element.movingSpeed = new vector.Vector( vx || 0, vy || 0);
	element.movingAcceleration = new vector.Vector( ax || 0, ay || 0);
	element.omega = omega || 0;

	console.log('moving: ' + element.movingSpeed.x + element.movingSpeed.y + element.omega);

	lastUpdated = element.controller.getTime();

	element.controller.setInterval(function() {
		
		currentTime = element.controller.getTime();
		dt = currentTime - lastUpdated;

		if (dt < 0.001)
			return;

		lastUpdated = currentTime;

		element.movingSpeed.x += element.movingAcceleration.x * dt;
		element.movingSpeed.y += element.movingAcceleration.y * dt;

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

		
		var discret = Math.ceil(Math.max(Math.abs(dElementX),Math.abs(dElementY)));
		
		for (var inc=0; inc<discret; inc++)
		{
			element.rollbackData = 
			{
					elementX: element.elementX, 
					elementY:element.elementY, 
					elementAngle:element.elementAngle,
					elementScaleX:element.elementScaleX,
					elementScaleY:element.elementScaleY
			};
	
			element.elementX += dElementX/discret; 
			element.elementY += dElementY/discret; 
			element.elementAngle += dElementAngle/discret;
			element.elementScaleX += dElementScaleX/discret;
			element.elementScaleY += dElementScaleY/discret;
	
			if (element.preMove && !element.preMove())
			{
	//			console.log('Cannot move  '+ element.id);
				element.elementX = element.rollbackData.elementX; 
				element.elementY = element.rollbackData.elementY;
				element.elementAngle = element.rollbackData.elementAngle;
				element.elementScaleX = element.rollbackData.elementScaleX;
				element.elementScaleY = element.rollbackData.elementScaleY;
				return;
			}
			
			element.update('elementX', element.elementX);
			element.update('elementY', element.elementY);				

			var newAngle = element.elementAngle;
			while (newAngle > Math.PI)
				newAngle-= 2* Math.PI
			while (newAngle < -Math.PI)
				newAngle+= 2* Math.PI
			element.update('elementAngle', newAngle );

			if (element.elementScaleSpeed)
			{
				element.update('elementScaleX', element.elementScaleX);	
				element.update('elementScaleY', element.elementScaleY);	
			}

		}
	}, 40);
		
};

exports.applyTo = applyTo;