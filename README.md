# Far-Edge Presentation

## Installation
```
    npm install
    tsc -w
    cd dist
    node index.js
```
## Configuration Settings
Firstly needs to edit conf/config.ts in order to define this settings:
* context broker host (ip address) and port
* service (tenant) and subservice (service path) of OCB
* itemTypes a list of possible entity types (used by simulation mode)
* bay upper limit for capacity and load attributes and numbers of available bays (used by simulation mode)
* cronExpression in order to setting the job scheduler (used by simulation mode)
```
 "contextBroker": {
    "host": "167.99.89.178",
    "port": 1026
},
"service": "faredge",
"subservice": "/demo",
"itemTypes":["oven", "washingMachine", "dryer", "refrigerator"],
"bay":{
    "capacity_max": 100,
    "load_max": 100,
    "n_bays": 20
},
"cronExpression": "20 * * * * *"
```
