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

	console.log('Setting up for Creanvas');

	controller.setInterval(function() {
		var toUpdate = controller.elements
			.map(function(e) {
				return e.getUpdatedClientData();
			})		
			.filter(function(updatedData) {
				return updatedData != null;
			});

		var toDelete = controller.elements.filter(function(e) {
			return e.toDelete;
		});

		if (toUpdate.length > 0 || toDelete.length > 0) {
			controller.applicationInstanceEmit('updateClientElements', {
				updates : toUpdate,
				deletes : toDelete.map(function(e) {
					return {
						id : e.id
					};
				})
			});

			toDelete.forEach(function(e) {
				controller.removeElement(e);
			});
		}
	}, 20);

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

Controller.prototype.addElement = function(elementTemplate) {
	var controller = this;

	var element = new serverElement.Element(controller, elementTemplate);

	controller.elements.push(element);

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

		eventData.identifierElement = controller.getElementByTouchIdentifier(eventData.touchIdentifier);
		eventData.originSocketId = socket.id;

		if (eventData.identifierElement) {
			eventData.identifierElement.triggerEvent(eventData);
		}

		var hits = controller.elements.filter(function(e) {
			return e.isPointInElementEdges(eventData.x, eventData.y);
		}).sort(function(a, b) {
			return (b.z || 0 - a.z || 0);
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
