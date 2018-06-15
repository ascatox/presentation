import * as schedule from 'node-schedule';
import * as async from 'async';
import * as await from 'await';
import { EventPayload } from './EventPayload';
import { LedgerClient } from 'node-ledger-client';
import * as Log from "./Logger";
const chalk = require('chalk');

const config = require('../data/config-presentation.json');
const fabricConfig = require('../resources/config-fabric-network.json');

var NGSI = require('ngsijs');

//Fabric config
//import {default as fabricConfig} from '../conf/config-fabric-network';
const peerName = fabricConfig.organizations[0].peers[0].name;
const ccid = fabricConfig.chaincode.name;
var eventId = config.event.name;
var handler = null;
const ORION_URL = config.contextBroker.protocol + "://" + config.contextBroker.host + ":" + config.contextBroker.port;
const ngsiConnection = new NGSI.Connection(ORION_URL);
//
/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

/**
* Returns a random integer between min (inclusive) and max (inclusive)
* Using Math.round() will give you a non-uniform distribution!
*/
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}


function generateRandomEvent() {
  var event = <EventPayload>{};
  event.serialNumberItem = randomString(16, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  event.itemType = config.itemTypes[Math.floor(Math.random() * config.itemTypes.length)];
  event.bayId = "bay_" + getRandomInt(1, config.bay.n_bays);
  event.bayCapacity = getRandomInt(0, config.bay.capacity_max);
  event.bayLoad = getRandomInt(0, config.bay.load_max);
  return event;
};


function extractAttributesFromEventPayload(eventPayload) {
  var attributes: { [k: string]: any } = {};
  attributes = Object.assign({}, eventPayload);
  delete attributes['serialNumberItem'];
  delete attributes['itemType'];
  return attributes;
}


async function getEntity(id, type) {
  return await ngsiConnection.v2.getEntity({
    id: id,
    type: type,
  }, {
      service: config.service,
      servicepath: config.subservice
    });
}

function createEntity(id, type) {
  // let isAlreadyPresent = null;
  // try {
  //   isAlreadyPresent = await getEntity(id, type);
  //   Log.logger.warn("getEntity element with id " + chalk.yellow(id) + " and type " + chalk.yellow(type) + " FOUND");
  // } catch (err) {
  //   Log.logger.warn("getEntity element with id " + chalk.yellow(id) + " and type " + chalk.yellow(type) + " NOT exists");
  // }
  // if (!isAlreadyPresent) return;
  var createEntity = ngsiConnection.v2.createEntity({
    id: id,
    type: type,
  }, {
      service: config.service,
      servicepath: config.subservice
    });
  createEntity.then(
    (response) => {
      // Entity created successfully
      // response.correlator transaction id associated with the server response
      Log.logger.info("success create " + chalk.yellow("Entity OCB ") + chalk.green(JSON.stringify(response)));
    }, (error) => {
      // Error creating the entity
      // If the error was reported by Orion, error.correlator will be
      // filled with the associated transaction id
      Log.logger.warn("error create Entity OCB " + chalk.yellow(JSON.stringify(error)));
    }
  );
  return createEntity;

}

function updateEntity(id, type, attributes) {
  var payload: { [k: string]: any } = {};
  payload.id = id;
  payload.type = type;
  var optionPayload = {
    service: config.service,
    servicepath: config.subservice
  };
  for (var property in attributes) {
    if (attributes.hasOwnProperty(property)) {
      // do stuff
      var valueAttribute: { [k: string]: any } = {};
      valueAttribute["value"] = attributes[property];
      payload[property] = valueAttribute;
    }
  }
  //var connection = new NGSI.Connection(ORION_URL);
  ngsiConnection.v2.appendEntityAttributes(payload, optionPayload
  ).then(
    (response) => {
      // Attributes appended successfully
      // response.correlator transaction id associated with the server response
      Log.logger.info("success update " + chalk.yellow("Entity OCB ") + chalk.green(JSON.stringify(response)));
    }, (error) => {
      // Error appending the attributes to the entity
      // If the error was reported by Orion, error.correlator will be
      // filled with the associated transaction id
      Log.logger.error("error update Entity OCB " + chalk.red.bold(JSON.stringify(error)));
    }
  );
}

function getEntities() {
  //var connection = new NGSI.Connection(ORION_URL);

  var optionPayload = {
    service: config.service,
    servicepath: config.subservice
  };
  ngsiConnection.v2.listEntities(optionPayload).then(
    (response) => {
      // Entities retrieved successfully
      // response.correlator transaction id associated with the server response
      // response.limit contains the used page size
      // response.results is an array with the retrieved entities
      // response.offset contains the offset used in the request
      Log.logger.debug("success read entities list" + JSON.stringify(response));
    }, (error) => {
      // Error retrieving entities
      // If the error was reported by Orion, error.correlator will be
      // filled with the associated transaction id
      Log.logger.error("error read entities list" + chalk.red.bold(JSON.stringify(error)));
    }
  );
}

Log.logger.info(chalk.yellow.bold('****************** PRESENTATION EVENTS SIMULATOR ******************'));



//SCHEDULER SECTION
getEntities();
/*
var j = schedule.scheduleJob(config.cronExpression, function () {
  var event: EventPayload;
  const run = async () => {
    event = generateRandomEvent();
    const createEntityResponse = await createEntity(event.serialNumberItem, event.itemType);
    var attributes = extractAttributesFromEventPayload(event);
    const updateEntityResponse = await updateEntity(event.serialNumberItem, event.itemType, attributes);
  };
  run();
})
*/

//LEDGER SECTION
var ledgerClient;
const ledger = async () => {
  ledgerClient = await LedgerClient.init(fabricConfig);
  await chaincodeEventSubscribe(eventId, peerName).then((handle) => {
    Log.logger.info('Handler received ' + JSON.stringify(handle));
    handler = handle;
  }, (err) => {
    Log.logger.error('Handler received ' + err);
  });
};
ledger();


//Ledger Subscription
async function chaincodeEventSubscribe(eventId: string, peerName: string) {
  return ledgerClient.registerChaincodeEvent(ccid, peerName, eventId, (event) => {
    Log.logger.info('Event arrived with name: ' + chalk.blue.bold(event.event_name) + ' and with payload ' + chalk.yellow(Buffer.from(event.payload)));
    const payload: EventPayload = JSON.parse(event.payload.toString());
    const payloadItemType = JSON.parse(payload.itemType);
    payload.itemType = payloadItemType.description;
    const run = async () => {
      try {
        const createEntityResponse = await createEntity(payload.serialNumberItem, payload.itemType);
      } catch (err) {
        Log.logger.warn("Element with id " + chalk.green(payload.serialNumberItem) + " and type " + chalk.green(payload.itemType) + " already EXISTS");
      }
      var attributes = extractAttributesFromEventPayload(payload);
      const updateEntityResponse = await updateEntity(payload.serialNumberItem, payload.itemType, attributes);
    };
    run();
  }, (err) => {
    Log.logger.error(chalk.red.bold('Errore ricevuto nell evento ' + err));
    setTimeout(() => {
      chaincodeEventSubscribe(eventId, peerName).then((handler) => {
        Log.logger.info('Handler received ' + chalk.yellow(JSON.stringify(handler)));
      }, (err) => {
        Log.logger.error('Handler received ' + err);
      });
    }, 1000);
  });
}

