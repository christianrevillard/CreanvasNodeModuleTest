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
	
	var updateAfterCollision = function (element, other, collisionPoints)
	{
		var 
			colVectors, speedElement, speedOther, localSpeedElement, localSpeedOther, centerCollisionElement,l1,
			centerCollisionOther,l2;
		
		var collisionPoint = getCollisionPoint(collisionPoints);
		
		colVectors = collisionPoint.vectors;
			
		centerCollisionElement = new vector.Vector(collisionPoint.x-element.elementX, collisionPoint.y-element.elementY);								
		l1 = vector.vectorProduct(centerCollisionElement, colVectors.v).z;		

		centerCollisionOther = new vector.Vector(collisionPoint.x-other.elementX, collisionPoint.y-other.elementY);								
		l2= vector.vectorProduct(centerCollisionOther, colVectors.v).z;		

		var elementRot = vector.vectorProduct(
				centerCollisionElement,
				colVectors.v);	

		var otherRot = vector.vectorProduct(
				centerCollisionOther,
				colVectors.v);	

		speedElement = new vector.Vector(
			element.movingSpeed.x, 
			element.movingSpeed.y);
		
		speedOther = new vector.Vector(
			other.movingSpeed?other.movingSpeed.x:0, 
			other.movingSpeed?other.movingSpeed.y:0);

		if (element.elementScaleSpeed)
		{
			speedElement.x += centerCollisionElement.x*element.elementScaleSpeed.x;
			speedElement.y += centerCollisionElement.y*element.elementScaleSpeed.y;
		};

		if (other.elementScaleSpeed)
		{
			speedOther.x += centerCollisionOther.x*other.elementScaleSpeed.x;
			speedOther.y += centerCollisionOther.y*other.elementScaleSpeed.y;
		};

		localSpeedElement = speedElement.getCoordinates(colVectors);
		localSpeedOther = speedOther.getCoordinates(colVectors);

		var elementMass = element.fixedPoint ? Infinity:element.mass;
		var otherMass = other.fixedPoint ? Infinity:other.mass;
		var elementMOI = element.fixed ? Infinity:element.getMomentOfInertia();
		var otherMOI = other.fixed ? Infinity:other.getMomentOfInertia();

		var F = element.collisionCoefficient * other.collisionCoefficient * 2 *
			(localSpeedOther.v - localSpeedElement.v + (other.omega || 0) * otherRot.z - element.omega * elementRot.z)
			/( 1/otherMass + 1/elementMass + otherRot.z*otherRot.z/otherMOI + elementRot.z*elementRot.z/elementMOI );
				
		element.movingSpeed.x += F/elementMass*colVectors.v.x;
		element.movingSpeed.y += F/elementMass*colVectors.v.y;
		if (other.movingSpeed !== undefined)
		{
			other.movingSpeed.x -= F/otherMass*colVectors.v.x;
			other.movingSpeed.y -= F/otherMass*colVectors.v.y;
		}
		element.omega += F * l1 / elementMOI;
		other.omega -= F * l2 / otherMOI;
	};

	var hasCollided = function(element, elementRealEdges, otherElement)
	{
		var collisionPoints = elementRealEdges.filter(function(realEdge){ 			
			return otherElement.isPointInElementEdges(realEdge.x, realEdge.y);			
		});
		
		if (collisionPoints.length < 2)
			return false;
	
		updateAfterCollision(element, otherElement, collisionPoints);
	};

	this.solveCollision = function(element)
	{			
		var realEdges = element.getRealEdges();					

		return element
			.controller
			.elements
			.filter(function(e){return e.id != element.id && e.isSolid && !e.isDuplicable;})
			.every(
			function(other)
			{				
				return !hasCollided(element, realEdges, other);
			});
	};
};

exports.CollisionSolver = CollisionSolver;