// Basic Element
// Define position, drawing info

(function() {
	var creanvas = CreJs.CreanvasNodeClient;

	// decorators as additional arguments.
	creanvas.NodeJsElement = function(
			controller, 
			elementTemplate) {

		var element = this;

		this.controller = controller;

		element.name = elementTemplate.name;
		element.scale = {
			x: elementTemplate["scaleX"] || 1,
			y: elementTemplate["scaleY"] || 1};

		element.elementType = elementTemplate["elementType"];
		element.x = elementTemplate["x"] || 0;
		element.y = elementTemplate["y"] || 0;
		element.z = elementTemplate["z"] || 0;
		element.angle = elementTemplate["angle"] || 0;		
	};

	creanvas.NodeJsElement.prototype.drawMyself = function() {

		var element = this;

		element.controller.context.translate(element.x, element.y);
		element.controller.context.rotate(element.angle || 0);
		element.controller.context.scale(element.scale.x || 1, element.scale.y || 1);

		element.controller.context.beginPath();
		element.elementType.draw(element.controller.context);
		
		/* Debug edges*/
		/*
		if (element.elementType.edges)
		{
			var edge = element.elementType.edges[0];
			controller.context.beginPath();
			controller.context.moveTo(edge.x, edge.y);
			element.elementType.edges.forEach(
					function(edge)
					{
						controller.context.lineTo(edge.x, edge.y);
					}					
			);
			controller.context.lineTo(edge.x, edge.y);
			controller.context.strokeStyle = "#F00";
			controller.context.stroke();
		}
		*/
		element.controller.context.scale(1/(element.scale.x || 1), 1/(element.scale.y || 1));
		element.controller.context.rotate(- (element.angle || 0));
		element.controller.context.translate(-element.x, - element.y);			
	};
}());