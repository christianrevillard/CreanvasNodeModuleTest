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

		speedElement = element.movingElement ? new vector.Vector(
			element.movingElement.movingSpeed?element.movingElement.movingSpeed.x:0, 
			element.movingElement.movingSpeed?element.movingElement.movingSpeed.y:0)
		: new vector.Vector(0,0);
		
		speedOther = other.movingElement ? new vector.Vector(
			other.movingElement.movingSpeed?other.movingElement.movingSpeed.x:0, 
			other.movingElement.movingSpeed?other.movingElement.movingSpeed.y:0):
				new vector.Vector(0,0);

		if (element.movingElement && element.movingElement.elementScaleSpeed)
		{
			speedElement.x += centerCollisionElement.x*element.movingElement.elementScaleSpeed.x;
			speedElement.y += centerCollisionElement.y*element.movingElement.elementScaleSpeed.y;
		};

		if (other.movingElement && other.movingElement.elementScaleSpeed)
		{
			speedOther.x += centerCollisionOther.x*other.movingElement.elementScaleSpeed.x;
			speedOther.y += centerCollisionOther.y*other.movingElement.elementScaleSpeed.y;
		};

		localSpeedElement = speedElement.getCoordinates(colVectors);
		localSpeedOther = speedOther.getCoordinates(colVectors);

		var elementMass = element.fixedPoint ? Infinity:element.mass;
		var otherMass = other.fixedPoint ? Infinity:other.mass;
		var elementMOI = element.fixed ? Infinity:element.getMomentOfInertia();
		var otherMOI = other.fixed ? Infinity:other.getMomentOfInertia();

		var F = element.collisionCoefficient * other.collisionCoefficient * 2 *
			(localSpeedOther.v - localSpeedElement.v + (other.omega || 0) * otherRot.z - (element.omega || 0) * elementRot.z)
			/( 1/otherMass + 1/elementMass + otherRot.z*otherRot.z/otherMOI + elementRot.z*elementRot.z/elementMOI );

		// should not be needed... do it better
/*		if (!element.movingSpeed)
		{
			element.movingSpeed = {x:0,y:0};
		}*/

		// require moving for collidable 
		element.movingElement.movingSpeed.x += F/elementMass*colVectors.v.x;
		element.movingElement.movingSpeed.y += F/elementMass*colVectors.v.y;
		
/*		if (!other.movingSpeed)
		{
			other.movingSpeed = {x:0,y:0};
		}*/

		other.movingElement.movingSpeed.x -= F/otherMass*colVectors.v.x;
		other.movingElement.movingSpeed.y -= F/otherMass*colVectors.v.y;
		
		element.movingElement.omega += F * l1 / elementMOI;
		other.movingElement.omega -= F * l2 / otherMOI;		
	};

	var hasCollided = function(element, otherElement)
	{
		var elementEdges = element.getRealEdges();
		var otherEdges = otherElement.getRealEdges();
		
		if(elementEdges.box.radius + otherEdges.box.radius < element.getDistance(otherElement.elementX, otherElement.elementY))
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
		console.log("Element: " + JSON.stringify({x:element.elementX.toFixed(2), y:element.elementY.toFixed(2)}));
		console.log("OtherEl: " + JSON.stringify({x:otherElement.elementX.toFixed(2), y:otherElement.elementY.toFixed(2)}));
		console.log("Collisi: " + JSON.stringify(collisionPoints));
		console.log("ElBefore: " + JSON.stringify({vx:element.movingSpeed?element.movingSpeed.x.toFixed(2):0, vy:element.movingSpeed?element.movingSpeed.y.toFixed(2):0, o:element.omega?element.omega.toFixed(2):0}));		
		console.log("OeBefore: " + JSON.stringify({vx:otherElement.movingSpeed?otherElement.movingSpeed.x.toFixed(2):0, vy:otherElement.movingSpeed?otherElement.movingSpeed.y.toFixed(2):0, o:otherElement.omega?otherElement.omega.toFixed(2):0}));
		updateAfterCollision(element, otherElement, collisionPoints);
		console.log("ElAfter: " + JSON.stringify({vx:element.movingSpeed?element.movingSpeed.x.toFixed(2):0, vy:element.movingSpeed?element.movingSpeed.y.toFixed(2):0, o:element.omega?element.omega.toFixed(2):0}));		
		console.log("OeAfter: " + JSON.stringify({vx:otherElement.movingSpeed?otherElement.movingSpeed.x.toFixed(2):0, vy:otherElement.movingSpeed?otherElement.movingSpeed.y.toFixed(2):0, o:otherElement.omega?otherElement.omega.toFixed(2):0}));
				
		return true;
	};

	this.solveCollision = function(element)
	{			
		return element
			.controller
			.elements
			.filter(function(e){return e.id != element.id && e.isSolid && !e.isDuplicable;})
			.every(
			function(other)
			{				
				return !hasCollided(element, other);
			});
	};
};

exports.CollisionSolver = CollisionSolver;