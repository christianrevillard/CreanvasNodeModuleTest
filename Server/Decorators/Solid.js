var collisionSolver = require('../CollisionSolver');
var moving = require("./Moving");

var SolidElement = function(parent, solidData) {
	this.parent = parent;
	this.mass = solidData.mass === 0 ? 0 : solidData.mass || Infinity;
	this.collisionCoefficient = solidData.collisionCoefficient === 0 ? 0 : solidData.collisionCoefficient || 1;
	this.isInside = solidData.isInside;
};

SolidElement.prototype.preMove = function() {		
	if (this.parent.duplicable)
		return true;		

	return this.parent.controller.collisionSolver.solveCollision(this.parent);		
};

SolidElement.prototype.getMomentOfInertia = function()
{			
	var element = this.parent;

	return this.mass / 12 * 
		(element.box.width*element.scale.x * element.box.width*element.scale.x + 
		element.box.height*element.scale.y * element.box.height*element.scale.y); // square...};
};

var applyTo = function(element, solidData) {
	console.log('Applying solid');

	var controller = element.controller;

	controller.collisionSolver = controller.collisionSolver || new collisionSolver.CollisionSolver(controller);
	
	element.solid = new SolidElement(element, solidData);
			
	if (!element.moving)
		moving.applyTo(element, {});
};

exports.applyTo = applyTo;