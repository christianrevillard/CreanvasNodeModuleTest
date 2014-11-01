/**
 * @define {boolean} 
 */
var TEST = true;

/**
 * @define {boolean} 
 */
var DEBUG = true;

var CreJs = CreJs || {};
CreJs.CreanvasNodeClient = CreJs.CreanvasNodeClient || {};

// Export
window["CreJs"] = CreJs;
CreJs["CreanvasNodeClient"] = CreJs.CreanvasNodeClient; // own?

if (TEST)
{
	CreJs.Test = CreJs.Test|| {};
	CreJs["Test"] = CreJs.Test;
}