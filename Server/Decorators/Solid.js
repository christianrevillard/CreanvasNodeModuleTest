var collisionSolver = require('../CollisionSolver');
var moving = require("./Moving");

var applyTo = function(element, solidData) {
	var controller = element.controller;
	
	element.isSolid = true;
	
	element.mass = solidData.mass || Infinity;
	element.collisionCoefficient = solidData.collisionCoefficient || 1;

	console.log('Applying solid');
	
	controller.collisionSolver = controller.collisionSolver || new collisionSolver.CollisionSolver(controller);
	
	if (!element.moving)
		moving.applyTo(element, {});

	// TODO: can other type than Solid implement a Premove: change stuff here...
	element.preMove = function()
	{		
		if (this.isDuplicable)
			return true;		

		if (!this.isSolid)
			return true;		

		return controller.collisionSolver.solveCollision(this);		
	};
	
	element.getMomentOfInertia = function()
	{				
		return element.mass / 12 * 
		(element.box.width*element.scale.x * element.box.width*element.scale.x + 
		element.box.height*element.scale.y * element.box.height*element.scale.y); // square...};
	};
};

exports.applyTo = applyTo;