var static =  require('node-static');


var fileServer = new static.Server('./', { cache: 1});

require('http').createServer(function (request, response) {
      request.addListener('end', function () {
                fileServer.serve(request, response);
                    });
}).listen(8080);
