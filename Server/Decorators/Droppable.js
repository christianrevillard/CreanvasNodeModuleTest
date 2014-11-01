var applyTo = function(element, droppableData)
{
	element.isDroppable = true;
	element.dropZone = droppableData["dropZone"];
	element.ondrop = droppableData["ondrop"];
}

exports.applyTo = applyTo;