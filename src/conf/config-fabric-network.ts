export default {

    "name": "fabric-network",
    "type": "hlfv1.1",
    "channelName": "ledgerchannel",
    "timeout": 5000,
    "cryptoconfigdir": "/Users/gabriele/Documents/crypto-config",
    "tls": false,
    "chaincode": {
      "path": "analytics-chaincode",
      "name": "analytics-chaincode",
      "version": "1.0",
      "lang": "NODE"
    },
    "organizations": [
      {
        "domainName": "org1.example.com",
        "mspID": "Org1MSP",
        "peers": [
          {
            "name": "peer0.org1.example.com",
            "requestURL": "grpc://167.99.89.178:7051",
            "eventURL": "grpc://167.99.89.178:7053"
          }
        ],
        "ca": {
          "url": "http://167.99.89.178:7054",
          "name": "ca.example.com"
        },
        "orderers": [
          {
            "name": "orderer.example.com",
            "url": "grpc://167.99.89.178:7050"
          }
        ],
        "users": [
          {
            "name": "Admin",
            "roles": [
              "admin"
            ]
          }
        ]
      }
    
    ]
  }