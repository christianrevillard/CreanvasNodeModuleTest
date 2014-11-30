var DuplicableElement = function(element, duplicableData)
{
	this.parent = element; // can we do better than this ??
	this.isBlocked = duplicableData.isBlocked;
	this.generatorCount = duplicableData.generatorCount || Infinity;
	this.applied = true;
};

DuplicableElement.prototype.makeCopy = function(e){

	if (this.isBlocked && this.isBlocked(this.parent, e.originSocketId)) 
		return;
	
	console.log('duplicable.makeCopy: GeneratorCount was: ' + this.generatorCount);

	if (this.generatorCount<=0) 
		return;

	this.generatorCount--;

	var copy = this.parent.cloneElement();
	copy.name+= " (duplicate)";

	copy.applyElementDecorator(
		"movable",
		{
			isBlocked : this.isBlocked,
		});
	
	copy.touchIdentifier =  e.touchIdentifier; 
	copy.movable.startMoving();
};

var applyTo = function(element, duplicableData) {

	if (duplicableData.applied)
		return;
	
	console.log('Apply duplicable to ' + element.id);
	
	var controller = element.controller;
	
	element.duplicable = new DuplicableElement(element, duplicableData);					

	element.addEventListener(
		'pointerDown',
		function(eventData)
		{
			console.log('Duplicating' + element.id  + ' at (' + element.x +',' + element.y +')');
			element.duplicable.makeCopy(eventData);			
			return false;
		});	
	
	console.log('Applied duplicable to ' + element.id);
};

exports.applyTo = applyTo;