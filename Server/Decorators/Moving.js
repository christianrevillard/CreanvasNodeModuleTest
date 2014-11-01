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
		
		// will need a real one here !
		var updatedElement = {
				elementX: element.elementX + element.movingSpeed.x * dt, 
				elementY:element.elementY + element.movingSpeed.y * dt, 
				elementAngle:element.elementAngle + element.omega * dt,
				elementScaleX:element.elementScaleSpeed?element.elementScaleX + element.elementScaleSpeed.x * dt : element.elementScaleX,
				elementScaleY:element.elementScaleSpeed?element.elementScaleY + element.elementScaleSpeed.y * dt : element.elementScaleY,
				edges: element.edges,
				getEdges: element.getEdges,
				controller:element.controller,
				getRealXYFromElementXY:element.getRealXYFromElementXY};

		if (element.preMove && !element.preMove(updatedElement))
		{
//			console.log('Cannot move  '+ element.id);
			return;
		}

		element.update('elementX', updatedElement.elementX);
		element.update('elementY', updatedElement.elementY);				

		var newAngle = updatedElement.elementAngle;
		while (newAngle > Math.PI)
			newAngle-= 2* Math.PI
		while (newAngle < -Math.PI)
			newAngle+= 2* Math.PI
		element.update('elementAngle', newAngle );

		if (element.elementScaleSpeed)
		{
			element.update('elementScaleX', updatedElement.elementScaleX);	
			element.update('elementScaleY', updatedElement.elementScaleY);	
		}
		
	}, 40);
		
};

exports.applyTo = applyTo;