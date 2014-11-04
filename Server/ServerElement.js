var decorators = require("./Decorators");

var Element = function(controller, identificationData, imageData, positionData) {

	var element = this;

	element.id = controller.elements.length + 1; 

	this.controller = controller;
	this.cachedValues = [];
	this.clonerData = [];
	// this.elementEvents = this.elementEvents || new
	// CreJs.Creevents.EventContainer();

	setIdentification(element, identificationData[1]);
	setImage(element, imageData[1]);
	setPosition(element, positionData[1]);

	this.clonerData.push(identificationData);
	this.clonerData.push(imageData);
	this.clonerData.push(positionData);

	this.events = [];
	// element.controller.elementEvents.getEvent('deactivate').addListener(function(e)
	// { element.deactivate(); });
};

var setIdentification = function(element, identificationData) {
	element.elementName = identificationData;
};

var setImage = function(element, imageData) {
	var width = imageData["width"];
	var height = imageData["height"];

	element.top = imageData["top"] == 0 ? 0 : imageData["top"] || (-height / 2);
	element.left = imageData["left"] == 0 ? 0 : imageData["left"]
			|| (-width / 2);
	element.bottom = imageData["bottom"] == 0 ? 0 : imageData["bottom"]
			|| (element.top + height);
	element.right = imageData["right"] == 0 ? 0 : imageData["right"]
			|| (element.left + width);
	element.elementWidth = width || (element.right - element.left);
	element.elementHeight = height || (element.bottom - element.top);

	// scaling decorator ?? => should be
	element.update('elementScaleX', imageData["scaleX"] || 1);
	element.update('elementScaleY', imageData["scaleY"] || 1);

	element.update('typeName', imageData["typeName"]);
};

var setPosition = function(element, position) {
	// position prop
	element.update('elementX', position["x"] || 0);
	element.update('elementY', position["y"] || 0);
	element.update('elementZ', position["z"] || 0);
	element.update('elementAngle', position["angle"] || 0);
};

Element.prototype.update = function(field, value) {
	this.toUpdate = this.toUpdate || {
		id : this.id
	};
	this.toUpdate[field] = this[field] = value;
};

Element.prototype.fullUpdate = function() {
	this.toUpdate = this.toUpdate || { id : this.id };
	this.toUpdate.elementX = this.elementX;
	this.toUpdate.elementY = this.elementY;
	this.toUpdate.elementZ = this.elementZ;
	this.toUpdate.elementScaleX = this.elementScaleX;
	this.toUpdate.elementScaleY = this.elementScaleY;
	this.toUpdate.elementAngle = this.elementAngle;
	this.toUpdate.typeName = this.typeName;
};

Element.prototype.applyElementDecorator = function(decoratorType,
		decoratorSettings) {
	// console.log("applyElementDecorator: " + decoratorType);

	var decorator = decorators[decoratorType];

	if (decorator) {
		this.clonerData.push([ decoratorType, decoratorSettings ]);
		decorator.applyTo(this, decoratorSettings);
	} else {
		console.log("applyElementDecorator: Not found: " + decoratorType);
	}
};

/*
 * creanvas.Element.prototype.getCacheableValue = function(cacheKey, currentKey,
 * getData) { if (this.cachedValues[cacheKey] && this.cachedValues[cacheKey].key ==
 * currentKey) { return this.cachedValues[cacheKey].value; } var newValue =
 * getData.call(this); this.cachedValues[cacheKey] = {key:currentKey,
 * value:newValue}; return newValue; };
 */

// unpractical syntax... ignore is unnatural here TODO
Element.prototype.cloneElement = function(ignoreDecorators) {
	// console.log("cloneElement : start cloning");

	var elementsToApply = ignoreDecorators ? this.clonerData
			.filter(function(d) {
				return ignoreDecorators.every(function(toIgnore) {
					return toIgnore != d[0];
				});
			}) : this.clonerData;

	// console.log("cloneElement: apply " + elementsToApply.length + " stuff");

	var clone = this.controller.addElement.apply(this.controller,
			elementsToApply);
	clone.update('elementZ', this.elementZ + 1);
	return clone;
};

/*
 * creanvas.Element.prototype.canHandleEvent = function(eventId) { // click,
 * pointerDown, always stopped by top element, even if not handled return
 * eventId == 'click' || eventId == 'pointerDown' ||
 * this.elementEvents.hasEvent(eventId); };
 */

