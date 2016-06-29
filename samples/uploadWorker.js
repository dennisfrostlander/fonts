var path = require("path");
var fs = require("fs");
//var request = require("request");
var Promise = require('bluebird');
var adalNode = require('adal-node');
var azureKeyVault = require('azure-keyvault');
var azureStorage = require('azure-storage');

var containerName = 'fonts';

var initPromise = null;
function init(options){
    if (!initPromise){
        initPromise = getConnectionInfo(options)
            .then(createBlobService);
    }
    return initPromise;
}

function getConnectionInfo(options){
    var principal = require(options.principalModule);
    var vaultUri = 'https://' + principal.vaultName + '.vault.azure.net';

    var credentials = new azureKeyVault.KeyVaultCredentials(keyVaultAuthenticator(principal));
    var client = new azureKeyVault.KeyVaultClient(credentials);

    var getSecret = Promise.promisify(client.getSecret);

    return getSecret.call(client, vaultUri + "/secrets/" + principal.cdnAccountKey)
        .then(function(result){
            return JSON.parse(result.value);
        });
}
function createBlobService(accountInfo){
    var blobService = azureStorage.createBlobService(accountInfo.accountName, accountInfo.accountKey);
    Promise.promisifyAll(blobService);

    return blobService.createContainerIfNotExistsAsync(containerName, {publicAccessLevel : 'container'})
        .then(function(){
            return blobService;
        });
}
function uploadFont(blobService, dir){
    var blobPath = path.relative(".", dir).replace("\\", "/");
    var metadata = JSON.parse(fs.readFileSync(path.join(dir, 'metadata.json'), 'utf-8'));
    var files = metadata.fonts.map(function(font){
        return font.filename;
    }).concat(['sample.png']);
    var blobOptions = {
        contentSettings: {
            cacheControl: 'public,max-age=' + (3600*24*365*10)
        }
    };

    var promises = [];
    for (var i = 0; i < files.length; i++){
        var file = files[i];
        var promise = blobService.createBlockBlobFromLocalFileAsync(containerName, blobPath + '/' + file, path.join(dir, file), blobOptions)
            .then(function(result){
                console.log('Uploaded', result.name);
            });
        promises.push(promise);
    }

    return Promise.all(promises);
}

module.exports = function(dir, options, callback){
    init(options)
        .then(function(blobService){
            return uploadFont(blobService, dir)
        })
        .then(function(){
            callback(null, 'Finished uploading ' + dir);
        })
        .catch(function(err){
            callback(err);
        });

    // var formData = {
    //     metadata: metadataString,
    //     //my_file: fs.createReadStream(__dirname + '/unicycle.jpg'),
    //     attachments: []
    // };
    //
    // for (var i = 0; i < metadata.fonts.length; i++){
    //     var font = metadata.fonts[i];
    //     formData.attachments.push(fs.createReadStream(path.join(dir, font.filename)));
    // }
    //
    // request.post({url:'http://localhost:50150/api/fonts/uploadSystemFont', formData: formData}, function optionalCallback(err, httpResponse, body) {
    //     callback(err, metadata.name);
    // });
};

function keyVaultAuthenticator(principal){
    return function (challenge, callback){
        var context = new adalNode.AuthenticationContext(challenge.authorization);
        return context.acquireTokenWithClientCertificate(challenge.resource, principal.appId, principal.getCertificate(), principal.thumbprint, function(err, tokenResponse){
            if (err) return callback(err);
            var authorizationValue = tokenResponse.tokenType + ' ' + tokenResponse.accessToken;
            return callback(null, authorizationValue);
        });
    };
}
