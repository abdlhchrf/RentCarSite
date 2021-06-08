const http = require('http');
const url = require('url');
const querystring = require('querystring');
const path = require('path');
const fs = require('fs');
const paypal = require('@paypal/checkout-server-sdk');
const mysql = require('mysql2');


const usersDB = mysql.createPool({
  host: 'localhost',
  user: 'admin',
  password:'admin',
  database: 'usersdb',
  rowsAsArray: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


usersDB.query("SELECT * FROM cars", function(err, rows, fields){
		//console.log(rows);
});


const clientId = "**************";
const clientSecret = "*****************";
// This sample uses SandboxEnvironment. In production, use LiveEnvironment
const environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);
// Construct a request object and set desired parameters
// Here, OrdersCreateRequest() creates a POST request to /v2/checkout/orders
const request = new paypal.orders.OrdersCreateRequest();





http.createServer(async function (req, res) {
var post = '',base,firstDate,oneDay,secondDate,secondDate,diffDays,response,createOrder;
    console.log(req.method ,req.url ,req.connection.remoteAddress);
   
    base = decodeURI(path.parse(req.url).base);
    if (req.method == 'POST')
	{
        req.on('data',async function (data) {
           
           if (data!=undefined)
		   {post += data;}
		   
            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (post.length > 1e3){
				req.connection.destroy();
                res.end();
			}
        });

        req.on('end',async function () {
			post=post.toString();
			if (!post.match(/^\{\"cni\"\:\"[A-Za-z0-9]{3,100}\"\,\"adrs\"\:\"[A-Za-z0-9\-\/]{3,100}\"\,\"phn\"\:\"[A-Za-z0-9]{3,100}\"\,\"fnam\"\:\"[A-Za-z0-9\s]{3,100}\"\,\"carID\"\:\"[A-Za-z0-9]{3,100}\"\,\"endDate\"\:\"[A-Za-z0-9\-]{3,100}\"\,\"startDate\"\:\"[A-Za-z0-9\-]{3,100}\"\,\"payType\"\:\"[A-Za-z0-9]{3,100}"\}$/))
			{console.log(post);res.writeHead(404).end("complete your information please !");return;}
			
            try{post = JSON.parse(post);}
			catch (e){console.log(e);res.writeHead(404).end("ff");return;}
			
            oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
			firstDate = new Date(post.startDate);
			secondDate = new Date(post.endDate);
			diffDays = Math.round(Math.abs((firstDate - secondDate) / oneDay)); 
			
			//~ if (diffDays>100)
			//~ {res.writeHead(404).end("ff");}
			
            switch (post.payType) { //path.parse(req.url)["dir"]
				case "payPaypal":
					
					usersDB.query(`SELECT * FROM cars WHERE carID='${post.carID}' and rented='0'`,async function(err, rows, fields) {
						if (rows[0]==undefined){res.writeHead(404).end("this car is rented before");return;}
						
						//console.log(rows);
						base = (diffDays*(rows[0][2]/10)).toString();//from dirhams to dollars
							
						//console.log(base);
						//var selectedAmount = req.body.options
						let request = new paypal.orders.OrdersCreateRequest();
						
						request.requestBody({
							intent: 'CAPTURE',
							application_context: {
								return_url: 'http://herbilauto.ddns.net/success',
								cancel_url: 'http://herbilauto.ddns.net/cancel',
							},
							purchase_units: [
								{
									reference_id: rows[0][1],
									description: rows[0][0],
									amount: {
										currency_code: 'USD',
										value: base
									}
								}
							]
						});
						
						// Call API with your client and get a response for your call
						createOrder = async function () {
							try{response = await client.execute(request);}
							catch (e){console.log(e);res.writeHead(404).end("ff");return;}
							//console.log(response.result.links);
							usersDB.query(`insert into renters (fullName,Phone,Adress,CNID,userID) values ('${post.fnam}','${post.phn}','${post.adrs}','${post.cni}','${response.result.id}');`, function(err, rows, fields) {});	
							
							//https://www.sandbox.paypal.com/webapps/hermes?token=5UY66936DB2766143&rcache=2&country.x=MA&locale.x=ar_EG&ulOnboardRedirect=true				
							
							//~ res.writeHead(200, {'Location': `https://www.sandbox.paypal.com/webapps/hermes?token=${response.result.id}&rcache=2&country.x=MA&locale.x=ar_EG&ulOnboardRedirect=true`});
							//~ res.end();
							
							for (i in response.result.links) {
								if (response.result.links[i].rel === 'approve') {
									res.writeHead(200, {'Location': response.result.links[i].href});
									//console.log(response.result);
									res.end();
									//res.redirect(response.result.links[i].href);
								}
							}
							
						};
						
						createOrder();
						console.log('Creating Order...');
					});	
						
				break;
				case "payCash":
				
					usersDB.query(`SELECT * FROM cars WHERE carID='${post.carID}'`,async function(err, rows, fields) {
						if (rows[0]==undefined){res.writeHead(404).end("payCash error");return;}
						
						//console.log(rows);
						base = diffDays*rows[0][2];
						
						//var selectedAmount = req.body.options
						usersDB.query(`insert into renters (fullName,Phone,Adress,CNID,userID) values ('${post.fnam}','${post.phn}','${post.adrs}','${post.cni}','payCash-${post.cni}');`,async function(err, rows, fields) {});	
						
						res.writeHead(200);
						res.end();
						
					});
					
				break;
				default:
					res.writeHead(404);
					res.end();
				break;
			}
        });
	}
    else if (req.method == 'GET') {
		switch (path.parse(req.url)["dir"]){
			case "/":
			if (base == '')
			{
				
				//~ var dgram = require('dgram');

				//~ var client = dgram.createSocket('udp4');

				//~ client.send('Hello World!',0, 12, 80, '127.0.0.1');
				//~ client.send('Hello2World!',0, 12, 80, '127.0.0.1');
				//~ client.send('Hello3World!',0, 12, 80, '127.0.0.1', function(err, bytes) {
				//~ client.close();
				//~ });
				
				
				fs.readFile("./index.html",async function(err, data) {
					if (err){ console.log(err);res.writeHead(404).end(` not ok !`);return;}
					res.writeHead(200, {'Content-Type': 'text/html'});
					res.end(data);
				 });
			}
			else if (base == 'favicon.ico')
			{
				fs.readFile('./Files/favicon.ico',async function(err, data){
					if (err){ console.log(err);res.writeHead(404).end(` not ok !`);return;}
					res.writeHead(200,{'Content-Type': 'ico'}); //'sysauth=cd0a56d9afda01c13a13319ed7b31564ee07e002'
					//response.write(data);
					res.end(data);
				});
			}
			else if (base == 'WF')
			{
				usersDB.query(`SELECT * FROM cars`,async function(err, rows, fields) {
					if (err){ console.log(err);res.writeHead(404).end(` not ok !`);return;}
					res.writeHead(200,{'Content-Type': 'JSON'}); //'sysauth=cd0a56d9afda01c13a13319ed7b31564ee07e002'
					//response.write(data);
					res.end(JSON.stringify(rows));
				});	
				
			}
			else if (base.startsWith("success?"))
			{
				//http://localhost:3000/success?token=9PH434349K3047344&PayerID=9THZ2YPMBRKKE

				base = querystring.parse(base.slice(8).toString());
				//const payerId = base.PayerID;
				//const token = base.token;
				console.log(base);
				let captureOrder =  async function(orderId) {
					request = new paypal.orders.OrdersCaptureRequest(orderId);
					request.requestBody({});
					// Call API with your client and get a response for your call
					let response = await client.execute(request);
					//console.log(`Response: ${JSON.stringify(response)}`);
					// If call returns body in response, you can get the deserialized version from the result attribute of the response.
					//console.log(`Capture: ${JSON.stringify(response.result)}`);
					//console.log(response.result);
					
					usersDB.query(`UPDATE car SET rented = '1' WHERE carID=(SELECT carID from renters where userID = '${response.result.id}');`,async function(err, rows, fields) {
						res.writeHead(200);
						res.end("thank you");
					});	
					
				}
				captureOrder(base.token); 
			}
			else
			{
				res.writeHead(404);
				res.end("not found");
			}
			break;
			case "/File":
			
			usersDB.query(`SELECT * FROM cars where carID='${base}'`,async function(err, rows, fields) {
					if (rows == undefined){ console.log(err);res.writeHead(404).end(` not ok !`);return;}
					
					// The filename is simple the local directory and tacks on the requested url
 
						//res.writeHead(200,{'Content-Type': '"image/png"'});
					  // This line opens the file as a readable stream  
					  var readStream = fs.createReadStream(`./Files/${base}.png`);

					  // This will wait until we know the readable stream is actually valid before piping
					  readStream.on('open',async function () {
						// This just pipes the read stream to the response object (which goes to the client)
						
						readStream.pipe(res);
					  });

					  // This catches any errors that happen while creating the readable stream (usually invalid names)
					  readStream.on('error',async function(err) {
						console.log(err);res.writeHead(404).end(` not ok !`);return;
					  });
									
				});	
			
			break;
			default:
				res.writeHead(404);
				res.end("not found");
			break;
		}
	}
	
    //~ var q = url.parse(req.url, true).query;
    //~ var t = querystring.parse(req.url)
    //~ var txt = q.year + " " + q.month;
  
    //~ console.log(base);
    
    //~ res.writeHead(200, {'Content-Type': 'text/html'});
    //~ res.end(base);

}).listen(8080, '0.0.0.0');

