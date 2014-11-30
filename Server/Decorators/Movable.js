var moving = require("./Moving");

var MovableElement = function(parent, movableData) {
	this.parent = parent;
	this.isBlocked =  movableData.isBlocked;
	this.alwaysMoving = movableData.alwaysMoving;
	this.suspendMoving = false;
};

MovableElement.prototype.startMoving = function () {
	console.log('startMoving: ' + this.parent.id  + ' from (' + this.parent.x +',' + this.parent.y +') ');
	this.isMoving = true;
	this.originalZ = this.parent.position.z;
	this.parent.position.z = this.parent.position.z + 100;	
};

MovableElement.prototype.stopMoving = function(eventData) {
	if (this.alwaysMoving)
		return;
	
	if (this.isBlocked && this.isBlocked(this.parent, eventData.originSocketId)) 
		return;

	this.isMoving = false;
	this.lastMoved = null;
	this.parent.position.z = this.originalZ;
	this.parent.touchIdentifier = null;

	return false;
};

MovableElement.prototype.onPointerDown = function(eventData) {
	if (this.isBlocked && this.isBlocked(this.parent, eventData.originSocketId)) 
		return;

	this.startMoving();
	this.suspendMoving = false;
	this.lastMoved = this.parent.controller.getTime();

	if (eventData.identifierElement) {
		eventData.identifierElement.touchIdentifier = null;
	}
	
	if (this.parent.droppable && this.parent.droppable.dropZone) {
		this.parent.droppable.dropZone.drag(this.parent);
	}
	
	this.parent.touchIdentifier = eventData.touchIdentifier;
	
	return false;
};

MovableElement.prototype.onPointerMove = function(eventData) {
	if (this.isBlocked && this.isBlocked(this.parent, eventData.originSocketId)) 
		return;

	if (!this.isMoving) {
		return true;
	}
				
	if (this.suspendMoving) {
		if (this.parent.isPointInElementEdges(eventData.x, eventData.y)) {
			this.suspendMoving = false;
		}
		else {
			return false;
		}
	}

	this.parent.moving.targetElementX = eventData.x;  
	this.parent.moving.targetElementY = eventData.y;

	return false;
};

var applyTo = function(element, movableData) {
	if (!element.moving)
		moving.applyTo(element, {});

	element.movable = new MovableElement(element, movableData);
	
	var controller = element.controller;
	
	element.addEventListener(
		'pointerDown',
		function(eventData) { return element.movable.onPointerDown(eventData); });

	element.addEventListener(
		'pointerMove', 
		function(eventData) { return element.movable.onPointerMove(eventData); });
	
	element.addEventListener(
		'pointerUp', 
		function(eventData) { return element.movable.stopMoving(eventData); });
};

exports.applyTo = applyTo;