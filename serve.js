var static =  require('node-static');
var PORT = 8080;

var fileServer = new static.Server('./', { cache: 1});

var server = require('http').createServer(function (request, response) {
    console.log("[" + request.method + "] " + request.url);

    fileServer.serve(request, response);
}).listen(PORT);

console.log("[SERVER] - Listening on :" + PORT);
