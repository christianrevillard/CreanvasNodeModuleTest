var vector = require('./Vector');

var CollisionSolver = function(controller) {				
	var getCollisionPoint = function(edges)
	{		
		var d,dmax = 0;
		var theMax = {i:0, j:edges.length-1};
		for (var i = 1; i<edges.length; i++)
		{
			for (var j = i+1; j<edges.length; j++)
			{
				var dx = edges[i].x-edges[j].x;
				var dy = edges[i].y-edges[j].y;
				d = Math.sqrt(dx*dx+dy*dy);
				if (d>dmax)
				{
					dmax=d;
					theMax.i = i;
					theMax.j = j;
				};
			};																			
		};

		var point1 = edges[theMax.i];
		var point2 = edges[theMax.j];
		
		return {
			x:(point1.x + point2.x)/2, 
			y:(point1.y + point2.y)/2, 
			vectors: vector.getUnitVectors(point1.x, point1.y,  point2.x , point2.y)};			
	};
	
	var getCollisionDetails = function (element, other, collisionPoints)
	{
		if (element.solid.mass == Infinity && other.solid.mass == Infinity)
		{
			return;
		}
			
		collisionPoints.forEach(
		function(cp){
			console.log("collisionPoint: " + cp.x + "," + cp.y);
		}		
		);
		
		var 
			colVectors, speedElement, speedOther, localSpeedElement, localSpeedOther, centerCollisionElement,l1,
			centerCollisionOther,l2;
		
		var collisionPoint = getCollisionPoint(collisionPoints);

		console.log("collisionPoint summary : " + collisionPoint.x + "," + collisionPoint.y);

		colVectors = collisionPoint.vectors;
			
		centerCollisionElement = new vector.Vector(collisionPoint.x-element.position.x, collisionPoint.y-element.position.y);								
		l1 = vector.vectorProduct(centerCollisionElement, colVectors.v).z;		

		centerCollisionOther = new vector.Vector(collisionPoint.x-other.position.x, collisionPoint.y-other.position.y);								
		l2= vector.vectorProduct(centerCollisionOther, colVectors.v).z;		

		var elementRot = vector.vectorProduct(
				centerCollisionElement,
				colVectors.v);	

		var otherRot = vector.vectorProduct(
				centerCollisionOther,
				colVectors.v);	

		speedElement = element.moving ? new vector.Vector(
			element.moving.speed?element.moving.speed.x:0, 
			element.moving.speed?element.moving.speed.y:0)
		: new vector.Vector(0,0);
		
		speedOther = other.moving ? new vector.Vector(
			other.moving.speed?other.moving.speed.x:0, 
			other.moving.speed?other.moving.speed.y:0):
				new vector.Vector(0,0);

		if (element.moving && element.moving.scaleSpeed)
		{
			speedElement.x += centerCollisionElement.x*element.moving.scaleSpeed.x;
			speedElement.y += centerCollisionElement.y*element.moving.scaleSpeed.y;
		};

		if (other.moving && other.moving.scaleSpeed)
		{
			speedOther.x += centerCollisionOther.x*other.moving.scaleSpeed.x;
			speedOther.y += centerCollisionOther.y*other.moving.scaleSpeed.y;
		};

		localSpeedElement = speedElement.getCoordinates(colVectors);
		localSpeedOther = speedOther.getCoordinates(colVectors);

		var elementMass = element.fixedPoint ? Infinity:element.solid.mass;
		var otherMass = other.fixedPoint ? Infinity:other.solid.mass;
		var elementMOI = element.fixed ? Infinity:element.solid.getMomentOfInertia();
		var otherMOI = other.fixed ? Infinity:other.solid.getMomentOfInertia();

		var F = element.solid.collisionCoefficient * other.solid.collisionCoefficient * 2 *
			(localSpeedOther.v - localSpeedElement.v 
					+ other.moving.speed.angle * otherRot.z 
					- element.moving.speed.angle * elementRot.z)
			/( 1/otherMass + 1/elementMass + otherRot.z*otherRot.z/otherMOI + elementRot.z*elementRot.z/elementMOI );

		return {
			e1:{
				dSpeedX: F/elementMass*colVectors.v.x,
				dSpeedY: F/elementMass*colVectors.v.y,
				dSpeedAngle: F * l1 / elementMOI},
			e2:{
				dSpeedX: -F/otherMass*colVectors.v.x,
				dSpeedY: -F/otherMass*colVectors.v.y,
				dSpeedAngle:- F * l2 / otherMOI}
		};
	};

	this.getCollision = function(element, position, otherElement, otherPosition)
	{
		var start = new Date().getTime();
		
		var realBox = element.getRealBox();
		var otherRealBox = otherElement.getRealBox();
		
		// broad stuff 
		if (realBox.right < otherRealBox.left)
			return { collided: false};

		if (otherRealBox.right < realBox.left)
			return { collided: false};

		if (realBox.bottom < otherRealBox.top)
			return { collided: false};

		if (otherRealBox.bottom < realBox.top)
			return { collided: false};

		var collisionPoints = [];

		if (element.getDistance(otherPosition.x, otherPosition.y)<50)
		{
			var col = { x:(otherPosition.x+position.x)/2,
						y:(otherPosition.y+position.y)/2};
			collisionPoints.push({x:col.x, y:col.y-5});
			collisionPoints.push({x:col.x, y:col.y+5});
		}
			
			
		if (collisionPoints.length < 2)
		{
			//console.log("No collision. Time: " + (new Date().getTime()-start));
			return { collided: false};
		}
		
		console.log("Collision. Total time find+update: " + (new Date().getTime()-start));

		return {
			collided: true,
			collisionDetails: getCollisionDetails(element, otherElement, collisionPoints)};
	};
};

exports.CollisionSolver = CollisionSolver;