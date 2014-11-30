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
		if (element.mass == Infinity && other.mass == Infinity)
		{
			return;
		}
				
		var 
			colVectors, speedElement, speedOther, localSpeedElement, localSpeedOther, centerCollisionElement,l1,
			centerCollisionOther,l2;
		
		var collisionPoint = getCollisionPoint(collisionPoints);
		
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

		console.log('localSpeedOther.v: ' + localSpeedOther.v);
		console.log('localSpeedElement.v: ' + localSpeedElement.v);

		var elementMass = element.fixedPoint ? Infinity:element.mass;
		var otherMass = other.fixedPoint ? Infinity:other.mass;
		var elementMOI = element.fixed ? Infinity:element.getMomentOfInertia();
		var otherMOI = other.fixed ? Infinity:other.getMomentOfInertia();

		var F = element.collisionCoefficient * other.collisionCoefficient * 2 *
			(localSpeedOther.v - localSpeedElement.v 
					+ other.moving.speed.angle * otherRot.z 
					- element.moving.speed.angle * elementRot.z)
			/( 1/otherMass + 1/elementMass + otherRot.z*otherRot.z/otherMOI + elementRot.z*elementRot.z/elementMOI );

		console.log('F: ' + F);

		element.moving.speed.x += F/elementMass*colVectors.v.x;
		element.moving.speed.y += F/elementMass*colVectors.v.y;
		
		other.moving.speed.x -= F/otherMass*colVectors.v.x;
		other.moving.speed.y -= F/otherMass*colVectors.v.y;
		
		element.moving.speed.angle += F * l1 / elementMOI;
		other.moving.speed.angle -= F * l2 / otherMOI;				
	};

	var hasCollided = function(element, otherElement)
	{
		var elementEdges = element.getRealEdges();
		var otherEdges = otherElement.getRealEdges();
		
		if(elementEdges.box.radius + otherEdges.box.radius < element.getDistance(otherElement.x, otherElement.y))
			return false;
			
		if (elementEdges.box.right < otherEdges.box.left)
			return false;

		if (otherEdges.box.right < elementEdges.box.left)
			return false;

		if (elementEdges.box.bottom < otherEdges.box.top)
			return false;

		if (otherEdges.box.bottom < elementEdges.box.top)
			return false;
		
		var wasIn = undefined;
		var previousEdge = undefined;

		var collisionSegments = [];
		var collisionPoints = 0;
		elementEdges.edges.forEach(function(realEdge){
			var isIn = otherElement.isPointInElementEdges(realEdge.x, realEdge.y);
			if (wasIn != undefined && wasIn != isIn)
			{
				collisionPoints++;
				if(wasIn)
				{	
					collisionSegments.push({A:previousEdge, B:realEdge});
				}
				else
				{
					collisionSegments.push({A:realEdge, B:previousEdge});					
				}
			}
			wasIn = isIn;
			previousEdge = realEdge;
		});
		
		
		//close the loop;
		var firstEdge = elementEdges.edges[0];
		var firstIn = otherElement.isPointInElementEdges(firstEdge.x, firstEdge.y);
		if (wasIn != firstIn)
		{
			collisionPoints++;
			if(wasIn)
			{	
				collisionSegments.push({A:previousEdge, B:firstEdge});
			}
			else
			{
				collisionSegments.push({A:firstEdge, B:previousEdge});
			}
		}

//		if (collisionPoints<2)
	//		return;

		if (collisionSegments.length < 2)
			return false;		
		
		var collisionPoints = collisionSegments.map(function(s){
			while (Math.abs(s.A.x - s.B.x)>1 || Math.abs(s.A.y - s.B.y)>1)
			{
				var x = (s.A.x + s.B.x)/2;
				var y = (s.A.y + s.B.y)/2;
				if (otherElement.isPointInElementEdges(x, y))
				{
					s.A = {x:x,y:y};
				}
				else
				{
					s.B = {x:x,y:y};
				}
			}
			return {x:(s.A.x+s.B.x)/2,y:(s.A.y+s.B.y)/2};
			});
				
		updateAfterCollision(element, otherElement, collisionPoints);
		
		return true;
	};

	this.solveCollision = function(element)
	{			
		return element
			.controller
			.elements
			.filter(function(e){return e.id != element.id && e.isSolid && !e.duplicable;})
			.every(
			function(other)
			{				
				return !hasCollided(element, other);
			});
	};
};

exports.CollisionSolver = CollisionSolver;