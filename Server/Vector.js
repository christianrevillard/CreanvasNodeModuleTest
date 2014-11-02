var Vector = function(x, y, z){
	this.x = x;
	this.y = y;
	this.z = z;	
};

var getUnitVectors = function(x1, y1, x2, y2)
{
	var dx = x2-x1; 
	var dy = y2-y1;
	var longueur = Math.sqrt(dx*dx + dy*dy);
	return {
		u:new Vector(dx/longueur, dy/longueur,0),
		v:new Vector(-dy/longueur, dx/longueur,0),
		w:new Vector(0,0,0)
	};
};

var scalarProduct = function(v1, v2)
{
	return v1.x * v2.x + v1.y * v2.y;
};

var vectorProduct = function(v1,v2)
{
	return new Vector(
			v1.y * v2.z - v1.z * v2.y,				
			v1.z * v2.x - v1.x * v2.z,	
			v1.x * v2.y - v1.y * v2.x);
};	

Vector.prototype.getCoordinates = function(unitVectors)
{
	return {
		u: scalarProduct(this,unitVectors.u),
		v: scalarProduct(this,unitVectors.v),
		w: scalarProduct(this,unitVectors.w)
	};
};

exports.Vector = Vector;
exports.getUnitVectors = getUnitVectors;
exports.scalarProduct = scalarProduct;
exports.vectorProduct = vectorProduct;
