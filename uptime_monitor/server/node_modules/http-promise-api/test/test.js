'use strict'

var HttpRequestAPI = require('../index')
HttpRequestAPI = new HttpRequestAPI('https://jsonplaceholder.typicode.com')

describe('module', function () {
  it('module should be loaded', function () {
    require('../index.js')
  })
})

describe('Test API Calls', function () {
  this.timeout(8000)
  it('get call with success response', function (done) {
    HttpRequestAPI.get('/posts/1').then(function (result) {
      done()
    }, function (error) {

    })
  })

  it('get call with failure response', function (done) {
    HttpRequestAPI.get('/posts/adasd').then(function (result) {

    }, function (error) {
      done()
    })
  })

    /* it('post call with success response', function(done) {
        HttpRequestAPI.post('/posts/1').then(function(result){
            done();
        }, function(error){

        })
    }) */

  it('post call with failure response', function (done) {
    HttpRequestAPI.post('/posts/adasd').then(function (result) {

    }, function (error) {
      done()
    })
  })

    // Similar tests for put and delete as well
})
