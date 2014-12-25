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
		element.controller.context.fillStyle="black";
		element.controller.context.fillText("[" + element.id + "]",-20,0);
		// full reset, avoid to accumulate errors over time
		element.controller.context.setTransform(1, 0, 0, 1, 0, 0);
	};
}());