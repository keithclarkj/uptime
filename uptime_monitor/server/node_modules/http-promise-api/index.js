'use strict'

var es6Promise = require('es6-promise')
var request = require('request')
var queryString = require('querystring')
var objectAssign = require('object-assign')
var PromiseFn

if (typeof Promise === 'undefined') {
  PromiseFn = Promise
} else {
    // noinspection JSUnresolvedVariable
  PromiseFn = es6Promise.Promise
}

function HttpRequestAPI (baseUrl, initialHeaders) {
  this.baseUrl = baseUrl
  this.initialHeaders = initialHeaders
};

HttpRequestAPI.prototype.get = function (resource, query) {
  return this.makeRequest(resource, 'GET', query, null)
}

HttpRequestAPI.prototype.post = function (resource, body, query) {
  return this.makeRequest(resource, 'POST', query, body)
}

HttpRequestAPI.prototype.put = function (resource, body, query) {
  return this.makeRequest(resource, 'PUT', query, body)
}

HttpRequestAPI.prototype.delete = function (resource, query, body) {
  return this.makeRequest(resource, 'DELETE', query, body)
}

HttpRequestAPI.prototype.makeRequest = function (resource, method, query, body) {
  var url = this.baseUrl + resource
  var qs
  if (query) {
    qs = queryString.stringify(query)
  }
  var headers
  if (this.initialHeaders) {
    headers = objectAssign({}, this.initialHeaders)
  }
  var options = {
    url: url,
    method: method,
    headers: headers,
    qs: qs,
    body: body
  }
  return new PromiseFn(function (resolve, reject) {
    request(options, function (err, res) {
      if (err) {
        reject({
          status: { code: 400, message: 'Bad Request' },
          error: err
        })
      } else {
        if (res.statusCode >= 400) {
          reject(constructResponse(res))
        } else {
          resolve(constructResponse(res))
        }
      }
    })
  })
}

function constructResponse (response) {
  var obj = {
    headers: response.headers,
    status: {
      code: response.statusCode,
      message: response.statusMessage
    }
  }
  if (response.statusCode < 400) {
    obj.data = JSON.parse(response.body)
  } else {
    obj.error = JSON.parse(response.body)
  }
  return obj
}

module.exports = HttpRequestAPI