Element.prototype.applyElementDecorators = function() {
	var element = this;

	var newDecorators = [].slice.apply(arguments);

	newDecorators.forEach(function(decoratorArgument) {
		element.applyElementDecorator(decoratorArgument[0],
				decoratorArgument[1]);
	});
};

Element.prototype.triggerEvent = function(eventData) {
	var bubble = true

	this.events.filter(function(e) {
		return e.eventId == eventData.eventId
	}).forEach(function(e) {
		if (e.action) {
			bubble = e.action(eventData) && bubble;
		}
	});

	return bubble;
};

Element.prototype.addEventListener = function(eventId, action) {
	var id = this.events.length + 1;
	this.events.push({
		eventId : eventId,
		action : action,
		id : id
	});
	return id;
};

Element.prototype.removeEventListener = function(id) {
	this.events.filter(function(e) {
		return e.id == id
	}).forEach(function(e) {
		e.action = null;
	});
};
	
Element.prototype.isPointInElementEdges = function(x, y) {

	var element = this;
	
	// borderline effect with y, just remove them ! (alt, map to 1.001 or something, or?)
	var realEdges = element.getRealEdges().edges.filter(function(realEdge){return realEdge.y != y });

	if (realEdges.length == 0)
		return false;;

	var edgeSegments = [];
	
	for(var i=0; i < realEdges.length; i++)
	{
		edgeSegments.push({A:realEdges[i], B:realEdges[i==realEdges.length-1?0:i+1], i:i});
	}
	
	var intersections = edgeSegments
		.filter(function(s){ 
			return (s.A.y-y)*(s.B.y-y)<0 && 
			(s.A.x > x || s.B.x > x) &&
			((s.A.x > x && s.B.x > x) || s.A.x + (y-s.A.y)*(s.B.x - s.A.x)/(s.B.y-s.A.y) > x )
			; });

	return intersections.length % 2 == 1;
};

Element.prototype.getRealXYFromElementXY  = function(elementXY)
{	
	var element= this;
	
	var xy = { 
		x: (element.elementX + element.elementScaleX * (elementXY.x*Math.cos(element.elementAngle) - elementXY.y*Math.sin(element.elementAngle))),
		y: (element.elementY + element.elementScaleY * (elementXY.x*Math.sin(element.elementAngle) + elementXY.y*Math.cos(element.elementAngle)))};
	
	//console.log ("("+ elementXY.x  +","+ elementXY.y+") => ("+ xy.x  +","+ xy.y+")");
	return xy;
};

Element.prototype.getEdges = function()
{
	if (this.edges)
		return this.edges;

	var element = this;
	
	var elementType = element.controller.elementTypes.filter(function(t){ return t.typeName == element.typeName});
	
	if (elementType.length == 0 || !elementType[0].edges)
		return [];

	return this.edges = elementType[0].edges; 	
}

Element.prototype.getDistance = function(x,y)
{
	return Math.sqrt((this.elementX-x)*(this.elementX-x) + (this.elementY-y)*(this.elementY-y));
};

Element.prototype.getRealEdges  = function()
{
	var element = this;

	if (!this.realEdges 
			|| this.realEdges.edges.length == 0
			|| this.realEdges.info.x!=this.elementX 
			|| this.realEdges.info.y!=this.elementY
			|| this.realEdges.info.angle!=this.elementAngle
			|| this.realEdges.info.scaleX!=this.elementScaleX
			|| this.realEdges.info.scaleY!=this.elementScaleY)
	{
		var realEdges = this.getEdges().map(function(e){ return element.getRealXYFromElementXY(e)});
			
		this.realEdges = 
			{	
				info:
				{
					x: this.elementX,
					y: this.elementY,
					angle: this.elementAngle,
					scaleX: this.elementScaleX,
					scaleY: this.elementScaleY
				},
				edges: realEdges,
				box:
				{
					radius: realEdges.reduce(function(current,edge){ return Math.max(current,element.getDistance(edge.x, edge.y));}, 0),				
					left: realEdges.reduce(function(current,edge){ return Math.min(current,edge.x);}, Infinity),
					top: realEdges.reduce(function(current,edge){ return Math.min(current,edge.y);}, Infinity),
					right: realEdges.reduce(function(current,edge){ return Math.max(current,edge.x);}, 0),
					bottom: realEdges.reduce(function(current,edge){ return Math.max(current,edge.y);}, 0)				
				}
			};
	}

	return this.realEdges
};

exports.Element = Element;