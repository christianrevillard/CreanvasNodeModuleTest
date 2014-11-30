var DroppableElement = function(droppableData)
{
	this.dropZone = droppableData.dropZone;
	this.onDrop = droppableData.onDrop;
}

var applyTo = function(element, droppableData)
{
	element.droppable = new DroppableElement(droppableData);
}

exports.applyTo = applyTo;