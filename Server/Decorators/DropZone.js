var applyTo = function(element, dropzoneData)
{
	var availableSpots = dropzoneData["availableSpots"];
	var dropX = dropzoneData["dropX"];
	var dropY = dropzoneData["dropY"];
	
	element.droppedElementsList = [];

	element.addEventListener(
		'pointerUp',
		function(eventData)
		{
			if (availableSpots - element.droppedElementsList.length <=0)
			{
				return;
			};
			
			var dropped = eventData.identifierElement;
			
			if (!dropped || !dropped.isDroppable)
			{
				console.log((!dropped)?('not found '+ eventData.touchElementId):'not droppable');
				return;
			}

			element.droppedElementsList.push(dropped);
			
			dropped.dropZone = element;
			
			console.log('Dropping ' + dropped.id  + ' at (' + dropped.elementX +',' + dropped.elementY +')');
			
			if (dropX) dropped.update('elementX', dropX);
			if (dropY) dropped.update('elementY', dropY);
			
			console.log('Adjusting ' + dropped.id + ' to (' + dropped.elementX + ',' + dropped.elementY + ')');

			if (dropped.ondrop)
				dropped.ondrop(element, dropped);
			
			return false;
		});
	
	
	element.drag = function(dropped)
	{
		element.droppedElementsList = element.droppedElementsList.filter(function(e){ return e.id != dropped.id;});
		dropped.dropZone = null;
	};

};

exports.applyTo = applyTo;