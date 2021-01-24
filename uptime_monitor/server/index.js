require('dotenv').config();

const express = require('express');
const request = require('request-promise-native');
const path = require('path');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const port = 5000;

// Database variables
const mongoUrl = process.env.DB_URL;
const dbName = process.env.DB_NAME;
let db;

// Configures express to use body-parser as middle ware.
app.use(express.static(path.join(__dirname, '../build')));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader(
    'Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

/**
 * TO DO LIST
 *
 * Sort out statuses collection ---
 * no port part
 * status codes
 *
 */


/**
 * GET/api/check
 * Recieves get http requests, and when it gets one it will check domain
 * statuses.
 */
app.get('/api/check', async (req, res) => {
  console.log('Data recieved: ', req.body);

  // Get data from request and put into JSON for mongodb
  const domain = req.body.domain;
  const port = req.body.port;

  // Checks to see if the domain and port exists or not
  // If it doesn't, code will go to the catch
  dbRepeatCheck(domain, port, 'get/check').then((result) => {
    // Calls checkStatus function, returns if the domain+port is up to the
    // client
    return checkStatus(domain, port);
  }).then((result) => {
    // response to console and http request
    res.send('Domain and port status recorded');
  }).catch((err) => {
    /**
     * Catch block that sends appropriate response
     *
     * if there has been in error in either function, first if block
     * else, just a res send to say status recorded
     */
    if (!err.statusCode) {
      res.send({
        online: 'uknown',
        msg: 'There has been an error or domain doesn\' exist',
      });
    } else {
      res.send('Domain and port offline and status has been recorded');
    }
  });
});

/**
 * GET/api/domains
 * Recieves get http requests and returns each domain in the database
 */
app.get('/api/domains', (req, res) => {
  console.log('Request recieved, attempting to sending all domains.');
  // variable to store array fetched from database

  // Fetches domains
  db.collection('domains').find().toArray().then((results) => {
    // Calls setStatus function for each domain found, which sets their current
    // online status
    const domainsArray = [];
    results.forEach((domainObject) => {
      domainsArray.push(setStatus(domainObject));
    });

    // After all online statuses are set, next section or code will run
    return Promise.all(domainsArray);
  }).then((domainsArray) => {
    // Sends domainsArray to client
    res.send(domainsArray);
  }).catch((err) => {
    console.error(err, 'Error while accessing database');
    res.send({
      err: true,
      msg: err,
    });
  });
});

/**
 * POST/api/statuses
 * Recieves post http requests and returns all statuses for the domain specified
 */
app.post('/api/statuses', (req, res) => {
  /**
   * Function required to return promise so database searches dont happen
   * before domain and port params are resolved
   * @return {Promise}
   */
  function setDomainAndPort() {
    return new Promise((resolve, reject) => {
      const domain = req.body.domain;
      const port = parseInt(req.body.port);
      resolve({domain, port});
    });
  }

  setDomainAndPort().then((domainAndPort) => {
    /**
     * Searches the domains collection to get the documents ID to use when
     * searching the statuses collection. Then the returned documents are sorted
     * in order of time, then sent to the client.
     */
    return db.collection('domains').findOne(domainAndPort);
  }).then((response) => {
    return db.collection('statuses').find({domainId: response._id}, {
      projection: {
        _id: 0,
      },
      sort: [['timestamp', 1]],
      limit: 50,
    }).toArray();
  }).then((response) => {
    if (response.length === 0) {
      res.send({error: true, msg: 'No statuses for this domain exist.'});
    } else {
      res.send(response);
    }
  }).catch((err) => {
    res.send({err, msg: 'Error while contacting db.'});
  });
});

/**
 * POST/api/insert
 * Recieves post http requests that should contain a domain to insert
 * into the database.
 */
app.post('/api/insert', (req, res) => {
  console.log('Data recieved: ', req.body);

  // Get data from request and put into JSON for mongodb
  const domain = req.body.domain;
  const port = req.body.port;
  const checkFrequency = 90;
  const object = {domain, port, checkFrequency};

  // Runs the dpRepeatCheck function to see if the domain already exists.
  dbRepeatCheck(domain, port, 'post/insert').then(() => {
    // If dbRepeatCheck says the domain doesn't exist the domain is inserted
    // If it says otherwise, it wont.

    // if domain doesn't exist
    // Inserts domain into db 'domains' collection
    db.collection('domains').insertOne(object, (err, res) => {
      if (err) {
        console.error(err);
        throw err;
      }
    });

    console.log('Domain inserted');
    res.status(200).send('Domain inserted');
  }).catch((err) => {
    // if domain already exists in the db
    console.warn(err);
    res.status(500).send({error: true, err, msg: 'Domain alreaady exists'});
  });
});

/**
 * DELETE api/removeDomain
 * Recieves delete http requests that should contain a domain and port to delete
 * from the domains and statuses collection of the database
 */
app.delete('/api/removeDomain', (req, res) => {
  console.log('Data recieved: ', req.body);
  // console.log(req);

  // Domain and port variables for the domains collection search
  const domain = req.body.domain;
  const port = req.body.port;
  // Variable used to store ID for deleteMany query
  let domainId;

  // Checks to see if the domain and port exist in the database; if they dont,
  // they can't be deleted obviously so the code will jump to the catch.
  dbRepeatCheck(domain, port, 'delete/removeDomain').then((result) => {
    // result is the database ID of the domain entry

    // Below variable is stored to be used in the deleteMany query
    domainId = {domainId: result};

    // Deletes the domain from the domains collection
    return db.collection('domains').deleteOne({_id: result});
  }).then(() => {
    console.log(domain, port, 'deleted from domains collection');

    // Deletes domain statuses from statuses collection
    return db.collection('statuses').deleteMany(domainId);
  }).then((result) => {
    console.log(result.deletedCount, 'documents deleted from statuses');
    res.status(200).send('Domain deleted');

    // catch block
  }).catch((err) => {
    // If the promise is rejected in dbRepeatCheck, below code >>>
    if (err.area === 'dbRepeatCheck') {
      console.error(err);
      res.status(500).send({err, error: true});
      // Otherwise, below code
    } else {
      console.error(err, 'There has been an error in the mongodb queries');
      res.status(500).send({
        err,
        error: true,
        msg: 'There has been an error in the mongodb queries',
      });
    }
  });
});


//
// FUNCTIONS
//

/**
 * dbRepeatCheck
 *
 * Checks the domain collection in the uptime database to see if a domain
 * that is being posted exists already. If it exists, the function will return
 * true, and the domain won't be inserted. If not, the function will return
 * false and not insert the domain.
 *
 * Ive done this bit super confusingly, due to code going into the catch
 * when I don't want it to and vice versa. Please bear with me. So:
 *
 * If dbRepeatCheck is called in app.get/check, and the domain exists,
 * the promise will resolve. If the domain doesn't exist, it will reject.
 *
 * If dbRepeatCheck is called in app.post/insert, and the domain exists,
 * the promise will reject. If it doesn't exist, it will resolve.
 *
 * If dbRepeatCheck is called in app.delete/removeDomain, and the domain
 * exists, the promise is resolved, returning the database ID of the entry.
 * If the domain doesn't exist in the database, the promise is rejected,
 * because it cant be deleted if it doesnt exist... obviously
 *
 * Complicated, but the quickest and easiest fix I could think of - please
 * dont judge me lmao
 *
 * @param {string} domain - Domain to be checked
 * @param {integer} port
 * @param {string} area - Where the function is being called from
 * @return {Promise}
 */
function dbRepeatCheck(domain, port, area) {
  return new Promise((resolve, reject) => {
    const query = {domain, port};

    // Searches for the domain and port in the domains collection
    db.collection('domains').findOne(query).then((result) => {
      /** What is done with the result of this search is decided below. Please
       * see comments above the function.
       */

      // app.get/check part
      if (area === 'get/check' && result != null) {
        resolve('The domain exists.');
      } else if (area === 'get/check' && result === null) {
        const err = 'The domain doesnt exist';
        reject(err);

        // app.post/domains part
      } else if (area === 'post/insert' && result === null) {
        resolve(true);

        // app.delete/removeDomain part
      } else if (area === 'delete/removeDomain') {
        if (result) {
          resolve(result._id);
        } else {
          const err = {
            err: 'This domain doesnt exist in the database',
            area: 'dbRepeatCheck',
          };
          reject(err);
        }

        // for areas other than delete, the promise is rejected.
      } else {
        const err = 'Domain already exists';
        reject(err);
      }
    }).catch((err) => {
      reject(err);
    });
  });
}

/**
 * checkStatus
 *
 * Checks if a domain and/or it's port is up and running or not. Rejects if
 * it isn't.
 * @param {string} domain - domain to be checked
 * @param {int} port - port to be checked
 * @return {Promise}
 */
async function checkStatus(domain, port) {
  return new Promise((resolve, reject) => {
    let requestDomain = '';

    // Sets HTTP type - HTTPS for port 443, HTTP for port 80
    if (port === 80) {
      requestDomain = 'http://' + domain + `:${port}`;
    } else if (port === 443) {
      requestDomain = 'https://' + domain + `:${port}`;
    }

    let status;
    // Sends a HTTP request to see if a server is up or not;
    // If it is, at .then it will resolve
    // If it isn't, at .catch it will reject
    request(requestDomain).then((response) => {
      status = (response.statusCode) ? response.statusCode : 200;
      return insertStatus(domain, port, status);
    }).then((result) => {
      resolve(result);
    }).catch((err) => {
      status = (err.statusCode) ? err.statusCode : 400;
      insertStatus(domain, port, err.statusCode);
      reject(err);
    });
  });
}

/**
 * setStatus
 *
 * Sets online status for the domains array which is used in the domains tab
 * of the website
 * @param {Array} domainObject - object containing information for a single
 *                               domain from the database
 * @return {Promise}
 */
function setStatus(domainObject) {
  return new Promise((resolve, reject) => {
    /**
     * .then if online, .catch if offline
     *
     * no error handling because of laziness, but if there was an error it would
     * be with the http request, where it would be noticed as all domains would
     * be offline. lazy i know sorry
     */
    checkStatus(domainObject.domain, domainObject.port).then(() => {
      domainObject.online = true;
      resolve(domainObject);
    }).catch(() => {
      domainObject.online = false;
      resolve(domainObject);
    });
  });
}

/**
 * insertStatus
 *
 * Inserts a domain's online status into the statuses mongo collection,
 * along with the last run timestamp and the port checked
 *
 * @param {string} domain
 * @param {integer} port
 * @param {bool} statusCode
 * @return {Promise}
 */
function insertStatus(domain, port, statusCode) {
  return new Promise((resolve, reject) => {
    db.collection('domains').findOne({domain, port}).then((result) => {
      // Defines values that will be inserted into statuses
      const id = result._id;
      const timestamp = Date.now();
      const statusesObject = {domainId: id, statusCode, port, timestamp};

      return db.collection('statuses').insertOne(statusesObject);
    }).then((result) => {
      console.log('Domain and port status has been recorded in statuses');
      resolve(result);
    }).catch((err) => {
      reject(err);
    });
  });
}

// Starts the server and listens for connections on port 3000
app.listen(port, () => {
  console.log('Uptime application is listening at http://localhost:5000');
});

/**
 * Catch all
 * If there are any URLs requested that don't exist, the following code will
 * execute.
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build/index.html'));
});
// app.use((req, res, next) => {
//   res.sendFile(path.join(__dirname, '..', 'build', 'index.html'));
// });

// Mongo db connection
MongoClient.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // reconnectTries: Number.MAX_VALUE,
  // reconnectInterval: 1000,
}, (err, database) => {
  if (err) {
    console.error(err);
    throw err;
  }
  db = database.db(dbName);
  console.log('index.js connected to database');
});
