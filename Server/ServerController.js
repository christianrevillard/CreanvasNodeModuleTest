var serverElement = require("./ServerElement");

var Controller = function(applicationSocket, applicationInstance, autoStart) {

	var controller = this;

	controller.intervals = [];
	
	var timeScale = 1;
	var time = 0; // seconds
	this.paused = !autoStart;
	
	controller.setInterval(function() {
		if (controller.paused)
			return;
		time += 10 * timeScale / 1000;
	}, 10);
	this.getTime = function() {
		return time;
	};

	controller.applicationSocket = applicationSocket;
	controller.applicationInstance = applicationInstance;

	controller.elements = [];
	controller.elementTypes = [];
	var movable = [];
	var moving = [];

	console.log('Setting up for Creanvas');

	controller.setInterval(function() {
		var toUpdate = controller.elements.filter(function(e) {
			return e.toUpdate != null;
		});

		var toDelete = controller.elements.filter(function(e) {
			return e.toDelete;
		});

		if (toUpdate.length > 0 || toDelete.length > 0) {
			controller.applicationInstanceEmit('updateClientElements', {
				updates : toUpdate.map(function(e) {
					return e.toUpdate;
				}),
				deletes : toDelete.map(function(e) {
					return {
						id : e.id
					};
				})
			});
			toUpdate.forEach(function(e) {
				e.toUpdate = null;
			});
			toDelete.forEach(function(e) {
				controller.removeElement(e);
			});
		}
	}, 40);

	this.applicationInstanceEmit = function(command, data) {
		applicationSocket.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	}

	this.applicationInstanceBroadcast = function(socket, command, data) {
		socket.broadcast.to(this.applicationInstance).emit(command,
				JSON.stringify(data));
	}

	this.emitToSocket = function(socketId, command, data) {
		applicationSocket.to(socketId).emit(command, JSON.stringify(data));
	}
};

Controller.prototype.getElementById = function(id) {
	var els = this.elements.filter(function(e) {
		return e.id == id;
	});
	if (els.length == 0)
		return null;
	return els[0];
};

Controller.prototype.getElementByTouchIdentifier = function(touchId) {
	var byIdentifier = this.elements.filter(function(e) {
		return e.touchIdentifier == touchId;
	});
	return byIdentifier.length > 0 ? byIdentifier[0] : null;
};

Controller.prototype.addElement = function() {
	// console.log('Controller.addElement: ' + JSON.stringify(arguments));
	var controller = this;

	var args = [].slice.call(arguments);

	var identificationData = args.filter(function(arg) {
		return arg && arg[0] == "name";
	})[0] || [ "name", "Unknown" ];
	var imageData = args.filter(function(arg) {
		return arg && arg[0] == "image";
	})[0]; // mandatory
	var positionData = args.filter(function(arg) {
		return arg && arg[0] == "position";
	})[0]; // mandatory

	var element = new serverElement.Element(controller, identificationData,
			imageData, positionData);

	var decoratorArguments = args.filter(function(arg) {
		return arg && arg[0] != "name" && arg[0] != "position"
				&& arg[0] != "image";
	});

	if (decoratorArguments.length > 0)// && CreJs.Creanvas.elementDecorators)
	{
		// console.log('New element : apply ' + decoratorArguments.length + "
		// decorators");
		element.applyElementDecorators.apply(element, decoratorArguments);
	}

	controller.elements.push(element);

	/*
	 * // only on the current? or change the join process... to see... // should
	 * be: add on all. Have a system to add existing elment to application that
	 * can be joined after start. controller.applicationInstanceEmit(
	 * 'addElement', { id:element.id, x:element.elementX, y:element.elementY,
	 * z:element.elementZ, angle:element.elementAngle,
	 * width:element.elementWidth, height:element.elementHeight,
	 * elementType:element.elementType});
	 */
	return element;
};

Controller.prototype.stop= function() {	
	if (this.intervals)
	{
		this.intervals.forEach(function(interval){
			console.log("cleanInterval: " + interval);
			clearInterval(interval);
			});
	}
	this.intervals = [];
};

Controller.prototype.setInterval= function(intervalFunction, time) {	
	this.intervals.push(setInterval(intervalFunction, time));
};

Controller.prototype.removeSocket = function(socket) {
	socket.leave(this.applicationInstance);
	this.socketCount--;
	if (this.socketCount == 0)
	{
		this.stop();
	}
};

Controller.prototype.pause = function() {
	this.paused = true;	
};

Controller.prototype.resume = function() {
	this.paused = false;	
};

Controller.prototype.addSocket = function(socket) {
	var controller = this;

	this.socketCount = this.socketCount || 0;
	this.socketCount++;
	
	socket.join(this.applicationInstance);

	socket.on('pointerEvent', function(message) {

		var eventData = JSON.parse(message);

		var bubble = true;

		eventData.identifierElement = controller
				.getElementByTouchIdentifier(eventData.touchIdentifier);
		eventData.originSocketId = socket.id;

		if (eventData.identifierElement) {
			eventData.identifierElement.triggerEvent(eventData);
		}

		var hits = controller.elements.filter(function(e) {
			return e.isPointInElementEdges(eventData.x, eventData.y);
		}).sort(function(a, b) {
			return (b.elementZ || 0 - a.elementZ || 0);
		});

		hits.forEach(function(hit) {

			if (!bubble)
				return;

			if (eventData.identifierElement
					&& hit.id == eventData.identifierElement.id)
				return;

			bubble = hit.triggerEvent(eventData);
		});
	});

	socket.on('registerEdges', function(message) {
		var edgesData = JSON.parse(message);

		console.log("Registering edges for " + edgesData.typeName);

		if (controller.elementTypes.filter(function(t) {
			return t.typeName == edgesData.typeName;
		}).length > 0)
			return;

		controller.elementTypes.push(edgesData);
	});
};

exports.Controller = Controller;
