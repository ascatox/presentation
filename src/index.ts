import * as schedule from 'node-schedule';
import * as async from 'async';
import * as await from 'await';
import { EventPayload } from './EventPayload';
import { LedgerClient } from 'node-ledger-client';

import {default as config} from '../conf/config';

var NGSI = require('ngsijs');

//Fabric config
//import {default as fabricConfig} from '../conf/config-fabric-network';
const fabricConfig = require('../resources/config-fabric-network.json');

const peerName = fabricConfig.organizations[0].peers[0].name;
const ccid = fabricConfig.chaincode.name;
var eventId = "EVENT";
var handler = null;
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


function generateRandomEvent(){
  var event = <EventPayload>{};
  event.serialNumberItem=randomString(16, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  event.itemType=config.itemTypes[Math.floor(Math.random()*config.itemTypes.length)];
  event.bayId="bay_"+getRandomInt(1,config.bay.n_bays);
  event.bayCapacity=getRandomInt(0,config.bay.capacity_max);
  event.bayLoad=getRandomInt(0,config.bay.load_max);
  return event;
};


function  extractAttributesFromEventPayload(eventPayload){
  var attributes: {[k: string]: any} = {};
  attributes=Object.assign({}, eventPayload); 
  delete attributes['serialNumberItem'];
  delete attributes['itemType'];  
  return attributes;
}


function createEntity(id, type){
  var connection = new NGSI.Connection("http://"+config.contextBroker.host+":"+config.contextBroker.port);
  var createEntity=  connection.v2.createEntity({
    "id": id,
    "type": type,
  }, {
  service: config.service,
  servicepath: config.subservice
});
createEntity.then(
    (response) => {
        // Entity created successfully
        // response.correlator transaction id associated with the server response
        console.log("success create "+JSON.stringify(response));
      }, (error) => {
        // Error creating the entity
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error create "+JSON.stringify(error));
    }
);
return createEntity;

}



function updateEntity(id, type, attributes){
  var payload: {[k: string]: any} = {};
  payload.id=id;
  payload.type=type;
  var optionPayload= {
    service: config.service,
    servicepath: config.subservice
  };
  for (var property in attributes) {
    if (attributes.hasOwnProperty(property)) {
        // do stuff
        var valueAttribute: {[k: string]: any} = {};
        valueAttribute["value"]=attributes[property];
        payload[property]=valueAttribute;
    }
}
  var connection = new NGSI.Connection("http://"+config.contextBroker.host+":"+config.contextBroker.port);
  connection.v2.appendEntityAttributes(payload,optionPayload
  ).then(
    (response) => {
        // Attributes appended successfully
        // response.correlator transaction id associated with the server response
        console.log("success update "+JSON.stringify(response));
    }, (error) => {
        // Error appending the attributes to the entity
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error update "+JSON.stringify(error));
    }
);
}

function getEntities(){
  var connection = new NGSI.Connection("http://"+config.contextBroker.host+":"+config.contextBroker.port);

  var optionPayload= {
    service: config.service,
    servicepath: config.subservice
  };
  connection.v2.listEntities(optionPayload).then(
    (response) => {
        // Entities retrieved successfully
        // response.correlator transaction id associated with the server response
        // response.limit contains the used page size
        // response.results is an array with the retrieved entities
        // response.offset contains the offset used in the request
        console.log("success read entities list"+JSON.stringify(response));
    }, (error) => {
        // Error retrieving entities
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error read entities list"+JSON.stringify(error));
    }
  );
}

console.log('****************** PRESENTATION EVENTS SIMULATOR ******************');



//SCHEDULER SECTION
getEntities();
var j = schedule.scheduleJob(config.cronExpression, function(){
  var event:EventPayload;
  const run = async () => {
    event=generateRandomEvent();
    const createEntityResponse = await createEntity(event.serialNumberItem,event.itemType);
    var attributes=extractAttributesFromEventPayload(event);
    const updateEntityResponse = await updateEntity(event.serialNumberItem,event.itemType, attributes);
  };
  run();
})


//LEDGER SECTION
var ledgerClient;
const ledger = async () => {
  ledgerClient = await LedgerClient.init(fabricConfig); 
  await chaincodeEventSubscribe(eventId, peerName).then((handle) => {
    console.log('Handler received ' + JSON.stringify(handle));
    handler = handle;
}, (err) => {
    console.error('Handler received ' + err);
});
};
ledger();




//Ledger Subscription
async function chaincodeEventSubscribe(eventId: string, peerName: string) {
  return ledgerClient.registerChaincodeEvent(ccid, peerName, eventId, (name, payload:EventPayload) => {
      console.log('Event arrived with name: ' + name + ' and with payload ' + JSON.stringify(payload));
      const run = async () => {
      const createEntityResponse = await createEntity(payload.serialNumberItem,payload.itemType);
      var attributes=extractAttributesFromEventPayload(payload);
      const updateEntityResponse = await updateEntity(payload.serialNumberItem,payload.itemType, attributes);
  };
  run();
  }, (err) => {
      console.log('Errore ricevuto nell evento ' + err);
      setTimeout(() => {
          chaincodeEventSubscribe(eventId, peerName).then((handler) => {
              console.log('Handler received ' + JSON.stringify(handler));
          }, (err) => {
              console.error('Handler received ' + err);
          });
      }, 1000);
  });
}

