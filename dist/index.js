"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schedule = require("node-schedule");
const config = require("./conf/config");
var NGSI = require('ngsijs');
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
    for (var i = length; i > 0; --i)
        result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
function generateRandomEvent() {
    var event = {};
    event.serialNumberItem = randomString(16, '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    event.itemType = config.default.itemTypes[Math.floor(Math.random() * config.default.itemTypes.length)];
    event.bayId = "bay_" + getRandomInt(1, config.default.bay.n_bays);
    event.bayCapacity = getRandomInt(0, config.default.bay.capacity_max);
    event.bayLoad = getRandomInt(0, config.default.bay.load_max);
    return event;
}
;
function extractAttributesFromEventPayload(eventPayload) {
    var attributes = {};
    attributes = Object.assign({}, eventPayload);
    delete attributes['serialNumberItem'];
    delete attributes['itemType'];
    return attributes;
}
function createEntity(id, type) {
    var connection = new NGSI.Connection("http://" + config.default.contextBroker.host + ":" + config.default.contextBroker.port);
    var createEntity = connection.v2.createEntity({
        "id": id,
        "type": type,
    }, {
        service: config.default.service,
        servicepath: config.default.subservice
    });
    createEntity.then((response) => {
        // Entity created successfully
        // response.correlator transaction id associated with the server response
        console.log("success create " + JSON.stringify(response));
    }, (error) => {
        // Error creating the entity
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error create " + JSON.stringify(error));
    });
    return createEntity;
}
function updateEntity(id, type, attributes) {
    var payload = {};
    payload.id = id;
    payload.type = type;
    var optionPayload = {
        service: config.default.service,
        servicepath: config.default.subservice
    };
    for (var property in attributes) {
        if (attributes.hasOwnProperty(property)) {
            // do stuff
            var valueAttribute = {};
            valueAttribute["value"] = attributes[property];
            payload[property] = valueAttribute;
        }
    }
    var connection = new NGSI.Connection("http://" + config.default.contextBroker.host + ":" + config.default.contextBroker.port);
    connection.v2.appendEntityAttributes(payload, optionPayload).then((response) => {
        // Attributes appended successfully
        // response.correlator transaction id associated with the server response
        console.log("success update " + JSON.stringify(response));
    }, (error) => {
        // Error appending the attributes to the entity
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error update " + JSON.stringify(error));
    });
}
function getEntities() {
    var connection = new NGSI.Connection("http://" + config.default.contextBroker.host + ":" + config.default.contextBroker.port);
    var optionPayload = {
        service: config.default.service,
        servicepath: config.default.subservice
    };
    connection.v2.listEntities(optionPayload).then((response) => {
        // Entities retrieved successfully
        // response.correlator transaction id associated with the server response
        // response.limit contains the used page size
        // response.results is an array with the retrieved entities
        // response.offset contains the offset used in the request
        console.log("success read entities list" + JSON.stringify(response));
    }, (error) => {
        // Error retrieving entities
        // If the error was reported by Orion, error.correlator will be
        // filled with the associated transaction id
        console.log("error read entities list" + JSON.stringify(error));
    });
}
console.log('****************** PRESENTATION EVENTS SIMULATOR ******************');
getEntities();
var j = schedule.scheduleJob(config.default.cronExpression, function () {
    var event;
    const run = async () => {
        event = generateRandomEvent();
        const createEntityResponse = await createEntity(event.serialNumberItem, event.itemType);
        var attributes = extractAttributesFromEventPayload(event);
        const updateEntityResponse = await updateEntity(event.serialNumberItem, event.itemType, attributes);
    };
    run();
});
//# sourceMappingURL=index.js.map