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
};

MovingElement.prototype.xxmove = function(useExistingDt)
{
//	var rollbackData;
	
	var moving = this;
	
	moving.parent.previousPosition = null;
	moving.parent.previousScale = null;

	var dt;
	if(!useExistingDt)
	{
		var currentTime = moving.parent.controller.getTime();
		dt = currentTime - moving.lastUpdated;
		moving.parent.dt = dt;
		moving.lastUpdated = currentTime;
	}
	else
	{
		dt = moving.parent.dt;
	}
	
	if (dt < 0.001)
		return;

	
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
		// todo, after (or test with gravity first...)
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

	// can be used for newAngle value, it is useful to keep it in this range?
	/* var newAngle = moving.parent.position.angle;
	while (newAngle > Math.PI) newAngle-= 2* Math.PI;
	while (newAngle < -Math.PI) newAngle+= 2* Math.PI;
	moving.parent.position.angle = newAngle; */

	// temp rollback function, need to refine deplacemnt oon collision
	moving.parent.previousPosition = moving.parent.position;
	moving.parent.previousScale = moving.parent.scale;
	
	moving.parent.position = {
		x: moving.parent.position.x + dElementX,
		y: moving.parent.position.y + dElementY,
		angle: moving.parent.position.anlge + dElementAngle};

	moving.parent.previousBoundaryBox = moving.parent.boundaryBox;
	moving.parent.boundaryBox = moving.parent.getBoundaryBox(moving.parent.position);

	moving.parent.scale = {
		x: moving.parent.scale.x + dElementScaleX,
		y: moving.parent.scale.y + dElementScaleY};
	
	if ( moving.parent.position.x>moving.movingLimits.xMax || moving.parent.position.x<moving.movingLimits.xMin)
	{
		moving.parent.position.x = moving.parent.previousPosition.x; 
	}

	if (moving.parent.position.y>moving.movingLimits.yMax || moving.parent.position.y<moving.movingLimits.yMin) 				
	{
		moving.parent.position.y = moving.parent.previousPosition.y; 
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

	//moving.parent.previousTiles = moving.parent.broadTiles;
	
	moving.parent.broadTiles.forEach(function(tile){
		// remove from all tiles
		tile.elements = tile.elements.filter(function(remove){ return moving.parent.id != remove.id});
	});
	
	// readd, in both positions
	moving.parent.broadTiles = moving.parent.controller.broadTiles.filter(function(tile){
		return (tile.right>=moving.parent.boundaryBox.left &&
				tile.bottom>=moving.parent.boundaryBox.top &&
				tile.left<=moving.parent.boundaryBox.right &&
				tile.top<=moving.parent.boundaryBox.bottom)
				||
				(tile.right>=moving.parent.previousBoundaryBox.left &&
						tile.bottom>=moving.parent.previousBoundaryBox.top &&
						tile.left<=moving.parent.previousBoundaryBox.right &&
						tile.top<=moving.parent.previousBoundaryBox.bottom);
		});
	
	moving.parent.broadTiles.forEach(function(tile){
		tile.elements.push(moving.parent);
	});

};

MovingElement.prototype.xxaccelerate = function()
{
	var moving = this;
	
	if (moving.targetElementX !== undefined && moving.targetElementY !== undefined )
		return;

	moving.speed.x += moving.acceleration.x * moving.parent.dt;
	moving.speed.y += moving.acceleration.y * moving.parent.dt;			
};

// do not take previous here, do it at caller

MovingElement.prototype.commitMove = function(updates)
{	
	if(!updates.dt)
		return;

	var moving = this;

	moving.parent.position.x = updates.position.x || 0;
	moving.parent.position.y = updates.position.y || 0;
	moving.parent.position.angle = updates.position.angle || 0;

	moving.speed.x = updates.speed.x || 0;
	moving.speed.y = updates.speed.y || 0;	
	moving.speed.angle = updates.speed.angle || 0;	

	moving.parent.scale.x = updates.scale.x || 1;
	moving.parent.scale.y = updates.scale.y || 1;
	
	moving.parent.boundaryBox = updates.boundaryBox;
}

MovingElement.prototype.move = function(dt)
{	
	var moving = this;

	// deltas, to avoid storing previous !
	var updates = { 
		dt: dt, 
		position: {x: moving.parent.position.x,y: moving.parent.position.y},
		speed:{},
		scale:{}
	};
	
	if (dt == 0)
	{
		return updates;
	}
		
	updates.speed.x = moving.speed.x + moving.acceleration.x * dt;
	updates.speed.y = moving.speed.y + moving.acceleration.y * dt;				
	
	if (updates.speed.x==0 && updates.speed.y==0 && updates.speed.angle==0) // tood add scale
	{
		updates.dt=0;
		return updates;
	}

	updates.position.x = moving.parent.position.x + moving.speed.x * dt; 
	updates.position.y = moving.parent.position.y + moving.speed.y * dt; 
	updates.position.angle = moving.parent.position.angle + moving.speed.angle * dt;
	updates.scale.x = moving.parent.scale.x + moving.scaleSpeed?moving.scaleSpeed.x * dt : 0;
	updates.scale.x = moving.parent.scale.y + moving.scaleSpeed?moving.scaleSpeed.y * dt : 0;
	

	if (updates.position.x > moving.movingLimits.xMax)
	{
		updates.position.x = moving.movingLimits.xMax; 
	}

	if (updates.position.x < moving.movingLimits.xMin)
	{
		updates.position.x = moving.movingLimits.xMin; 
	}

	if (moving.parent.position.y > moving.movingLimits.yMax) 				
	{
		updates.position.y = moving.movingLimits.yMax; 
	}

	if (moving.parent.position.y < moving.movingLimits.yMin) 				
	{
		updates.position.y = moving.movingLimits.yMin; 
	}

	updates.boundaryBox = moving.parent.getBoundaryBox(updates.position);
	

	/*
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
*/
	//moving.parent.previousTiles = moving.parent.broadTiles;
	
	moving.parent.broadTiles.forEach(function(tile){
		// remove from all tiles
		tile.elements = tile.elements.filter(function(remove){ return moving.parent.id != remove.id});
	});
	
	// in both positions - so matrix prefilled with all possibilities - aviod to rerun broad phase
	moving.parent.broadTiles = moving.parent.controller.broadTiles.filter(function(tile){
		return (tile.right>=moving.parent.boundaryBox.left &&
				tile.bottom>=moving.parent.boundaryBox.top &&
				tile.left<=moving.parent.boundaryBox.right &&
				tile.top<=moving.parent.boundaryBox.bottom)
				||
				(tile.right>=updates.boundaryBox.left &&
						tile.bottom>=updates.boundaryBox.top &&
						tile.left<=updates.boundaryBox.right &&
						tile.top<=updates.boundaryBox.bottom);
		});
	
	moving.parent.broadTiles.forEach(function(tile){
		tile.elements.push(moving.parent);
	});

	return updates;
};














exports.applyTo = applyTo;