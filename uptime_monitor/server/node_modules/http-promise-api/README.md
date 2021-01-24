#http-promise-api

[![NPM Version](https://img.shields.io/npm/v/http-promise-api.svg)](https://www.npmjs.com/package/http-promise-api)


A simple nodejs application for http requests with Promise wrapper

```bash
npm install http-promise-api
```
How to use

```js
var HttpRequestAPI = require('http-promise-api')
HttpRequestAPI = new HttpRequestAPI('your base url',  {header object});

//get request
HttpRequestAPI.get('/posts').then(function(data){
	//Successful
}, function(error){
	//Error
})
```
All the required headers like Content-Type, Tokens etc.. need to be inserted while constructing HttpRequestAPI.

#Response/Error Formats

successful response

```js
{
	headers:{
		//All headers from servers
	},
	status:{
		code:200,
		message:'OK'
	},
	data: {
		//desired data
	}
}
```
Error Response

```js
	{
		headers:{ },
		status: {},
		error: {
			//Any error responses from server
		}
	}
```

#Methods

get(resource, query)

```js
//url will be http://example.com/?id=123
HttpRequestAPI.get('/posts', {id:'123'}).then(function(data){
	//Successful
}, function(error){
	//Error
})
```
post(resource, postbody, query)
```js
//url will be http://example.com/
HttpRequestAPI.get('/posts', {id:'123', name:'Anand', profession:'developer'}, {optional}).then(function(data){
	//Successful
}, function(error){
	//Error
})
```
delete(resource, query, body)
```js
//url will be http://example.com/?id='123'
HttpRequestAPI.delete('/posts', {id:'123'}, {optional -body }).then(function(data){
	//Successful
}, function(error){
	//Error
})
```
put(resource, postbody, query)
```js
//url will be http://example.com/
HttpRequestAPI.put('/posts', {id:'123', name:'Anand', profession:'developer'}, {optional}).then(function(data){
	//Successful
}, function(error){
	//Error
})
```
#Generic Method

A part from above requests there is a generic request
makeRequest(resource, method, query, body)
```js
HttpRequestAPI.makeRequest('/posts', 'ANY METHOD', {}, {}).then(function(data){
	//Successful
}, function(error){
	//Error
})
```

